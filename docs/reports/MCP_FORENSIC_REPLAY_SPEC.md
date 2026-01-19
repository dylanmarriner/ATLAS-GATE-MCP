# MCP Forensic Replay Specification

**Version:** 1.0.0  
**Authority:** PROMPT 07 - MCP Deterministic Replay + Forensics  
**Date:** 2026-01-19

## Overview

The MCP Forensic Replay system enables deterministic reconstruction of execution from audit logs without re-invoking any tool handlers. It provides Level-5 reliability by proving causality, detecting divergence, and identifying tampering.

## Purpose

This system answers critical questions:
- **What happened?** Deterministic timeline from audit log
- **Why did it happen?** Intent artifacts and plan context
- **Did it comply?** Authority, policy, and determinism validation
- **Can we trust it?** Tamper detection via hash chains
- **What went wrong?** Forensic finding classification

## Core Components

### 1. Replay Engine (`core/replay-engine.js`)

Deterministic reconstruction without state mutation.

#### API

```javascript
replayExecution(workspaceRoot, planHash, filters = {})
```

**Inputs:**
- `workspaceRoot` (required): Workspace root path
- `planHash` (required): SHA256 plan hash (64-char hex)
- `filters` (optional): Phase, tool, seq range filters

**Filters:**
```javascript
{
  phase_id: "01-setup",     // Filter to phase
  tool: "write_file",        // Filter to tool
  seq_start: 10,             // Start seq
  seq_end: 50                // End seq
}
```

**Output:**
```javascript
{
  success: boolean,
  error_code: string | null,
  plan_hash: string,
  entries_analyzed: number,
  findings: [
    {
      finding_code: string,
      message: string,
      affected_seqs: number[],
      ...context
    }
  ],
  timeline: [
    {
      seq: number,
      ts: string,
      tool: string,
      role: string,
      intent: string,
      plan_hash: string,
      phase_id: string,
      args_hash: string,
      result_hash: string,
      error_code: string | null,
      invariant_id: string | null
    }
  ],
  verdict: "PASS" | "FAIL",
  summary: {
    total_findings: number,
    tamper_violations: number,
    divergence_violations: number,
    authority_violations: number,
    policy_violations: number,
    evidence_gaps: number
  }
}
```

#### Invariants Validated

1. **Hash Chain Integrity**
   - Each entry's `prev_hash` matches previous entry's `entry_hash`
   - No gaps or breaks in chain
   - Entry hash recomputation matches stored hash

2. **Sequence Continuity**
   - Sequence numbers are monotonic (1, 2, 3, ...)
   - No gaps (seq jump from 5 to 7 = tampering)

3. **Determinism**
   - Identical `args_hash` → identical `result_hash` within same phase/tool
   - No non-deterministic signals detected

4. **Authority**
   - Tools executed only with approved plan
   - Role authorized for tool
   - Phase boundaries respected

5. **Policy**
   - No policy gates blocked execution
   - No invariant violations
   - No security policy breaches

### 2. Workspace Integrity Verification (`core/replay-engine.js`)

```javascript
verifyWorkspaceIntegrity(workspaceRoot)
```

**Output:**
```javascript
{
  pass: boolean,
  violations: [
    {
      invariant: string,
      message: string,
      seq: number | null,
      lineNum: number | null
    }
  ],
  first_failing_invariant: string | null
}
```

**Checked Invariants:**
- `VALID_WORKSPACE_ROOT`: Workspace path valid
- `AUDIT_LOG_EXISTS`: Audit log file exists
- `HASH_CHAIN_INTACT`: Hash chain unbroken
- `SEQUENCE_CONTINUOUS`: No sequence gaps
- `VALID_JSON`: All entries valid JSON

### 3. Forensic Report Generation (`core/forensic-report-generator.js`)

```javascript
generateForensicReport(replayResult, planHash, generatedAt)
```

**Generates markdown report with sections:**
1. Executive Summary (non-coder friendly)
2. Key Findings (violations by category)
3. Execution Timeline (seq, tool, role, result)
4. Detailed Findings (per violation with context)
5. What This Means (plain English explanation)
6. Recommended Actions (remediation steps)
7. Technical Details (counts, hashes, timestamps)

## Finding Codes (Non-Negotiable)

### Success States
- `DETERMINISTIC_PASS`: Execution was deterministic and compliant
- `COMPLIANCE_PASS`: No violations detected

### Divergence Violations
- `DIVERGENCE_IDENTICAL_ARGS_DIFFERENT_RESULTS`: Same input → different outputs
- `DIVERGENCE_SAME_PHASE_TOOL_DIFFERENT_RESULT`: Tool inconsistent in phase
- `DIVERGENCE_RESULT_HASH_MISMATCH`: Expected result hash does not match

### Authority Violations
- `AUTHORITY_VIOLATION_TOOL_OUTSIDE_PHASE`: Tool executed outside phase
- `AUTHORITY_VIOLATION_ROLE_MISMATCH`: Role not authorized for tool
- `AUTHORITY_VIOLATION_EXECUTION_WITHOUT_PLAN`: Execution without approved plan

### Policy Violations
- `POLICY_VIOLATION_WRITE_REFUSED`: Write operation refused
- `POLICY_VIOLATION_BLOCKED_BY_GATE`: Tool blocked by security gate
- `POLICY_VIOLATION_INVARIANT_VIOLATION`: Invariant violation occurred

