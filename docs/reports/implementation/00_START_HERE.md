# 🚀 ATLAS-GATE MCP Server - START HERE

**Welcome to ATLAS-GATE - Enterprise-Grade Governance for AI-Generated Code**

---

## What You're Looking At

The ATLAS-GATE MCP Server is a production-ready system that:

✅ **Mandatory Session Ignition** - Authority starts with `begin_session`  
✅ **Role Purity** - Isolated Planning (**ANTIGRAVITY**) and Execution (**WINDSURF**)  
✅ **Immutable Audit Chain** - Every change is hash-chained and logged  
✅ **Plan-Driven Writes** - No modification without an approved mission hash  
✅ **Zero Autonomy** - Agents move only when the law is clear  

---

## In 30 Seconds

1. **Clone** the repository
2. **Install** dependencies with `npm install`
3. **Set** environment variable: `ATLAS-GATE_BOOTSTRAP_SECRET`
4. **Run** the server for your role: `node bin/atlas-gate-mcp-antigravity.js`
5. **Ignite**: Call `begin_session` with your absolute workspace root

---

## 🏗️ The 2-Role Architecture

ATLAS-GATE enforces a strict binary authority model:

### 🧠 ANTIGRAVITY (The Architect)

- **Objective**: Translate strategic intent into execution-locked plans.
- **Tools**: `list_plans`, `read_file`, `bootstrap_create_foundation_plan`.
- **Constraint**: Purely semantic. No implementation code or inline output.

### ⚙️ WINDSURF (The Builder)

- **Objective**: Mechanically implement approved plans with zero autonomy.
- **Tools**: `read_prompt`, `read_file`, `write_file`, `read_audit_log`.
- **Constraint**: Absolute adherence to SHA256 plan hashes. 100% chat silence for file content.

---

## 🛠️ The 7 Core Tools

| Tool | Role | Purpose |
|------|------|---------|
| **`begin_session`** | Both | **MANDATORY FIRST CALL**. Checks directory and locks root. |
| **`read_prompt`** | Both | Fetches the canonical role-specific blueprint. Required for writes. |
| **`list_plans`** | Both | Discovers hash-addressed `APPROVED` plans in `docs/plans/`. |
| **`read_file`** | Both | Safe, workspace-relative file inspection. |
| **`write_file`** | WINDSURF | Audited mutation. Requires valid plan hash and metadata. |
| **`read_audit_log`** | Both | Verification of the immutable session history. |
| **`bootstrap_create_foundation_plan`** | ANTIGRAVITY | Creation of the initial governance contract. |

---

## Typical Lifecycle

1. **Ignition**: `begin_session({ workspace_root: "/abs/path" })`
2. **Authorization**: `read_prompt({ name: "..." })`
3. **Discovery**: `list_plans()`
4. **Execution**: `write_file({ path, content, plan, ...metadata })`
5. **Verification**: `read_audit_log()`

---

## Choose Your Path

- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Complete Setup**: [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)
- **Deep Technical Audit**: [FINAL_VERIFICATION_REPORT.md](FINAL_VERIFICATION_REPORT.md)

---
**ATLAS-GATE MCP**: *Refining the boundary between intelligence and execution.*
