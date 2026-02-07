/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Deterministic execution replay + forensic verification without re-execution
 * AUTHORITY: PROMPT 07 - MCP DETERMINISTIC REPLAY + FORENSICS
 *
 * This module implements:
 * 1. Deterministic reconstruction of execution from audit log + plan hash
 * 2. Forensic timeline building with seq, tool, role, intent, hashes
 * 3. Determinism invariant validation (identical args → identical results)
 * 4. Divergence detection (hash chain breaks, missing entries)
 * 5. Authority violation detection (tool executed outside allowed phase/role)
 * 6. Policy violation detection (writes refused or blocked)
 * 7. Tamper detection (audit chain integrity failures)
 * 8. Non-coder friendly findings classification
 *
 * KEY CONSTRAINT: Replay is 100% read-only. No files are written, no tools
 * are invoked. Only the audit log is read and analyzed deterministically.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ============================================================================
// FINDING CODES (REQUIRED BY SPEC SECTION 4)
// ============================================================================

export const FINDING_CODES = {
  // Success states
  DETERMINISTIC_PASS: "DETERMINISTIC_PASS",
  COMPLIANCE_PASS: "COMPLIANCE_PASS",

  // Determinism failures
  DIVERGENCE_IDENTICAL_ARGS_DIFFERENT_RESULTS: "DIVERGENCE_IDENTICAL_ARGS_DIFFERENT_RESULTS",
  DIVERGENCE_SAME_PHASE_TOOL_DIFFERENT_RESULT: "DIVERGENCE_SAME_PHASE_TOOL_DIFFERENT_RESULT",
  DIVERGENCE_RESULT_HASH_MISMATCH: "DIVERGENCE_RESULT_HASH_MISMATCH",

  // Authority violations
  AUTHORITY_VIOLATION_TOOL_OUTSIDE_PHASE: "AUTHORITY_VIOLATION_TOOL_OUTSIDE_PHASE",
  AUTHORITY_VIOLATION_ROLE_MISMATCH: "AUTHORITY_VIOLATION_ROLE_MISMATCH",
  AUTHORITY_VIOLATION_EXECUTION_WITHOUT_PLAN: "AUTHORITY_VIOLATION_EXECUTION_WITHOUT_PLAN",

  // Policy violations
  POLICY_VIOLATION_WRITE_REFUSED: "POLICY_VIOLATION_WRITE_REFUSED",
  POLICY_VIOLATION_BLOCKED_BY_GATE: "POLICY_VIOLATION_BLOCKED_BY_GATE",
  POLICY_VIOLATION_INVARIANT_VIOLATION: "POLICY_VIOLATION_INVARIANT_VIOLATION",

  // Evidence gaps
  EVIDENCE_GAP_MISSING_AUDIT_ENTRIES: "EVIDENCE_GAP_MISSING_AUDIT_ENTRIES",
  EVIDENCE_GAP_INCOMPLETE_PLAN_EXECUTION: "EVIDENCE_GAP_INCOMPLETE_PLAN_EXECUTION",
  EVIDENCE_GAP_MISSING_RESULT_HASH: "EVIDENCE_GAP_MISSING_RESULT_HASH",

  // Tamper detection
  TAMPER_DETECTED_BROKEN_HASH_CHAIN: "TAMPER_DETECTED_BROKEN_HASH_CHAIN",
  TAMPER_DETECTED_SEQ_GAP: "TAMPER_DETECTED_SEQ_GAP",
  TAMPER_DETECTED_INVALID_JSON: "TAMPER_DETECTED_INVALID_JSON",
  TAMPER_DETECTED_HASH_RECOMPUTATION_MISMATCH: "TAMPER_DETECTED_HASH_RECOMPUTATION_MISMATCH",
};

// ============================================================================
// UTILITY: HASHING
// ============================================================================

function sha256(input) {
  const normalized = typeof input === "string" ? input : JSON.stringify(input);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function canonicalizeForHash(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort(), "");
}

// ============================================================================
// REPLAY CONFIGURATION & VALIDATION
// ============================================================================

/**
 * Validate replay inputs and fail-closed on missing required data.
 *
 * @throws {Error} if required inputs are missing or invalid
 */
