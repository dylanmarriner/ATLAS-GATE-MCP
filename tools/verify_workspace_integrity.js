/**
 * TOOL: verify_workspace_integrity (READ-ONLY, WINDSURF + ANTIGRAVITY)
 * PURPOSE: Verify workspace audit log and artifact integrity
 * AUTHORITY: PROMPT 07 - MCP Deterministic Replay
 *
 * This read-only tool verifies:
 * 1. Audit log hash chain is unbroken
 * 2. All intent artifacts are present for executed files
 * 3. Plan hashes are immutable
 * 4. No tamper evidence exists
 *
 * OUTPUT:
 * - PASS/FAIL verdict
 * - First failing invariant (if any)
 * - List of all violations found
 */

import { verifyWorkspaceIntegrity, FINDING_CODES } from "../core/replay-engine.js";
import { SESSION_STATE } from "../session.js";
import { appendAuditEntry } from "../core/audit-system.js";

/**
 * Tool handler for verify_workspace_integrity.
 *
 * Output: Integrity check result with detailed violations
 */
export async function verifyWorkspaceIntegrityHandler(args) {
  // Execute integrity check (read-only, no state mutation)
  const integrityResult = verifyWorkspaceIntegrity(SESSION_STATE.workspaceRoot);

  // Audit this verification invocation (read-only operation)
  await appendAuditEntry({
    session_id: SESSION_STATE.sessionId || "unknown",
    role: process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY",
    workspace_root: SESSION_STATE.workspaceRoot,
    tool: "verify_workspace_integrity",
    intent: "Verify workspace and audit log integrity",
    plan_hash: null,
    phase_id: null,
    args: {},
    result: integrityResult.pass ? "ok" : "integrity_check_failed",
    error_code: null,
    invariant_id: integrityResult.first_failing_invariant || null,
    notes: `Integrity check: ${integrityResult.pass ? "PASS" : "FAIL"}, violations: ${integrityResult.violations.length}`,
  }, SESSION_STATE.workspaceRoot);

  // Return result (non-coder friendly format)
  return formatIntegrityResult(integrityResult);
}

/**
 * Format integrity result for non-coder consumption.
 */
function formatIntegrityResult(integrityResult) {
  const passFailText = integrityResult.pass ? "PASS" : "FAIL";

  return {
    verdict: passFailText,
    pass: integrityResult.pass,
    summary: {
      total_violations: integrityResult.violations.length,
      first_failing_invariant: integrityResult.first_failing_invariant,
    },
    violations: integrityResult.violations.map((v) => ({
      invariant: v.invariant,
      human_readable: translateInvariant(v.invariant),
      details: v.message || v.description || "No details available",
      affected_sequence: v.seq || null,
      line_number: v.lineNum || null,
    })),
    explanation: generateIntegrityExplanation(integrityResult),
  };
}

/**
 * Translate invariant name to plain English.
 */
function translateInvariant(invariantName) {
  const translations = {
    VALID_WORKSPACE_ROOT: "Workspace root path is valid and accessible",
    AUDIT_LOG_EXISTS: "Audit log file exists",
    HASH_CHAIN_INTACT:
      "Audit log hash chain is unbroken (no tampering detected)",
    SEQUENCE_CONTINUOUS: "Audit log sequence numbers are continuous",
    VALID_JSON: "All audit log entries are valid JSON",
    INTENT_ARTIFACTS_PRESENT:
      "All executed files have corresponding intent artifacts",
    PLAN_HASHES_IMMUTABLE: "Plan hashes are immutable and consistent",
    NO_TAMPERING_EVIDENCE: "No evidence of tampering in audit log",
  };

  return (
    translations[invariantName] || `Invariant: ${invariantName}`
  );
}

/**
 * Generate a plain-English explanation of integrity check results.
 */
function generateIntegrityExplanation(integrityResult) {
  const { pass, violations, first_failing_invariant } = integrityResult;

  if (pass) {
    return (
      "✓ Workspace integrity verified. The audit log is intact, hash chain is unbroken, " +
      "and no evidence of tampering was detected. You can trust the execution history."
    );
  }

  const parts = [];

  parts.push(`✗ Workspace integrity check FAILED at: ${first_failing_invariant}`);
  parts.push("");

  if (violations.length === 1) {
    parts.push(`Issue: ${violations[0].message}`);
  } else {
    parts.push(`${violations.length} issues found:`);
    violations.slice(0, 3).forEach((v, idx) => {
      parts.push(`  ${idx + 1}. ${v.message}`);
    });
    if (violations.length > 3) {
      parts.push(`  ... and ${violations.length - 3} more issues`);
    }
  }

  parts.push("");
  parts.push(
    "Action: Review the violations above. If tampering is suspected, " +
      "do not proceed with further operations. Consult your security team."
  );

  return parts.join("\n");
}
