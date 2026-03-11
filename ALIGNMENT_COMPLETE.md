# ATLAS-GATE ALIGNMENT COMPLETE

**Date**: 2026-03-11  
**Status**: ✓ ALL SYSTEMS ALIGNED  
**Authority**: ATLAS-GATE-v2 Governance

---

## Summary

The ATLAS-GATE antigravity planning prompt, plan template, windsurf execution prompt, plan-linter, lint_plan, save_plan, and all relevant tools and documentation are now **fully aligned and synchronized**.

All components produce and validate plans to the **same exact JSON schema** with **identical field requirements**, **matching validation rules**, and **consistent tool outputs**.

---

## What Was Fixed

### 1. Plan Template Alignment ✓

**PLAN_SCAFFOLD.json** updated:
- Standardized `affected_files` format: `"path: description"` 
- Improved example constraints and out-of-scope items
- Now matches PLAN_EXAMPLE_FINALIZED.json exactly

### 2. ANTIGRAVITY Planning Prompt ✓

**antigravity_planning_prompt_v2.md** completely updated:
- Emphasized plans are **STRICT JSON ONLY** (not Markdown)
- Added explicit list of 10 required top-level keys
- Added "Forbidden Content in Plans" section showing:
  - Stub patterns (TODO, FIXME, XXX, HACK, stub, mock, placeholder, TBD, WIP)
  - Ambiguous language (may, should, if possible, use best judgment, optional, try to, attempt to)
  - Code symbols in objectives
- Fixed WORKFLOW section with exact tool output formats:
  - `lint_plan` returns: `{ passed, errors, warnings, summary }`
  - `save_plan` returns: `{ status, signature, path, bundlePath, message }`
- Clarified that `save_plan` requires lint to pass first

### 3. WINDSURF Execution Prompt ✓

**windsurf_execution_prompt_v2.md** completely updated:
- Clarified **plan parameter is a base64 signature string**, not a JSON object
- Added critical validation section:
  - Plan file must exist
  - Signature must match filename
  - status MUST be "APPROVED"
  - role MUST be "ANTIGRAVITY"
- Fixed intent artifact schema with correct 9-section format:
  - Title: `# Intent: <path>`
  - Purpose: Plain English (30+ chars, no code)
  - **Authority: Key-value format** (not bulleted):
    ```
    Plan Signature: <signature-string>
    Phase ID: PHASE_NAME
    ```
  - Inputs, Outputs, Invariants, Failure Modes, Debug Signals, Out-of-Scope
- Updated write_file tool schema with complete parameters
- Enhanced execution sequence with step-by-step intent artifact creation

### 4. Canonical Plan Format Specification ✓

**NEW: docs/PLAN_FORMAT_SPEC.md** created:
- Complete canonical JSON schema documentation
- All 10 top-level keys with constraints and examples
- All 7 major sections (plan_metadata, scope_and_constraints, phase_definitions, path_allowlist, verification_gates, forbidden_actions, rollback_failure_policy)
- Field validation rules for each section
- Forbidden content patterns
- Complete minimal plan example
- JSON Schema reference for automated validation
- Cross-references to linter and tool implementations

### 5. Documentation Hub ✓

**PROMPT_TEMPLATES.md** updated:
- Added alignment status and synchronization date
- Added quick links to specs and audit
- Fixed broken file paths (removed old absolute paths)
- Added alignment/cross-reference table showing:
  - Plan Linter validates all required fields
  - Save Plan Tool signs and persists
  - Lint Plan Tool returns errors/warnings/summary
  - Write File Tool enforces plan authorization
  - Intent Spec defines 9-section schema
  - Plan Format Spec defines complete JSON structure

### 6. Alignment Audit Document ✓

**ALIGNMENT_AUDIT_AND_FIX.md** created and completed:
- Documents all misalignments found
- Shows exactly what was wrong in each component
- Details the fix for each issue
- Provides implementation status with checkmarks

---

## Synchronization Guarantees

