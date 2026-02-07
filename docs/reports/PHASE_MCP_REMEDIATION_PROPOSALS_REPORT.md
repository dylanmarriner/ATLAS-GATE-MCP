# MCP Remediation Proposals - Implementation Report

**Date**: 2026-01-19  
**Status**: COMPLETED  
**Specification**: PROMPT 08 - MCP REMEDIATION PROPOSALS (PROPOSE-ONLY)  
**Role**: WINDSURF (EXECUTABLE, read-only)

---

## Executive Summary

Implemented a complete propose-only remediation engine for the ATLAS-GATE MCP server. The system:

✅ **Generates evidence-bound proposals** from forensic findings, SystemError records, and audit entries  
✅ **Enforces human approval gate** — all proposals remain PENDING until explicit human decision  
✅ **Prevents code mutations** — no automatic fixes; approval only transitions status  
✅ **Audits every decision** — proposal generation, approval, and rejection recorded  
✅ **Supports 5 proposal types** — PLAN_CORRECTION, POLICY_EXCEPTION_REQUEST, INTENT_CORRECTION, EXECUTION_RETRY, INVESTIGATION_REQUIRED  
✅ **Passes all 12 tests** — comprehensive coverage of evidence-binding, immutability, audit trail

---

## Files Created

### Core Implementation (4 files)

| File | Purpose | Lines |
|------|---------|-------|
| `core/remediation-engine.js` | RemediationEngine + Proposal classes; evidence processing | 287 |
| `core/proposal-store.js` | Proposal persistence, parsing, status updates | 379 |
| `tools/generate-remediation-proposals.js` | MCP tool: generate proposals from evidence | 109 |
| `tools/list-proposals.js` | MCP tool: list proposals with filters | 48 |
| `tools/approve-proposal.js` | MCP tool: human approval gate | 133 |

### Tests (1 file)

| File | Purpose | Tests |
|------|---------|-------|
| `test-remediation-proposals.js` | Full test suite | 12 tests, 100% PASS |

### Documentation (1 file)

| File | Purpose |
|------|---------|
| `docs/reports/MCP_REMEDIATION_PROPOSAL_SPEC.md` | Complete specification; non-coder explanation; error codes; workflow example |

---

## Proposal Types Supported (Enum: 5)

### 1. PLAN_CORRECTION
Ambiguous or incomplete plan discovered during execution.  
Example: Invariant violation reveals missing phase ordering.

### 2. POLICY_EXCEPTION_REQUEST
Code violates policy but is justified (e.g., Rust unsafe code).  
Example: `unwrap()` is safe; needs plan exception.

### 3. INTENT_CORRECTION
Intent artifact violates schema or is incomplete.  
Example: Tool input missing required "authority" field.

### 4. EXECUTION_RETRY
Execution diverged (non-deterministic behavior).  
Example: Same args → different results on re-run.

### 5. INVESTIGATION_REQUIRED
Evidence insufficient or issue too complex.  
Example: Broken audit hash chain (potential tampering).

---

## Tools Implemented (3 read-only MCP tools)

### Tool: generate_remediation_proposals

**Inputs**:
```json
{
  "workspace_root": "/path",
  "plan_hash": "abc123...",
  "evidence_selectors": {
    "forensic_findings": [/* array of findings */],
    "system_errors": [/* array of SystemError */]
  }
}
```

**Outputs**:
```json
{
  "success": true,
  "proposals_generated": 3,
  "proposal_ids": ["PROP-abc", "PROP-def", "PROP-ghi"],
  "proposals": [...]
}
```

**Constraints**: Read-only. Writes only to docs/proposals/ and .atlas-gate/proposals-index.jsonl.

---

### Tool: list_proposals

**Inputs**:
```json
{
  "workspace_root": "/path",
  "filter": { "status": "PENDING", "proposal_type": "PLAN_CORRECTION" }
}
```

**Outputs**:
```json
{
  "success": true,
  "count": 2,
  "proposals": [...]
}
```

---

### Tool: approve_proposal

**Inputs**:
```json
{
  "workspace_root": "/path",
  "proposal_id": "PROP-abc123",
  "decision": "APPROVED",
  "approver_identity": "alice@company.com",
  "reason": "Acceptable risk"
}
```

**Outputs**:
```json
{
  "success": true,
  "proposal_id": "PROP-abc123",
  "decision": "APPROVED",
  "approved_by": "alice@company.com",
  "timestamp": "2026-01-19T10:15:00.000Z",
  "message": "Proposal approved. Ready for remediation execution (separate plan required)."
}
```

**Critical**: Transitions status ONLY. Does NOT apply changes.

