# AI Agent Prompt Templates for ATLAS-GATE MCP

**Purpose**: Templates for instructing AI agents how to use ATLAS-GATE MCP tools correctly. These align with the v2 signature-based governance system.

---

## 1. Role: Planning Agent (ANTIGRAVITY)

**Template**: [antigravity_planning_prompt_v2.md](file:///media/linnyux/development1/developing/ATLAS-GATE-MCP/docs/templates/antigravity_planning_prompt_v2.md)

### Core Tools
- `begin_session({ workspace_root })` — MANDATORY first call
- `read_file({ path })` — read workspace files
- `lint_plan({ content })` — validate plan structure; returns `{ passed, errors, warnings }`
- `save_plan({ content })` — sign + save to `docs/plans/<signature>.md`; returns `{ signature, path }`
- `list_plans()` — list existing approved plans

### Key Responsibilities
1. **Analyze**: Use `begin_session` and `read_file` to understand requirements.
2. **Design**: Draft a complete plan following the 7-section scaffold.
3. **Validate**: Use `lint_plan` to verify structure — iterate until `passed: true`.
4. **Save**: Use `save_plan` to sign and persist the plan.
5. **Deliver**: Provide the `signature` and `path` to the operator.

---

## 2. Role: Execution Agent (WINDSURF)

**Template**: [windsurf_execution_prompt_v2.md](file:///media/linnyux/development1/developing/ATLAS-GATE-MCP/docs/templates/windsurf_execution_prompt_v2.md)

### Core Tools
- `begin_session({ workspace_root })` — MANDATORY first call
- `read_file({ path })` — read the signed plan and workspace files
- `write_file({ path, plan, intent, content, ... })` — audited file write
- `list_plans()` — verify plan exists

### Key Responsibilities
1. **Initialize**: Call `begin_session`.
2. **Read Plan**: Use `read_file` with the plan path from the operator.
3. **Execute**: Use `write_file` for every file change — must reference the plan signature.
4. **Verify**: Run gates defined in the plan after writes.

---

## 3. Plan Scaffold

**Template**: [plan_scaffold.md](file:///media/linnyux/development1/developing/ATLAS-GATE-MCP/docs/templates/plan_scaffold.md)

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
// result → { signature: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o", path: "docs/plans/y6RIU0X...md" }
```

### Execution Phase (WINDSURF)
```javascript
// 1. Lock workspace
await begin_session({ workspace_root: "/path/to/project" });

// 2. Read signed plan
await read_file({ path: "docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.md" });

// 3. Execute write
await write_file({
  path: "src/auth.js",
  content: "... complete implementation ...",
  plan: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  intent: "Implement JWT token validation with refresh and error handling"
});
```

---

**STATUS**: PRODUCTION-READY
**LAST UPDATED**: 2026-02-24
