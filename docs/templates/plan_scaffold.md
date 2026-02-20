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
Timestamp: [ISO 8601 format, e.g., 2026-02-14T14:30:00Z]
Governance: ATLAS-GATE-v1

**Linting Status**: Will be validated by 7-stage linter (Structure, Phases, Paths, Enforceability, Auditability, Spectral, Cosign)

---

# Scope & Constraints

Objective: [Clear, measurable goal written in plain English. No code symbols, backticks, or technical jargon. Linter Stage 5 validates this is human-readable.]

Affected Files:
- [path/to/file1.js]: [What changes - specific, not vague]
- [path/to/file2.js]: [What changes - specific, not vague]
- [path/to/test.js]: [What changes - specific, not vague]

Out of Scope:
- [What explicitly will NOT be changed]
- [To avoid scope creep and ambiguity]

Constraints:
- MUST [requirement 1 - use binary language only]
- MUST [requirement 2 - no "may", "should", "optional", "try to"]
- MUST NOT [forbidden action 1]
- MUST NOT [forbidden action 2]

**Linter Validation**: Stage 4 checks for ambiguous language (may, should, try to, attempt to, optional). Stage 5 validates objectives are plain English.

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

**Linter Validation**: 
- Stage 1 checks phase section exists
- Stage 2 checks Phase ID is UPPERCASE_WITH_UNDERSCORES format and all required fields present (Objective, Allowed operations, Forbidden operations, Required intent artifacts, Verification commands, Expected outcomes, Failure stop conditions)
- Stage 6 (Spectral) validates phase format matches rules

---

# Path Allowlist

- src/
- tests/
- docs/

**Linter Validation**: 
- Stage 3 checks all paths are workspace-relative (no leading `/`)
- Stage 3 blocks parent directory escapes (`..`)
- Stage 3 blocks unresolved variables (`${...}`)

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

**Linter Validation**: 
- Stage 4 (Enforceability) scans for stub patterns: TODO, FIXME, XXX, HACK, stub, mock, placeholder, temp.*implementation, "to be implemented", "to be determined", tbd, wip
- Stage 4 checks for ambiguous language: may, should, if possible, optional, try to, attempt to
- Stage 4 blocks human judgment clauses: "use best judgment", "exercise judgment"

---

# Rollback / Failure Policy

## Automatic Rollback Triggers
1. Signature verification fails (WINDSURF can't verify plan integrity with cosign)
2. Any verification gate fails (test failure, lint error)
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
2. Identify root cause:
   - Signature verification failure: Plan file was modified or public key mismatch - check git history
   - Test failure or lint error: Code needs fixing, resubmit to linting
   - File outside allowlist: Plan scope violation, modify plan Path Allowlist
3. Modify plan to address issue
4. Resubmit plan for linting (runs all 7 stages: Structure, Phases, Paths, Enforceability, Auditability, Spectral, Cosign signing)
5. New signature generated: `ATLAS-GATE_PLAN_SIGNATURE: [new-url-safe-base64]`
6. Plan saved with new filename: `docs/plans/[new-signature].md`
7. WINDSURF executes with verified signature