### Plan Linter ✓
- Validates exactly the same 10 required top-level keys
- Enforces same phase_id format (UPPERCASE_WITH_UNDERSCORES)
- Validates path_allowlist (no `/`, no `..`, no `${}`)
- Rejects stub patterns and ambiguous language
- Validates code symbols in objectives
- Runs Spectral linting on JSON
- Supports signature verification

### ANTIGRAVITY Planning ✓
- Creates plans with exactly 10 required top-level keys
- Calls `lint_plan` before `save_plan`
- Plans MUST pass linting to be saved
- Receives exact tool outputs documented in prompt
- Delivers signature to WINDSURF for execution

### WINDSURF Execution ✓
- Receives plan signature from ANTIGRAVITY
- Reads plan from `docs/plans/<SIGNATURE>.json`
- Validates plan status = "APPROVED" and role = "ANTIGRAVITY"
- Requires intent artifacts in exact 9-section format
- Calls `write_file` with plan signature parameter
- All writes enforce path_allowlist
- All writes require valid intent artifacts

### Intent Artifacts ✓
- 9-section canonical schema enforced:
  1. Title
  2. Purpose
  3. Authority (key-value, not bulleted)
  4. Inputs
  5. Outputs
  6. Invariants
  7. Failure Modes
  8. Debug Signals
  9. Out-of-Scope
- Authority format: `Plan Signature: <sig>` and `Phase ID: PHASE_NAME`
- Validated by intent-validator.js before write_file succeeds

### Tool Outputs ✓
All documented with exact field names and types:
- `lint_plan`: `{ passed, errors, warnings, summary }`
- `save_plan`: `{ status, signature, path, bundlePath, message }`
- `write_file`: `{ status, plan, role, path, repoRoot, preflight }`

---

## How to Use These Documents

### For AI Agents

**Planning (ANTIGRAVITY)**:
1. Read: `docs/templates/antigravity_planning_prompt_v2.md`
2. Reference: `docs/PLAN_FORMAT_SPEC.md` for all JSON structure details
3. Template: `docs/templates/PLAN_SCAFFOLD.json`
4. Use: `lint_plan` and `save_plan` tools as directed

**Execution (WINDSURF)**:
1. Read: `docs/templates/windsurf_execution_prompt_v2.md`
2. Reference: `docs/PLAN_FORMAT_SPEC.md` for plan field details
3. Reference: `docs/reports/MCP_INTENT_ARTIFACT_SPEC.md` for intent schema details
4. Use: `write_file` tool with plan signature and intent artifacts

### For Operators

1. Give ANTIGRAVITY the planning prompt + PLAN_FORMAT_SPEC.md
2. ANTIGRAVITY creates and signs plans
3. Give WINDSURF the execution prompt + plan path + signature
4. WINDSURF executes the plan
5. All writes are audited and cryptographically verified

### For Engineers

1. **Plan Linter**: `src/application/plan-linter.js` implements validation
2. **Save Plan**: `src/interfaces/tools/save_plan.js` implements signing
3. **Lint Tool**: `src/interfaces/tools/lint_plan.js` exposes linter
4. **Write File**: `src/interfaces/tools/write_file.js` enforces execution
5. **Intent Validator**: `src/application/intent-validator.js` validates intent artifacts
6. **Plan Enforcer**: `src/application/plan-enforcer.js` validates path_allowlist

---

## Key Alignment Points

### 1. JSON Structure is Strict
- Plans are **valid JSON objects** (not Markdown)
- Exactly 10 required top-level keys (no more, no less)
- All arrays must be arrays, all objects must be objects
- No mixing of types or optional fields

### 2. Validation is Deterministic
- Linter checks format, enforceability, auditability
- All errors block saving (no warnings-only)
- Stub/ambiguous patterns are rejected
- Path escaping (/.., ${}) is rejected

### 3. Signatures are Cryptographic
- Plans are signed with Cosign (ECDSA P-256)
- Signature is URL-safe base64
- Bundle format is Sigstore-compatible
- Signature verification is mathematical (not heuristic)