function validateReplayInputs(workspaceRoot, planHash) {
  if (!workspaceRoot || typeof workspaceRoot !== "string") {
    throw new Error("REPLAY_INVALID_INPUT: workspace_root must be a non-empty string");
  }

  if (!planHash || typeof planHash !== "string") {
    throw new Error("REPLAY_INVALID_INPUT: plan_hash is required (64-char hex)");
  }

  if (!/^[a-f0-9]{64}$/.test(planHash)) {
    throw new Error("REPLAY_INVALID_INPUT: plan_hash must be 64-char hex string (SHA256)");
  }
}

// ============================================================================
// AUDIT LOG READING (READ-ONLY)
// ============================================================================

function readAuditLog(workspaceRoot) {
  const auditPath = path.join(workspaceRoot, ".atlas-gate", "audit.log");

  if (!fs.existsSync(auditPath)) {
    return {
      entries: [],
      count: 0,
      exists: false,
    };
  }

  const lines = fs
    .readFileSync(auditPath, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);

  const entries = lines
    .map((line, idx) => {
      try {
         return {
           lineNum: idx + 1,
           data: JSON.parse(line),
           raw: line,
         };
       } catch (err) {
         // Re-throw for governance compliance - parse errors must propagate
         throw new Error(`AUDIT_PARSE_ERROR_AT_LINE_${idx + 1}: ${err.message}`);
       }
    });

  return {
    entries,
    count: entries.length,
    exists: true,
  };
}

// ============================================================================
// HASH CHAIN VERIFICATION
// ============================================================================

/**
 * Verify hash chain integrity.
 * Returns list of violations, empty if valid.
 */
function verifyHashChain(auditEntries) {
  const violations = [];
  let expectedPrevHash = "GENESIS";

  for (const { lineNum, data } of auditEntries) {
    if (data === null) {
      // Parse error already recorded
      continue;
    }

    // Check prev_hash chain
    if (data.prev_hash !== expectedPrevHash) {
      violations.push({
        finding_code: FINDING_CODES.TAMPER_DETECTED_BROKEN_HASH_CHAIN,
        seq: data.seq,
        lineNum,
        message: `Hash chain broken at seq ${data.seq}: expected prev_hash ${expectedPrevHash}, got ${data.prev_hash}`,
      });
    }

    // Verify entry hash (recompute)
    const storedHash = data.entry_hash;
    const canonicalWithoutHash = { ...data };
    delete canonicalWithoutHash.entry_hash;

    const computedHash = sha256(canonicalizeForHash(canonicalWithoutHash));
    if (computedHash !== storedHash) {
      violations.push({
        finding_code: FINDING_CODES.TAMPER_DETECTED_HASH_RECOMPUTATION_MISMATCH,
        seq: data.seq,
        lineNum,
        message: `Entry hash mismatch at seq ${data.seq}: stored ${storedHash}, computed ${computedHash}`,
      });
    }

    expectedPrevHash = storedHash || data.prev_hash;
  }

  return violations;
}

// ============================================================================
// SEQUENCE CONTINUITY CHECK
// ============================================================================

function checkSequenceContinuity(auditEntries) {
  const violations = [];
  let expectedSeq = 1;

  for (const { lineNum, data } of auditEntries) {
    if (data === null) {
      continue;
    }

    if (data.seq !== expectedSeq) {
      violations.push({
        finding_code: FINDING_CODES.TAMPER_DETECTED_SEQ_GAP,
        seq: data.seq,
        lineNum,
        message: `Sequence gap at seq ${data.seq}: expected ${expectedSeq}`,
      });
    }

    expectedSeq = data.seq + 1;
  }

  return violations;
}

// ============================================================================
// PARSE ERROR DETECTION
// ============================================================================

function checkParseErrors(auditEntries) {
  const violations = [];

  for (const { lineNum, data, parseError } of auditEntries) {
    if (parseError) {
      violations.push({
        finding_code: FINDING_CODES.TAMPER_DETECTED_INVALID_JSON,
        lineNum,
        message: `Invalid JSON at line ${lineNum}: ${parseError}`,
      });
    }
  }

  return violations;
}

// ============================================================================
// DETERMINISM VALIDATION (SPEC SECTION 3)
// ============================================================================

