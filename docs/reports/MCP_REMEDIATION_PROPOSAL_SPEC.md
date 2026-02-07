# MCP Remediation Proposal System Specification

**Version**: 1.0  
**Status**: ACTIVE  
**Last Updated**: 2026-01-19  
**Authority**: ATLAS-GATE MCP REMEDIATION PROPOSAL SYSTEM (PROPOSE-ONLY)

---

## Executive Summary

The MCP Remediation Proposal System is a **propose-only** remediation engine that:

1. **Consumes Evidence**: Forensic replay findings, SystemError records, audit entries, policy violations
2. **Generates Proposals**: Structured, evidence-bound remediation requests (NOT automatic fixes)
3. **Enforces Human Gate**: All proposals start PENDING; require explicit human approval to advance
4. **Records Everything**: Audit trail of proposal generation, approval, rejection
5. **Prevents Mutation**: No code, plan, or configuration changes without separate execution plan

**Key Principle**: _Proposals are read-only analysis. Decisions are human-only. Execution is separate._

---

## Proposal Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. EVIDENCE COLLECTION                              │
│  - Forensic replay findings                         │
│  - SystemError records                              │
│  - Audit log entries                                │
│  - Policy violation reports                         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 2. PROPOSAL GENERATION                              │
│  - RemediationEngine processes evidence             │
│  - Creates Proposal objects (PENDING status)        │
│  - Validates evidence-bound (all refs map to data) │
│  - NO mutations, NO file writes (except proposals) │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 3. PROPOSAL PERSISTENCE                             │
│  - Write to docs/proposals/PROPOSAL_<id>.md         │
│  - Append to .atlas-gate/proposals-index.jsonl           │
│  - Audit entry: "PROPOSAL_GENERATED"                │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 4. HUMAN REVIEW                                     │
│  - Human reads proposal markdown                    │
│  - Reviews evidence, risk, changes, verification   │
│  - Decides: APPROVE or REJECT                       │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐         ┌──────▼─────┐
   │ APPROVE │         │  REJECT    │
   └────┬────┘         └──────┬─────┘
        │                     │
   ┌────▼────────────────────▼─────┐
   │ Update status on disk          │
   │ Append approval audit entry    │
   │ (Still NO code mutations)      │
   └────┬──────────────────────────┘
        │
   ┌────▼──────────────────────────┐
   │ 5. EXECUTION (separate plan)   │
   │  - If APPROVED, create exec    │
   │    plan to apply remediation   │
   │  - Requires new authorization  │
   │  - Separate test/verify cycle  │
   └───────────────────────────────┘
