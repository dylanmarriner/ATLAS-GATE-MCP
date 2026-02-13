# ATLAS-GATE MCP Templates - Complete Reference

This directory contains the authoritative templates for ATLAS-GATE MCP governance.

## Templates

### 1. **antigravity_planning_prompt_v2.md** (ANTIGRAVITY)
- How ANTIGRAVITY (planning agent) should generate plans
- Exact plan structure required by linter
- What each section must contain
- Validation rules that will be enforced

**Use this when**: You are creating an implementation plan.

### 2. **windsurf_execution_prompt_v2.md** (WINDSURF)
- How WINDSURF (execution agent) executes plans
- Step-by-step execution sequence
- write_file parameters and requirements
- Hash validation and audit verification
- Rollback procedures

**Use this when**: You are executing an approved plan.

### 3. **plan_scaffold.md** (TEMPLATE)
- Minimal plan structure with placeholders
- Copy-paste starting point
- All 7 required sections with field names
- Instructions for filling in each section

**Use this when**: You need to start a new plan quickly.

### 4. **PLAN_EXAMPLE_JWT_AUTH.md** (EXAMPLE)
- Complete, real-world example plan
- Shows how to write Scope & Constraints properly
- Real Affected Files, Constraints, and Verification Gates
- Demonstrates proper constraint language

**Use this when**: You want to see what a complete plan looks like.

---

## Workflow

### Planning Phase (ANTIGRAVITY)

1. **Read the planning prompt**: `antigravity_planning_prompt_v2.md`
2. **Get operator input**: Objective, Target Files, Plan ID, Constraints
3. **Analyze the code**: Read target files from workspace
4. **Design the solution**: Complete implementation details
5. **Use the scaffold**: Start with `plan_scaffold.md`, fill in sections
6. **Reference the example**: Check `PLAN_EXAMPLE_JWT_AUTH.md` for correct format
7. **Generate the plan**: Follow exact structure from planning prompt
8. **Lint the plan**: Call `lint_plan({ path: "PLAN_ID.md" })`
9. **Fix any errors**: Re-run lint until it passes
10. **Submit to WINDSURF**: Plan is now sealed and ready for execution

### Execution Phase (WINDSURF)

1. **Read the execution prompt**: `windsurf_execution_prompt_v2.md`
2. **Get operator input**: Plan Path, Workspace Root, Plan Hash
3. **Init sequence**: begin_session, read_prompt("WINDSURF_CANONICAL")
4. **Validate plan**: Hash verification, section check
5. **Extract requirements**: Path Allowlist, Affected Files, Verification Gates
6. **Execute writes**: For each file, call write_file with exact parameters
7. **Verify audit**: After each write, check audit log entry
8. **Run verification**: npm test, npm run lint
9. **Integrity check**: Verify only allowlist files modified
10. **Report**: Success or failure with details

---

## Plan Structure (Quick Reference)

Every plan MUST have these 7 sections in this order:

```
<!--
ATLAS-GATE_PLAN_HASH: [64-char SHA256 hex]
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->

# Plan Metadata
[Plan ID, Version, Author, Status, Timestamp, Governance]

# Scope & Constraints
[Objective, Affected Files, Out of Scope, Constraints]

# Phase Definitions
[Phase ID, Objective, Allowed/Forbidden operations, Verification commands, Expected outcomes, Failure stop conditions]

# Path Allowlist
[List of workspace-relative paths that can be modified]

# Verification Gates
[Gate 1, Gate 2, etc. - commands to run after implementation]

# Forbidden Actions
[List of actions strictly prohibited]

# Rollback / Failure Policy
[Automatic rollback triggers, Rollback procedure, Recovery steps]
```

---

## Key Rules

### Antigravity Planning

- ✓ Plans must have all 7 sections in order
- ✓ All phase fields must be plain text (no markdown formatting)
- ✓ Phase ID must be UPPERCASE_WITH_UNDERSCORES
- ✓ No ambiguous language (may, should, optional, try to, attempt to)
- ✓ No stub markers (TODO, FIXME, XXX, HACK)
- ✓ All paths must be workspace-relative (no leading `/`)
- ✓ All constraints must be in binary language (MUST, MUST NOT)
- ✗ Do NOT write code in the plan (plan specifies WHAT, not implementation)
- ✗ Do NOT use mock examples or placeholder implementations in constraints

### Windsurf Execution

