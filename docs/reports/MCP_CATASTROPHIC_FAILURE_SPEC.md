# MCP CATASTROPHIC FAILURE & KILL-SWITCH SPECIFICATION

**Version:** 1.0  
**Date:** 2026-01-19  
**Status:** APPROVED  
**Audience:** Engineering & Operators

## Executive Summary

This specification defines the catastrophic failure handling system for the ATLAS-GATE MCP Server. When critical invariants are violated, the system engages a global kill-switch that:

- **Immediately** stops all write operations
- **Persists** across process restarts (survives crashes)
- **Allows** read-only forensic access only
- **Requires** human operator acknowledgement and recovery verification before unlock
- **Produces** auditable evidence and detailed halt reports

The kill-switch is **non-negotiable**: once engaged, the system refuses all mutations until recovery verifications pass.

---

## 1. Failure Taxonomy

All failures are classified with stable IDs (F-*) mapped to invariants and default responses.

### Critical Failures (F-CRITICAL)

| ID | Description | Severity | Default Response |
|----|-------------|----------|------------------|
| F-STARTUP | Boot integrity failure | CRITICAL | HALT |
| F-POLICY | Write-time policy breach | CRITICAL | HALT |
| F-AUDIT | Audit append/verify failure | CRITICAL | HALT |
| F-AUDIT-WRITE | Audit write failure | CRITICAL | HALT |
| F-DETERMINISM | Replay divergence | CRITICAL | HALT |
| F-AUTHORITY-ROLE | Tool invoked with wrong role | CRITICAL | HALT |
| F-AUTHORITY-PLAN | Write with unapproved plan | CRITICAL | REFUSE |
| F-INTENT | Intent schema violation | CRITICAL | HALT |
| F-PLAN-HASH | Plan file hash mismatch | CRITICAL | HALT |
| F-SECURITY | Tamper detected | CRITICAL | HALT |
| F-HUMAN-ABUSE | Operator abuse threshold | CRITICAL | HALT |

### High Severity Failures (F-HIGH)

| ID | Description | Severity | Default Response |
|----|-------------|----------|------------------|
| F-HUMAN-FATIGUE | Operator fatigue threshold | HIGH | HALT |
| F-ENV-FS | Filesystem permission denied | HIGH | DEGRADED |
| F-ENV-RESOURCE | Resource exhaustion | HIGH | DEGRADED |

### Implementation

Defined in: `core/failure-taxonomy.js`

```javascript
export const FAILURE_TAXONOMY = {
  STARTUP_GATE_FAILURE: {
    id: "F-STARTUP",
    invariant_id: "INV_STARTUP_GATE_ENFORCED",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Server failed startup self-audit or gate checks"
  },
  // ... (complete list in taxonomy file)
};
```

---

## 2. Global Kill-Switch

### Semantics (NON-NEGOTIABLE)

When triggered, the kill-switch:

1. **Sets engaged flag** to `true` in `/.atlas-gate/kill_switch.json`
2. **Records trigger reason**, failure IDs, and invariant IDs
3. **Persists state** to disk immediately (survives process crashes)
4. **Blocks ALL non-read tools** from execution
5. **Allows only read-only tools** for forensic access

### Trigger Conditions

Kill-switch engages when:

- **Critical invariant breach** detected (F-STARTUP, F-POLICY, F-AUDIT, etc)
- **Audit tamper** detected (hash chain broken, entry corrupted)
- **Operator abuse** threshold exceeded
- **Explicit human invocation** (OWNER role only, requires acknowledgement)

### Startup Gate Enforcement

Before serving ANY tool, startup must:

1. Check if kill-switch is engaged
2. If engaged: only allow read-only tools
3. If engaged: refuse all write/mutation tools
4. If engaged: display HALT_REPORT path and recovery status

### Implementation

Defined in: `core/kill-switch.js`

```javascript
export function engageKillSwitch(workspaceRoot, config = {}) {
  const state = new KillSwitchState({
    engaged: true,
    timestamp: new Date().toISOString(),
    trigger_failure_ids: config.failure_ids,
    trigger_invariant_ids: config.invariant_ids,
    trigger_reason: config.trigger_reason,
    // ...
  });

  saveKillSwitchState(workspaceRoot, state);
  return { engaged: true, state, message: "..." };
}
```

---

## 3. Safe-Halt Protocol

When a critical failure is detected, the system executes a safe-halt routine:

### Routine