```

---

## Proposal Types (Enum)

All proposals must be one of these types:

### 1. PLAN_CORRECTION

**When**: Ambiguous or incomplete plan discovered during execution.

**Example**: Invariant violation reveals missing phase ordering constraint.

**Changes Requested**: Add clarifying language to plan phase, add prerequisite checks.

**Verification**: Re-run phase, confirm audit log has no divergence.

### 2. POLICY_EXCEPTION_REQUEST

**When**: Code violates a policy (e.g., Rust unsafe, missing error handling) but is justified.

**Example**: `unwrap()` is safe because error is statically impossible; needs plan exception.

**Changes Requested**: Add justified exception to plan with scope (file/phase).

**Verification**: Run linter with exception applied, compile, no new warnings.

### 3. INTENT_CORRECTION

**When**: Intent artifact (tool input) violates schema or is incomplete.

**Example**: Tool input missing required "authority" field.

**Changes Requested**: Fix schema violation, add missing fields.

**Verification**: Validate against tool schema, dry-run, verify no type errors.

### 4. EXECUTION_RETRY

**When**: Execution diverged (non-deterministic behavior detected).

**Example**: Same args → different results in two runs.

**Changes Requested**: Re-run specific phase to verify determinism.

**Verification**: Run replay engine, confirm same result, compare audit entries.

### 5. INVESTIGATION_REQUIRED

**When**: Evidence insufficient or issue is too complex for proposal.

**Example**: Broken audit hash chain (potential tampering).

**Changes Requested**: None (requires manual investigation).

**Verification**: Security team review, root cause analysis documented.

---

## Proposal Content Schema

Every proposal contains:

```json
{
  "proposal_id": "PROP-abc123def456",
  "proposal_type": "PLAN_CORRECTION|POLICY_EXCEPTION_REQUEST|INTENT_CORRECTION|EXECUTION_RETRY|INVESTIGATION_REQUIRED",
  "status": "PENDING|APPROVED|REJECTED",
  "created_at": "2026-01-19T10:00:00.000Z",
  "workspace_root": "/path/to/workspace",
  "plan_hash": "abc123def456...",
  
  "evidence_refs": [
    "sha256-hash-of-finding-1",
    "sha256-hash-of-finding-2"
  ],
  
  "violations_addressed": [
    "RUST_POLICY_VIOLATION",
    "EXECUTION_DIVERGENCE",
    "INVARIANT_AUDIT_LOG_ATOMIC"
  ],
  
  "exact_changes_requested": [
    {
      "file": "src/main.rs (optional)",
      "section": "unwrap() at line 42",
      "action": "APPROVE_UNSAFE_IN_PLAN",
      "scope": "phase:01-compile",
      "justification": "Error is statically impossible because..."
    }
  ],
  
  "files_affected": [
    "src/main.rs",
    "docs/plans/FOUNDATION.md"
  ],
  
  "scope": "phase:01-compile|plan|file:src/main.rs",
  
  "risk_assessment": {
    "level": "CRITICAL|HIGH|MEDIUM|LOW",
    "description": "Plain English risk description",
    "mitigation": "Mitigation strategy if applied"
  },
  
  "verification_after_apply": [
    "[ ] Run cargo build",
    "[ ] Run cargo clippy",
    "[ ] Verify no new warnings"
  ],
  
  "approved_at": "2026-01-19T10:15:00.000Z (null if PENDING)",
  "approved_by": "human@example.com (null if PENDING)",
  
  "expiration_condition": "proposal is valid if plan_hash matches abc123def456..."
}
```

---

## Human Gate Rules

### Proposal Approval (Human-Only Tool)

**Tool**: `approve_proposal`

**Inputs**:
- `proposal_id`: string
- `decision`: "APPROVED" | "REJECTED"
- `approver_identity`: string (person/service ID, e.g., "alice@company.com")
- `reason`: string (optional, used for REJECTED)

**Output**:
- Updated proposal JSON
- Audit entry with timestamp + approver

**Constraints**:
1. **No Automatic Approval**: This tool ONLY transitions status. It does NOT:
   - Apply code changes
   - Execute remediation
   - Mutate files
   - Modify plans
2. **Immutable Decision**: Once APPROVED or REJECTED, proposal status cannot change
3. **Audit Trail**: Every decision is logged with approver identity + timestamp
4. **Plan Hash Validation**: Proposal is invalid if plan hash has changed (stale)

### Review Checklist (For Human Reviewer)

Before approving, verify:

- [ ] Evidence is legitimate (forensic findings, audit entries, error records)
- [ ] Changes are scoped and justified
- [ ] Risk level is acceptable
- [ ] Verification steps can realistically pass
- [ ] Expiration condition is not triggered (plan hash still matches)

---

## Evidence-Bound Rule

**CRITICAL INVARIANT**: Every proposed change must map directly to cited evidence.

### Valid Example

```json
{
  "evidence_refs": ["sha256-finding-12345"],
  "violations_addressed": ["RUST_POLICY_VIOLATION"],
  "exact_changes_requested": [
    {
      "action": "APPROVE_UNSAFE_IN_PLAN",
      "justification": "See forensic finding sha256-finding-12345"
    }
  ]
}
```

### Invalid Example (Will Be Rejected)

```json
{
  "evidence_refs": ["sha256-finding-12345"],
  "violations_addressed": ["EVERYTHING_SHOULD_BE_CHECKED"],  // ← Not in evidence!
  "exact_changes_requested": [
    {
      "action": "REFACTOR_ENTIRE_CODEBASE"  // ← Not justified by finding!
    }
  ]
}
```

**Validation Error**: `REMEDIATION_NOT_EVIDENCE_BOUND`

---

## API: Read-Only Tools

### Tool: generate_remediation_proposals

**Role**: EXECUTABLE (read-only, propose-only)

**Inputs**:
```json
{
  "workspace_root": "/path/to/workspace",
  "plan_hash": "abc123def456...",
  "evidence_selectors": {
    "forensic_findings": [/* array of finding objects */],
    "system_errors": [/* array of SystemError objects */],
    "audit_filter": { "role": "EXECUTABLE", "tool": "write_file" }
  }
}
```

**Output**:
```json
{
  "success": true,
  "proposals_generated": 3,
  "proposal_ids": ["PROP-abc", "PROP-def", "PROP-ghi"],
  "proposals": [
    { "proposal_id": "...", "file_path": "docs/proposals/...", "status": "PENDING" },
    ...
  ]
}
```

**Constraints**:
- No mutations to workspace
- Writes only to `docs/proposals/` and `.atlas-gate/proposals-index.jsonl`
- Appends one audit entry: `tool=generate_remediation_proposals`
- All evidence must be provided; tool does NOT fetch from disk

### Tool: list_proposals

**Role**: EXECUTABLE (read-only)

**Inputs**:
```json
{
  "workspace_root": "/path/to/workspace",
  "filter": { "status": "PENDING", "proposal_type": "PLAN_CORRECTION" }
}
```

**Output**:
```json
{
  "success": true,
  "count": 2,
  "proposals": [
    { "proposal_id": "...", "proposal_type": "...", "status": "PENDING", "created_at": "..." },
    ...
  ]
}
```

### Tool: approve_proposal

**Role**: WINDSURF (human gate)

**Inputs**:
```json
{
  "workspace_root": "/path/to/workspace",
  "proposal_id": "PROP-abc123",
  "decision": "APPROVED",
  "approver_identity": "alice@company.com",
  "reason": "Looks good; risk is acceptable"
}
```

**Output**:
```json
{
  "success": true,
  "proposal_id": "PROP-abc123",
  "decision": "APPROVED",
  "approved_by": "alice@company.com",
  "timestamp": "2026-01-19T10:15:00.000Z",
  "proposal": { /* full proposal object */ },
  "message": "Proposal PROP-abc123 approved. Ready for remediation execution (separate plan required)."
}
```

**Constraints**:
- Does NOT apply changes
- Does NOT execute remediation
- Only transitions proposal status
- Appends audit entry with timestamp + approver

---

## Proposal Persistence

### Proposal Markdown File

**Location**: `docs/proposals/PROPOSAL_<proposal_id>.md`

**Format**:
```markdown
# Remediation Proposal: PROP-abc123