---

## Evidence-Bound Rule (Enforced)

**INVARIANT**: Every proposed change maps directly to cited evidence.

Example of **valid** proposal:
```json
{
  "evidence_refs": ["sha256-finding-12345"],
  "violations_addressed": ["RUST_POLICY_VIOLATION"],
  "exact_changes_requested": [
    {
      "justification": "See forensic finding sha256-finding-12345"
    }
  ]
}
```

Example of **invalid** (rejected):
```json
{
  "evidence_refs": ["sha256-finding-12345"],
  "violations_addressed": ["EVERYTHING_SHOULD_BE_CHECKED"],  // ← Not in evidence!
  "exact_changes_requested": [...]
}
```

Error: `REMEDIATION_NOT_EVIDENCE_BOUND`

---

## Proposal Persistence

### Proposal Markdown File
**Location**: `docs/proposals/PROPOSAL_<proposal_id>.md`

Human-readable, structured for manual review + parsing.

```markdown
# Remediation Proposal: PROP-abc123

**Status**: PENDING
**Type**: PLAN_CORRECTION
**Created**: 2026-01-19T10:00:00.000Z

## Evidence
References:
- sha256-finding-12345

Violations Addressed:
- INVARIANT_VIOLATION

## Proposed Changes
Scope: `phase:01-compile`

Changes Requested:
```json
[...]
```

## Risk Assessment
**Level**: HIGH
...

## Verification Steps (Post-Apply)
- [ ] Run cargo build
- [ ] Verify no new warnings

## Validity
proposal is valid if plan_hash matches abc123...
```

### Proposal Index
**Location**: `.atlas-gate/proposals-index.jsonl` (append-only)

One JSON object per line:
```json
{"proposal_id":"PROP-abc","status":"PENDING","created_at":"2026-01-19..."}
```

### Approval Audit Log
**Location**: `.atlas-gate/proposal-approvals.jsonl` (append-only)

```json
{"timestamp":"2026-01-19T10:15:00.000Z","event":"PROPOSAL_STATUS_UPDATE","proposal_id":"PROP-abc","new_status":"APPROVED","approver":"alice@company.com"}
```

---

## Test Results (12/12 PASS)

All tests passed:

✅ **Test 1**: Proposal generated from forensic finding with evidence reference  
✅ **Test 2**: Proposal refused without evidence (REMEDIATION_NOT_EVIDENCE_BOUND)  
✅ **Test 3**: Proposal content is evidence-bound (refs map to evidence)  
✅ **Test 4**: Only allowed proposal types emitted  
✅ **Test 5**: Proposal file written correctly (markdown format)  
✅ **Test 6**: list_proposals returns all proposals with status  
✅ **Test 7**: approve_proposal records approval (timestamp, approver identity)  
✅ **Test 8**: Approval does NOT mutate code files  
✅ **Test 9**: Audit entry written on proposal generation  
✅ **Test 10**: Audit entry written on proposal approval  
✅ **Test 11**: Proposal status starts PENDING (immutable)  
✅ **Test 12**: Stale plan hash detected on approval  

**Run Command**: `node test-remediation-proposals.js`

---

## Fail-Closed Semantics

System rejects (throws) if:

| Error Code | Condition | Recovery |
|-----------|-----------|----------|
| `REMEDIATION_EVIDENCE_INSUFFICIENT` | Required evidence missing | Provide complete bundle |
| `REMEDIATION_NOT_EVIDENCE_BOUND` | Proposal refs missing evidence | Validate evidence map |
| `REMEDIATION_SCOPE_EXCEEDED` | Change outside proposal scope | Narrow scope or split |
| `REMEDIATION_STALE_PLAN` | Plan hash has changed | Generate new proposals |
| `PROPOSAL_NOT_FOUND` | Proposal ID not on disk | Verify proposal ID |
| `PROPOSAL_WRITE_FAILED` | I/O error writing | Check disk space |
| `INVALID_INPUT_TYPE` | Argument type mismatch | Verify input schema |

---

## Audit Trail Completeness

Every proposal action is audited:

**On Generation**:
```json
{
  "tool": "generate_remediation_proposals",
  "intent": "Generate proposals from evidence",
  "role": "EXECUTABLE",
  "result": "ok",
  "notes": "Generated PROP-abc PROP-def ..."
}
```

**On Approval/Rejection**:
```json
{
  "timestamp": "2026-01-19T10:15:00.000Z",
  "event": "PROPOSAL_STATUS_UPDATE",
  "proposal_id": "PROP-abc",
  "new_status": "APPROVED",
  "approver": "alice@company.com",
  "reason": "Looks good"
}
```

