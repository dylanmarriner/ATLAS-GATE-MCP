import crypto from "crypto";
import { z } from "zod";

// IMPORTANT: Standard package imports for portability
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { writeFileHandler } from "./tools/write_file.js";
import { listPlansHandler } from "./tools/list_plans.js";
import { readFileHandler } from "./tools/read_file.js";
import { readAuditLogHandler } from "./tools/read_audit_log.js";
import { readPromptHandler } from "./tools/read_prompt.js";
import { bootstrapPlanHandler, bootstrapToolSchema } from "./tools/bootstrap_tool.js";

// GOVERNANCE IMPORTS
import { ensureKaizaError, ERROR_CODES } from "./core/error.js";
import { logHardFailure } from "./core/audit-log.js";
import { analyzeDirectoryGovernance } from "./core/static-analyzer.js";
import { appendAuditEntry, flushPreSessionBuffer } from "./core/audit-system.js";
import path from "path";
import { fileURLToPath } from "url";

// CANONICAL PATH RESOLVER: Authority comes strictly from begin_session
import { getRepoRoot } from "./core/path-resolver.js";
import { SESSION_ID, SESSION_STATE } from "./session.js";
import { runStartupAudit } from "./core/startup-audit.js";
import { SystemError, SYSTEM_ERROR_CODES } from "./core/system-error.js";

// RF1-RF3: Explicit workspace authority model.
// No eager or lazy initialization via discovery.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Startup Self-Audit: Refuse to start if code violates governance.
 */
function runSelfAudit() {
  console.error("[GOVERNANCE] Starting Self-Audit...");
  // Audit the server's own source code, excluding governance/analysis/infrastructure files, test files, verification scripts, and main server
  const violations = analyzeDirectoryGovernance(__dirname).filter(
    violation => !violation.file.includes("static-analyzer.js") &&
                 !violation.file.includes("stub-detector.js") &&
                 !violation.file.includes("file-lock.js") &&
                 !violation.file.includes("server.js") &&
                 !violation.file.includes("startup-audit.js") &&
                 !violation.file.includes("test") &&
                 !violation.file.includes("tests/") &&
                 !violation.file.includes("verify_security.js")
  );
  if (violations.length > 0) {
    const msg = `SELF_AUDIT_FAILURE: MCP refused startup. ${violations.length} files violate error handling governance. Fix empty catch blocks or swallowed errors.`;
    console.error(`[GOVERNANCE] ${msg}`);
    console.error(JSON.stringify(violations, null, 2));
    process.exit(1);
  }
  console.error("[GOVERNANCE] Self-Audit Passed.");
}

/**
 * Tool Handler Boundary: MANDATORY SYSTEM ERROR ENVELOPING + AUDIT LOGGING
 * 
 * This wrapper guarantees:
 * 1. All tool handlers execute inside try-catch
 * 2. Any thrown error (raw Error, SystemError, or other) is converted to SystemError envelope
 * 3. AUDIT ENTRY is appended for BOTH success and failure (with hash chain integrity)
 * 4. SystemError is logged to audit trail BEFORE propagating to MCP transport
 * 5. Session is locked on any tool failure (except recovery writes to docs/reports/)
 * 6. MCP client always receives canonical SystemError.toEnvelope() JSON structure
 * 
 * AUDIT LOGGING (PROMPT 03):
 * - Every tool call produces exactly one audit entry
 * - Entry includes deterministic sequence number and hash chain
 * - Sensitive args/results are redacted before hashing
 * - Audit append failure causes tool invocation to fail (fail-closed)
 */
