# ATLAS-GATE Templates Index

Complete reference for all templates, prompts, and scaffolds.

## Available Templates

### 1. ANTIGRAVITY Planning Prompt

**File**: `ANTIGRAVITY_PLANNING_PROMPT.md`

**Use When**: You need to generate a plan

**How to Use**:

1. Copy entire file contents
2. Feed to Claude/GPT-4 with your objective
3. Provide codebase context (files to analyze)
4. Agent will generate complete JSON plan

**Contents**:

- 10 required plan sections explained
- Language rules (MUST/MUST NOT, no ambiguity)
- Path rules (relative, no .., no /)
- Creation workflow (7 steps)
- Common mistakes (10 patterns to avoid)
- Quality checklist (20 items)
- Output format (pure JSON)

**Example Usage**:

```
[Paste entire ANTIGRAVITY_PLANNING_PROMPT.md into Claude]
[Add your objective]:

Please create a plan for: "Add JWT authentication to our REST API"

Here's the codebase structure:
- src/auth/ (authentication directory)
- src/api/ (API routes)
- tests/ (test directory)

Here are the existing files:
[provide file contents...]

Generate a complete ATLAS-GATE plan in JSON format.
```

---

### 2. WINDSURF Execution Prompt

**File**: `WINDSURF_EXECUTION_PROMPT.md`

**Use When**: You need to execute a plan

**How to Use**:

1. Copy entire file contents
2. Feed to Claude/GPT-4 with plan details
3. Provide workspace path and plan signature
4. Agent will execute the plan step-by-step

**Contents**:

- 5-step execution sequence
- 5-gate pipeline explanation
- Intent artifact creation (9 sections)
- write_file parameters (8 fields)
- Rollback procedures
- Code requirements (production-ready)
- Example JWT workflow
- Common mistakes (8 patterns to avoid)
- Safety principles

**Example Usage**:

```
[Paste entire WINDSURF_EXECUTION_PROMPT.md into Claude]
[Add execution details]:

Please execute this plan:
- Workspace: /path/to/my-project
- Plan file: docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.json
- Plan signature: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o

Follow the execution sequence step-by-step.
```

---

### 3. Intent Artifact Template

**File**: `INTENT_ARTIFACT_TEMPLATE.md`

**Use When**: You're about to write a file

**How to Use**:

1. For each file in `path_allowlist`, create a `.intent.md` file
2. Copy template structure
3. Fill in all 9 sections with details
4. Save as `FILENAME.intent.md` in same directory as target file

**Structure** (9 Required Sections):

1. Purpose — What the file does
2. Authorization — Plan, phase, signature
3. Content Description — Plain English, no code
4. Change Justification — Why it's needed
5. Constraints — Rules from plan
6. Error Handling — How failures handled
7. Verification — How success tested
8. Audit Trail — Metadata for logging

**Example Intent Files**:

- For `src/auth/jwt.js` → Create `src/auth/jwt.js.intent.md`
- For `tests/auth.test.js` → Create `tests/auth.test.js.intent.md`

**Example**:

```markdown
# Intent Artifact: src/auth/jwt.js

## Purpose
Core JWT authentication module with signing and verification

## Authorization
- Plan ID: FEATURE_JWT_AUTH_V1
- Phase: PHASE_001_JWT_MODULE
- Role: EXECUTABLE
- Signature: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o

## Content Description
Exports sign(payload, secret) and verify(token, secret) functions

[... continue with other 6 sections ...]
```

---

### 4. Plan Scaffold (JSON)

**File**: `PLAN_SCAFFOLD.json`

**Use When**: You're creating a new plan

**How to Use**:

1. Copy this JSON file
2. Rename to your plan ID: `PLAN_YOURFEATURE.json`
3. Fill in all sections
4. Run `lint_plan({ path: "PLAN_YOURFEATURE.json" })`
5. Signature returned, save to `docs/plans/<SIGNATURE>.json`

**Structure**:

```json
{
  "atlas_gate_plan_signature": "",        // Leave empty
  "role": "ANTIGRAVITY",                  // Always this
  "status": "APPROVED",                   // Always this
  "plan_metadata": { ... },               // 5 fields
  "scope_and_constraints": { ... },       // 4 fields
  "phase_definitions": [ ... ],           // Array of phases (8 fields each)
  "path_allowlist": [ ... ],              // Array of paths
  "verification_gates": [ ... ],          // Array of strings
  "forbidden_actions": [ ... ],           // Array of strings
  "rollback_failure_policy": { ... }      // 3 fields
}
```

**Example**:

```bash
# Copy scaffold
cp docs/templates/PLAN_SCAFFOLD.json PLAN_JWT_AUTH.json

# Edit in your favorite editor
vim PLAN_JWT_AUTH.json

# Validate
lint_plan({ path: "PLAN_JWT_AUTH.json" })

# If passes, save to plans directory
mv PLAN_JWT_AUTH.json docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.json
```

---

## Usage Matrix

| Task | Template | Who | When |
|------|----------|-----|------|
| Generate plan | ANTIGRAVITY_PLANNING_PROMPT.md | ANTIGRAVITY agent | Planning phase |
| Create intent | INTENT_ARTIFACT_TEMPLATE.md | WINDSURF agent | Before each write_file |
| Execute plan | WINDSURF_EXECUTION_PROMPT.md | WINDSURF agent | Execution phase |
| Start new plan | PLAN_SCAFFOLD.json | Human or AI | Plan creation |

---

## Quick Start Workflows

### Workflow 1: AI-Driven Planning & Execution

```
1. [You] Copy ANTIGRAVITY_PLANNING_PROMPT.md
2. [You] Feed to Claude + your objective + code context
3. [Claude] Generates JSON plan
4. [You] Run lint_plan() to validate and sign
5. [You] Copy WINDSURF_EXECUTION_PROMPT.md
6. [You] Feed to Claude + plan details + workspace
7. [Claude] Executes plan, creates intents, writes files
8. [You] Verify audit-log.jsonl
```

