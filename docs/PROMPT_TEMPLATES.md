# AI Agent Prompt Templates for ATLAS-GATE MCP

**Purpose**: Templates for instructing AI agents (Claude, GPT, etc.) how to use ATLAS-GATE MCP effectively. These templates align with the v2 signature-based governance system.

---

## 1. Role: Software Architect (ANTIGRAVITY)

**Template**: [antigravity_planning_prompt_v2.md](file:///media/linnyux/development1/developing/ATLAS-GATE-MCP/docs/templates/antigravity_planning_prompt_v2.md)

### Key Responsibilities
1. **Analyze**: Use `begin_session` and `read_file` to understand requirements.
2. **Design**: Create a detailed plan without stubs or placeholders.
3. **Validate**: Use `lint_plan` to verify structure and sign the plan.
4. **Publish**: Save the signed plan to `docs/plans/<signature>.md`.

### Core Tools
- `begin_session({ workspace_root })`
- `read_file({ path })`
- `lint_plan({ content })`

---

## 2. Role: Code Executor (WINDSURF)

**Template**: [windsurf_execution_prompt_v2.md](file:///media/linnyux/development1/developing/ATLAS-GATE-MCP/docs/templates/windsurf_execution_prompt_v2.md)

### Key Responsibilities
1. **Initialize**: Use `begin_session` and `read_prompt({ name: "WINDSURF_CANONICAL" })`.
2. **Verify**: Read the plan and ensure it matches the provided signature.
3. **Execute**: Use `write_file` with the plan's `authority` (the signature).
4. **Audit**: Ensure every write is documented in the audit log.

### Core Tools
- `begin_session({ workspace_root })`
- `read_prompt({ name: "WINDSURF_CANONICAL" })`
- `write_file({ path, content, plan, role, purpose, intent, authority, failureModes })`

---

## 3. Plan Scaffold

**Template**: [plan_scaffold.md](file:///media/linnyux/development1/developing/ATLAS-GATE-MCP/docs/templates/plan_scaffold.md)

Use this as a starting point for any new implementation plan.

---

## Example Implementation Workflow

### Planning Phase
```javascript
// 1. Start session
await begin_session({ workspace_root: "/path/to/project" });

// 2. Draft plan (following scaffold)
const draft = `...`;

// 3. Lint and Sign
const result = await lint_plan({ content: draft });
// result.signature -> "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o"
```

### Execution Phase
```javascript
// 1. Start session and unlock
await begin_session({ workspace_root: "/path/to/project" });
await read_prompt({ name: "WINDSURF_CANONICAL" });

// 2. Execute write
await write_file({
  path: "src/auth.js",
  content: "...",
  plan: "PLAN_AUTH_V1",
  role: "EXECUTABLE",
  purpose: "...",
  intent: "...",
  authority: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o", // Signature from linter
  failureModes: "..."
});
```

---

**STATUS**: PRODUCTION-READY
**LAST UPDATED**: 2026-02-22
