/**
 * TOOL: replay_execution (READ-ONLY, WINDSURF + ANTIGRAVITY)
 * PURPOSE: Deterministic forensic replay of execution from audit log
 * AUTHORITY: PROMPT 07 - MCP Deterministic Replay
 *
 * This tool provides a read-only forensic replay that reconstructs what happened
 * during a previous execution without invoking any handlers. It proves causality,
 * detects divergence, and identifies tampering.
 *
 * OUTPUTS:
 * - Deterministic summary object
 * - Findings list with classification
 * - Replay verdict (PASS/FAIL)
 * - Non-coder friendly timeline
 */

import { replayExecution, FINDING_CODES } from "../core/replay-engine.js";
import { SESSION_STATE } from "../session.js";
import { appendAuditEntry } from "../core/audit-system.js";

/**
 * Tool handler for replay_execution.
 * Inputs:
 * - plan_hash (required): SHA256 plan hash to replay
 * - phase_id (optional): filter to specific phase
 * - tool (optional): filter to specific tool name
 * - seq_start (optional): start sequence number
 * - seq_end (optional): end sequence number
 *
 * Output: Replay result with findings and timeline
 */
export async function replayExecutionHandler(args) {
  const {
    plan_hash: planHash,
    phase_id: phaseId,
    tool,
    seq_start: seqStart,
    seq_end: seqEnd,
  } = args;

  // Validate required input
  if (!planHash) {
    throw new Error("REPLAY_INVALID_INPUT: plan_hash is required");
  }

  // Execute replay (read-only, no state mutation)
  const filters = {};
  if (phaseId) filters.phase_id = phaseId;
  if (tool) filters.tool = tool;
  if (seqStart !== undefined) filters.seq_start = seqStart;
  if (seqEnd !== undefined) filters.seq_end = seqEnd;

  const replayResult = replayExecution(SESSION_STATE.workspaceRoot, planHash, filters);

  // Audit this replay invocation (read-only operation)
  await appendAuditEntry({
    session_id: SESSION_STATE.sessionId || "unknown",
    role: process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY",
    workspace_root: SESSION_STATE.workspaceRoot,
    tool: "replay_execution",
    intent: `Forensic replay of plan ${planHash}`,
    plan_hash: planHash,
    phase_id: phaseId || null,
    args: {
      plan_hash: planHash,
      phase_id: phaseId || null,
      tool: tool || null,
      seq_start: seqStart || null,
      seq_end: seqEnd || null,
    },
    result: replayResult.success ? "ok" : "analysis_complete",
    error_code: replayResult.error_code || null,
    invariant_id: null,
    notes: `Replay verdict: ${replayResult.verdict}, findings: ${replayResult.findings?.length || 0}`,
  }, SESSION_STATE.workspaceRoot);

  // Return result (MCP-formatted with non-coder friendly content)
  const formattedResult = formatReplayResult(replayResult);
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(formattedResult, null, 2)
      }
    ]
  };
}

/**
 * Format replay result for non-coder consumption.
 */
function formatReplayResult(replayResult) {
  return {
    verdict: replayResult.verdict,
    success: replayResult.success,
    plan_hash: replayResult.plan_hash,
    summary: {
      total_entries_analyzed: replayResult.entries_analyzed,
      total_findings: replayResult.summary?.total_findings || 0,
      tamper_detected: (replayResult.summary?.tamper_violations || 0) > 0,
      divergence_detected: (replayResult.summary?.divergence_violations || 0) > 0,
      authority_violations: replayResult.summary?.authority_violations || 0,
      policy_violations: replayResult.summary?.policy_violations || 0,
      evidence_gaps: replayResult.summary?.evidence_gaps || 0,
    },
    findings: (replayResult.findings || []).map((f) => ({
      code: f.finding_code,
      human_readable: translateFindingCode(f.finding_code),
      details: f.message || f.key || "No additional details",
      affected_sequences: f.affected_seqs || f.seq ? [f.seq].filter(Boolean) : [],
    })),
    timeline: (replayResult.timeline || []).slice(0, 100), // Limit to 100 entries for brevity
    explanation: generateExplanation(replayResult),
  };
}

