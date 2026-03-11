# ATLAS-GATE Prompt Templates - Master Index

**Status**: CONSOLIDATED (2026-03-11)  
**Authority**: ATLAS-GATE-v2 Governance

---

## CANONICAL TEMPLATES (USE THESE)

These are the **ONLY** templates you should use. All others are archived/deprecated.

### 1. ANTIGRAVITY Planning Prompt
**File**: `antigravity_planning_prompt_v2.md`  
**Updated**: 2026-03-11  
**Status**: ✓ CURRENT (fully aligned with PLAN_FORMAT_SPEC.md)

**What it does**: Instructions for ANTIGRAVITY agent to create governance-compliant plans

**Key sections**:
- YOUR TOOLS (lint_plan, save_plan, begin_session, etc.)
- PLAN STRUCTURE (10 required top-level keys)
- FORBIDDEN CONTENT (stub patterns, ambiguous language, code symbols)
- WORKFLOW (Initialize → Analyze → Draft → Lint → Save → Deliver)

**Use this when**: Instructing any AI agent to create ATLAS-GATE plans

---

### 2. WINDSURF Execution Prompt
**File**: `windsurf_execution_prompt_v2.md`  
**Updated**: 2026-03-11  
**Status**: ✓ CURRENT (fully aligned with PLAN_FORMAT_SPEC.md and MCP_INTENT_ARTIFACT_SPEC.md)

**What it does**: Instructions for WINDSURF agent to execute approved plans

**Key sections**:
- YOUR TOOLS (write_file, begin_session, etc.)
- OPERATOR INPUT (plan signature + path)
- PLAN ANATOMY (10 required keys)
- INTENT ARTIFACT LAW (9-section canonical schema)
- EXECUTION SEQUENCE (Initialize → Read → Validate → Create Intent → Write → Verify)

**Use this when**: Instructing any AI agent to execute ATLAS-GATE plans

---

## REFERENCE DOCUMENTS (USE THESE FOR CONTEXT)

### Templates
- `PLAN_SCAFFOLD.json` — Starter template with 10 required keys and examples
- `PLAN_EXAMPLE_FINALIZED.json` — Concrete example (JWT auth plan)

### Specifications
- `../PLAN_FORMAT_SPEC.md` — Canonical JSON schema (complete reference)
- `../reports/MCP_INTENT_ARTIFACT_SPEC.md` — Intent artifact schema (9 sections)
- `../PROMPT_TEMPLATES.md` — Index of all prompts and tools

---

## ARCHIVED/DEPRECATED FILES

These files are **OUT OF DATE** and should NOT be used. They are kept for historical reference only.

| File | Status | Reason |
|------|--------|--------|
| `ANTIGRAVITY_PLANNING_PROMPT.md` | DEPRECATED | Superseded by v2 |
| `antigravity_planning_prompt_template.md` | DEPRECATED | Old format, incomplete schema |
| `ANTIGRAVITY_SYSTEM_PROMPT.md` | DEPRECATED | System prompt (use v2 planning prompt instead) |
| `WINDSURF_EXECUTION_PROMPT.md` | DEPRECATED | Superseded by v2 |
| `WINDSURF_EXECUTION_PROMPT_UPDATED.md` | DEPRECATED | Partial update, use v2 |
| `windsurf_implementation_prompt_template.md` | DEPRECATED | Old format, incomplete schema |
| `WINDSURF_SYSTEM_PROMPT.md` | DEPRECATED | System prompt (use v2 execution prompt instead) |
| `PLANNING_PROMPT_UPDATED.md` | DEPRECATED | Partial update, use v2 |

---

## How to Use

### For ANTIGRAVITY (Planning)
1. Copy `antigravity_planning_prompt_v2.md`
2. Feed it to your AI agent along with the user's requirements
3. Agent creates JSON plan matching `PLAN_FORMAT_SPEC.md`
4. Agent calls `lint_plan` tool to validate
5. Agent calls `save_plan` tool to sign and persist
6. Agent delivers signature to operator

### For WINDSURF (Execution)
1. Copy `windsurf_execution_prompt_v2.md`
2. Feed it to your AI agent along with:
   - Plan signature (from ANTIGRAVITY)
   - Plan path (docs/plans/<SIGNATURE>.json)
3. Agent reads plan and creates intent artifacts (9-section schema)
4. Agent calls `write_file` tool for each file
5. Agent runs verification commands
6. All writes are audited

### For AI Agent Developers
1. Reference: `../PLAN_FORMAT_SPEC.md` (complete JSON schema)
2. Reference: `../reports/MCP_INTENT_ARTIFACT_SPEC.md` (intent schema)
3. Reference: `../PROMPT_TEMPLATES.md` (tool documentation)

---

## Validation Checklist

Before using any prompt template:

- [ ] File name is `antigravity_planning_prompt_v2.md` or `windsurf_execution_prompt_v2.md`
- [ ] File was updated on or after 2026-03-11
- [ ] File contains reference to PLAN_FORMAT_SPEC.md
- [ ] For ANTIGRAVITY: Contains "Forbidden Content in Plans" section
- [ ] For WINDSURF: Contains "INTENT ARTIFACT LAW" section
- [ ] Tool outputs documented match actual tool implementations

---

## Migration Guide: Old Prompts → v2

If you have code using old prompts, update as follows:

**Old**: `ANTIGRAVITY_PLANNING_PROMPT.md`  
**New**: `antigravity_planning_prompt_v2.md`

**Old**: `WINDSURF_EXECUTION_PROMPT.md`  
**New**: `windsurf_execution_prompt_v2.md`

**Changes in v2**:
- ANTIGRAVITY now emphasizes STRICT JSON format
- ANTIGRAVITY now documents forbidden patterns (stubs, ambiguous language)
- WINDSURF now clarifies plan parameter is a signature STRING
- WINDSURF now shows correct 9-section intent artifact schema
- WINDSURF now documents Authority format (key-value pairs, not bulleted)
- Both prompts now align with PLAN_FORMAT_SPEC.md

---

## Questions?

See: `../../ALIGNMENT_INDEX.md` (navigation hub for all alignment docs)

---

**Status**: ✓ CONSOLIDATED  
**Last Updated**: 2026-03-11  
**Authority**: ATLAS-GATE-v2 Governance

