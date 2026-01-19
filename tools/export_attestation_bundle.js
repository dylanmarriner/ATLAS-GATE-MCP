/**
 * TOOL: export_attestation_bundle (READ-ONLY, WINDSURF + ANTIGRAVITY)
 * PURPOSE: Export attestation bundle to JSON or Markdown format
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP External Attestation Interface
 *
 * This read-only tool:
 * 1. Accepts signed attestation bundle
 * 2. Exports to requested format (json | markdown)
 * 3. Returns non-coder friendly output
 * 4. Appends audit entry for export operation
 * 5. Never mutates state
 *
 * OUTPUT:
 * - JSON representation (full bundle)
 * - Markdown representation (human-readable)
 */

import { exportAttestationBundle } from "../core/attestation-engine.js";
import { SESSION_STATE } from "../session.js";
import { appendAuditEntry } from "../core/audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

/**
 * Tool handler for export_attestation_bundle.
 *
 * Input: { bundle: Object, format: "json" | "markdown" }
 * Output: Exported content (string or object)
 */
export async function exportAttestationBundleHandler(args) {
  const workspaceRoot = SESSION_STATE.workspaceRoot;
  const role = process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY";

  if (!workspaceRoot) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      human_message: "Session not initialized. Call begin_session first.",
      tool_name: "export_attestation_bundle",
    });
  }

  if (!args.bundle || typeof args.bundle !== "object") {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: "Invalid input: 'bundle' field must be an object",
      tool_name: "export_attestation_bundle",
    });
  }

  const format = args.format || "json";
  if (!["json", "markdown"].includes(format)) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: `Invalid format: ${format}. Must be 'json' or 'markdown'.`,
      tool_name: "export_attestation_bundle",
    });
  }

  let exported;
  try {
    exported = exportAttestationBundle(args.bundle, format);
  } catch (err) {
    // Audit the export failure
    await appendAuditEntry({
      session_id: SESSION_STATE.sessionId || "unknown",
      role,
      workspace_root: workspaceRoot,
      tool: "export_attestation_bundle",
      intent: "Export attestation bundle to specified format",
      plan_hash: null,
      phase_id: null,
      args: { bundle_id: args.bundle?.bundle_id || "unknown", format },
      result: "error",
      error_code: "ATTESTATION_EXPORT_FAILED",
      invariant_id: null,
      notes: err.message,
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
      human_message: `Attestation export failed: ${err.message}`,
      tool_name: "export_attestation_bundle",
      cause: err,
    });
  }

  // Audit the successful export
  await appendAuditEntry({
    session_id: SESSION_STATE.sessionId || "unknown",
    role,
    workspace_root: workspaceRoot,
    tool: "export_attestation_bundle",
    intent: "Export attestation bundle to specified format",
    plan_hash: null,
    phase_id: null,
    args: {
      bundle_id: args.bundle.bundle_id,
      format,
      export_size_bytes: exported.length,
    },
    result: "ok",
    error_code: null,
    invariant_id: null,
    notes: `Attestation exported to ${format} (${exported.length} bytes)`,
  }, workspaceRoot);

  // Return formatted result
  if (format === "json") {
    // Parse and return as object for JSON format
    try {
      const parsed = JSON.parse(exported);
      return {
        status: "exported",
        format: "json",
        bundle_id: args.bundle.bundle_id,
        export_size_bytes: exported.length,
        content: parsed,
      };
    } catch {
      return {
        status: "exported",
        format: "json",
        bundle_id: args.bundle.bundle_id,
        export_size_bytes: exported.length,
        content_raw: exported,
      };
    }
  } else {
    // Return markdown as string
    return {
      status: "exported",
      format: "markdown",
      bundle_id: args.bundle.bundle_id,
      export_size_bytes: exported.length,
      content: exported,
      content_type: "text/markdown",
    };
  }
}
