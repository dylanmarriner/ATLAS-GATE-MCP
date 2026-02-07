# MCP Plan Linter Specification

**Status**: IMPLEMENTED  
**Date**: 2026-01-19  
**Version**: 1.0

---

## Executive Summary

The Plan Linter is a deterministic validation system that enforces plan structure, enforceability, and auditability **before** approval and **during** execution. It operates at three critical points:

1. **Plan Creation** (proposal by ANTIGRAVITY)
2. **Plan Approval** (before hash binding)
3. **Plan Execution** (hash re-validation by WINDSURF)

**Core Principle**: All plans must pass linting or be refused. No "warn-only" validation.

---

## Required Plan Structure

Every plan MUST contain these seven sections in this order:

### 1. Plan Metadata
- Contains: Plan title, version, description
- Required: Yes
- Example:
  ```
  # Plan Metadata
  Foundation plan for ATLAS-GATE MCP linting system
  ```

### 2. Scope & Constraints
- Contains: Boundary conditions, what the plan covers
- Required: Yes
- Example:
  ```
  # Scope & Constraints
  All operations scoped to /core/** and /tools/** only.
  ```

### 3. Phase Definitions
- Contains: Phases with structured metadata (see below)
- Required: Yes
- Must contain at least 1 phase
- Example:
  ```
  # Phase Definitions
  ## Phase: Implementation
  Phase ID: IMPL_PHASE
  ...
  ```

### 4. Path Allowlist
- Contains: Workspace-relative paths that operations are allowed to touch
- Required: Yes
- Example:
  ```
  # Path Allowlist
  - core/plan-linter.js
  - test-plan-linter.js
  ```

### 5. Verification Gates
- Contains: Tests, checks, or commands to verify the plan execution
- Required: Yes
- Example:
  ```
  # Verification Gates
  - npm test
  - npm run verify
  ```

### 6. Forbidden Actions
- Contains: Explicit list of operations that MUST NOT be performed
- Required: Yes
- Example:
  ```
  # Forbidden Actions
  - DELETE any file
  - EXECUTE arbitrary shell
  ```

### 7. Rollback / Failure Policy
- Contains: What happens if execution fails (deterministic recovery)
- Required: Yes
- Example:
  ```
  # Rollback / Failure Policy
  On any verification failure, revert all changes immediately.
  ```

---

## Phase Definition Requirements

Each phase in `# Phase Definitions` MUST be a subsection (e.g., `## Phase: Name`) and contain these 8 required fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Phase ID** | Unique identifier (UPPERCASE_UNDERSCORE format) | `IMPL_PHASE` |
| **Objective** | Single-sentence, plain-English description of what phase does | `Implement the plan linting system` |
| **Allowed operations** | List of CREATE/MODIFY paths or operations permitted | `CREATE /core/plan-linter.js` |
| **Forbidden operations** | Explicit list of operations that fail the phase | `DELETE any file` |
| **Required intent artifacts** | Intent documents required for execution | `Implementation specification` |
| **Verification commands** | Deterministic commands to validate success | `npm test && npm run verify` |
| **Expected outcomes** | Plain-English description of success state | `All tests pass, no build errors` |
| **Failure stop conditions** | Conditions that trigger immediate rollback | `Any test failure MUST trigger rollback` |

### Valid Phase ID Format
- MUST be: `[A-Z0-9_]+` (uppercase alphanumeric + underscore)
- Examples: `PHASE_1`, `IMPL_PHASE`, `VERIFY_GATES`
- Invalid: `phase1`, `Phase-1`, `Phase 1`

---

## Path Allowlist Rules

### Allowed Path Formats
- ✓ Workspace-relative: `core/plan-linter.js`
- ✓ Globbing (explicit): `tools/**/*.js`
- ✓ Directories: `docs/`

### Forbidden Path Formats
- ✗ Absolute paths: `/absolute/path` (except with explicit `**` for glob)
- ✗ Parent escape: `../../../etc/passwd`
- ✗ Unresolved variables: `${VAR_NAME}`

---

## Enforceability Rules

### Binary Language Required
Plans must use **deterministic, machine-enforceable language**. All rules must be expressible as code.

#### Forbidden Words (Non-Enforceable)
- "may", "should", "could"
- "if possible", "try to", "attempt to"
- "optional", "may or may not"
- "use best judgment", "use judgment"

**Rule**: If the linter detects these patterns, lint fails with error `PLAN_NOT_ENFORCEABLE`.

#### Required Language (Enforceable)
- "MUST", "MUST NOT"
- "SHALL", "SHALL NOT"
- "REQUIRED", "FORBIDDEN"
- Binary conditions: "IF X THEN Y" or "UNLESS Z DO NOT W"

---

## Auditability Rules

### Non-Coder Readability Requirement
Plans must be understandable to engineers without coding knowledge. All objectives, outcomes, and conditions must be plain English.

#### Forbidden in Objectives/Descriptions
- ✗ Code symbols: `` `const x = 5` ``
- ✗ Function calls: `buildSystem()`
- ✗ Variables: `$VARIABLE`, `<placeholder>`
- ✗ Undefined jargon (without glossary)