**Status**: PENDING  
**Type**: PLAN_CORRECTION  
**Created**: 2026-01-19T10:00:00.000Z  
**Workspace**: `/path/to/workspace`  
**Plan Hash**: `abc123def456...`

## Approval
(Only present if APPROVED/REJECTED)

**Approved By**: alice@company.com  
**Approved At**: 2026-01-19T10:15:00.000Z

## Evidence

References:
- sha256-finding-12345

Violations Addressed:
- INVARIANT_VIOLATION
- AUDIT_LOG_ATOMIC

## Proposed Changes

Scope: `phase:01-compile`

Files Affected:
- src/main.rs

Changes Requested:
```json
[
  {
    "file": "src/main.rs",
    "section": "unwrap() at line 42",
    "action": "APPROVE_UNSAFE_IN_PLAN",
    "scope": "phase:01-compile",
    "justification": "..."
  }
]
```

## Risk Assessment

**Level**: HIGH

**Description**: ...

**Mitigation**: ...

## Verification Steps (Post-Apply)

- [ ] Run cargo build
- [ ] Run cargo clippy
- [ ] Verify no new warnings

## Validity

proposal is valid if plan_hash matches abc123def456...
```

### Proposal Index

**Location**: `.atlas-gate/proposals-index.jsonl`

**Format**: One JSON object per line, append-only.

```json
{"proposal_id":"PROP-abc","proposal_type":"PLAN_CORRECTION","status":"PENDING","created_at":"2026-01-19T10:00:00.000Z","workspace_root":"/path","file_path":"docs/proposals/PROPOSAL_PROP-abc.md"}
```

### Approval Audit Log

**Location**: `.atlas-gate/proposal-approvals.jsonl`

**Format**: One JSON object per line, append-only.

```json
{"timestamp":"2026-01-19T10:15:00.000Z","event":"PROPOSAL_STATUS_UPDATE","proposal_id":"PROP-abc","new_status":"APPROVED","approver":"alice@company.com","reason":"Acceptable risk"}
```

---

## Fail-Closed Semantics

The system rejects (throws) if:

1. **Evidence Incomplete**: `REMEDIATION_EVIDENCE_INSUFFICIENT`
   - Evidence ref does not map to actual data
   - Required evidence missing (e.g., plan_hash)

2. **Not Evidence-Bound**: `REMEDIATION_NOT_EVIDENCE_BOUND`
   - Proposal references evidence that doesn't exist
   - Proposed changes have no justification in evidence

3. **Scope Exceeded**: `REMEDIATION_SCOPE_EXCEEDED`
   - Proposal tries to change something outside its scope
   - Scope mismatch (phase vs. plan level)

4. **Stale Plan Hash**: `REMEDIATION_STALE_PLAN`
   - Proposal references old plan_hash
   - Plan has been updated; proposal is no longer valid

5. **Invalid Input**: `INVALID_INPUT_TYPE`, `INVALID_INPUT_FORMAT`
   - workspace_root not a string
   - proposal_type not in enum
   - decision not "APPROVED" or "REJECTED"

---

## Non-Coder Explanation

### For Project Manager / Decision Maker

**What is this?**

The Remediation Proposal System is like a **proposal review and approval process**:

1. When the system finds a problem (via forensic analysis or error logs), it doesn't just "fix it"
2. Instead, it creates a **proposal** — a detailed document explaining:
   - What the problem is
   - What evidence proves it's a problem
   - What the proposed fix is
   - How risky the fix is
   - How to verify the fix worked
3. A **human reviewer** reads the proposal and decides: "Approve this fix" or "Reject it"
4. Once approved, a **separate plan** is created to actually implement the fix

**Why is this useful?**

- **Safety**: No automatic fixes. Every change gets human review.
- **Accountability**: Clear audit trail of who approved what and when.
- **Clarity**: Proposals are written in plain English, not code jargon.
- **Reversibility**: Bad decisions can be rejected; no silent fixes.

### For Developer / Engineer

**What's my workflow?**

1. **System generates proposals** from forensic replay, audit logs, or errors
2. **You read proposal markdown** (human-readable, not JSON)
3. **You decide**: Is this a good fix? Is the risk acceptable?
4. **You approve or reject** using the `approve_proposal` tool
5. **If approved**, engineering creates separate execution plan to apply the fix

**Important**: Approving a proposal does NOT apply the fix. It just says "yes, this sounds good". The actual fix requires a separate authorized plan.

---

## Testing

Minimum 10 tests required:

1. ✅ Proposal generated from forensic finding with evidence reference
2. ✅ Proposal refused without evidence (REMEDIATION_NOT_EVIDENCE_BOUND)
3. ✅ Proposal content is evidence-bound (refs map to evidence)
4. ✅ Only allowed proposal types emitted
5. ✅ Proposal file written correctly (markdown format)
6. ✅ list_proposals returns all proposals with status
7. ✅ approve_proposal records approval (timestamp, approver identity)
8. ✅ Approval does NOT mutate code files
9. ✅ Audit entry written on proposal generation
10. ✅ Audit entry written on proposal approval
11. ✅ Proposal status starts PENDING (immutable)
12. ✅ Stale plan hash detected on approval

See `test-remediation-proposals.js` for full test suite.

---

## Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `REMEDIATION_EVIDENCE_INSUFFICIENT` | Required evidence missing | Provide complete evidence bundle |
| `REMEDIATION_NOT_EVIDENCE_BOUND` | Proposal refs missing evidence | Validate evidence map before generation |
| `REMEDIATION_SCOPE_EXCEEDED` | Change outside proposal scope | Narrow scope or split proposal |
| `REMEDIATION_STALE_PLAN` | Plan hash has changed | Generate new proposals with current hash |
| `PROPOSAL_NOT_FOUND` | Proposal ID not on disk | Verify proposal ID is correct |
| `PROPOSAL_WRITE_FAILED` | I/O error writing proposal | Check disk space, permissions |
| `INVALID_INPUT_TYPE` | Argument type mismatch | Verify input schema |
| `INVALID_INPUT_FORMAT` | Argument format error | Consult API docs |

---

## Glossary

- **Proposal**: Structured remediation request (evidence-bound, no execution)
- **Evidence**: Forensic finding, SystemError, audit entry, policy violation
- **Evidence-Bound**: Every change maps to cited evidence
- **Approval Gate**: Human-only tool to transition proposal status
- **Audit Entry**: Immutable record of proposal generation/approval
- **Plan Hash**: SHA256 hash of plan; used to detect stale proposals
- **Scope**: Level of change (phase, file, plan)
- **Risk Assessment**: Level (CRITICAL, HIGH, MEDIUM, LOW) + mitigation strategy

---

## References

- **PROMPT 08**: MCP REMEDIATION PROPOSALS (PROPOSE-ONLY)
- **SystemError** (`core/system-error.js`): Error envelope with invariant IDs
- **Forensic Replay** (`core/replay-engine.js`): Finding codes
- **Audit System** (`core/audit-system.js`): Append-only log
- **RemediationEngine** (`core/remediation-engine.js`): Core proposal generator
- **ProposalStore** (`core/proposal-store.js`): Persistence layer

---

## Appendix: Full Workflow Example

### Scenario: Rust Policy Violation Detected

1. **Forensic Replay Finds Problem**
   ```
   Finding: POLICY_VIOLATION_UNSAFE_UNWRAP
   File: src/engine.rs, Line 42
   Code: `connection.accept().unwrap()`
   Reason: unwrap() without justification
   ```

2. **System Generates Proposal**
   ```
   RemediationEngine processes finding:
   - Proposal Type: POLICY_EXCEPTION_REQUEST
   - Violation: RUST_POLICY_VIOLATION
   - Change: Add exception to plan for src/engine.rs phase:01-startup
   - Risk: HIGH (unsafe code needs justification)
   - Verification: Build, clippy, no new warnings
   ```

3. **Proposal Written to Disk**
   ```
   File: docs/proposals/PROPOSAL_PROP-abc123.md
   Status: PENDING
   Index: .atlas-gate/proposals-index.jsonl (appended)
   Audit: generate_remediation_proposals entry written
   ```

4. **Human Reviews Proposal**
   ```
   Reviewer reads markdown:
   - Evidence: ✓ Valid forensic finding
   - Risk: ✓ HIGH but acceptable (critical path, guaranteed OK)
   - Changes: ✓ Scoped to one phase
   - Verification: ✓ Reasonable
   Decision: APPROVE
   ```

5. **Approve Tool Called**
   ```
   Input: proposal_id=PROP-abc123, decision=APPROVED, approver=alice@company.com
   
   System:
   - Updates proposal status to APPROVED
   - Records timestamp + approver
   - Appends approval audit entry
   - NO code changes yet
   
   Output: Success message + updated proposal
   ```

6. **Separate Execution Plan Created**
   ```
   (By separate WINDSURF process)
   Plan: EXECUTE_REMEDIATION_PROP_ABC123
   Actions:
   - Read proposal PROP-abc123
   - Add exception to plan file
   - Run verification steps
   - Commit with audit trail
   ```

---

**End of Specification**