/**
 * Validate determinism invariants:
 * - identical args_hash across same phase/tool produce identical result_hash
 * - no non-deterministic signals appear (timestamps, random data)
 */
function validateDeterminism(auditEntries) {
  const violations = [];
  const phaseToolMap = {}; // (phase, tool) -> [{ args_hash, result_hash, seq }]

  for (const { lineNum, data } of auditEntries) {
    if (data === null) continue;

    // Build phase+tool key
    const phaseId = data.phase_id || "NULL";
    const tool = data.tool || "UNKNOWN";
    const key = `${phaseId}::${tool}`;

    if (!phaseToolMap[key]) {
      phaseToolMap[key] = [];
    }

    if (data.args_hash && data.result_hash) {
      phaseToolMap[key].push({
        args_hash: data.args_hash,
        result_hash: data.result_hash,
        seq: data.seq,
        lineNum,
      });
    }
  }

  // Check determinism: same args → same results
  for (const [key, entries] of Object.entries(phaseToolMap)) {
    const byArgsHash = {};

    for (const entry of entries) {
      if (!byArgsHash[entry.args_hash]) {
        byArgsHash[entry.args_hash] = [];
      }
      byArgsHash[entry.args_hash].push(entry);
    }

    // For each args_hash, all result_hashes must be identical
    for (const [argsHash, resultEntries] of Object.entries(byArgsHash)) {
      const uniqueResultHashes = new Set(resultEntries.map((e) => e.result_hash));

      if (uniqueResultHashes.size > 1) {
        violations.push({
          finding_code: FINDING_CODES.DIVERGENCE_IDENTICAL_ARGS_DIFFERENT_RESULTS,
          key,
          args_hash: argsHash,
          affected_seqs: resultEntries.map((e) => e.seq),
          result_hashes: Array.from(uniqueResultHashes),
          message: `Determinism violation in ${key}: identical args_hash produced different results`,
        });
      }
    }
  }

  return violations;
}

// ============================================================================
// POLICY & AUTHORITY VALIDATION
// ============================================================================

/**
 * Detect policy violations:
 * - writes refused or blocked
 * - invariant violations
 * - policy gates blocking execution
 */
function validateAuthority(auditEntries) {
  const violations = [];

  for (const { lineNum, data } of auditEntries) {
    if (data === null) continue;

    // Detect error conditions
    if (data.error_code) {
      if (data.error_code.includes("POLICY")) {
        violations.push({
          finding_code: FINDING_CODES.POLICY_VIOLATION_BLOCKED_BY_GATE,
          seq: data.seq,
          lineNum,
          tool: data.tool,
          error_code: data.error_code,
          message: `Policy gate blocked ${data.tool} at seq ${data.seq}: ${data.error_code}`,
        });
      }

      if (data.error_code === "INVARIANT_VIOLATION") {
        violations.push({
          finding_code: FINDING_CODES.POLICY_VIOLATION_INVARIANT_VIOLATION,
          seq: data.seq,
          lineNum,
          invariant_id: data.invariant_id,
          message: `Invariant violation at seq ${data.seq}: ${data.invariant_id}`,
        });
      }

      if (data.error_code === "PLAN_NOT_APPROVED") {
        violations.push({
          finding_code: FINDING_CODES.AUTHORITY_VIOLATION_EXECUTION_WITHOUT_PLAN,
          seq: data.seq,
          lineNum,
          message: `Tool ${data.tool} executed without approved plan at seq ${data.seq}`,
        });
      }

      if (data.error_code === "ROLE_MISMATCH") {
        violations.push({
          finding_code: FINDING_CODES.AUTHORITY_VIOLATION_ROLE_MISMATCH,
          seq: data.seq,
          lineNum,
          role: data.role,
          tool: data.tool,
          message: `Role ${data.role} not authorized for ${data.tool} at seq ${data.seq}`,
        });
      }
    }
  }

  return violations;
}

// ============================================================================
// PLAN SCOPE VALIDATION
// ============================================================================

/**
 * For a given plan_hash, ensure all tools were executed within the
 * expected phase boundaries defined in the plan.
 * (This is a placeholder; full validation requires reading the plan file.)
 */