1. **Flush audit buffers** to disk (fsync)
2. **Verify audit integrity** (hash chain check)
3. **Generate HALT_REPORT** with:
   - What failed (failure IDs, invariant IDs)
   - Why (root cause, trigger reason)
   - What is safe to do (read-only operations)
   - What is forbidden (all mutations)
4. **Write report to disk** at `docs/reports/HALT_REPORT_<timestamp>.md`
5. **Append audit entry** documenting the halt
6. **Return halt evidence** (audit status, timestamps)

### HALT REPORT Structure

```markdown
# HALT REPORT

**Generated:** <ISO timestamp>

## What Failed
- Failure IDs: F-AUDIT, F-SECURITY
- Invariant IDs: INV_AUDIT_INTEGRITY, INV_SECURITY_TAMPER

## Why the System Halted
[Explanation of root cause and why system cannot continue safely]

## What is Safe to Do Next
✓ Read audit log
✓ Read plan files
✓ Read workspace files
✓ Run verification tools (read-only)

## What is Explicitly FORBIDDEN
✗ Writing to workspace
✗ Creating plans
✗ Executing plans
✗ Any state mutation

## Recovery Path
1. Read full audit log
2. Investigate root cause
3. Fix underlying issue
4. Acknowledge halt report (OWNER only)
5. Run required verifications
6. Unlock kill-switch
```

### Implementation

Defined in: `core/safe-halt.js`

---

## 4. Failure Simulation Harness

For testing (not production), the system supports deterministic failure injection.

### Modes

- `SIMULATION_MODE.DISABLED` - No failures injected (production default)
- `SIMULATION_MODE.TEST` - Single-run test mode
- `SIMULATION_MODE.DRILL` - Drill execution mode

### Simulable Failures

```javascript
export const SIMULABLE_FAILURES = {
  AUDIT_WRITE_FAILURE: "audit_write_failure",
  AUDIT_HASH_MISMATCH: "audit_hash_mismatch",
  POLICY_ENGINE_CRASH: "policy_engine_crash",
  REPLAY_DIVERGENCE: "replay_divergence",
  OPERATOR_FATIGUE_BREACH: "operator_fatigue_breach",
  FILESYSTEM_PERMISSION_DENIED: "filesystem_permission_denied",
  PLAN_HASH_MISMATCH: "plan_hash_mismatch",
  STARTUP_GATE_FAILURE: "startup_gate_failure"
};
```

### Usage

```javascript
// Initialize simulation
initializeSimulation(SIMULATION_MODE.DRILL, "deterministic-seed");

// Inject failure
injectFailure(SIMULABLE_FAILURES.AUDIT_WRITE_FAILURE);

// Execute
try {
  simulateAuditWriteFailure(); // Throws if failure injected
} catch (err) {
  // Handle simulated failure
}

// Finalize and get results
const results = finalizeSimulation();
```

### Implementation

Defined in: `core/failure-simulation.js`

---

## 5. Named Drills

Drills are read-only tools that execute simulations with full auditability.

### Available Drills

1. **drill_audit_tamper** - Simulate audit write failure + hash mismatch
2. **drill_policy_breach** - Simulate policy engine crash
3. **drill_plan_hash_mismatch** - Simulate plan file hash mismatch
4. **drill_operator_abuse** - Simulate operator fatigue threshold breach
5. **drill_filesystem_denial** - Simulate filesystem permission denied

### Drill Properties

Each drill:

- ✓ Triggers correct failure simulation
- ✓ Engages kill-switch (if CRITICAL)
- ✓ Produces HALT_REPORT
- ✓ Appends audit entries
- ✓ Returns evidence (simulation results, audit status)
- ✓ Is deterministic (same seed = same results)
- ✓ Is repeatable (can run multiple times)
- ✓ Is auditable (leaves full audit trail)

### Running a Drill

```javascript
const result = await drillAuditTamper(
  workspaceRoot,
  sessionId,
  role // "ANTIGRAVITY" or "WINDSURF"
);

// Result contains:
// - drill_name
// - timestamp
// - simulation_state (injected failures)
// - failure_triggered
// - kill_switch_engaged
// - halt_report_path
// - audit_entries
// - evidence
```

### Implementation

Defined in: `core/drills.js`

---

## 6. Recovery Gate

Recovery is human-only, structured, and requires explicit acknowledgement.

### Recovery Requirements

1. **OWNER role only** - Non-OWNER operators cannot unlock
2. **Explicit halt report reference** - Must cite the specific HALT_REPORT
3. **Structured acknowledgement** - Must confirm understanding:
   - ✓ Understand the failure reason
   - ✓ Understand what failed
   - ✓ Understand forbidden operations
   - ✓ Acknowledge personal responsibility
