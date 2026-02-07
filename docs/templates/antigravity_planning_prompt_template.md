# ATLAS-GATE PLAN GENERATION TEMPLATE

This document is a **PROMPT TEMPLATE** for use by ANTIGRAVITY. It is NOT itself a plan.

When completing this template, you will generate an **actual implementation plan** that must pass linting via `lint_plan`.

---

## TEMPLATE INSTRUCTIONS

### OPERATOR INPUT SECTION

[OPERATOR: FILL ALL FIELDS BELOW - THESE ARE REQUIRED]

- Objective: [Describe the technical goal clearly and measurably]
- Target Files: [List specific file paths that will be modified or created]
- Plan ID: [Unique identifier, e.g., PLAN_AUTH_UPGRADE_v1]
- Timestamp: [Current date/time in ISO 8601 format, e.g., 2026-02-08T10:30:00Z]

**HALT CONDITION**: If any Operator Input is missing, HALT immediately and request it from the operator.

### GLOBAL HARD CONSTRAINTS

1. **REALITY LOCK (PROMPT 02)**: You are STRICTLY PROHIBITED from proposing stubs, mocks, placeholders, TODOs, or incomplete code. EVERY line of code MUST be production-ready.

2. **WRITE_FILE PARITY**: Every modification MUST be defined such that it can be passed to `mcp_atlas-gate-mcp_write_file` with clear `intent` and `role` metadata.

3. **EXHAUSTIVITY REQUIREMENT**: You MUST document all side effects, including error paths, cleanup procedures, and edge cases.

4. **NO AMBIGUOUS LANGUAGE**: Do NOT use words like "may", "should", "optional", "try to", "attempt to". Use ONLY binary language: MUST, MUST NOT, and imperative statements.

5. **DETERMINISTIC BEHAVIOR**: All operations MUST be deterministic and have predictable outcomes.

---

## OUTPUT PLAN STRUCTURE

Your generated plan MUST follow this exact structure:

### 1. YAML Frontmatter (Required)

```
---
status: APPROVED or DRAFT
plan_id: [From Operator Input]
timestamp: [From Operator Input]
scope:
  - [file_path_1]
  - [file_path_2]
governance: ATLAS-GATE-v1
---
```

### 2. Plan Metadata Section (Required)

```
# Plan Metadata

Plan ID: [From Operator]
Version: 1.0
Author: ANTIGRAVITY
Created: [From Operator]
Status: APPROVED or DRAFT
Governance: ATLAS-GATE-v1
```

### 3. Scope & Constraints Section (Required)

```
# Scope & Constraints

Objective: [State the goal from Operator Input]

Affected Files:
- [file_1]: [description of what will be done]
- [file_2]: [description of what will be done]

Out of Scope:
- [List what WILL NOT be changed]

Constraints:
- All changes MUST [requirement 1]
- All changes MUST [requirement 2]
- No [forbidden thing 1]
- No [forbidden thing 2]
```

### 4. Phase Definitions Section (Required)

You MUST define at least one phase. Example:

```
# Phase Definitions

## Phase: PHASE_IMPLEMENTATION

Phase ID: PHASE_IMPLEMENTATION

Objective: Implement all specified changes with complete testing and validation

Allowed operations: Create files, Modify files, Run tests, Execute verification commands

Forbidden operations: Delete files, Modify dependencies, Execute arbitrary commands

Required intent artifacts: Code implementation, Unit tests, Documentation, Verification output

Verification commands: npm run test, npm run lint

Expected outcomes: Files created/modified per scope, All tests pass, No errors

Failure stop conditions: Test fails, Lint errors, File outside scope modified, Syntax errors
```

**CRITICAL**: All Phase fields MUST use plain text (no markdown **bold** formatting).

### 5. Path Allowlist Section (Required)

```
# Path Allowlist

- src/
- tests/
- docs/
- package.json
- README.md
```

### 6. Verification Gates Section (Required)

```
# Verification Gates

Verification Gate 1: Code Quality
- Trigger: After implementation complete
- Check: Run full test suite and linting
- Required: MUST pass without errors
- Failure action: REJECT and ROLLBACK

Verification Gate 2: Workspace Integrity
- Trigger: Before approval
- Check: Verify no files outside allowlist modified
- Required: MUST report no violations
- Failure action: REJECT
```

### 7. Forbidden Actions Section (Required)

```
# Forbidden Actions

Actions STRICTLY PROHIBITED during plan execution:

- MUST NOT execute arbitrary shell commands
- MUST NOT modify files outside Path Allowlist
- MUST NOT create symlinks or hard links
- MUST NOT access environment variables without explicit allowlist
- MUST NOT make network requests
- MUST NOT fork or spawn child processes
- MUST NOT write to files with absolute paths
- MUST NOT use sudo or privilege escalation
- MUST NOT write stub code, TODOs, or placeholders
- MUST NOT skip testing or verification steps
```

### 8. Rollback / Failure Policy Section (Required)

```
# Rollback / Failure Policy

Automatic Rollback Triggers:
1. Any verification gate fails
2. Syntax error detected in code
3. Test failure occurs
4. Workspace integrity violation
5. File outside allowlist modified

Rollback Procedure:
1. Use `git checkout` to revert all modified files
2. Delete any newly created files
3. Verify workspace matches pre-execution state
4. Generate rollback audit log entry

Recovery Steps:
1. Review failure logs and error messages
2. Identify root cause of failure
3. Modify implementation to address issue
4. Re-submit plan for approval
```

### 9. Hash Footer (Required)

At the end of your plan, you MUST include:

```
[BLAKE3_HASH: aeb41114559a6c480b2750d5c8df73806b5bcfc9627a66b3e9f67a0cd1ba4ff2]
```

The linter will compute the actual hash and insert it. This creates a self-referential hash that enables integrity verification.

---

## COMPLETENESS CHECKLIST

Before submitting your generated plan, VERIFY all of the following:

- ✓ NO partial implementation, TODOs, or FIXMEs anywhere
- ✓ NO mock code, stubs, or placeholder implementations
- ✓ YAML frontmatter present with valid timestamp and plan_id
- ✓ All 8 required sections present and properly formatted
- ✓ Phase ID in uppercase alphanumeric + underscore (e.g., PHASE_IMPLEMENTATION)
- ✓ All phase fields are plain text (no markdown formatting)
- ✓ All language is binary (MUST, MUST NOT) with no ambiguous words
- ✓ Path Allowlist specifies exact workspace-relative paths
- ✓ No hardcoded absolute paths anywhere
- ✓ All file operations are within Path Allowlist
- ✓ [BLAKE3_HASH: placeholder] footer present at end
- ✓ Plan is ready to pass `lint_plan` validation

---

## GENERATION INSTRUCTION

[AUTHORITATIVE]: You must NOW generate the implementation plan using the structure above. The plan will be validated by the `lint_plan` tool before execution. Ensure it passes all linting requirements.

---

**STATUS**: TEMPLATE v1.0 - ANTIGRAVITY PLANNING PROMPT
**LAST UPDATED**: 2026-02-08
**GOVERNANCE**: ATLAS-GATE-v1

[BLAKE3_HASH: placeholder]
