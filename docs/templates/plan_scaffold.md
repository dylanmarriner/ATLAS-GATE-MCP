<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->

# Plan Metadata

Plan ID: PLAN_[FEATURE_NAME]_V1
Version: 1.0
Author: ANTIGRAVITY
Status: APPROVED
Timestamp: [ISO 8601, e.g., 2026-02-22T10:00:00Z]
Governance: ATLAS-GATE-v2

---

# Scope & Constraints

Objective: [Clear, measurable goal in plain English. No code symbols or backticks.]

Affected Files:
- [path/to/file1.js]: [Specific change description]
- [path/to/test.js]: [Specific change description]

Out of Scope:
- [Explicitly excluded changes]

Constraints:
- MUST [Requirement 1 - use binary language]
- MUST NOT [Forbidden action 1]

---

# Phase Definitions

## Phase: PHASE_IMPLEMENTATION

Phase ID: PHASE_IMPLEMENTATION
Objective: Implement specified changes with validation
Allowed operations: CREATE, MODIFY
Forbidden operations: DELETE
Required intent artifacts: Code, Tests, Documentation
Verification commands: [e.g., npm test]
Expected outcomes: [Success criteria]
Failure stop conditions: [When to halt]

---

# Path Allowlist

- [dir/]
- [path/to/file.js]

---

# Verification Gates

## Gate 1: [Gate Name]
Trigger: [When to run]
Check: [Command]
Required: Exit code 0 (success)
Failure: REJECT and ROLLBACK

---

# Forbidden Actions

- MUST NOT modify files outside Path Allowlist
- MUST NOT delete files
- MUST NOT write stub code (TODO, FIXME, mock)
- MUST NOT skip verification commands

---

# Rollback / Failure Policy

## Automatic Rollback Triggers
1. Verification gate failure
2. File outside allowlist modified
3. Signature verification failure

## Rollback Procedure
1. git checkout [affected files]
2. Delete new files
3. Verify workspace state

## Recovery Steps
1. Review logs
2. Modify plan
3. Resubmit for linting and signing
