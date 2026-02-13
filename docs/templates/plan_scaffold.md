<!--
ATLAS-GATE_PLAN_HASH: placeholder
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->

# Plan Metadata

Plan ID: PLAN_[FEATURE_NAME]_V1
Version: 1.0
Author: ANTIGRAVITY
Status: APPROVED
Timestamp: [ISO 8601 format, e.g., 2026-02-14T14:30:00Z]
Governance: ATLAS-GATE-v1

---

# Scope & Constraints

Objective: [Clear, measurable goal. What exactly are we building?]

Affected Files:
- [path/to/file1.js]: [What changes]
- [path/to/file2.js]: [What changes]
- [path/to/test.js]: [What changes]

Out of Scope:
- [What explicitly will NOT be changed]
- [To avoid scope creep]

Constraints:
- MUST [requirement 1]
- MUST [requirement 2]
- MUST NOT [forbidden action 1]
- MUST NOT [forbidden action 2]

---

# Phase Definitions

## Phase: PHASE_IMPLEMENTATION

Phase ID: PHASE_IMPLEMENTATION
Objective: Implement all specified changes with complete testing and validation
Allowed operations: CREATE, MODIFY
Forbidden operations: DELETE
Required intent artifacts: Code implementation, Unit tests, Documentation
Verification commands: npm run test && npm run lint
Expected outcomes: All tests pass, all files created/modified per spec, zero lint errors
Failure stop conditions: Test failure, Lint error, File outside allowlist, Syntax error

---

# Path Allowlist

- src/
- tests/
- docs/

---

# Verification Gates

## Gate 1: Code Quality
Trigger: After all files written
Check: npm run test && npm run lint
Required: Exit code 0 (both commands succeed)
Failure action: REJECT and ROLLBACK

## Gate 2: Workspace Integrity
Trigger: Before approval
Check: Verify no files modified outside Path Allowlist
Required: Zero violations reported
Failure action: REJECT

---

# Forbidden Actions

Actions STRICTLY PROHIBITED during execution:

- MUST NOT execute arbitrary shell commands
- MUST NOT modify files outside Path Allowlist
- MUST NOT delete files
- MUST NOT create symlinks or hardlinks
- MUST NOT write stub code (TODO, FIXME, XXX, HACK markers)
- MUST NOT write mock implementations
- MUST NOT write placeholder code
- MUST NOT skip verification commands
- MUST NOT write code with "// to be implemented" comments

---

# Rollback / Failure Policy

## Automatic Rollback Triggers
1. Any verification gate fails (test failure, lint error)
2. Hash mismatch detected during execution
3. File modified outside Path Allowlist
4. Syntax error in written code
5. Audit log entry missing after write

## Rollback Procedure
1. Execute: git checkout [all modified files]
2. Delete any newly created files
3. Run: git status (verify clean state)
4. Verify workspace matches pre-execution baseline
5. Create audit log entry documenting rollback

## Recovery Steps
1. Review failure logs and error output
2. Identify root cause (test failure, lint error, etc.)
3. Modify plan to address issue
4. Resubmit plan for linting and execution
