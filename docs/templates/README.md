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
2. **Get operator input**: Plan Path, Workspace Root, Plan Signature
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
ATLAS-GATE_PLAN_SIGNATURE: [url-safe-base64 signature]
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

### Signature Validation

- Plan signature is base64-encoded ECDSA P-256 cosign signature (URL-safe format)
- 43 characters long, no `/`, `+`, or `=` characters
- Used as filename for plan storage: `docs/plans/<signature>.md`
- Verified with cosign public key before execution
- If verification fails → STOP immediately, do NOT execute

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
- ✗ Using hash format that doesn't match MCP implementation
- ✗ Assuming plan hash format without verifying
- ✗ Not checking linting errors before execution

---

## Spectral Linting

**What is Spectral?**
Spectral is a linting tool (like ESLint for JSON/OpenAPI). The plan linter uses custom Spectral rules to validate plan structure and format.

**Spectral Rules in Plan Linter**:
1. `plan-required-sections`: Verifies all 7 sections present
2. `plan-no-stubs`: Detects stub/incomplete code patterns
3. `plan-phase-format`: Validates Phase ID format (UPPERCASE_WITH_UNDERSCORES)

**Stage 6 Output**: If Spectral rules fail, errors are reported as `SPECTRAL_LINT_ERROR` in the violations list.

---

## Cosign Signing

**What is Cosign?**
Cosign signs plans with ECDSA P-256 cryptography. Creates tamper-proof, verifiable plans with cryptographic proof of authenticity.

**Signing Process** (Stage 7 of Linting):
1. Linter strips HTML comment header (lines 1-5) and signature footer from plan
2. Canonicalizes content (removes comments, normalizes whitespace)
3. Signs with cosign using EC P-256 private key from `.atlas-gate/.cosign-keys/`
4. Returns URL-safe base64-encoded signature (43 characters)
5. Inserts signature into `ATLAS-GATE_PLAN_SIGNATURE: [signature]` field in header
6. Plan filename becomes the signature: `docs/plans/<signature>.md`

**Verification Process** (WINDSURF Execution):
1. Loads plan from `docs/plans/<signature>.md`
2. Extracts `ATLAS-GATE_PLAN_SIGNATURE` from plan header
3. Strips HTML comment header and signature footer
4. Canonicalizes content identically to signing process
5. Verifies signature using cosign public key from `.atlas-gate/.cosign-keys/`
6. If verification fails: Plan rejected, execution stopped, audit entry created

---

## Linting (Multi-Stage: Spectral + Cosign)

Plans are validated by `lint_plan` which runs 7 validation stages:

**Stages 1-5: Custom Validation**
- Structure: All 7 sections, correct order
- Phases: Valid IDs (UPPERCASE_WITH_UNDERSCORES), required fields
- Paths: Workspace-relative, no escapes
- Enforceability: No stubs, ambiguous language, or judgment clauses
- Auditability: Plain English objectives, human-readable

**Stage 6: Spectral Linting**
- OpenAPI/Spectral-based custom rules
- Validates format patterns and field requirements
- Checks code quality markers

**Stage 7: Cosign Signing**
- Signs plan with ECDSA P-256 private key from `.atlas-gate/.cosign-keys/`
- Returns URL-safe base64-encoded signature (43 characters)
- Inserts `ATLAS-GATE_PLAN_SIGNATURE` into plan header
- Plan is ready for cryptographic verification

**Run**: `lint_plan({ path: "PLAN_ID.md" })`

**Returns**:
```json
{
  "passed": true/false,
  "planId": "plan-signature-as-filename",
  "signature": "url-safe-base64-cosign-signature",
  "errors": [...],
  "warnings": [...]
}
```

If `passed: false`, fix errors and re-run.

**On success**:
- Plan is signed with cosign (ECDSA P-256)
- Save to `docs/plans/<signature>.md` (signature is filename)
- Include `ATLAS-GATE_PLAN_SIGNATURE` in header comment
- Plan immutable and cryptographically verified

---

## File Locations (CRITICAL)

**Plans MUST be stored in**: `docs/plans/`

**Plans MUST be named by ATLAS-GATE_PLAN_SIGNATURE**: `<SIGNATURE>.md`

**Example**:
- Plan Signature (from linting): `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`
- Location: `docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.md`
- Plan header contains: `ATLAS-GATE_PLAN_SIGNATURE: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`

**Why**: 
- WINDSURF looks up plans by signature using the path resolver
- Signature is cryptographically unique per plan content
- If modified, signature verification fails and execution stops
- Prevents undetected tampering or version confusion

**Workflow**:
1. Write plan to temp location: `PLAN_AUTH_V1.md`
2. Lint: `lint_plan({ path: "PLAN_AUTH_V1.md" })` → Validates 7 stages, signs with cosign, returns signature
3. Save to canonical location: `docs/plans/<signature>.md` (plan now includes `ATLAS-GATE_PLAN_SIGNATURE`)
4. Deliver plan signature and public key path to operator for execution

---

## Audit Trail

Every write operation is recorded in the audit log with:
- Timestamp
- Plan signature
- File path
- Role (EXECUTABLE, BOUNDARY, etc.)
- Intent/purpose
- Audit entry hash (SHA256)
- Cosign verification status

Audit log is immutable and sequential. Cannot be modified or deleted.

**Verification**: Each audit entry is linked to plan signature, providing cryptographic proof of execution authorization.

---

## Quick Start

1. Read: `antigravity_planning_prompt_v2.md`
2. Copy: `plan_scaffold.md` → new file `PLAN_YOUR_FEATURE.md`
3. Fill in: All sections with real content
4. Lint: `lint_plan({ path: "PLAN_YOUR_FEATURE.md" })` → 7-stage validation + cosign signing
5. Fix: Any errors, re-lint
6. Save: Move to `docs/plans/<signature>.md` with signature from linting
7. Submit: Send plan signature and public key path to WINDSURF
8. Execute: WINDSURF verifies cosign signature, then executes plan

---

**STATUS**: Complete v2 Template Suite
**LAST UPDATED**: 2026-02-14
**BASED ON**: Actual MCP implementation (plan-linter.js, write_file.js, lint_plan.js)