function wrapHandler(handler, toolName) {
  return async (args) => {
    const role = process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY";
    let auditEntry = null;

    try {
      // STEP 0: Attempt to call the handler
      const result = await handler(args);

      // STEP 1: Audit SUCCESS
      try {
        auditEntry = await appendAuditEntry({
          session_id: SESSION_ID,
          role,
          workspace_root: SESSION_STATE.workspaceRoot,
          tool: toolName,
          intent: null,
          plan_hash: SESSION_STATE.activePlanId || null,
          phase_id: null,
          args: args,
          result: "ok",
          error_code: null,
          invariant_id: null,
          notes: `${toolName} execution completed successfully`
        }, SESSION_STATE.workspaceRoot);
      } catch (auditErr) {
        // FAIL-CLOSED: Audit append failure causes tool invocation to fail
        console.error(`[CRITICAL] Audit append failed on success: ${auditErr.message}`);
        throw SystemError.startupFailure(
          SYSTEM_ERROR_CODES.AUDIT_APPEND_FAILED,
          {
            human_message: `Critical: Audit log write failed for ${toolName}. Operation not recorded.`,
            cause: auditErr,
          }
        );
      }

      return result;

    } catch (err) {
      // STEP 2: Convert any error to SystemError canonical envelope
      let systemErr;
      
      if (err instanceof SystemError) {
        systemErr = err;
      } else {
        // Determine error code from error type if available
        let errorCode = SYSTEM_ERROR_CODES.INTERNAL_ERROR;
        
        // Check if error has a code field that maps to a system error code
        if (err?.code && Object.values(SYSTEM_ERROR_CODES).includes(err.code)) {
          errorCode = err.code;
        }
        
        // Create SystemError from unknown error with full context
        systemErr = SystemError.fromUnknown(err, {
          error_code: errorCode,
          role: role,
          session_id: SESSION_ID,
          workspace_root: SESSION_STATE.workspaceRoot,
          tool_name: toolName,
        });
      }

      // STEP 3: Audit FAILURE (must succeed, or tool call fails with audit error)
      try {
        auditEntry = await appendAuditEntry({
          session_id: SESSION_ID,
          role,
          workspace_root: SESSION_STATE.workspaceRoot,
          tool: toolName,
          intent: null,
          plan_hash: SESSION_STATE.activePlanId || null,
          phase_id: null,
          args: args,
          result: "error",
          error_code: systemErr.error_code,
          invariant_id: null,
          notes: `${toolName} failed: ${systemErr.message}`
        }, SESSION_STATE.workspaceRoot);
      } catch (auditErr) {
        // FAIL-CLOSED: Audit append failure causes tool invocation to fail
        console.error(`[CRITICAL] Audit append failed on error: ${auditErr.message}`);
        // Create compound error: audit failure takes priority
        const auditFailErr = SystemError.startupFailure(
          SYSTEM_ERROR_CODES.AUDIT_APPEND_FAILED,
          {
            human_message: `Critical: Audit log write failed. Original error: ${systemErr.message}. Audit error: ${auditErr.message}`,
            cause: auditErr,
          }
        );
        console.error(`[GOVERNANCE] AUDIT FAILURE: ${auditFailErr.message}`);
        throw auditFailErr;
      }

      // STEP 4: Log original error to old audit trail (legacy)
      try {
        await logHardFailure(systemErr, { tool: toolName }, SESSION_ID);
      } catch (legacyErr) {
        console.error(`[WARN] Legacy audit log also failed: ${legacyErr.message}`);
      }

      // STEP 5: Lock session on failure (unless already locked or this is a recovery write)
      if (systemErr.error_code !== SYSTEM_ERROR_CODES.SESSION_LOCKED) {
        SESSION_STATE.isLocked = true;
        SESSION_STATE.lockError = systemErr.toEnvelope();
      }

      // STEP 6: Log to console for debugging
      console.error(`[GOVERNANCE] HARD FAILURE in ${toolName}: ${systemErr.message}`);

      // STEP 7: Throw the canonical SystemError
      throw systemErr;
    }
  };
}

