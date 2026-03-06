---
description: "Enterprise MCP Security Gateway with MCP-Only Sandbox Enforcement"
---

# ATLAS-GATE MCP

**Description**: ATLAS-GATE is a zero-trust, cryptography-verified implementation of the Model Context Protocol (MCP). It is explicitly designed to enforce a "Plans are Laws" architecture, ensuring deterministic, auditable, and restrictively permissioned AI agent capabilities.

**Category**: Security, Governance, Infrastructure

## Capabilities

- **Zero-Trust Execution**: Exposes no operations to the AI without prior cryptographic authorization.
- **Deterministic Boundaries**: Paths are restricted to isolated tenant workspaces dynamically via strict chroot-esque bounds.
- **Immutable Audit Trails**: Every byte read, written, or deleted generates a cryptographically signed SIEM-ready JSONL audit log.
- **Cosign Plan Verification**: The AI agent can only execute actions pre-approved via an external human-in-the-loop signing ceremony.
- **Hardened Session Locking**: Single tenant execution runs per instantiated container.
- **Disallowed Globals**: Hard-blocks Node's `child_process.exec()` to prevent reverse shells.

## Usage

ATLAS-GATE is integrated into the agent as an MCP server. It intercepts and governs all file operations and executions, ensuring they comply with the predetermined, signed execution plans.

The server is run locally via the node script: `./bin/ATLAS-GATE-MCP-antigravity.js` and provides standard MCP tools for interacting securely with the host system.

Whenever performing actions that could modify the system (read, write, execute), ATLAS-GATE ensures these actions are logged and authorized. Ensure you are operating within the provided workspace and providing necessary nonces for bootstrapping if required.
