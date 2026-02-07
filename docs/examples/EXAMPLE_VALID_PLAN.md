<!--
ATLAS-GATE_PLAN_HASH: d8bb32317a7c1fa04b8203a75388afc6b58a9aa5cad210b85a3e826850b72112
ROLE: ANTIGRAVITY
STATUS: PENDING_APPROVAL
-->

# Plan Metadata

This plan establishes the Plan Linter system for the ATLAS-GATE MCP server. The linter ensures all subsequent plans meet strict requirements for structure, enforceability, and auditability.

---

# Scope & Constraints

All operations in this plan are scoped strictly to the ATLAS-GATE MCP server repository, specifically the following directories:
- `core/plan-linter.js` - Core linter implementation
- `test-plan-linter.js` - Test suite
- `docs/reports/` - Documentation and reports
- `tools/bootstrap_tool.js` - Bootstrap integration (pending next phase)
- `core/governance.js` - Approval integration (pending next phase)

Operations MUST NOT:
- Modify files outside the MCP server repository
- Execute arbitrary shell commands
- Delete files (CREATE and MODIFY only)
- Bypass linting requirements
- Create unapproved plans

---

# Phase Definitions

## Phase: CORE_IMPLEMENTATION
Phase ID: CORE_IMPL_PHASE

Objective: Implement the deterministic plan linter core module that validates plan structure, enforceability, and auditability.

Allowed operations: CREATE core/plan-linter.js, CREATE test-plan-linter.js

Forbidden operations: DELETE any file, MODIFY any files outside scope, EXECUTE arbitrary shell

Required intent artifacts: Plan Linter Specification (MCP_PLAN_LINTER_SPEC.md)

Verification commands: npm test && npm run verify && node test-plan-linter.js

Expected outcomes: All 14 tests pass, linter correctly identifies valid and invalid plans, hash computation deterministic

Failure stop conditions: Any test failure MUST trigger immediate rollback. Any verification failure MUST block completion.

---

## Phase: DOCUMENTATION_PHASE
Phase ID: DOC_PHASE

Objective: Create comprehensive specification and example documentation for the plan linting system.

Allowed operations: CREATE docs/reports/MCP_PLAN_LINTER_SPEC.md, CREATE docs/examples/EXAMPLE_VALID_PLAN.md, CREATE docs/reports/PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md

Forbidden operations: DELETE any file, MODIFY documentation outside scope

Required intent artifacts: Implementation report

Verification commands: Verify files exist and contain required sections

Expected outcomes: All documentation files created with complete coverage of linting rules and examples

Failure stop conditions: Missing required sections MUST block completion

---

## Phase: INTEGRATION_PREPARATION
Phase ID: INTEGRATION_PREP

Objective: Prepare for integration of linter into approval and execution gates (deferred to next phase).

Allowed operations: CREATE integration plan documentation

Forbidden operations: Modify production code, Delete files

Required intent artifacts: Integration strategy document

Verification commands: Review integration plan against linter API

Expected outcomes: Clear integration strategy documented for next phase

Failure stop conditions: Incomplete integration strategy MUST block sign-off

---

# Path Allowlist

- core/plan-linter.js
- test-plan-linter.js
- docs/reports/MCP_PLAN_LINTER_SPEC.md
- docs/reports/PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md
- docs/examples/
- tools/ (for future bootstrap_tool.js modifications)

---

# Verification Gates

All of the following commands MUST pass before plan execution proceeds:

- `node test-plan-linter.js` - Plan linter test suite (14 comprehensive tests) - MUST show 14 passed, 0 failed
- `npm test` - Full repository test suite - MUST show all tests passing
- `npm run verify` - Security and governance verification - MUST show zero violations
- Lint result: All tests MUST PASS, zero failures

Automated verification checks:
- Example plans MUST pass linting
- Invalid plans MUST be rejected by linter
- All 14 lint tests MUST pass

---

# Forbidden Actions

The following operations are explicitly forbidden and will BLOCK execution:

- DELETE operations (only CREATE and MODIFY permitted)
- Shell command execution outside of verification gates
- Modification of any file outside the allowlist
- Writing to parent directories (../../../...)
- Including absolute filesystem paths in configuration
- Approving plans that fail linting checks
- Creating plans with vague or ambiguous conditions

---

# Rollback / Failure Policy

The rollback procedure for this plan is deterministic and automated:

**On Test Failure**:
1. Revert all file changes to previous version
2. Restore original permissions and timestamps
3. Document failure in audit log with error code and line number
4. Block any further execution attempts
5. Require explicit human review before retry

**On Verification Failure**:
1. Immediate rollback of all changes
2. Run full repository verify suite to ensure no corruption
3. Report failure to audit trail with diagnostic information
4. Do not proceed until root cause is resolved

**Recovery Procedure**:
1. Fix identified errors in plan or code
2. Increment plan version
3. Resubmit for linting
4. Only proceed after full linting passes

---

# Notes for Approvers

This plan implements deterministic plan linting, a foundational governance system for the ATLAS-GATE MCP server.

**Key Invariants Enforced**:
- `PLAN_SCOPE_LAW` - Structure and path validation
- `MECHANICAL_LAW_ONLY` - Enforceability (binary language)
- `PUBLIC_LAW_READABLE` - Non-coder auditability
- `PLAN_IMMUTABILITY` - Hash binding and integrity

**Testing Coverage**: 14 comprehensive tests validate all lint rules and edge cases.

**Integration**: Phase is foundation-only. Integration into bootstrap/approval/execution gates is deferred to next phase with separate plan.

**Non-Coder Readability**: All objectives, outcomes, and failure conditions are written in plain English. No code symbols in critical sections.