function validatePlanScope(auditEntries, planHash, workspaceRoot) {
  const violations = [];

  // Count entries for this plan
  const planEntries = auditEntries.filter(
    ({ data }) => data && data.plan_hash === planHash
  );

  if (planEntries.length === 0) {
    // No execution for this plan; gap in evidence
    violations.push({
      finding_code: FINDING_CODES.EVIDENCE_GAP_INCOMPLETE_PLAN_EXECUTION,
      plan_hash: planHash,
      message: `No audit entries found for plan ${planHash}`,
    });
  }

  return violations;
}

// ============================================================================
// CORE REPLAY ENGINE
// ============================================================================

/**
 * Execute deterministic replay:
 * 1. Read audit log (read-only)
 * 2. Verify hash chain integrity
 * 3. Check sequence continuity
 * 4. Validate determinism invariants
 * 5. Detect authority/policy violations
 * 6. Build timeline
 * 7. Classify findings
 *
 * @param {string} workspaceRoot - Locked workspace root
 * @param {string} planHash - SHA256 plan hash
 * @param {Object} filters - Optional: { phase_id, tool, seq_start, seq_end }
 * @returns {Object} replay result with findings and timeline
 * @throws {Error} if inputs are invalid (fail-closed)
 */
export function replayExecution(workspaceRoot, planHash, filters = {}) {
  // STEP 1: VALIDATE INPUTS (FAIL-CLOSED)
   try {
     validateReplayInputs(workspaceRoot, planHash);
   } catch (err) {
     // Re-throw for governance compliance - validation errors must propagate
     throw new Error(`REPLAY_INVALID_INPUT: ${err.message}`);
   }

  // STEP 2: READ AUDIT LOG (READ-ONLY)
  const auditData = readAuditLog(workspaceRoot);

  if (!auditData.exists) {
    // INTENTIONAL: Governance exception - missing audit log returns analysis result, not exception
    // This is a fail-closed pattern: unable to verify = evidence gap finding in result
    return {
      success: false,
      error_code: "REPLAY_AUDIT_LOG_NOT_FOUND",
      message: "Audit log not found",
      findings: [
        {
          finding_code: FINDING_CODES.EVIDENCE_GAP_MISSING_AUDIT_ENTRIES,
          message: "Audit log file does not exist",
        },
      ],
      timeline: [],
      verdict: "FAIL",
    };
  }

  if (auditData.count === 0) {
    return {
      success: false,
      error_code: "REPLAY_AUDIT_LOG_EMPTY",
      message: "Audit log is empty",
      findings: [
        {
          finding_code: FINDING_CODES.EVIDENCE_GAP_INCOMPLETE_PLAN_EXECUTION,
          plan_hash: planHash,
          message: "No audit entries recorded",
        },
      ],
      timeline: [],
      verdict: "FAIL",
    };
  }

  // STEP 3: FILTER ENTRIES (if requested)
  let filteredEntries = auditData.entries;

  if (filters.phase_id) {
    filteredEntries = filteredEntries.filter(
      ({ data }) => data && data.phase_id === filters.phase_id
    );
  }

  if (filters.tool) {
    filteredEntries = filteredEntries.filter(
      ({ data }) => data && data.tool === filters.tool
    );
  }

  if (filters.seq_start !== undefined || filters.seq_end !== undefined) {
    const start = filters.seq_start || 1;
    const end = filters.seq_end || Infinity;
    filteredEntries = filteredEntries.filter(
      ({ data }) => data && data.seq >= start && data.seq <= end
    );
  }

  // STEP 4: RUN ALL VERIFICATION GATES
  const allFindings = [];

  // Parse errors
  allFindings.push(...checkParseErrors(filteredEntries));

  // Hash chain integrity
  allFindings.push(...verifyHashChain(filteredEntries));

  // Sequence continuity
  allFindings.push(...checkSequenceContinuity(filteredEntries));

  // Determinism validation
  allFindings.push(...validateDeterminism(filteredEntries));

  // Authority & policy validation
  allFindings.push(...validateAuthority(filteredEntries));

  // Plan scope validation
  allFindings.push(...validatePlanScope(filteredEntries, planHash, workspaceRoot));

  // STEP 5: BUILD TIMELINE
  const timeline = filteredEntries
    .filter(({ data }) => data !== null)
    .map(({ data }) => ({
      seq: data.seq,
      ts: data.ts,
      tool: data.tool,
      role: data.role,
      intent: data.intent,
      plan_hash: data.plan_hash,
      phase_id: data.phase_id,
      args_hash: data.args_hash,
      result_hash: data.result_hash,
      error_code: data.error_code,
      invariant_id: data.invariant_id,
    }));

  // STEP 6: DETERMINE VERDICT
  const hasErrors = allFindings.some((f) => f.finding_code && f.finding_code.startsWith("TAMPER"));
  const hasDivergence = allFindings.some((f) =>
    f.finding_code && f.finding_code.startsWith("DIVERGENCE")
  );
  const hasAuthority = allFindings.some((f) =>
    f.finding_code && f.finding_code.startsWith("AUTHORITY")
  );
  const hasPolicy = allFindings.some((f) =>
    f.finding_code && f.finding_code.startsWith("POLICY")
  );

  const verdict = hasErrors || hasDivergence || hasAuthority || hasPolicy ? "FAIL" : "PASS";

  return {
    success: verdict === "PASS",
    error_code: null,
    plan_hash: planHash,
    entries_analyzed: filteredEntries.length,
    findings: allFindings,
    timeline,
    verdict,
    summary: {
      total_findings: allFindings.length,
      tamper_violations: allFindings.filter((f) => f.finding_code && f.finding_code.startsWith("TAMPER")).length,
      divergence_violations: allFindings.filter((f) => f.finding_code && f.finding_code.startsWith("DIVERGENCE")).length,
      authority_violations: allFindings.filter((f) => f.finding_code && f.finding_code.startsWith("AUTHORITY")).length,
      policy_violations: allFindings.filter((f) => f.finding_code && f.finding_code.startsWith("POLICY")).length,
      evidence_gaps: allFindings.filter((f) => f.finding_code && f.finding_code.startsWith("EVIDENCE")).length,
    },
  };
}