- ✓ Call read_prompt("WINDSURF_CANONICAL") FIRST
- ✓ Validate plan hash before executing
- ✓ For each file: call write_file, then verify audit log entry
- ✓ All written code must be complete, production-ready
- ✓ Paths must be in Path Allowlist
- ✓ Run verification commands and check exit codes
- ✗ Do NOT skip verification steps
- ✗ Do NOT continue execution if any step fails
- ✗ Do NOT write stub code, TODOs, or incomplete implementations

### Hash Validation

- Plan hash is SHA256 (64 hexadecimal characters)
- Computed by stripping HTML comment header (lines 1-5) and hashing remaining content
- Must match exactly (case-insensitive comparison)
- If mismatch → STOP immediately, do NOT execute

### write_file Parameters

Required parameters:
- `path`: Workspace-relative, in allowlist
- `content`: Complete code, no stubs
- `plan`: Plan ID
- `role`: EXECUTABLE | BOUNDARY | INFRASTRUCTURE | VERIFICATION
- `purpose`: 20+ character description
- `intent`: 20+ character detailed description
- `authority`: Plan ID
- `failureModes`: How errors are handled

---

## Common Mistakes

**Planning**:
- ✗ Using ambiguous language ("may", "should", "try to")
- ✗ Phase fields with markdown formatting (**bold**, *italic*)
- ✗ Including code snippets in the plan
- ✗ Paths with leading `/` or parent directory escapes (`..`)
- ✗ Missing any of the 7 required sections

**Execution**:
- ✗ Not calling read_prompt first
- ✗ Skipping hash validation
- ✗ Not verifying audit log after each write
- ✗ Writing code with TODO/FIXME comments
- ✗ Modifying files outside Path Allowlist
- ✗ Continuing execution after a step fails

**General**:
- ✗ Using BLAKE3 instead of SHA256 for hashes
- ✗ Assuming plan hash format without verifying
- ✗ Not checking linting errors before execution

---

## Linting

Plans are validated by `lint_plan` which checks:

- All 7 required sections present
- Sections in correct order
- No ambiguous language
- No stub markers
- Phase ID format correct
- Phase fields are plain text
- Paths are workspace-relative
- No absolute paths or parent escapes
- Hash can be computed deterministically

Run: `lint_plan({ path: "PLAN_ID.md" })`

Returns:
```json
{
  "passed": true/false,
  "hash": "64-char-sha256-hex",
  "errors": [...],
  "warnings": [...]
}
```

If `passed: false`, fix errors and re-run.

---

## File Locations (CRITICAL)

**Plans MUST be stored in**: `docs/plans/`

**Plans MUST be named by their hash**: `<SHA256_HASH>.md`

**Example**:
- Hash: `aeb41114559a6c480b2750d5c8df73806b5bcfc9627a66b3e9f67a0cd1ba4ff2`
- Location: `docs/plans/aeb41114559a6c480b2750d5c8df73806b5bcfc9627a66b3e9f67a0cd1ba4ff2.md`

**Why**: WINDSURF looks up plans by hash using the path resolver. If a plan is saved anywhere else (e.g., `PLAN_AUTH_V1.md`, `plans/my_plan.md`, etc.), WINDSURF cannot find it and execution will FAIL.

**Workflow**:
1. Write plan to temp location: `PLAN_AUTH_V1.md`
2. Lint: `lint_plan({ path: "PLAN_AUTH_V1.md" })` → Returns hash
3. Save to canonical location: `docs/plans/<hash>.md`
4. Deliver plan hash to operator for execution

---

## Audit Trail

Every write operation is recorded in the audit log with:
- Timestamp
- Plan hash
- File path
- Role (EXECUTABLE, BOUNDARY, etc.)
- Intent/purpose
- Audit entry hash (SHA256)

Audit log is immutable and sequential. Cannot be modified or deleted.

---

## Quick Start

1. Read: `antigravity_planning_prompt_v2.md`
2. Copy: `plan_scaffold.md` → new file `PLAN_YOUR_FEATURE.md`
3. Fill in: All sections with real content
4. Lint: `lint_plan({ path: "PLAN_YOUR_FEATURE.md" })`
5. Fix: Any errors, re-lint
6. Submit: Send plan path and hash to WINDSURF
7. Execute: WINDSURF runs `windsurf_execution_prompt_v2.md` workflow

---

**STATUS**: Complete v2 Template Suite
**LAST UPDATED**: 2026-02-14
**BASED ON**: Actual MCP implementation (plan-linter.js, write_file.js, lint_plan.js)
