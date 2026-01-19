/**
 * TOOL: verify_attestation_bundle (READ-ONLY, WINDSURF + ANTIGRAVITY)
 * PURPOSE: Verify signed attestation bundle
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP External Attestation Interface
 *
 * This read-only tool:
 * 1. Verifies HMAC-SHA256 signature
 * 2. Validates bundle_id deterministic hash
 * 3. Checks all verifier checksums
 * 4. Returns PASS/FAIL verdict with first failing check
 * 5. Never mutates state
 *
 * OUTPUT:
 * - PASS | FAIL verdict
 * - First failing check (if any)
 * - List of all violations
 * - Human-readable explanation
 */

import { verifyAttestationBundle } from "../core/attestation-engine.js";
import { SESSION_STATE } from "../session.js";
import { appendAuditEntry } from "../core/audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

/**
 * Tool handler for verify_attestation_bundle.
 *
 * Input: { bundle: Object } - The signed attestation bundle to verify
 * Output: Verification result with PASS/FAIL verdict
 */
export async function verifyAttestationBundleHandler(args) {
  const workspaceRoot = SESSION_STATE.workspaceRoot;
  const role = process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY";

  if (!workspaceRoot) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      human_message: "Session not initialized. Call begin_session first.",
      tool_name: "verify_attestation_bundle",
    });
  }

  if (!args.bundle || typeof args.bundle !== "object") {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: "Invalid input: 'bundle' field must be an object",
      tool_name: "verify_attestation_bundle",
    });
  }

  let result;
  try {
    result = verifyAttestationBundle(args.bundle, workspaceRoot);
  } catch (err) {
    // Audit the verification attempt failure
    await appendAuditEntry({
      session_id: SESSION_STATE.sessionId || "unknown",
      role,
      workspace_root: workspaceRoot,
      tool: "verify_attestation_bundle",
      intent: "Verify attestation bundle signature and integrity",
      plan_hash: null,
      phase_id: null,
      args: { bundle_id: args.bundle?.bundle_id || "unknown" },
      result: "error",
      error_code: "ATTESTATION_VERIFICATION_ERROR",
      invariant_id: "ATTESTATION_SIGNATURE_INTEGRITY",
      notes: err.message,
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
      human_message: `Attestation verification error: ${err.message}`,
      tool_name: "verify_attestation_bundle",
      cause: err,
    });
  }

  // Audit the verification attempt (both success and failure)
  await appendAuditEntry({
    session_id: SESSION_STATE.sessionId || "unknown",
    role,
    workspace_root: workspaceRoot,
    tool: "verify_attestation_bundle",
    intent: "Verify attestation bundle signature and integrity",
    plan_hash: null,
    phase_id: null,
    args: { bundle_id: args.bundle.bundle_id },
    result: result.passed ? "ok" : "verification_failed",
    error_code: result.passed ? null : result.first_failing_check,
    invariant_id: result.passed ? null : "ATTESTATION_INTEGRITY_CHECK",
    notes: result.passed 
      ? `Attestation verified successfully: ${args.bundle.bundle_id.substring(0, 16)}...`
      : `Attestation verification failed: ${result.first_failing_check}`,
  }, workspaceRoot);

  // Format output
  return formatVerificationResult(result, args.bundle);
}

/**
 * Format verification result for human consumption.
 */
function formatVerificationResult(result, bundle) {
  const humanReadableViolations = result.violations.map(v => ({
    check: v.check,
    human_readable: translateCheckName(v.check),
    details: v.message,
  }));

  return {
    verdict: result.verdict,
    passed: result.passed,
    bundle_id: bundle.bundle_id,
    
    summary: {
      total_checks: humanReadableViolations.length + 1, // +1 for signature
      passed_checks: result.passed ? humanReadableViolations.length + 1 : humanReadableViolations.length,
      failed_checks: humanReadableViolations.length,
      first_failing_check: result.first_failing_check,
    },

    violations: humanReadableViolations,

    explanation: generateVerificationExplanation(result, bundle),
  };
}

/**
 * Translate check name to plain English.
 */
function translateCheckName(checkName) {
  const translations = {
    SIGNATURE_VERIFICATION: "HMAC-SHA256 signature verification",
    BUNDLE_ID_MISMATCH: "Bundle ID (deterministic hash) validation",
    AUDIT_METRIC_HASH_MISMATCH: "Audit metrics integrity check",
    POLICY_SUMMARY_HASH_MISMATCH: "Policy enforcement summary integrity check",
    MATURITY_HASH_MISMATCH: "Maturity scores integrity check",
  };

  return translations[checkName] || checkName;
}

/**
 * Generate plain-English explanation of verification result.
 */
function generateVerificationExplanation(result, bundle) {
  const parts = [];

  if (result.passed) {
    parts.push("✓ Attestation bundle signature verified successfully.");
    parts.push("");
    parts.push(`Bundle ID: ${bundle.bundle_id.substring(0, 16)}...`);
    parts.push(`Generated: ${bundle.generated_timestamp}`);
    parts.push(`Audit entries: ${bundle.audit_metrics.total_entries}`);
    parts.push(`Maturity level: ${bundle.maturity_scores.overall.toFixed(1)}/5.0`);
    parts.push("");
    parts.push("All integrity checks passed. You can trust this attestation bundle.");
  } else {
    parts.push(`✗ Attestation bundle verification FAILED.`);
    parts.push("");
    parts.push(`First failing check: ${translateCheckName(result.first_failing_check)}`);
    parts.push("");
    
    if (result.violations.length > 0) {
      parts.push("Issues found:");
      result.violations.forEach((v, idx) => {
        parts.push(`  ${idx + 1}. ${v.human_readable}`);
        parts.push(`     ${v.details}`);
      });
    }
    parts.push("");
    parts.push("Action: Do not rely on this attestation. Verify the bundle integrity.");
  }

  return parts.join("\n");
}
