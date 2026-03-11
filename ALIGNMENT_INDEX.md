# ATLAS-GATE Alignment Index

**Date**: 2026-03-11  
**Status**: COMPLETE ✓  
**Authority**: ATLAS-GATE-v2 Governance

---

## What is This?

This index guides you to all alignment documentation and synchronization guarantees for ATLAS-GATE MCP's governance system.

All components (prompts, templates, linter, tools, and specs) are now **perfectly aligned** — they create, validate, sign, and execute plans using the **same JSON schema** with **identical field requirements**.

---

## Core Documents (Read These First)

### 1. ALIGNMENT_COMPLETE.md
**→ [Read Full Document](./ALIGNMENT_COMPLETE.md)**

**What**: Executive summary of all changes and alignment guarantees
- What was fixed (6 major components)
- Synchronization guarantees (4 major subsystems)
- How to use these documents
- Key alignment points
- Verification checklist

**Read this first.** It's the executive summary.

### 2. PLAN_FORMAT_SPEC.md  
**→ [Read Full Document](./docs/PLAN_FORMAT_SPEC.md)**

**What**: Canonical JSON schema for all plans
- Top-level structure (10 required keys)
- All 7 major sections documented
- Field constraints and validation rules
- Forbidden content patterns
- Complete minimal plan example
- JSON Schema reference
- All code file references

**Reference this when creating or validating plans.**

### 3. PROMPT_TEMPLATES.md
**→ [Read Full Document](./docs/PROMPT_TEMPLATES.md)**

**What**: Index of all agent prompts and templates
- ANTIGRAVITY planning prompt
- WINDSURF execution prompt
- Plan scaffold template
- Example plan
- Cross-reference table showing which tool implements what

**Reference this for quick navigation.**

---

## Agent Prompts (Use These When Executing)

### Planning Agent (ANTIGRAVITY)
**→ [Read antigravity_planning_prompt_v2.md](./docs/templates/antigravity_planning_prompt_v2.md)**

**What**: Complete instructions for the ANTIGRAVITY agent
- Required tools: `begin_session`, `read_file`, `lint_plan`, `save_plan`, `list_plans`
- Workflow: Initialize → Analyze → Draft → Lint → Save → Deliver
- Plan structure with all 10 required keys
- Forbidden content rules (stubs, ambiguous language, code symbols)
- Tool output formats with examples
- Delivery to WINDSURF

**When**: Use this to instruct any AI agent that creates plans

### Execution Agent (WINDSURF)
**→ [Read windsurf_execution_prompt_v2.md](./docs/templates/windsurf_execution_prompt_v2.md)**

**What**: Complete instructions for the WINDSURF agent
- Required tools: `begin_session`, `read_file`, `write_file`, `list_plans`
- Plan validation checklist
- Intent artifact law (9-section schema)
- write_file tool schema with all parameters
- Execution sequence: Initialize → Read Plan → Validate → Create Intent → Write → Verify
- Critical validation checks

**When**: Use this to instruct any AI agent that executes plans

---

## Templates (Use These as Baselines)

### PLAN_SCAFFOLD.json
**→ [View Template](./docs/templates/PLAN_SCAFFOLD.json)**

Starter template with:
- All 10 required top-level keys
- Example values for each field
- Detailed comments and structure

**Use this when ANTIGRAVITY creates a new plan.**

### PLAN_EXAMPLE_FINALIZED.json
**→ [View Example](./docs/templates/PLAN_EXAMPLE_FINALIZED.json)**

Concrete example (JWT authentication plan) showing:
- Realistic values for all fields
- Proper constraint language
- Complete phase definitions
- Full rollback policy

**Reference this to see how a real plan is structured.**

---

## Specification Documents (Reference These for Details)

### MCP_INTENT_ARTIFACT_SPEC.md
**→ [View Spec](./docs/reports/MCP_INTENT_ARTIFACT_SPEC.md)**

