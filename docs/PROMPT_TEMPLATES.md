# AI Agent Prompt Templates for ATLAS-GATE MCP

**Purpose**: Templates for instructing AI agents how to use ATLAS-GATE MCP tools correctly. These align with the v2 signature-based governance system.

**Authority**: ATLAS-GATE-v2 Governance  
**Status**: ALIGNED (2026-03-11) — Prompts, templates, linter, and tools are fully synchronized  
**Canonical Reference**: [PLAN_FORMAT_SPEC.md](./PLAN_FORMAT_SPEC.md)

---

## Quick Links

- **[PLAN_FORMAT_SPEC.md](./PLAN_FORMAT_SPEC.md)** — Canonical JSON schema and format for all plans
- **[ALIGNMENT_AUDIT_AND_FIX.md](../ALIGNMENT_AUDIT_AND_FIX.md)** — Alignment audit and synchronization report

---

## 1. Role: Planning Agent (ANTIGRAVITY)

**Template**: [antigravity_planning_prompt_v2.md](./templates/antigravity_planning_prompt_v2.md)

### Core Tools

- `begin_session({ workspace_root })` — MANDATORY first call
- `read_file({ path })` — read workspace files
- `lint_plan({ content })` — validate plan structure; returns `{ passed, errors, warnings }`
- `save_plan({ content })` — sign + save `docs/plans/<signature>.json` and `<signature>.bundle.json`; returns `{ signature, path, bundlePath }`
- `list_plans()` — list existing approved plans
- `generate_maturity_report()` — compute workspace maturity and write formal report

### Key Responsibilities

1. **Analyze**: Use `begin_session` and `read_file` to understand requirements.
2. **Design**: Draft a complete JSON plan following the canonical scaffold.
3. **Validate**: Use `lint_plan` to verify structure — iterate until `passed: true`.
4. **Save**: Use `save_plan` to sign and persist the plan.
5. **Deliver**: Provide the `signature` and `path` to the operator.

---

## 2. Role: Execution Agent (WINDSURF)

**Template**: [windsurf_execution_prompt_v2.md](./templates/windsurf_execution_prompt_v2.md)

### Core Tools

- `begin_session({ workspace_root })` — MANDATORY first call
- `read_file({ path })` — read the signed plan and workspace files
- `write_file({ path, plan, intent, content, ... })` — audited file write (requires `.intent.md` file first)
- `list_plans()` — verify plan exists
- `generate_remediation_proposals({ plan_signature, evidence_selectors })` — generate proposals from errors
- `list_proposals()` — list pending remediation proposals

### Key Responsibilities

1. **Initialize**: Call `begin_session`.
2. **Read Plan**: Use `read_file` with the plan path from the operator.
3. **Execute**: Use `write_file` for every file change — must reference the plan signature.
4. **Verify**: Run gates defined in the plan after writes.

---

## 3. Plan Scaffold & Format

**Template**: [PLAN_SCAFFOLD.json](./templates/PLAN_SCAFFOLD.json)  
**Canonical Spec**: [PLAN_FORMAT_SPEC.md](./PLAN_FORMAT_SPEC.md) — Complete JSON schema documentation

**Key Points**:

- Use PLAN_SCAFFOLD.json as the starting template
- Refer to PLAN_FORMAT_SPEC.md for all field requirements
- All plans must match the 10-key structure exactly
- Plans are validated by plan-linter before saving

Use as a starting point for any new implementation plan. Guaranteed to pass `lint_plan` structure validation when filled in correctly.

---

## Example Workflow

### Planning Phase (ANTIGRAVITY)

```javascript
// 1. Lock workspace
await begin_session({ workspace_root: "/path/to/project" });

// 2. Read relevant files
const code = await read_file({ path: "src/auth.js" });

// 3. Validate draft
const lint = await lint_plan({ content: draftPlan });
// lint → { passed: true, errors: [], warnings: [] }

// 4. Sign and save
const result = await save_plan({ content: draftPlan });
// result → { signature: "MEUCIQDlQ...", path: "docs/plans/MEUCIQDlQ...json", bundlePath: "docs/plans/MEUCIQDlQ...bundle.json" }
```

### Execution Phase (WINDSURF)

```javascript
// 1. Lock workspace
await begin_session({ workspace_root: "/path/to/project" });

// 2. Read signed plan
await read_file({ path: "docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.json" });

// 3. Create Intent Artifact FIRST (Mandatory Level-5 compliance)
await write_file({
  path: "src/auth.js.intent.md",
  content: "# Intent: src/auth.js\n\n## Purpose\n...",
  plan: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o"
});

// 4. Execute Write
await write_file({
  path: "src/auth.js",
  content: "... complete implementation ...",
  plan: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  intent: "Implement JWT token validation"
});
```

---

## Alignment & Cross-References

This document aligns with:

| Component | File | Status |
|-----------|------|--------|
| Plan Linter | `src/application/plan-linter.js` | ✓ Validates all required fields |
| Save Plan Tool | `src/interfaces/tools/save_plan.js` | ✓ Signs and persists plans |
| Lint Plan Tool | `src/interfaces/tools/lint_plan.js` | ✓ Returns errors/warnings/summary |
| Write File Tool | `src/interfaces/tools/write_file.js` | ✓ Enforces plan authorization |
| Intent Spec | `docs/reports/MCP_INTENT_ARTIFACT_SPEC.md` | ✓ 9-section canonical schema |
| Plan Format | `docs/PLAN_FORMAT_SPEC.md` | ✓ Complete JSON schema |

---

**STATUS**: PRODUCTION-READY  
**LAST UPDATED**: 2026-03-11  
**ALIGNMENT**: All prompts, templates, linter, tools, and specs fully synchronized
