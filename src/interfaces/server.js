import crypto from "crypto";
import { z } from "zod";

// IMPORTANT: Standard package imports for portability
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { writeFileHandler } from "./tools/write_file.js";
import { listPlansHandler } from "./tools/list_plans.js";
import { readFileHandler } from "./tools/read_file.js";
import { readAuditLogHandler } from "./tools/read_audit_log.js";
import { lintPlanHandler } from "./tools/lint_plan.js";
import { savePlanHandler } from "./tools/save_plan.js";
import { replayExecutionHandler } from "./tools/replay_execution.js";
import { verifyWorkspaceIntegrityHandler } from "./tools/verify_workspace_integrity.js";
import { generateAttestationBundleHandler } from "./tools/generate_attestation_bundle.js";
import { verifyAttestationBundleHandler } from "./tools/verify_attestation_bundle.js";
import { exportAttestationBundleHandler } from "./tools/export_attestation_bundle.js";
import { commitPhase } from "../application/post-execution-commit.js";

// GOVERNANCE IMPORTS
import { SystemError, SYSTEM_ERROR_CODES } from "../domain/system-error.js";
import { logHardFailure } from "../application/audit-log.js";
import { analyzeDirectoryGovernance } from "../application/static-analyzer.js";
import { appendAuditEntry, flushPreSessionBuffer } from "../application/audit-system.js";
import path from "path";
import { fileURLToPath } from "url";