**What**: Complete intent artifact schema specification
- 9-section canonical format
- Authority format (key-value, not bulleted)
- Purpose constraints (30+ chars, no code symbols)
- Inputs, Outputs, Invariants sections
- Failure Modes, Debug Signals, Out-of-Scope sections
- Validation rules and error handling

**Reference when creating intent artifacts in WINDSURF execution.**

---

## Audit & Change Log

### ALIGNMENT_AUDIT_AND_FIX.md
**→ [View Audit](./ALIGNMENT_AUDIT_AND_FIX.md)**

**What**: Detailed audit of all misalignments found and fixed
- 16 identified misalignment categories
- Root causes and impacts
- Fixes applied to each
- Implementation status with checkmarks

**Read this if you want to understand what was wrong and how it was fixed.**

---

## Cross-Reference: What Implements What

### Plan Structure Validation
| Requirement | Implementation | File |
|------------|---------------|----|
| 10 required top-level keys | plan-linter.js | `src/application/plan-linter.js` |
| phase_id format (UPPERCASE_WITH_UNDERSCORES) | plan-linter.js | `src/application/plan-linter.js#L221` |
| path_allowlist (no `/`, no `..`, no `${}`) | plan-linter.js | `src/application/plan-linter.js#L284-L298` |
| Stub pattern detection | plan-linter.js | `src/application/plan-linter.js#L73` |
| Ambiguous language detection | plan-linter.js | `src/application/plan-linter.js#L76` |
| Code symbols in objectives | plan-linter.js | `src/application/plan-linter.js#L79` |

### Plan Signing & Persistence
| Operation | Implementation | File |
|-----------|---------------|----|
| Call linter before signing | save_plan.js | `src/interfaces/tools/save_plan.js#L33` |
| Validate status = "APPROVED" | save_plan.js | `src/interfaces/tools/save_plan.js#L76` |
| Validate role = "ANTIGRAVITY" | plan-linter.js | `src/application/plan-linter.js#L123-L130` |
| Sign with Cosign (ECDSA P-256) | save_plan.js | `src/interfaces/tools/save_plan.js#L87` |
| Generate Sigstore Bundle | save_plan.js | `src/interfaces/tools/save_plan.js#L96` |
| Write plan.json + bundle.json | save_plan.js | `src/interfaces/tools/save_plan.js#L124-L126` |

### Plan Execution Enforcement
| Gate | Implementation | File |
|------|---------------|----|
| Intent artifact validation | write_file.js | `src/interfaces/tools/write_file.js#L141` |
| Plan authorization check | write_file.js | `src/interfaces/tools/write_file.js#L219` |
| Path allowlist enforcement | plan-enforcer.js | `src/application/plan-enforcer.js#L193-L220` |
| Stub detection in code | write_file.js | `src/interfaces/tools/write_file.js#L348` |
| Preflight checks (tests/lint) | write_file.js | `src/interfaces/tools/write_file.js#L382` |
| Audit logging | write_file.js | `src/interfaces/tools/write_file.js#L406-L419` |

### Intent Artifact Validation
| Requirement | Implementation | File |
|-----------|---------------|----|
| 9-section schema enforced | intent-validator.js | `src/application/intent-validator.js` |
| Authority key-value format | intent-schema.js | `src/domain/intent-schema.js` |
| No code symbols in Purpose | intent-validator.js | `src/application/intent-validator.js` |
| Minimum 30 chars in Purpose | intent-validator.js | `src/application/intent-validator.js` |
| Plan signature verification | intent-validator.js | `src/application/intent-validator.js` |
| Phase ID validation | intent-validator.js | `src/application/intent-validator.js` |

---

## Synchronization Timeline

### Changes Made (2026-03-11)