4. **Two-step confirmation** - Must complete both steps:
   - Step 1: Initiate acknowledgement (returns confirmation code)
   - Step 2: Confirm with valid code
5. **Recovery verification** - Must pass all verifications:
   - ✓ audit_verify (audit log integrity)
   - ✓ plan_lint (plan files valid)
   - ✓ maturity_recompute (maturity score recalculated)

### Recovery Flow

#### Step 1: Initiate

```javascript
const step1 = initiateRecoveryAcknowledgement({
  role: "OWNER",
  operator: "alice@company.com",
  halt_report_path: "docs/reports/HALT_REPORT_2026-01-19T06-24-22Z.md",
  understood_reason: true,
  understood_what_failed: true,
  understood_forbidden_ops: true,
  responsibility_acknowledged: true
});

// Returns: { step_one_confirmed: true, confirmation_code: "abc123..." }
```

#### Step 2: Confirm

```javascript
const step2 = confirmRecovery(null, {
  role: "OWNER",
  halt_report_path: "docs/reports/HALT_REPORT_2026-01-19T06-24-22Z.md",
  confirmation_code: step1.confirmation_code,
  understood_reason: true,
  understood_what_failed: true,
  understood_forbidden_ops: true,
  responsibility_acknowledged: true
});

// Returns: { step_two_confirmed: true }
```

#### Step 3: Verify & Unlock

```javascript
// Run verifications (must all pass)
runAuditVerification();
runPlanLinting();
recomputeMaturityScore();

// Then unlock
const unlock = await unlockKillSwitch(
  workspaceRoot,
  sessionId,
  "OWNER",
  { operator: "alice@company.com", halt_report_path: "..." }
);

// Returns: { unlocked: true, message: "Kill-switch cleared" }
```

### Verification Status

Before unlocking, check:

```javascript
const status = getRecoveryStatus(workspaceRoot);
// {
//   kill_switch_engaged: true/false,
//   verifications_required: ["audit_verify", "plan_lint", "maturity_recompute"],
//   verifications_passed: ["audit_verify"],
//   verifications_pending: ["plan_lint", "maturity_recompute"],
//   ready_for_unlock: false
// }
```

### Implementation

Defined in: `core/recovery-gate.js`

---

## 7. Audit & Attestation Integration

### Audit Trail

Kill-switch events are recorded in the audit log:

```json
{
  "ts": "2026-01-19T06:24:22Z",
  "seq": 42,
  "prev_hash": "abc...",
  "entry_hash": "def...",
  "session_id": "session-123",
  "role": "WINDSURF",
  "tool": "drill_audit_tamper",
  "result": "drill_completed",
  "invariant_id": "INV_AUDIT_INTEGRITY",
  "notes": "Kill-switch engagement drill: verified kill-switch engagement"
}
```

### Forensic Replay

Drills and recovery attempts are fully replay-verifiable:

```javascript
const replay = await replayExecution({
  plan_hash: "<drill-plan-hash>",
  tool: "drill_audit_tamper",
  seq_start: 40,
  seq_end: 50
});
```

### Attestation Bundle

Attestation bundles reflect halt state:

```json
{
  "workspace_state": {
    "kill_switch_engaged": true,
    "halt_report_path": "docs/reports/HALT_REPORT_2026-01-19T06-24-22Z.md",
    "recovery_status": "PENDING_VERIFICATION"
  },
  "audit_chain": { ... },
  "failure_evidence": { ... }
}
```

### Maturity Score

During halt, maturity score is capped:

```javascript
// Before halt: score = 85
// After halt (engaged): score = 0 (capped)
// After recovery (verified): score = 85 (restored)
```

---

## 8. Non-Coder Explanation

### What is a Kill-Switch?

A kill-switch is a safety mechanism. Like an emergency stop button on machinery:

- **Normal operation**: Everything runs normally
- **Emergency detected**: Hit the emergency stop
- **System state after stop**: Motors off, no movement, safe state
- **Before restart**: Inspect what went wrong, fix it, restart

### Why Do We Need It?

The MCP system manages important operations. If something goes critically wrong (like corruption of the audit log), we can't trust the system to keep running. The kill-switch:

1. **Stops immediately** - No more writes or operations
2. **Prevents further damage** - Can't make things worse
3. **Preserves evidence** - All audit logs intact for investigation
4. **Forces human review** - Person must approve restart

