# ATLAS-GATE MCP — START HERE

**Status**: ✓ PRODUCTION READY (2026-03-11)

---

## Quick Navigation

### I want to...

**Create a plan** (ANTIGRAVITY)
→ Read [`docs/templates/antigravity_planning_prompt_v2.md`](./docs/templates/antigravity_planning_prompt_v2.md)  
→ Reference [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md)  
→ Template [`docs/templates/PLAN_SCAFFOLD.json`](./docs/templates/PLAN_SCAFFOLD.json)

**Execute a plan** (WINDSURF)
→ Read [`docs/templates/windsurf_execution_prompt_v2.md`](./docs/templates/windsurf_execution_prompt_v2.md)  
→ Reference [`docs/reports/MCP_INTENT_ARTIFACT_SPEC.md`](./docs/reports/MCP_INTENT_ARTIFACT_SPEC.md)  
→ Reference [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md)

**Understand the system**
→ Read [`ALIGNMENT_INDEX.md`](./ALIGNMENT_INDEX.md) (comprehensive index)  
→ Read [`ALIGNMENT_COMPLETE.md`](./ALIGNMENT_COMPLETE.md) (what was fixed)  
→ Read [`TOOL_VERIFICATION.md`](./TOOL_VERIFICATION.md) (tool correctness)

**Learn all the rules**
→ Read [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md) (canonical JSON schema)  
→ Read [`docs/reports/MCP_INTENT_ARTIFACT_SPEC.md`](./docs/reports/MCP_INTENT_ARTIFACT_SPEC.md) (intent artifacts)

**Find something specific**
→ Use [`ALIGNMENT_INDEX.md`](./ALIGNMENT_INDEX.md) (master index with all links)

---

## Core Documents

### Essential
- 📋 [`ALIGNMENT_INDEX.md`](./ALIGNMENT_INDEX.md) — **Master navigation hub** (start here if lost)
- 📋 [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md) — **Canonical JSON schema** (the source of truth)
- 📋 [`docs/templates/README.md`](./docs/templates/README.md) — **Template index** (which files to use)

### Prompts (Copy & Paste to AI)
- 📄 [`docs/templates/antigravity_planning_prompt_v2.md`](./docs/templates/antigravity_planning_prompt_v2.md) — Instructions for planning agent
- 📄 [`docs/templates/windsurf_execution_prompt_v2.md`](./docs/templates/windsurf_execution_prompt_v2.md) — Instructions for execution agent

### Templates (Use as Baseline)
- 📦 [`docs/templates/PLAN_SCAFFOLD.json`](./docs/templates/PLAN_SCAFFOLD.json) — Starter template
- 📦 [`docs/templates/PLAN_EXAMPLE_FINALIZED.json`](./docs/templates/PLAN_EXAMPLE_FINALIZED.json) — Concrete example

### Specifications (Reference)
- 📖 [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md) — Complete JSON schema
- 📖 [`docs/PROMPT_TEMPLATES.md`](./docs/PROMPT_TEMPLATES.md) — Tool documentation & outputs
- 📖 [`docs/reports/MCP_INTENT_ARTIFACT_SPEC.md`](./docs/reports/MCP_INTENT_ARTIFACT_SPEC.md) — Intent artifact schema

### Reports
- 📊 [`ALIGNMENT_COMPLETE.md`](./ALIGNMENT_COMPLETE.md) — What was fixed & verified
- 📊 [`ALIGNMENT_AUDIT_AND_FIX.md`](./ALIGNMENT_AUDIT_AND_FIX.md) — Detailed audit of misalignments
- 📊 [`TOOL_VERIFICATION.md`](./TOOL_VERIFICATION.md) — Verification that all tools work correctly
- 📊 [`CLEANUP_SUMMARY.md`](./CLEANUP_SUMMARY.md) — What was archived

---

## One-Minute Overview

### What is ATLAS-GATE MCP?

A cryptographically signed governance system for AI code execution:

1. **ANTIGRAVITY** (planning agent) creates JSON plans
   - Plans specify scope, phases, verification gates
   - Plans are validated by linter
   - Plans are signed with Cosign (ECDSA P-256)
   - Plans are delivered to WINDSURF

2. **WINDSURF** (execution agent) executes plans
   - Reads signed plan
   - Creates intent artifacts (9-section schema)
   - Calls write_file with plan authorization
   - Runs verification gates
   - All writes are audited

3. **Enforcement**
   - All plans must pass linting (10 required fields)
   - All writes require plan authorization
   - All writes require intent artifacts
   - All paths must be in allowlist
   - Forbidden patterns detected (stubs, ambiguous language)
   - Cryptographic signatures prevent tampering

---

## Getting Started

### For ANTIGRAVITY (Planning)

1. Copy prompt: [`docs/templates/antigravity_planning_prompt_v2.md`](./docs/templates/antigravity_planning_prompt_v2.md)
2. Read spec: [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md)
3. Use template: [`docs/templates/PLAN_SCAFFOLD.json`](./docs/templates/PLAN_SCAFFOLD.json)
4. Create JSON plan matching 10-key structure
5. Call `lint_plan` tool to validate
6. Call `save_plan` tool to sign
7. Deliver signature to WINDSURF

### For WINDSURF (Execution)

1. Copy prompt: [`docs/templates/windsurf_execution_prompt_v2.md`](./docs/templates/windsurf_execution_prompt_v2.md)
2. Read intent spec: [`docs/reports/MCP_INTENT_ARTIFACT_SPEC.md`](./docs/reports/MCP_INTENT_ARTIFACT_SPEC.md)
3. Receive plan signature from ANTIGRAVITY
4. Read plan: `docs/plans/{SIGNATURE}.json`
5. Create intent artifacts (9-section schema)
6. Call `write_file` with plan authorization
7. Run verification gates
8. Report results to operator

---

## Key Alignments

✓ **Prompts aligned with specs**
- ANTIGRAVITY prompt matches PLAN_FORMAT_SPEC.md exactly
- WINDSURF prompt matches intent spec exactly
- Both reference canonical formats

✓ **Tools aligned with specs**
- lint_plan validates 10 required keys
- save_plan enforces lint-before-save
- write_file validates plan authorization

✓ **All validation rules synchronized**
- phase_id format (UPPERCASE_WITH_UNDERSCORES)
- path_allowlist rules (no `/`, no `..`, no `${}`)
- Stub patterns (TODO, FIXME, XXX, HACK, stub, mock, placeholder, TBD, WIP)
- Ambiguous language (may, should, if possible, optional, try to, attempt to)
- Code symbols in objectives

---

## Archived Documents

Old/redundant documents moved to [`docs/templates/ARCHIVED/`](./docs/templates/ARCHIVED/)

See [`CLEANUP_SUMMARY.md`](./CLEANUP_SUMMARY.md) for details.

---

## Help

**Lost?** → Read [`ALIGNMENT_INDEX.md`](./ALIGNMENT_INDEX.md)

**Need a quick reference?** → See section above: "I want to..."

**Need all the rules?** → Read [`docs/PLAN_FORMAT_SPEC.md`](./docs/PLAN_FORMAT_SPEC.md)

**Need to verify something?** → Check [`TOOL_VERIFICATION.md`](./TOOL_VERIFICATION.md)

---

## Status

✓ **All components aligned** (2026-03-11)  
✓ **All tools verified working**  
✓ **All specs comprehensive**  
✓ **All prompts canonical**  
✓ **Ready for production**

---

**Last Updated**: 2026-03-11  
**Authority**: ATLAS-GATE-v2 Governance