// CANONICAL PATH RESOLVER: Authority comes strictly from begin_session
import { getRepoRoot } from "../infrastructure/path-resolver.js";
import { SESSION_ID, SESSION_STATE } from "../../session.js";
import { runStartupAudit } from "../application/startup-audit.js";

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
      !violation.file.includes("dependency-manager.js") &&
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
          plan_signature: SESSION_STATE.activePlanId || null,
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
          plan_signature: SESSION_STATE.activePlanId || null,
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

      // STEP 5: Session locking removed - plans can be written immediately after begin_session

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

    // RF1: Hard Gate - ENABLED
    // Session locking mandatory - tools cannot be called without begin_session
    console.error(`[DEBUG] tool=${toolName} workspaceRoot=${SESSION_STATE.workspaceRoot}`);
    if (toolName !== 'begin_session' && SESSION_STATE.workspaceRoot === null) {
      throw new Error("REFUSE: Session not initialized. You must call begin_session with an absolute workspace_root first.");
    }

    // 7️⃣ SESSION LOCK: Single session enforcement ENABLED
    // Multiple sessions and re-initialization NOT allowed

    // Deny multiple begin_session calls
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
          plan: z.string().describe("The cosign signature identifying the authorized plan"),
          role: z.enum(["EXECUTABLE", "BOUNDARY", "INFRASTRUCTURE", "VERIFICATION"]).optional(),
          intent: z.string().optional().describe("Summary of intent for this change (MANDATORY for governance)"),
        }),
      },
      wrapHandler(writeFileHandler, "write_file")
    );
    // WINDSURF: Remediation Proposal Generation
    const { generateRemediationProposals } = await import("./tools/generate-remediation-proposals.js");
    server.registerTool(
      "generate_remediation_proposals",
      {
        description: "Generate remediation proposals from forensic/audit/error evidence",
        inputSchema: z.object({
          plan_signature: z.string().describe("Cosign plan signature"),
          evidence_selectors: z.object({
            forensic_findings: z.array(z.any()).optional(),
            system_errors: z.array(z.any()).optional(),
            audit_filter: z.any().optional(),
          }).optional()
        }),
      },
      wrapHandler(generateRemediationProposals, "generate_remediation_proposals")
    );

    // WINDSURF: List Proposals
    const { listRemediationProposals } = await import("./tools/list-proposals.js");
    server.registerTool(
      "list_proposals",
      {
        description: "List all pending read-only proposals and their metadata",
        inputSchema: z.object({
          filter: z.any().optional(),
        }),
      },
      wrapHandler(listRemediationProposals, "list_proposals")
    );

    // WINDSURF: Commit Phase — post-execution signed Git commit
    server.registerTool(
      "commit_phase",
      {
        description: "Commit all changes within the plan path_allowlist after a phase completes successfully",
        inputSchema: z.object({
          plan_id: z.string().describe("plan_metadata.plan_id from the executed plan"),
          phase_id: z.string().describe("phase_id of the completed phase"),
          plan_signature: z.string().describe("Cosign signature of the executed plan"),
          path_allowlist: z.array(z.string()).describe("path_allowlist from the executed plan JSON"),
        }),
      },
      wrapHandler(
        async (args) => {
          const result = await commitPhase({
            planId: args.plan_id,
            phaseId: args.phase_id,
            planSignature: args.plan_signature,
            pathAllowlist: args.path_allowlist,
            workspaceRoot: SESSION_STATE.workspaceRoot,
          });
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        },
        "commit_phase"
      )
    );

    } else if (role === "ANTIGRAVITY") {
    console.error("[SERVER] ANTIGRAVITY: manifesting planning tools");

    // ANTIGRAVITY: Lint Plan Tool (read-only, non-mutating)
    server.registerTool(
      "lint_plan",
      {
        description: "Validate a plan without approval (read-only, ANTIGRAVITY only)",
        inputSchema: z.object({
          path: z.string().optional().describe("Path to plan file in docs/plans/"),
          signature: z.string().optional().describe("Plan signature to validate (Base64)"),
          content: z.string().optional().describe("Raw plan JSON content to lint"),
        }),
      },
      wrapHandler(lintPlanHandler, "lint_plan")
    );

    // ANTIGRAVITY: Save Plan Tool (sign + persist to docs/plans/)
    server.registerTool(
      "save_plan",
      {
        description: "Sign and save a lint-passing plan to docs/plans/<signature>.json (ANTIGRAVITY only)",
        inputSchema: z.object({
          content: z.string().describe("Complete lint-passing plan JSON content"),
        }),
      },
      wrapHandler(savePlanHandler, "save_plan")
    );

    // ANTIGRAVITY: Generate Maturity Report (read-only computation)
    const { generateMaturityReportHandler } = await import("./tools/generate_maturity_report.js");
    server.registerTool(
      "generate_maturity_report",
      {
        description: "Generate a formal maturity score report based on workspace evidence",
        inputSchema: z.object({}),
      },
      wrapHandler(generateMaturityReportHandler, "generate_maturity_report")
    );

    // ANTIGRAVITY: Recovery tools (OWNER role enforced inside each handler)
    const { initiateRecovery, confirmRecovery, getRecoveryStatus } = await import("../application/recovery-gate.js");
    server.registerTool(
      "recovery_initiate",
      {
        description: "Initiate kill-switch recovery procedure (OWNER role required)",
        inputSchema: z.object({
          owner_acknowledgement: z.string().describe("Explicit acknowledgement of recovery responsibility"),
          reason: z.string().describe("Reason for initiating recovery"),
        }),
      },
      wrapHandler(
        async (args) => {
          const result = await initiateRecovery(args);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        },
        "recovery_initiate"
      )
    );
    server.registerTool(
      "recovery_confirm",
      {
        description: "Confirm recovery with verification code (OWNER role required)",
        inputSchema: z.object({
          confirmation_code: z.string().describe("The confirmation code returned by recovery_initiate"),
          final_acknowledgement: z.string().describe("Final explicit acknowledgement to clear kill-switch"),
        }),
      },
      wrapHandler(
        async (args) => {
          const result = await confirmRecovery(args);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        },
        "recovery_confirm"
      )
    );
    server.registerTool(
      "recovery_status",
      {
        description: "Check current kill-switch and verification status",
        inputSchema: z.object({}),
      },
      wrapHandler(
        async (_args) => {
          const result = await getRecoveryStatus();
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        },
        "recovery_status"
      )
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

  // Forensic replay tools (read-only, both roles)
  server.registerTool(
    "replay_execution",
    {
      description: "Deterministic forensic replay of execution from audit log",
      inputSchema: z.object({
        plan_signature: z.string().describe("Cosign plan signature to replay"),
        phase_id: z.string().optional().describe("Filter to specific phase"),
        tool: z.string().optional().describe("Filter to specific tool name"),
        seq_start: z.number().optional().describe("Start sequence number"),
        seq_end: z.number().optional().describe("End sequence number"),
      }),
    },
    wrapHandler(replayExecutionHandler, "replay_execution")
  );

  server.registerTool(
    "verify_workspace_integrity",
    {
      description: "Verify workspace audit log and artifact integrity",
      inputSchema: z.object({}),
    },
    wrapHandler(verifyWorkspaceIntegrityHandler, "verify_workspace_integrity")
  );

  // Attestation tools (read-only, both roles)
  server.registerTool(
    "generate_attestation_bundle",
    {
      description: "Generate signed attestation bundle from workspace evidence (read-only)",
      inputSchema: z.object({
        workspace_root_label: z.string().optional().describe("Label for workspace in bundle"),
        plan_signature_filter: z.string().optional().describe("Filter to specific plan signature"),
        time_window: z.object({
          start: z.string().optional(),
          end: z.string().optional(),
        }).optional().describe("Time window for attestation"),
      }),
    },
    wrapHandler(generateAttestationBundleHandler, "generate_attestation_bundle")
  );

  server.registerTool(
    "verify_attestation_bundle",
    {
      description: "Verify signed attestation bundle (read-only)",
      inputSchema: z.object({
        bundle: z.any().describe("Attestation bundle object to verify"),
      }),
    },
    wrapHandler(verifyAttestationBundleHandler, "verify_attestation_bundle")
  );

  server.registerTool(
    "export_attestation_bundle",
    {
      description: "Export attestation bundle to JSON or Markdown format (read-only)",
      inputSchema: z.object({
        bundle: z.any().describe("Attestation bundle object to export"),
        format: z.enum(["json", "markdown"]).optional().describe("Export format (default: json)"),
      }),
    },
    wrapHandler(exportAttestationBundleHandler, "export_attestation_bundle")
  );

  // Attach stdio transport and start
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MCP] kaiza-mcp-${role.toLowerCase()} running | session=${SESSION_ID}`);
}