### When Does It Trigger?

- Audit log corruption detected
- Critical file missing or corrupted
- Policy violation detected
- System detects tampering
- Operator abuse patterns detected

### What Can I Do When It's Engaged?

You can:
- ✓ Read the audit log (see what happened)
- ✓ Read workspace files
- ✓ Read the HALT_REPORT
- ✓ Run verification tools
- ✓ Investigate the root cause

You cannot:
- ✗ Write to files
- ✗ Create plans
- ✗ Execute plans
- ✗ Modify any state

### How Do I Fix It?

1. **Read the HALT_REPORT** - Understand what failed
2. **Investigate** - Use read-only tools to understand the problem
3. **Fix the root cause** - Address the underlying issue
4. **Acknowledge** - Confirm you understand the problem (OWNER role)
5. **Verify** - Run verification checks
6. **Unlock** - Clear the kill-switch

The system requires **human acknowledgement** because only a human can decide if it's safe to restart.

---

## 9. Test Coverage

### Test Suite: `test-catastrophic-failure.js`

20 comprehensive tests covering:

1. ✓ Failure taxonomy complete
2. ✓ Kill-switch engagement
3. ✓ Kill-switch persistence
4. ✓ Non-read tools refused
5. ✓ Read-only tools allowed
6. ✓ HALT_REPORT generation
7. ✓ HALT_REPORT disk write
8. ✓ Safe-halt protocol
9. ✓ Recovery gate OWNER requirement
10. ✓ Recovery gate acknowledgement
11. ✓ Two-step confirmation
12. ✓ Recovery code validation
13. ✓ Simulation initialization
14. ✓ Failure injection
15. ✓ Simulation finalization
16. ✓ Drill availability
17. ✓ Critical failure detection
18. ✓ Recovery status retrieval
19. ✓ Kill-switch clearance
20. ✓ Halt report listing

**Run tests:**

```bash
node test-catastrophic-failure.js
```

**Expected output:**

```
=== CATASTROPHIC FAILURE & KILL-SWITCH TESTS ===

✓ [20 passing tests]

=== TEST SUMMARY ===
Passed: 20
Failed: 0
Total: 20
```

---

## 10. Implementation Files

| File | Purpose | Lines |
|------|---------|-------|
| `core/failure-taxonomy.js` | Failure definitions | ~150 |
| `core/kill-switch.js` | Kill-switch logic & persistence | ~250 |
| `core/safe-halt.js` | Safe-halt protocol & reporting | ~200 |
| `core/failure-simulation.js` | Test failure injection | ~300 |
| `core/drills.js` | Named drill implementations | ~350 |
| `core/recovery-gate.js` | Recovery acknowledgement & unlock | ~320 |
| `test-catastrophic-failure.js` | Comprehensive test suite | ~400 |

**Total LOC:** ~1,970 lines

---

## 11. Verification Gates

All implementations pass:

- ✓ **Lint** - ESLint + syntax checks
- ✓ **Tests** - 20 passing tests
- ✓ **Security** - No hardcoded credentials
- ✓ **Audit** - All operations recorded
- ✓ **Determinism** - Drills produce deterministic results

---

## 12. Known Limitations

1. **Single kill-switch per workspace** - Cannot have multiple independent kill-switches
2. **Recovery requires disk write access** - Cannot recover if filesystem is read-only
3. **HALT_REPORT is advisory** - Human must still read and understand it
4. **No automatic recovery** - System requires explicit human acknowledgement
5. **Verification tools must be trusted** - Verification results depend on integrity of verification tools themselves

---

## 13. Future Enhancements

1. **Graceful degradation levels** - HALT vs DEGRADED vs REFUSE responses
2. **Operator role levels** - Different recovery authority levels
3. **Automated email alerts** - Notify operators of kill-switch engagement
4. **Rollback capability** - Auto-revert to last known-good state
5. **Machine learning** - Predict failures before kill-switch needed
6. **Multi-region kill-switch** - Coordinate across distributed systems

---

## 14. References

- [GLOBAL_INVARIANTS.md](../GLOBAL_INVARIANTS.md) - Core invariants
- [ENGINEERING_STANDARDS.md](../ENGINEERING_STANDARDS.md) - Code standards
- [audit-system.js](../core/audit-system.js) - Audit implementation
- [startup-audit.js](../core/startup-audit.js) - Startup enforcement

---

**End of Specification**

Document Version: 1.0  
Last Updated: 2026-01-19  
Approved By: Engineering Leadership  
Status: PRODUCTION READY