/**
 * Translate finding code to plain English.
 */
function translateFindingCode(code) {
  const translations = {
    // Success
    DETERMINISTIC_PASS: "Execution was deterministic and compliant",
    COMPLIANCE_PASS: "No violations detected",

    // Divergence
    DIVERGENCE_IDENTICAL_ARGS_DIFFERENT_RESULTS:
      "Same input produced different outputs (non-deterministic)",
    DIVERGENCE_SAME_PHASE_TOOL_DIFFERENT_RESULT:
      "Tool behaved inconsistently within the same phase",
    DIVERGENCE_RESULT_HASH_MISMATCH: "Expected result hash does not match actual",

    // Authority
    AUTHORITY_VIOLATION_TOOL_OUTSIDE_PHASE:
      "Tool was executed outside its authorized phase",
    AUTHORITY_VIOLATION_ROLE_MISMATCH:
      "User role was not authorized to execute this tool",
    AUTHORITY_VIOLATION_EXECUTION_WITHOUT_PLAN:
      "Tool was executed without an approved plan",

    // Policy
    POLICY_VIOLATION_WRITE_REFUSED: "Write operation was refused by policy",
    POLICY_VIOLATION_BLOCKED_BY_GATE: "Tool was blocked by a security gate",
    POLICY_VIOLATION_INVARIANT_VIOLATION: "Invariant violation occurred",

    // Evidence gaps
    EVIDENCE_GAP_MISSING_AUDIT_ENTRIES: "Audit log entries are missing",
    EVIDENCE_GAP_INCOMPLETE_PLAN_EXECUTION:
      "Plan execution was not fully recorded",
    EVIDENCE_GAP_MISSING_RESULT_HASH: "Result hash is missing from audit entry",

    // Tamper
    TAMPER_DETECTED_BROKEN_HASH_CHAIN: "Audit log hash chain is broken (tampering)",
    TAMPER_DETECTED_SEQ_GAP: "Sequence numbers have gaps (entries removed)",
    TAMPER_DETECTED_INVALID_JSON:
      "Audit entry contains invalid JSON (corruption)",
    TAMPER_DETECTED_HASH_RECOMPUTATION_MISMATCH:
      "Stored hash does not match recomputed hash (tampering)",
  };

  return translations[code] || `Unknown: ${code}`;
}

/**
 * Generate a plain-English explanation of what happened.
 */
function generateExplanation(replayResult) {
  const { verdict, summary } = replayResult;

  if (verdict === "PASS") {
    return (
      `The system replayed ${replayResult.entries_analyzed} audit entries and found ` +
      `no evidence of tampering, violations, or non-deterministic behavior. ` +
      `The execution was fully deterministic and compliant with policy.`
    );
  }

  const parts = [];

  if (summary.tamper_violations > 0) {
    parts.push(
      `⚠️ Tampering detected: ${summary.tamper_violations} entry/entries ` +
        `show signs of tampering (broken hash chain, missing entries, or corruption).`
    );
  }

  if (summary.divergence_violations > 0) {
    parts.push(
      `⚠️ Non-determinism detected: ${summary.divergence_violations} case(s) where ` +
        `identical inputs produced different outputs.`
    );
  }

  if (summary.authority_violations > 0) {
    parts.push(
      `⚠️ Authorization issue: ${summary.authority_violations} tool(s) were executed ` +
        `without proper authorization or outside allowed phases.`
    );
  }

  if (summary.policy_violations > 0) {
    parts.push(
      `⚠️ Policy violation: ${summary.policy_violations} operation(s) violated ` +
        `system policy or security gates.`
    );
  }

  if (summary.evidence_gaps > 0) {
    parts.push(
      `⚠️ Evidence gap: ${summary.evidence_gaps} audit record(s) are missing ` +
        `or incomplete, preventing full analysis.`
    );
  }

  return (
    `Replay FAILED. Issues detected:\n\n` +
    parts.join("\n\n") +
    `\n\nReview the detailed findings above for more information.`
  );
}
