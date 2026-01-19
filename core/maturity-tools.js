/**
 * ROLE: BOUNDARY (read-only)
 * PURPOSE: MCP-compatible read-only tools for maturity scoring
 * AUTHORITY: KAIZA MCP Maturity Scoring Specification v1.0
 * 
 * These tools are:
 * - Read-only (no state mutations)
 * - Deterministic (same inputs = same outputs)
 * - Audit-logged on execution
 * - Fail-closed on missing evidence
 */

import path from 'path';
import fs from 'fs';
import { computeMaturityScore, explainMaturityGap, hashScoringResult } from './maturity-scoring-engine.js';
import { appendAuditEntry } from './audit-system.js';

const TOOL_NAMES = {
  COMPUTE_MATURITY_SCORE: 'compute_maturity_score',
  EXPLAIN_MATURITY_GAP: 'explain_maturity_gap',
};

/**
 * Tool: compute_maturity_score
 * 
 * Input:
 * {
 *   workspace_root: string (required),
 *   time_window?: { start: ISO, end: ISO }
 * }
 * 
 * Output:
 * {
 *   timestamp: string,
 *   overall: number (1-5),
 *   dimensions: { [name]: score },
 *   evidence_summary: string,
 *   blocking_reasons: Array<{dimension, score, blockedBy}>,
 *   result_hash: string
 * }
 * 
 * Side effects:
 * - Appends audit entry (intent: read)
 */
export async function toolComputeMaturityScore(input, workspaceRoot) {
  const { workspace_root, time_window } = input;

  if (!workspace_root) {
    throw new Error('MISSING_INPUT: workspace_root required');
  }

  if (!fs.existsSync(workspace_root)) {
    throw new Error(`INVALID_WORKSPACE: ${workspace_root} not found`);
  }

  const auditLogPath = path.join(workspace_root, 'audit-log.jsonl');

  // Compute score
  const scoreResult = computeMaturityScore(workspace_root, {
    auditLogPath,
    timeWindow: time_window,
  });

  const resultHash = hashScoringResult(scoreResult);

  // Append audit entry
  try {
    await appendAuditEntry({
      session_id: process.env.SESSION_ID || 'maturity-scoring',
      role: 'BOUNDARY',
      workspace_root: workspace_root,
      tool: TOOL_NAMES.COMPUTE_MATURITY_SCORE,
      args: { workspace_root, time_window },
      result: 'success',
      claimed_level: scoreResult.overall,
      result_hash: resultHash,
    }, workspace_root);
  } catch (err) {
    console.error('Failed to append audit entry:', err.message);
    // Continue even if audit fails (fail-open on audit)
  }

  // Evidence summary (non-coder readable)
  const blockingReasons = scoreResult.blockingReasons || [];
  const evidenceSummary = blockingReasons.length === 0
    ? 'All evidence gates passed. Level-5 claim supported.'
    : blockingReasons.map(r => 
        `${r.dimension}: ${r.score} (blocked by ${r.blockedBy})`
      ).join('; ');

  return {
    timestamp: scoreResult.timestamp,
    overall: scoreResult.overall,
    dimensions: scoreResult.dimensions,
    evidence_summary: evidenceSummary,
    blocking_reasons: blockingReasons,
    result_hash: resultHash,
  };
}

/**
 * Tool: explain_maturity_gap
 * 
 * Input:
 * {
 *   workspace_root: string (required),
 *   target_level: number (default 5.0),
 *   current_result?: Object (optional, from compute_maturity_score)
 * }
 * 
 * Output:
 * {
 *   current_level: number,
 *   target_level: number,
 *   can_reach_target: boolean,
 *   gaps: Array<{dimension, current, target, gap, priority}>,
 *   unmet_invariants: Array<string>,
 *   required_evidence: Array<string>,
 * }
 */
export async function toolExplainMaturityGap(input, workspaceRoot) {
  const { workspace_root, target_level = 5.0, current_result } = input;

  if (!workspace_root) {
    throw new Error('MISSING_INPUT: workspace_root required');
  }

  if (!fs.existsSync(workspace_root)) {
    throw new Error(`INVALID_WORKSPACE: ${workspace_root} not found`);
  }

  // Compute current score if not provided
  let scoreResult = current_result;
  if (!scoreResult) {
    scoreResult = computeMaturityScore(workspace_root, {
      auditLogPath: path.join(workspace_root, 'audit-log.jsonl'),
    });
  }

  const gapAnalysis = explainMaturityGap(
    scoreResult.overall,
    target_level,
    scoreResult.dimensions
  );

  // Map gaps to unmet invariants (plain English)
  const unmetInvariants = gapAnalysis.gaps.map(gap => {
    const dim = gap.dimension;
    if (gap.gap > 2) {
      return `${dim}: MAJOR_FAILURE - Current ${gap.current.toFixed(1)} vs target ${gap.target}`;
    } else if (gap.gap > 1) {
      return `${dim}: INCOMPLETE - Current ${gap.current.toFixed(1)} vs target ${gap.target}`;
    } else {
      return `${dim}: MINOR_GAP - Current ${gap.current.toFixed(1)} vs target ${gap.target}`;
    }
  });

  // Required evidence to close gaps
  const requiredEvidence = [];
  gapAnalysis.gaps.forEach(gap => {
    if (gap.dimension === 'Reliability') {
      requiredEvidence.push('Achieve ≥99% audit coverage');
      requiredEvidence.push('Zero uncaught exceptions in error log');
      requiredEvidence.push('Fix hash chain breaks (if any)');
    } else if (gap.dimension === 'Security') {
      requiredEvidence.push('100% policy validation pass rate');
      requiredEvidence.push('Zero policy bypasses');
      requiredEvidence.push('Audit chain integrity verified');
    } else if (gap.dimension === 'Documentation') {
      requiredEvidence.push('Intent artifacts for ≥95% of files');
      requiredEvidence.push('Zero intent schema violations');
    } else if (gap.dimension === 'Governance') {
      requiredEvidence.push('100% executions tied to approved plan hash');
      requiredEvidence.push('Zero plan hash mismatches');
    } else if (gap.dimension === 'Integration') {
      requiredEvidence.push('≥5 integration tools configured');
      requiredEvidence.push('All verification gates passing');
    } else if (gap.dimension === 'Performance') {
      requiredEvidence.push('Policy latency ≤5000ms');
      requiredEvidence.push('Audit latency ≤10000ms');
    }
  });

  return {
    current_level: gapAnalysis.currentLevel,
    target_level: gapAnalysis.targetLevel,
    can_reach_target: gapAnalysis.canReachTarget,
    gaps: gapAnalysis.gaps,
    unmet_invariants: unmetInvariants,
    required_evidence: [...new Set(requiredEvidence)],
  };
}
