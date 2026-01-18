# KAIZA MCP: Canonical Workflow (Authoritative)

> **Enterprise Governance Gateway for LLM-Driven Development**

KAIZA is a high-assurance Model Context Protocol (MCP) implementation designed to enforce strict role boundaries, deterministic execution, and cryptographic auditability. It transforms an LLM agent from an unconstrained generator into a governed **Execution Authority**.

## 🛠️ Technical Setup

### Prerequisites

- **Node.js**: version 18 or later.
- **MCP Client**: compatible client like Claude Desktop or Windsurf.

### Installation

```bash
git clone <repository-url> KAIZA-MCP-server
cd KAIZA-MCP-server
npm install
```

### Configuration

Add KAIZA to your MCP client configuration (e.g., `claude_desktop_config.json` or `mcp_config.json`):

```json
{
  "mcpServers": {
    "kaiza": {
      "command": "node",
      "args": ["/absolute/path/to/KAIZA-MCP-server/server.js"],
      "env": {
        "KAIZA_BOOTSTRAP_SECRET": "your-secure-secret-here"
      }
    }
  }
}
```

> [!IMPORTANT]
> Change `/absolute/path/to/KAIZA-MCP-server` to the actual location on your machine.
> `KAIZA_BOOTSTRAP_SECRET` is required for initializing fresh mission roots.

## 🛡️ The Authoritative Invariants

1. **Mandatory Ignition**: No operations are permitted without a `begin_session` call locking the `workspace_root`.
2. **Role Purity**: Tools are manifested dynamically based on the active role (**ANTIGRAVITY** for Planning, **WINDSURF** for Execution).
3. **Hash-Only addressing**: Plans are identified strictly by their SHA256 content hash (`<HASH>.md`).
4. **Canonical Metadata**: Every write operation must include mandatory role-specific metadata for the audit chain.
5. **Zero Discovery**: No directory listing allowed outside of explicit governance discovery (`list_plans`).

---

## 🚀 The Lifecycle

### 1. Session Ignition

Every session **must** begin with `begin_session`. This locks the repository root and initializes the path resolver.

### 2. Role Selection

- **ANTIGRAVITY**: The Planning Role. Focuses on architectural intent and semantic contracts.
- **WINDSURF**: The Execution Role. Focuses on mechanical implementation of approved plans.

### 3. Plan Authorization

All modifications must target an **APPROVED** plan. A plan is approved if it contains the canonical header:

```markdown
<!--
KAIZA_PLAN_HASH: <64-char-sha256-hash>
ROLE: <ANTIGRAVITY|WINDSURF>
STATUS: APPROVED
-->
```

---

## 🏗️ Role: ANTIGRAVITY (The Architect)

**Purpose**: Define the mission parameters, architectural boundaries, and implementation contracts.

### Example Prompt
>
> "🧠 I am in the **ANTIGRAVITY** role. I need to initialize a session at `/home/lin/Documents/my-project`. Once initialized, I will read the requirements, call `list_plans` to see existing state, and then use `bootstrap_create_foundation_plan` to establish a new governance plan for the feature I'm designing. I will ensure the plan content includes the `STATUS: APPROVED` header and the SHA256 hash of the content."

### Planning Tools

- `list_plans`: Discover approved plans in the repository.
- `read_file`: Safe, audited reading of existing code and docs.
- `bootstrap_create_foundation_plan`: Create the initial approved mission contract.

---

## 🔨 Role: WINDSURF (The Builder)

**Purpose**: Execute the changes specified in approved plans with absolute mechanical precision.

### Example Prompt
>
> "⚙️ I am in the **WINDSURF** role. I need to begin a session at `/home/lin/Documents/my-project`. After ignition, I will satisfy the prompt gate via `read_prompt({ name: 'WINDSURF_CANONICAL' })`. I will then list plans to find the approved hash for the task. Finally, I will implement the changes using `write_file`, ensuring I provide the `plan` hash and all required role metadata (`role`, `purpose`, `connectedVia`, etc.)."

### Execution Tools

- `read_prompt`: Unlock write capabilities by acknowledging the canonical protocol.
- `write_file`: Authoritative audited write. Requires a valid plan hash and full metadata.
- `read_audit_log`: Inspect the session's hash chain for verification.

---

## 🛠️ Tool Reference (Core)

### `begin_session`

Locks the session to an absolute `workspace_root`. **MANDATORY FIRST CALL.**

### `write_file`

The primary mutation tool.

- **Plan Hash**: Must match a file in `docs/plans/<HASH>.md`.
- **Metadata**: Requires `role`, `purpose`, `connectedVia`, `registeredIn`, `failureModes`.
- **Stub Detector**: Automatically rejects code containing `TODO`, `FIXME`, or placeholder logic.

---

## 📁 Repository Governance

Plans and audit data are stored in canonical locations:

- **Plans**: `docs/plans/` (Hash-addressed `.md` files).
- **Audit Log**: `audit-log.jsonl` (Append-only operation history).
- **Governance**: `governance.json` (Maintains bootstrap state).

## 🧪 Verification

Ensure your environment is compliant by running:

```bash
npm run verify
```

This executes the full suite of bootstrap, enforcement, and security penetration tests.

---
**KAIZA MCP**: *Refining the boundary between intelligence and execution.*