---

## Human Gate Rules

### Design Principles

1. **Propose-Only**: System generates proposals but never executes changes
2. **Human Decision**: Every proposal requires explicit human approval or rejection
3. **Immutable Status**: Once APPROVED/REJECTED, status cannot change (prevents flip-flopping)
4. **Audit Trail**: Approver identity + timestamp recorded for every decision
5. **Plan Hash Validation**: Proposals invalid if plan has changed (staleness detected)

### Approval Workflow

```
Human reviews proposal markdown
      ↓
   APPROVE or REJECT?
      ↓
   approve_proposal tool called
      ↓
   Status updated to APPROVED/REJECTED
   Timestamp + approver recorded
   Audit entry appended
      ↓
   Separate execution plan required to apply changes
   (No automatic fixes)
```

---

## Known Limitations

1. **Markdown Parsing**: Parser is regex-based (not AST). Works for well-formed markdown; edge cases may fail.
2. **Evidence Filtering**: Tool expects evidence pre-selected; does not query audit log directly.
3. **Proposal Immutability**: Once APPROVED, cannot revert without manual audit log edit (by design—fail-safe).
4. **Stale Detection**: Uses plan_hash; plan updates invalidate all prior proposals (conservative).

---

## Integration Points

### With Other Systems

- **Forensic Replay** (`core/replay-engine.js`): Consumes FINDING_CODES (TAMPER_*, DIVERGENCE_*, POLICY_VIOLATION_*)
- **SystemError** (`core/system-error.js`): Consumes error_code + invariant_id from tool failures
- **Audit System** (`core/audit-system.js`): Appends entries on proposal generation/approval
- **Plan Enforcer** (`core/plan-enforcer.js`): Validates plan hash to detect staleness

### MCP Tool Distribution

- **WINDSURF Only** (execution role):
  - `generate_remediation_proposals`
  - `list_proposals`
  - `approve_proposal`

- **Not available to ANTIGRAVITY** (planning role, no execution)

---

## Specification Document

Complete specification published at:

**File**: `docs/reports/MCP_REMEDIATION_PROPOSAL_SPEC.md`

Includes:
- Proposal lifecycle diagram
- All 5 proposal types detailed
- Complete schema (JSON format)
- Non-coder explanation (for project managers)
- Full API documentation
- Error codes + recovery strategies
- Real-world workflow example (Rust policy violation)
- Glossary

---

## Verification Commands

**Run full test suite**:
```bash
npm test  # Runs all test-*.js files including this one
```

**Run only remediation tests**:
```bash
node test-remediation-proposals.js
```

**Type checking** (if TypeScript available):
```bash
npx tsc --noEmit (optional, not currently required)
```

---

## Summary of Deliverables

| Deliverable | Status | Files |
|------------|--------|-------|
| Remediation engine (core) | ✅ Complete | `core/remediation-engine.js` |
| Proposal schema + generator | ✅ Complete | `core/remediation-engine.js`, `tools/generate-remediation-proposals.js` |
| Proposal persistence | ✅ Complete | `core/proposal-store.js` |
| Read-only MCP tools | ✅ Complete | `tools/{generate,list,approve}-*.js` |
| Human approval gate | ✅ Complete | `tools/approve-proposal.js` |
| Audit integration | ✅ Complete | Integrated with `core/audit-system.js` |
| Tests (≥10) | ✅ Complete | 12 tests, all PASS |
| Spec document | ✅ Complete | `docs/reports/MCP_REMEDIATION_PROPOSAL_SPEC.md` |
| This report | ✅ Complete | You are reading it |

---

## Next Steps (Not Included in This Phase)

These are separate concerns, requiring separate plans:

1. **Remediation Execution**: Tool that reads APPROVED proposals and applies fixes (separate plan/execution)
2. **Forensic Replay Integration**: Wire forensic findings → proposal generation (requires forensic system)
3. **Web UI**: Dashboard to review/approve proposals (separate UI project)
4. **Slack/Email Integration**: Notify approvers of pending proposals (separate notification system)
5. **Compliance Reporting**: Generate audit reports of all approved remediation (separate reporting module)

---

## Sign-Off

**Implementation**: WINDSURF (execution role)  
**Specification**: PROMPT 08 - MCP REMEDIATION PROPOSALS  
**Authority**: ATLAS-GATE MCP REMEDIATION PROPOSAL SYSTEM  
**Status**: READY FOR DEPLOYMENT  

All tests pass. All constraints enforced. Human gate operational. Audit trail complete.

---

**End of Report**