### 4. Intent Artifacts are Required
- Every write requires a `.intent.md` file
- 9-section schema is mandatory
- Authority format must be exactly: `Plan Signature: ...` + `Phase ID: ...`
- Validation is fail-closed (missing intent = write rejected)

### 5. Path Allowlist is Enforced
- Only paths in `path_allowlist` can be written
- Exact match or subdirectory of allowlisted path
- Violations trigger rollback
- Checked at write time by plan-enforcer

### 6. Tools Output Exact Formats
- `lint_plan`: Returns parsed results with severity levels
- `save_plan`: Returns signature + paths + status
- `write_file`: Requires plan signature parameter
- All outputs documented in prompts

---

## Cross-Reference Map

| Component | File | Purpose |
|-----------|------|---------|
| **Prompts** | `docs/templates/antigravity_planning_prompt_v2.md` | ANTIGRAVITY instructions |
| | `docs/templates/windsurf_execution_prompt_v2.md` | WINDSURF instructions |
| **Templates** | `docs/templates/PLAN_SCAFFOLD.json` | Starter template |
| | `docs/templates/PLAN_EXAMPLE_FINALIZED.json` | Concrete example |
| **Specs** | `docs/PLAN_FORMAT_SPEC.md` | Canonical JSON schema |
| | `docs/PROMPT_TEMPLATES.md` | Index + quick reference |
| | `docs/reports/MCP_INTENT_ARTIFACT_SPEC.md` | Intent artifact schema |
| **Linter** | `src/application/plan-linter.js` | Validation engine |
| **Tools** | `src/interfaces/tools/lint_plan.js` | Lint tool interface |
| | `src/interfaces/tools/save_plan.js` | Sign + save tool |
| | `src/interfaces/tools/write_file.js` | Execution + enforcement |
| **Validation** | `src/application/intent-validator.js` | Intent validation |
| | `src/application/plan-enforcer.js` | Path allowlist enforcement |

---

## Verification Checklist

- [x] Plan structure matches linter validation rules
- [x] ANTIGRAVITY prompt creates plans linter accepts
- [x] WINDSURF prompt executes plans correctly
- [x] Lint_plan tool output documented in prompts
- [x] Save_plan tool output documented in prompts
- [x] Write_file tool parameters documented in prompts
- [x] Intent artifact schema matches implementation
- [x] Path allowlist validation matches enforcer logic
- [x] Phase definitions have all required fields
- [x] Forbidden patterns are documented in prompts
- [x] All cross-references are correct

---

## Template Consolidation

**Note**: There were 9 other prompt template files in `docs/templates/` that were **obsolete and conflicting**:
- ANTIGRAVITY_PLANNING_PROMPT.md (old)
- antigravity_planning_prompt_template.md (template version)
- ANTIGRAVITY_SYSTEM_PROMPT.md (system prompt)
- WINDSURF_EXECUTION_PROMPT.md (old)
- WINDSURF_EXECUTION_PROMPT_UPDATED.md (partial update)
- windsurf_implementation_prompt_template.md (template version)
- WINDSURF_SYSTEM_PROMPT.md (system prompt)
- PLANNING_PROMPT_UPDATED.md (partial update)

**Resolution**:
- Added deprecation notices to old versions pointing to v2
- Created `docs/templates/README.md` with master index
- Consolidated all guidance on canonical templates (v2 versions only)
- Archived references in documentation

**Result**: Users now have one clear source of truth for each agent prompt.

---

## Going Forward

All future changes to:
- Plan structure
- Validation rules
- Tool outputs
- Intent schema

Must be synchronized across:
1. The prompts (ANTIGRAVITY + WINDSURF)
2. The linter (plan-linter.js)
3. The specs (PLAN_FORMAT_SPEC.md + INTENT_ARTIFACT_SPEC.md)
4. The tools (lint_plan.js, save_plan.js, write_file.js)
5. This alignment document

**No component changes independently.**

---

**✓ ALIGNMENT COMPLETE**  
**✓ ALL SYSTEMS SYNCHRONIZED**  
**✓ READY FOR PRODUCTION**

