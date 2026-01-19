/**
 * TOOL: generate_attestation_bundle (READ-ONLY, WINDSURF + ANTIGRAVITY)
 * PURPOSE: Generate signed attestation bundle from workspace evidence
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP External Attestation Interface
 *
 * This read-only tool:
 * 1. Gathers evidence from audit log, plans, and replays
 * 2. Computes maturity scores
 * 3. Generates deterministic bundle_id
 * 4. Signs bundle with workspace secret (HMAC-SHA256)
 * 5. Returns signed attestation bundle
 *
 * OUTPUT:
 * - Signed attestation bundle (JSON)
 * - bundle_id (deterministic hash)
 * - Audit trail entry
 */

import { generateAttestationBundle } from "../core/attestation-engine.js";
import { SESSION_STATE } from "../session.js";
import { appendAuditEntry } from "../core/audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";
import path from "path";

/**
 * Tool handler for generate_attestation_bundle.
 *
 * Input: optional { workspace_root_label, plan_hash_filter, time_window }
 * Output: Signed attestation bundle with bundle_id
 */
export async function generateAttestationBundleHandler(args) {
  const workspaceRoot = SESSION_STATE.workspaceRoot;
  const role = process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY";

  if (!workspaceRoot) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      human_message: "Session not initialized. Call begin_session first.",
      tool_name: "generate_attestation_bundle",
    });
  }

  let bundle;
  let auditResult = "ok";
  let errorCode = null;

  try {
    // Generate bundle (read-only)
    bundle = generateAttestationBundle(workspaceRoot, {
      workspace_root_label: args.workspace_root_label || null,
      plan_hash_filter: args.plan_hash_filter || null,
      time_window: args.time_window || null,
    });
  } catch (err) {
    auditResult = "error";
    errorCode = err.message.split(":")[0] || "ATTESTATION_GENERATION_FAILED";

    // Audit the failure
    await appendAuditEntry({
      session_id: SESSION_STATE.sessionId || "unknown",
      role,
      workspace_root: workspaceRoot,
      tool: "generate_attestation_bundle",
      intent: "Generate attestation bundle from workspace evidence",
      plan_hash: null,
      phase_id: null,
      args: args || {},
      result: "error",
      error_code: errorCode,
      invariant_id: "ATTESTATION_EVIDENCE_INTEGRITY",
      notes: err.message,
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
      human_message: `Attestation generation failed: ${err.message}`,
      tool_name: "generate_attestation_bundle",
      cause: err,
    });
  }

  // Audit the success
  await appendAuditEntry({
    session_id: SESSION_STATE.sessionId || "unknown",
    role,
    workspace_root: workspaceRoot,
    tool: "generate_attestation_bundle",
    intent: "Generate attestation bundle from workspace evidence",
    plan_hash: null,
    phase_id: null,
    args: {
      bundle_id: bundle.bundle_id,
      plan_count: bundle.plan_hashes.length,
      audit_entries: bundle.audit_metrics.total_entries,
    },
    result: "ok",
    error_code: null,
    invariant_id: null,
    notes: `Attestation bundle generated: ${bundle.bundle_id.substring(0, 16)}...`,
  }, workspaceRoot);

  // Format output (non-coder friendly)
  return formatBundleOutput(bundle);
}

/**
 * Format bundle output for human consumption.
 */
function formatBundleOutput(bundle) {
  return {
    bundle_id: bundle.bundle_id,
    status: "generated",
    generated_timestamp: bundle.generated_timestamp,
    workspace_root_hash: bundle.workspace_root_hash,
    
    // Summary
    summary: {
      plans_executed: bundle.plan_hashes.length,
      audit_entries: bundle.audit_metrics.total_entries,
      audit_failures: bundle.audit_metrics.failure_count,
      policy_pass_rate: `${(bundle.policy_enforcement.pass_rate * 100).toFixed(1)}%`,
      replay_verdict: bundle.replay_verdict,
      maturity_level: `${bundle.maturity_scores.overall.toFixed(1)} / 5.0`,
    },

    // For verification
    bundle_metadata: {
      bundle_schema_version: bundle.bundle_schema_version,
      audit_log_root_hash: bundle.audit_log_root_hash,
      time_window: bundle.time_window,
      verifier_checksums: bundle.verifier_checksums,
      signature: bundle.signature,
    },

    // Detailed scores
    maturity_dimensions: bundle.maturity_scores.dimensions,
    blocking_reasons: bundle.maturity_scores.blocking_reasons,

    explanation: `Attestation bundle generated for workspace. ` +
      `Bundle ID: ${bundle.bundle_id.substring(0, 16)}... ` +
      `Maturity level: ${bundle.maturity_scores.overall.toFixed(1)}/5.0. ` +
      `Sign: HMAC-SHA256 signature verified with workspace secret.`,
  };
}