### Workflow 2: Manual Planning, AI Execution

```
1. [You] Copy PLAN_SCAFFOLD.json
2. [You] Edit plan manually (design phases, constraints)
3. [You] Run lint_plan() to validate and sign
4. [You] Copy WINDSURF_EXECUTION_PROMPT.md
5. [You] Feed to Claude + plan details
6. [Claude] Executes plan automatically
7. [You] Verify results
```

### Workflow 3: Complete Manual Approach

```
1. [You] Copy PLAN_SCAFFOLD.json, edit manually
2. [You] Run lint_plan() to validate
3. [You] For each file:
   a. Copy INTENT_ARTIFACT_TEMPLATE.md
   b. Create FILENAME.intent.md
   c. Call write_file() with your own code
4. [You] Run verification commands
5. [You] Call commit_phase()
```

---

## Template Locations

All templates in `/docs/templates/`:

```
docs/templates/
├── ANTIGRAVITY_PLANNING_PROMPT.md      ← Planning agent instructions
├── WINDSURF_EXECUTION_PROMPT.md        ← Execution agent instructions
├── INTENT_ARTIFACT_TEMPLATE.md         ← File write justification
├── PLAN_SCAFFOLD.json                  ← Blank plan structure
└── TEMPLATES_INDEX.md                  ← This file
```

---

## Field Reference

### Required in Every Plan

**Header Fields**:

- `atlas_gate_plan_signature` — Leave empty (linter fills)
- `role` — Always "ANTIGRAVITY"
- `status` — Always "APPROVED"

**Metadata Fields** (in plan_metadata):

- `plan_id` — UPPERCASE_WITH_UNDERSCORES
- `version` — X.Y.Z semantic version
- `author` — Email or team name
- `timestamp` — ISO 8601 format
- `governance` — Always "ATLAS-GATE-v2"

**Phase Fields** (in phase_definitions):

- `phase_id` — UPPERCASE_WITH_UNDERSCORES
- `objective` — Plain English
- `allowed_operations` — List of MCP tools
- `forbidden_operations` — Banned operations
- `required_intent_artifacts` — .intent.md files
- `verification_commands` — Real shell commands
- `expected_outcomes` — Success criteria
- `failure_stop_conditions` — Abort conditions

**Scope Fields** (in scope_and_constraints):

- `objective` — What plan accomplishes
- `affected_files` — Files to be modified
- `out_of_scope` — What's NOT included
- `constraints` — MUST/MUST NOT rules

**Write File Parameters** (write_file call):

- `path` — Relative to workspace
- `content` — Complete code
- `plan` — Plan signature
- `role` — EXECUTABLE, BOUNDARY, etc.
- `purpose` — 20+ char description
- `intent` — 20+ char detailed intent
- `authority` — Plan ID
- `failureModes` — Error handling strategy

---

## Language Rules

### ✓ Correct Constraint Language

```
MUST validate all input
MUST NOT expose secrets
MUST handle errors explicitly
MUST use HTTPS for all requests
```

### ✗ Incorrect Constraint Language

```
Should handle errors              ✗ Use MUST/MUST NOT
May use encryption                ✗ Be definitive
Try to optimize performance       ✗ Be declarative
Optional security checks          ✗ MUST NOT be optional
If possible, validate input       ✗ MUST be done
```

---

## Path Rules

### ✓ Correct Paths

```
src/auth/jwt.js
src/api/routes.js
tests/auth.test.js
```

### ✗ Incorrect Paths

```
/home/user/project/src/auth.js     ✗ Absolute
/src/auth.js                        ✗ Leading /
src/../config.js                    ✗ Parent escape
src/${dir}/file.js                  ✗ Unresolved variable
```

---

## Hard Block Patterns

These code patterns are ABSOLUTELY FORBIDDEN:

- TODO, FIXME, XXX, HACK
- mock, fake, dummy, testData
- Empty functions: `function foo() { }`
- Empty catch blocks: `catch(e) { }`
- Returning null, undefined, ""
- SIMULATE, DRY_RUN
- bypass, BYPASS
- @ts-ignore, @ts-nocheck

---

## Template Customization

All templates can be customized:

1. **ANTIGRAVITY Prompt**: Add domain-specific language rules for your codebase
2. **WINDSURF Prompt**: Customize execution steps for your CI/CD
3. **Intent Template**: Add custom sections for your compliance requirements
4. **Plan Scaffold**: Pre-fill with your standard phases and constraints

---

## Examples in This Suite

Each template has real-world examples:

**ANTIGRAVITY Prompt**:

- JWT authentication feature example

**WINDSURF Prompt**:

- Complete JWT feature execution workflow

**Intent Template**:

- JWT module intent
- Middleware intent
- Test suite intent

**Plan Scaffold**:

- Two phases (create + test)
- Real verification commands

---

## Next Steps

1. **New to ATLAS-GATE?** → Read `/docs/00-GETTING_STARTED.md` first
2. **Creating a plan?** → Use `PLAN_SCAFFOLD.json`
3. **Using AI agents?** → Use `ANTIGRAVITY_PLANNING_PROMPT.md` + `WINDSURF_EXECUTION_PROMPT.md`
4. **Writing files?** → Use `INTENT_ARTIFACT_TEMPLATE.md` for each file
5. **Want details?** → Read `/docs/01-PLANNING_GUIDE.md` and `/docs/02-EXECUTION_GUIDE.md`

---

**Status**: All templates ready to use
**Version**: 2.0
**Last Updated**: 2026-03-07
**Authority**: ATLAS-GATE Governance