#### Required in Objectives/Descriptions
- ✓ Plain English sentences
- ✓ Clear, active voice
- ✓ Defined technical terms (with glossary if needed)
- ✓ Explicit success/failure criteria

---

## Plan Hash Binding & Immutability

### Hash Computation
```javascript
hash = SHA256(canonicalized_plan_text)
```

**Canonicalization**: Plan text is normalized before hashing:
1. Trim leading/trailing whitespace
2. Split into lines
3. Trim right side of each line
4. Rejoin with `\n`

### Hash Immutability
- Plan hash is computed once during proposal
- Hash is embedded in plan header as `ATLAS-GATE_PLAN_HASH`
- Plan header also includes `STATUS: APPROVED`
- If plan content is modified after approval, hash changes
- Execution validates hash matches: if mismatch → refuse

### Hash Format
- 64-character hexadecimal string
- Example: `6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d`

---

## Linting Error Codes & Invariants

All lint failures map to an error code and invariant ID for auditing:

| Error Code | Invariant ID | Severity | Meaning |
|-----------|-------------|----------|---------|
| `PLAN_MISSING_SECTION` | `PLAN_SCOPE_LAW` | ERROR | Required section absent |
| `PLAN_MISSING_FIELD` | `PLAN_SCOPE_LAW` | ERROR | Required phase field absent |
| `PLAN_INVALID_STRUCTURE` | `PLAN_SCOPE_LAW` | ERROR | Sections out of order |
| `PLAN_INVALID_PHASE_ID` | `PLAN_SCOPE_LAW` | ERROR | Phase ID invalid/duplicate |
| `PLAN_INVALID_PATH` | `PLAN_SCOPE_LAW` | ERROR | Path fails validation |
| `PLAN_PATH_ESCAPE` | `PLAN_SCOPE_LAW` | ERROR | Path escape detected |
| `PLAN_NOT_ENFORCEABLE` | `MECHANICAL_LAW_ONLY` | ERROR | Vague language detected |
| `PLAN_NOT_AUDITABLE` | `PUBLIC_LAW_READABLE` | ERROR | Non-coder cannot understand |
| `PLAN_HASH_MISMATCH` | `PLAN_IMMUTABILITY` | ERROR | Hash doesn't match content |

---

## Linting Invocation Points

### Point 1: Plan Proposal (bootstrapPlanHandler)
```
→ lintPlan(planContent)
→ If not passed: REFUSE with error codes
→ If passed: Compute hash and proceed to approval
```

### Point 2: Plan Approval (bootstrapCreateFoundationPlan)
```
→ lintPlan(planContent, expectedHash)
→ If not passed: REFUSE approval
→ If passed: Write plan file with APPROVED status
→ Record approval in audit log
```

### Point 3: Plan Execution (enforcePlan in write_file handler)
```
→ Read plan file by hash
→ Re-hash content
→ lintPlan(planContent, expectedHash)
→ If mismatch or lint fails: REFUSE execution
→ Else: Proceed with write authorization
```

---

## Audit Integration

Every lint operation produces an audit entry:

```jsonl
{
  "session_id": "...",
  "role": "ANTIGRAVITY|WINDSURF",
  "tool": "bootstrap_create_foundation_plan|write_file",
  "plan_hash": "6448139...",
  "result": "lint_pass|lint_fail",
  "error_code": "PLAN_MISSING_SECTION|null",
  "invariant_id": "PLAN_SCOPE_LAW|...",
  "lint_violations": [
    {
      "code": "PLAN_MISSING_FIELD",
      "message": "Phase 'IMPL' missing required field: 'Objective'",
      "severity": "ERROR",
      "invariant": "PLAN_SCOPE_LAW"
    }
  ],
  "notes": "Plan linting completed"
}
```

---

## How to Read a Plan (Non-Coder Guide)

### Step 1: Check Structure
- Does the plan have all 7 sections?
- Are they in the right order?

### Step 2: Read Objectives
- Can you understand what each phase does without code knowledge?
- Are the outcomes clear and measurable?

### Step 3: Check Constraints
- What files can be touched?
- What files are forbidden?

### Step 4: Verify Failure Conditions
- What happens if something breaks?
- Are rollback steps explicit?

### Step 5: Run Verification
- Can you run the commands listed in "Verification Gates"?
- Do they all pass?

---

## Implementation Files

- **Core Linter**: `core/plan-linter.js`
- **Integration Points**:
  - `tools/bootstrap_tool.js` (plan proposal)
  - `core/governance.js` (plan approval)
  - `tools/write_file.js` (plan execution)
- **Lint Tool**: Added to `server.js` as MCP tool
- **Tests**: `test-plan-linter.js` (14+ comprehensive tests)

---

## Known Limitations

1. **Glossary**: Jargon detection is heuristic-based (checks for undefined terms)
2. **Context-aware validation**: Path allowlist is extracted via regex; complex scope conditions may not parse perfectly
3. **Phase extraction**: Regex-based; unusual formatting may not parse phases correctly
4. **Ambiguous language**: Pattern-based detection; context-dependent words may be flagged incorrectly

---

## Future Enhancements

- Formal glossary section in plans
- YAML/JSON structured plan format
- Automated rollback script validation
- Phase dependency graph validation
- Intent artifact schema validation