### Evidence Gaps
- `EVIDENCE_GAP_MISSING_AUDIT_ENTRIES`: Audit entries missing
- `EVIDENCE_GAP_INCOMPLETE_PLAN_EXECUTION`: Plan execution incomplete
- `EVIDENCE_GAP_MISSING_RESULT_HASH`: Result hash missing

### Tamper Detection
- `TAMPER_DETECTED_BROKEN_HASH_CHAIN`: Hash chain broken (tampering)
- `TAMPER_DETECTED_SEQ_GAP`: Sequence gaps (entries removed)
- `TAMPER_DETECTED_INVALID_JSON`: Invalid JSON (corruption)
- `TAMPER_DETECTED_HASH_RECOMPUTATION_MISMATCH`: Stored ≠ computed hash

## Tool Interfaces

### `replay_execution` (Read-Only)

**Schema:**
```javascript
{
  plan_hash: string,           // SHA256 plan hash (required)
  phase_id?: string,           // Filter to phase (optional)
  tool?: string,               // Filter to tool (optional)
  seq_start?: number,          // Start seq (optional)
  seq_end?: number             // End seq (optional)
}
```

**Returns:** Formatted replay result with human-readable findings

### `verify_workspace_integrity` (Read-Only)

**Schema:**
```javascript
{}  // No input required
```

**Returns:** Integrity check result with violation details

## Audit Integration

Every replay invocation is audited:
```javascript
{
  tool: "replay_execution" | "verify_workspace_integrity",
  intent: "Forensic replay of plan X" | "Verify workspace integrity",
  result: "ok" | "analysis_complete",
  error_code: null,
  plan_hash: string,
  args: { /* redacted args */ }
}
```

Audit entries MUST be appended with full hash chain integrity.

## Non-Coder Output Format

All findings are translated to plain English:
- `TAMPER_DETECTED_BROKEN_HASH_CHAIN` → "Audit log hash chain is broken (tampering)"
- `DIVERGENCE_IDENTICAL_ARGS_DIFFERENT_RESULTS` → "Same input produced different outputs"
- `AUTHORITY_VIOLATION_ROLE_MISMATCH` → "User role was not authorized to execute this tool"

Forensic reports include:
- Executive summary (1-2 paragraphs)
- Bulleted key findings with context
- Execution timeline table
- "What This Means" section in plain English
- "Recommended Actions" section for non-technical stakeholders

## Constraints & Limitations

1. **Read-Only Execution**
   - Replay NEVER writes to workspace
   - NEVER invokes any tool handlers
   - NEVER mutates state

2. **Audit Log Dependency**
   - Replay accuracy depends on audit log integrity
   - If audit log is corrupted, replay detects it
   - Missing audit entries = evidence gaps

3. **Hash-Based Matching**
   - Determinism validation uses `args_hash` and `result_hash`
   - Hash collisions are negligible (SHA256)
   - Redaction before hashing is deterministic

4. **Determinism Scope**
   - Only validates within same phase + tool combination
   - Different tools may have different determinism requirements
   - Non-deterministic reads (timestamps, random) are outside audit scope

5. **Plan Scope Validation**
   - Full plan scope validation requires plan file read
   - Current implementation checks for execution presence
   - Future enhancement: read .md plan files and validate all phases

## Fail-Closed Rules

Replay MUST refuse if:
- `workspace_root` is null, empty, or invalid
- `plan_hash` is not a 64-char hex string
- Audit log verification fails (corrupted entries)
- Plan hash not found in audit log

**Error codes:**
- `REPLAY_INVALID_INPUT`: Input validation failed
- `REPLAY_AUDIT_LOG_NOT_FOUND`: Audit log missing
- `REPLAY_AUDIT_LOG_EMPTY`: No audit entries
- `REPLAY_EVIDENCE_INVALID`: Audit log corrupted

## Testing Strategy

Tests MUST cover (at least 12):
1. ✓ Replay PASS on valid deterministic run
2. ✓ Divergence detected on altered result_hash
3. ✓ Tamper detected on broken hash chain
4. ✓ Tamper detected on missing entry (seq gap)
5. ✓ Tamper detected on invalid JSON
6. ✓ Authority violation detected (tool outside phase)
7. ✓ Policy violation detected (write refused)
8. ✓ Authority violation: execution without plan
9. ✓ Replay tool is read-only (no state mutation)
10. ✓ Verify workspace integrity PASS on clean workspace
11. ✓ Verify workspace integrity FAIL on tamper
12. ✓ Audit entry written on replay invocation
13. ✓ Non-deterministic pattern flagged
14. ✓ Forensic report generated with correct codes

## Future Enhancements

1. **Plan Scope Validation**
   - Read .md plan files from `docs/plans/`
   - Validate all phases executed in order
   - Check for missing or out-of-order phases

2. **Intent Artifact Verification**
   - Cross-reference intent artifacts with executed files
   - Verify all writes have corresponding artifacts

3. **Cross-Log Correlation**
   - Support multiple audit logs (per-repo)
   - Correlate events across logs

4. **Visualization**
   - Timeline diagrams
   - Flow graphs of execution

5. **Automated Remediation**
   - Suggest repairs for common issues
   - Generate rollback plans

## References

- PROMPT 07: MCP Deterministic Replay + Forensics
- PROMPT 03: MCP-Enforced Execution Boundary Audit Logging
- PROMPT 02: SystemError Envelope (PROMPT 02)
- GLOBAL_INVARIANTS.md: Governance invariants