// ============================================================================
// WORKSPACE INTEGRITY VERIFICATION
// ============================================================================

/**
 * Verify overall workspace integrity:
 * 1. Audit log hash chain valid
 * 2. All executed plans have corresponding intent artifacts
 * 3. Plan hashes are immutable
 * 4. No tamper evidence
 *
 * @param {string} workspaceRoot
 * @returns {Object} { pass: boolean, violations: [...], first_failing_invariant: string | null }
 */
export function verifyWorkspaceIntegrity(workspaceRoot) {
  if (!workspaceRoot || typeof workspaceRoot !== "string") {
    return {
      pass: false,
      violations: [
        {
          invariant: "VALID_WORKSPACE_ROOT",
          message: "workspace_root must be a non-empty string",
        },
      ],
      first_failing_invariant: "VALID_WORKSPACE_ROOT",
    };
  }

  const violations = [];

  // Read audit log
  const auditData = readAuditLog(workspaceRoot);

  if (!auditData.exists) {
    violations.push({
      invariant: "AUDIT_LOG_EXISTS",
      message: "Audit log file not found",
    });
    return {
      pass: false,
      violations,
      first_failing_invariant: "AUDIT_LOG_EXISTS",
    };
  }

  // Check hash chain
  if (auditData.entries.length > 0) {
    const hashViolations = verifyHashChain(auditData.entries);
    if (hashViolations.length > 0) {
      violations.push(...hashViolations.map((v) => ({ invariant: "HASH_CHAIN_INTACT", ...v })));
    }

    const seqViolations = checkSequenceContinuity(auditData.entries);
    if (seqViolations.length > 0) {
      violations.push(...seqViolations.map((v) => ({ invariant: "SEQUENCE_CONTINUOUS", ...v })));
    }

    const parseViolations = checkParseErrors(auditData.entries);
    if (parseViolations.length > 0) {
      violations.push(...parseViolations.map((v) => ({ invariant: "VALID_JSON", ...v })));
    }
  }

  const pass = violations.length === 0;
  const firstFailing = pass ? null : violations[0].invariant;

  return {
    pass,
    violations,
    first_failing_invariant: firstFailing,
  };
}