1. **PLAN_SCAFFOLD.json** — Updated affected_files format
2. **antigravity_planning_prompt_v2.md** — Complete rewrite for clarity and spec alignment
3. **windsurf_execution_prompt_v2.md** — Updated intent schema format and write_file parameters
4. **PLAN_FORMAT_SPEC.md** — NEW: Comprehensive canonical specification
5. **PROMPT_TEMPLATES.md** — Updated with links and alignment status
6. **ALIGNMENT_AUDIT_AND_FIX.md** — NEW: Audit of all misalignments
7. **ALIGNMENT_COMPLETE.md** — NEW: Executive summary of alignment

### No Changes Required To
- `src/application/plan-linter.js` — Already correct
- `src/interfaces/tools/save_plan.js` — Already correct
- `src/interfaces/tools/write_file.js` — Already correct
- `src/interfaces/tools/lint_plan.js` — Already correct
- `src/application/intent-validator.js` — Already correct
- `src/application/plan-enforcer.js` — Already correct

---

## How to Stay Aligned

**If you modify...**

### Plan Structure
→ Update: `PLAN_FORMAT_SPEC.md`, both prompts, `plan-linter.js`

### Tool Outputs
→ Update: Prompt documentation for that tool, `PLAN_FORMAT_SPEC.md`

### Intent Schema
→ Update: `MCP_INTENT_ARTIFACT_SPEC.md`, `windsurf_execution_prompt_v2.md`, `intent-validator.js`

### Validation Rules
→ Update: `PLAN_FORMAT_SPEC.md`, relevant linter code, relevant prompt

**Always update across all 3 categories:**
1. **Code** (linter, tools, validators)
2. **Specs** (format specs, artifact specs)
3. **Prompts** (ANTIGRAVITY, WINDSURF)

---

## Quick Reference Links

| Document | Type | Purpose |
|----------|------|---------|
| [ALIGNMENT_COMPLETE.md](./ALIGNMENT_COMPLETE.md) | Summary | Executive summary (start here) |
| [PLAN_FORMAT_SPEC.md](./docs/PLAN_FORMAT_SPEC.md) | Spec | Canonical JSON schema |
| [antigravity_planning_prompt_v2.md](./docs/templates/antigravity_planning_prompt_v2.md) | Prompt | Planning agent instructions |
| [windsurf_execution_prompt_v2.md](./docs/templates/windsurf_execution_prompt_v2.md) | Prompt | Execution agent instructions |
| [PROMPT_TEMPLATES.md](./docs/PROMPT_TEMPLATES.md) | Index | Navigation hub |
| [PLAN_SCAFFOLD.json](./docs/templates/PLAN_SCAFFOLD.json) | Template | Plan starter template |
| [PLAN_EXAMPLE_FINALIZED.json](./docs/templates/PLAN_EXAMPLE_FINALIZED.json) | Example | Concrete plan example |
| [MCP_INTENT_ARTIFACT_SPEC.md](./docs/reports/MCP_INTENT_ARTIFACT_SPEC.md) | Spec | Intent artifact schema |
| [ALIGNMENT_AUDIT_AND_FIX.md](./ALIGNMENT_AUDIT_AND_FIX.md) | Audit | Misalignment details |

---

## Verification

To verify alignment is maintained:

1. **Plans Pass Linting**
   - Run: `node src/interfaces/tools/lint_plan.js`
   - All PLAN_FORMAT_SPEC.md rules are enforced

2. **Plans Are Saved Correctly**
   - Run: `node src/interfaces/tools/save_plan.js`
   - Signature, path, bundlePath are returned
   - Sigstore bundle is created

3. **Writes Enforce Plans**
   - Run: `node src/interfaces/tools/write_file.js`
   - Intent artifacts are validated
   - Path allowlist is enforced
   - Preflight checks pass

4. **Intent Artifacts Validate**
   - Run: `node src/interfaces/tools/validate-intents.js`
   - 9-section schema enforced
   - Authority format validated

---

**Status**: ✓ ALIGNMENT COMPLETE  
**Last Verified**: 2026-03-11  
**Authority**: ATLAS-GATE-v2 Governance