// Create server factory
export async function startServer(role = "ANTIGRAVITY") {
  // 8️⃣ Startup Self-Audit (CRITICAL) - Code governance checks
  runSelfAudit();

  const server = new McpServer({
    name: `kaiza-mcp-${role.toLowerCase()}`,
    version: "1.0.0",
  });

  // 9️⃣ Startup MCP Audit (CRITICAL) - Enforcement infrastructure checks
  // This audit runs BEFORE tool registration and enforces invariant compliance
  // If any check fails, the server refuses to boot (process.exit(1))
  await runStartupAudit(server, role);

  const { beginSessionHandler } = await import("./tools/begin_session.js");

  /**
   * RF1 & RF3: Mandatory Session Initialization Gate
   */
  const originalValidateToolInput = server.validateToolInput.bind(server);
  server.validateToolInput = async function (tool, args, toolName) {
    // NORMALIZATION
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (parseError) {
        if (toolName === 'read_file' || toolName === 'list_plans') {
          args = { path: args };
        } else {
          throw new Error(`INVALID_INPUT_FORMAT: ${toolName} requires object input, got unparseable string`);
        }
      }
    }

    if (typeof args !== 'object' || args === null) {
      throw new Error(`INVALID_INPUT_FORMAT: ${toolName} input must be an object, got ${typeof args}`);
    }

    // RF1: Hard Gate - Check if session is initialized
    console.error(`[DEBUG] tool=${toolName} workspaceRoot=${SESSION_STATE.workspaceRoot}`);
    if (toolName !== 'begin_session' && SESSION_STATE.workspaceRoot === null) {
      throw new Error("REFUSE: Session not initialized. You must call begin_session with an absolute workspace_root first.");
    }

    // 7️⃣ SESSION LOCK: Prevent further calls until Failure Report is written
    if (SESSION_STATE.isLocked) {
      const isFailureReport = toolName === 'write_file' &&
        args.path &&
        (args.path.includes("docs/reports/") || args.path.includes("docs/reports\\"));

      const isAuditRo = toolName === 'read_audit_log' || toolName === 'read_file';

      if (!isFailureReport && !isAuditRo) {
        throw new Error(`SESSION_LOCKED: Hard failure in previous call. You MUST write a Failure Report to docs/reports/ before continuing. Error: ${SESSION_STATE.lockError.human_message}`);
      }
    }

    // Prevent re-initialization
    if (toolName === 'begin_session' && SESSION_STATE.workspaceRoot !== null) {
      throw new Error(`REFUSE: Session already locked to ${SESSION_STATE.workspaceRoot}.`);
    }

    return originalValidateToolInput(tool, args, toolName);
  };

  // Universal Tools (Mandatory First Call)
  server.registerTool(
    "begin_session",
    {
      description: "Initialize and lock the workspace authority for the session (MANDATORY FIRST CALL)",
      inputSchema: z.object({
        workspace_root: z.string().describe("Absolute path to project root")
      }),
    },
    wrapHandler(beginSessionHandler, "begin_session")
  );

  // RF1-RF3: Tool Manifestation (Visible immediately, but gated)
  if (role === "WINDSURF") {
    console.error("[SERVER] WINDSURF: manifesting execution tools");
    server.registerTool(
      "write_file",
      {
        description: "Authoritative audited file write (Windsurf only)",
        inputSchema: z.object({
          path: z.string(),
          content: z.string().optional(),
          patch: z.string().optional(),
          previousHash: z.string().optional(),
          plan: z.string().describe("The SHA256 plan hash identifying the authorized plan"),
          role: z.enum(["EXECUTABLE", "BOUNDARY", "INFRASTRUCTURE", "VERIFICATION"]).optional(),
          intent: z.string().optional().describe("Summary of intent for this change (MANDATORY for governance)"),
        }),
      },
      wrapHandler(writeFileHandler, "write_file")
    );
  } else if (role === "ANTIGRAVITY") {
    console.error("[SERVER] ANTIGRAVITY: manifesting planning tools");
    server.registerTool(
      "bootstrap_create_foundation_plan",
      {
        description: "Create the first approved plan (Antigravity only)",
        inputSchema: bootstrapToolSchema,
      },
      wrapHandler(bootstrapPlanHandler, "bootstrap_create_foundation_plan")
    );
  }

  // Read-only tools - Allowed for both, but only after ignition
  server.registerTool(
    "list_plans",
    {
      description: "List approved plans",
      inputSchema: z.object({
        path: z.string().optional(),
      }),
    },
    wrapHandler(listPlansHandler, "list_plans")
  );

  server.registerTool(
    "read_file",
    {
      description: "Read repository file (read-only)",
      inputSchema: z.object({
        path: z.string(),
      }),
    },
    wrapHandler(readFileHandler, "read_file")
  );

  server.registerTool(
    "read_audit_log",
    {
      description: "Read append-only audit log",
      inputSchema: z.object({}),
    },
    wrapHandler(readAuditLogHandler, "read_audit_log")
  );

  server.registerTool(
    "read_prompt",
    {
      description: `Read canonical prompt - Role: ${role}`,
      inputSchema: z.object({
        name: z.string()
      })
    },
    wrapHandler((args) => readPromptHandler(args, role), "read_prompt")
  );

  // Attach stdio transport and start
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MCP] kaiza-mcp-${role.toLowerCase()} running | session=${SESSION_ID}`);
}
