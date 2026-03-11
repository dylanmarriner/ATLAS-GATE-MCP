# Template Registry

## Active canonical templates

| File | Status | Purpose |
|---|---|---|
| `docs/templates/antigravity_planning_prompt_v2.md` | Active | Planning prompt aligned to `lint_plan` + `save_plan` |
| `docs/templates/windsurf_execution_prompt_v2.md` | Active | Execution prompt aligned to `write_file` + plan enforcement |
| `docs/templates/PLAN_SCAFFOLD.json` | Active | Canonical JSON plan scaffold |
| `docs/templates/INTENT_ARTIFACT_TEMPLATE.md` | Active | Canonical intent artifact scaffold |
| `docs/templates/PLAN_EXAMPLE_FINALIZED.json` | Active | Example of a finalized JSON plan |

## Verification target

These templates must align with:

- `src/application/plan-linter.js`
- `src/application/plan-enforcer.js`
- `src/application/intent-validator.js`
- `src/domain/intent-schema.js`
- `src/interfaces/tools/lint_plan.js`
- `src/interfaces/tools/save_plan.js`
- `src/interfaces/tools/write_file.js`
- `src/interfaces/server.js`

## Current plan storage contract

- approved saved plans: `docs/plans/<signature>.json`
- signature bundles: `docs/plans/<signature>.bundle.json`

## Legacy note

Legacy Markdown plan material may still be present for compatibility or migration, but the canonical template registry is JSON-first.
