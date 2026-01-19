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
import path from "path";
import { fileURLToPath } from "url";

// CANONICAL PATH RESOLVER: Authority comes strictly from begin_session
import { getRepoRoot } from "./core/path-resolver.js";
import { SESSION_ID, SESSION_STATE } from "./session.js";

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
 * Tool Handler Boundary: mandatory diagnostics and session locking.
 */
function wrapHandler(handler, toolName) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (err) {
      const kerr = ensureKaizaError(err, {
        error_code: err.code || ERROR_CODES.INTERNAL_ERROR,
        phase: "EXECUTION",
        component: "TOOL_HANDLER",
        invariant: "MANDATORY_DIAGNOSTICS"
      });

      // LOG HARD FAILURE TO AUDIT LOG
      try {
        await logHardFailure(kerr, { tool: toolName }, SESSION_ID);
      } catch (logErr) {
        console.error(`[CRITICAL] Audit log failed during error handling: ${logErr.message}`);
        // GOVERNANCE: Log failures should not prevent error propagation
        throw new Error(`AUDIT_LOG_FAILURE: ${logErr.message}`);
      }

      // LOCK SESSION (unless it's already a lock error being re-thrown)
      if (kerr.error_code !== ERROR_CODES.SESSION_LOCKED) {
        SESSION_STATE.isLocked = true;
        SESSION_STATE.lockError = kerr.toDiagnostic();
      }

      console.error(`[GOVERNANCE] HARD FAILURE in ${toolName}: ${kerr.message}`);
      throw kerr;
    }
  };
}

// Create server factory
export async function startServer(role = "ANTIGRAVITY") {
  // 8️⃣ Startup Self-Audit (CRITICAL)
  runSelfAudit();

  const server = new McpServer({
    name: `kaiza-mcp-${role.toLowerCase()}`,
    version: "1.0.0",
  });

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
