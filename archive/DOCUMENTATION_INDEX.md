# ATLAS-GATE-MCP Documentation Index

**Version**: 2.0.0  
**Last Updated**: 2026-01-31  
**Status**: Production-Ready with Enhanced Security Enforcement

---

## 📋 Quick Navigation

### For Your Role

- **Decision-Maker** → [Executive Overview](./EXECUTIVE_OVERVIEW.md)
- **Developer/Operator** → [Architecture Overview](#core-documentation)
- **Security Engineer** → [Security Policy](./SECURITY.md) + [MCP Sandbox Enforcement](./MCP_SANDBOX_ENFORCEMENT.md)
- **Contributing** → [Contributing Guide](./CONTRIBUTING.md)

### By Topic

- **Enforcement & Security** → [Enforcement Summary](#enforcement--security)
- **Getting Started** → [Installation & Setup](#installation--setup)
- **Architecture** → [Core Documentation](#core-documentation)
- **Troubleshooting** → [Operations & Support](#operations--support)

---

## 🆕 Version 2.0 Changes

### New in v2.0

**MCP-Only Sandbox Enforcement**

- Windsurf and Antigravity locked into MCP-only mode
- No filesystem access outside of tools
- No shell execution, no dangerous imports
- Process-level lockdown with integrity verification

**Tool Parameter Enforcement**

- Strict schema enforcement for all tools
- Wrong types/fields rejected at MCP boundary
- Clear error messages for IDE developers
- Comprehensive audit trail of violations

**Documentation Updates**

- 5 new enforcement documentation files
- Updated AGENTS.md with sandbox requirements
- Updated README with enforcement references
- Architecture diagrams of enforcement flow

**Files Added**

- `core/mcp-sandbox.js` — Process-level sandbox
- `core/tool-enforcement.js` — Tool parameter validation
- `MCP_SANDBOX_ENFORCEMENT.md` — Sandbox documentation
- `TOOL_ENFORCEMENT.md` — Tool validation documentation
- `ENFORCEMENT_QUICKSTART.md` — Developer quick start
- `ENFORCEMENT_SUMMARY.md` — Complete enforcement overview
- `ENFORCEMENT_REFERENCE.md` — Quick reference card

**Files Updated**

- `AGENTS.md` — Added sandbox & enforcement section
- `bin/ATLAS-GATE-MCP-windsurf.js` — Sandbox initialization
- `bin/ATLAS-GATE-MCP-antigravity.js` — Sandbox initialization
- `server.js` — Tool enforcement integration
- `README.md` — Links to enforcement docs
- `package.json` — Complete project metadata

---

## Installation & Setup

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](./README.md) | Installation, configuration, quick start | Everyone |
| [BOOTSTRAP_SETUP_COMPLETE.md](./BOOTSTRAP_SETUP_COMPLETE.md) | Bootstrap secret setup | Operators |
| [ANTIGRAVITY_SETUP.md](./ANTIGRAVITY_SETUP.md) | Antigravity role setup | Operators |

**Quick Start**:

```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP-server.git
cd ATLAS-GATE-MCP-server
npm install
node bin/ATLAS-GATE-MCP-windsurf.js    # Start Windsurf (MCP-only)
node bin/ATLAS-GATE-MCP-antigravity.js # Start Antigravity (MCP-only)
```

---

## Core Documentation

### Architecture & Design

| Document | Purpose | Audience |
|----------|---------|----------|
| [EXECUTIVE_OVERVIEW.md](./EXECUTIVE_OVERVIEW.md) | 1-page strategic summary | Decision-makers |
| [AGENTS.md](./AGENTS.md) | AI agent coding guide | Developers, AI engineers |
| [SECURITY.md](./SECURITY.md) | Security policy, incident response | Security team, compliance |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute code | Contributors |

### System Architecture

- **Dual-Role Governance**: Separation of planning (ANTIGRAVITY) and execution (WINDSURF)
- **Plan-Based Authorization**: Hash-addressed contracts prevent unauthorized changes
- **Cryptographic Audit Trails**: Tamper-proof operation history
- **Zero-Trust Design**: Every operation verified, never implicit trust
- **Role-Based Access Control**: Granular permission management

---

## Enforcement & Security

### 🔒 MCP-Only Sandbox (Process-Level)

**Key Points**:

- Windsurf and Antigravity cannot access filesystem directly
- Cannot execute shell commands or spawn processes
- Cannot import dangerous modules (fs, child_process, etc.)
- Cannot access environment variables (except whitelisted)
- Cannot access `__dirname`, `__filename`, or `process`
- All access goes through MCP tools only

**Documentation**:

| Document | Purpose |
|----------|---------|
| [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md) | Complete sandbox documentation |
| [ENFORCEMENT_QUICKSTART.md](./ENFORCEMENT_QUICKSTART.md) | Quick start for developers |
| `core/mcp-sandbox.js` | Implementation |

**Entrypoints**:

- `bin/ATLAS-GATE-MCP-windsurf.js` — Applies sandbox before starting MCP
- `bin/ATLAS-GATE-MCP-antigravity.js` — Applies sandbox before starting MCP

### 🛠️ Tool Parameter Enforcement (MCP Boundary)

**Key Points**:

- Every tool call validated against strict schemas
- Wrong types, missing fields, extra fields → rejected
- Clear error messages for IDE developers
- All violations logged to audit trail
- No tool can be called with invalid parameters

**Documentation**:

| Document | Purpose |
|----------|---------|
| [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md) | Complete tool validation documentation |
| [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md) | Quick reference card |
| `core/tool-enforcement.js` | Implementation |

**Integration**:

- Installed in `server.js` at startup
- Integrated into `validateToolInput()` override
- Wraps all tool handlers

### 📊 Enforcement Summary

| Document | Purpose |
|----------|---------|
| [ENFORCEMENT_SUMMARY.md](./ENFORCEMENT_SUMMARY.md) | Overview of both enforcement layers |
| [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md) | Quick facts and error codes |

---

## Tools & Features

### Available MCP Tools

**Read-Only Tools** (Both roles):

- `read_file` — Read files
- `read_audit_log` — Access audit trail
- `read_prompt` — Read system prompts
- `list_plans` — List approved plans
- `replay_execution` — Forensic replay
- `verify_workspace_integrity` — Verify logs
- `generate_attestation_bundle` — Generate attestation
- `verify_attestation_bundle` — Verify attestation
- `export_attestation_bundle` — Export attestation

**Windsurf-Only Tools** (Execution role):

- `begin_session` — Initialize session (both roles)
- `write_file` — Write files (enforces plan hash)

**Antigravity-Only Tools** (Planning role):

- `bootstrap_create_foundation_plan` — Create first plan
- `lint_plan` — Validate plan syntax

### Tool Usage

All tools enforce strict parameter validation:

- Required fields must be present
- Field types must match (string, number, object, array)
- Extra fields are rejected
- Field values validated (e.g., plan hash must be 64-char hex)

See [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md) for complete tool schemas.

---

## Operations & Support

| Document | Purpose | Audience |
|----------|---------|----------|
| [DOCUMENTATION_CHANGELOG.md](./DOCUMENTATION_CHANGELOG.md) | Doc updates per release | Operators, users |
| [COMPREHENSIVE_TEST_REPORT.md](./COMPREHENSIVE_TEST_REPORT.md) | Test results & coverage | QA, operators |
| [FINAL_STATUS_REPORT.md](./FINAL_STATUS_REPORT.md) | Current status | Everyone |

### Common Tasks

**Start Windsurf (MCP-only)**:

```bash
node bin/ATLAS-GATE-MCP-windsurf.js
```

**Start Antigravity (MCP-only)**:

```bash
node bin/ATLAS-GATE-MCP-antigravity.js
```

**Run Tests**:

```bash
npm test
npm run verify
```

**Check Documentation**:

```bash
npm run docs:build
```

---

## Audit & Compliance

### Audit Logging

- **Location**: `audit-log.jsonl` (append-only)
- **Content**: Every tool call with args, result, timestamp
- **Integrity**: Hash-chained for tamper detection
- **Tools**: `read_audit_log`, `replay_execution`, `verify_workspace_integrity`

### Compliance

- **OWASP Top 10**: Compliant
- **SOC 2 Ready**: Complete audit trail, access controls
- **NIST Cybersecurity Framework**: Mapped to controls
- **ISO 27001**: Supports certification
- **GDPR**: Audit logs are exportable

---

## File Structure

```
ATLAS-GATE-MCP/
├── core/
│   ├── mcp-sandbox.js              ← Process sandbox
│   ├── tool-enforcement.js         ← Tool validation
│   ├── audit-system.js             ← Audit logging
│   ├── error.js                    ← Error types
│   └── ... (other core modules)
├── bin/
│   ├── ATLAS-GATE-MCP-windsurf.js  ← Windsurf entrypoint
│   ├── ATLAS-GATE-MCP-antigravity.js ← Antigravity entrypoint
│   └── ATLAS-GATE-MCP.js
├── tools/
│   ├── write_file.js
│   ├── read_file.js
│   ├── bootstrap_tool.js
│   ├── lint_plan.js
│   └── ... (other tools)
├── tests/
│   ├── system/
│   │   ├── test-ast-policy.js      ← Governance tests
│   │   ├── test-bootstrap.js
│   │   └── ... (other tests)
├── docs/
│   ├── README.md                   ← Main docs index
│   ├── ABSOLUTE_BEGINNER_GUIDE.md
│   └── ... (detailed guides)
├── adr/
│   └── ... (architectural decisions)
├── AGENTS.md                       ← AI agent guide (UPDATED)
├── SECURITY.md                     ← Security policy
├── README.md                        ← Project readme
├── EXECUTIVE_OVERVIEW.md            ← For decision-makers
├── CONTRIBUTING.md                 ← How to contribute
├── MCP_SANDBOX_ENFORCEMENT.md      ← Sandbox docs (NEW)
├── TOOL_ENFORCEMENT.md             ← Tool validation (NEW)
├── ENFORCEMENT_QUICKSTART.md       ← Developer quickstart (NEW)
├── ENFORCEMENT_SUMMARY.md          ← Enforcement overview (NEW)
├── ENFORCEMENT_REFERENCE.md        ← Quick reference (NEW)
├── DOCUMENTATION_INDEX.md          ← This file (NEW)
├── DOCUMENTATION_CHANGELOG.md      ← Doc changelog
└── ... (other files)
```

---

## Key Concepts

### Sandbox vs. Tool Enforcement

| Layer | What | When | Purpose |
|-------|------|------|---------|
| **Sandbox** | Process-level lockdown | At startup | Prevent escape from MCP-only mode |
| **Tool Validation** | Parameter schema checking | Every tool call | Ensure correct tool usage at MCP boundary |

### Tool Schemas

Each tool has a strict schema:

- **Required fields**: Must be present
- **Field types**: string, number, object, array
- **Field values**: Custom validators (e.g., hash format)
- **Extra fields**: Rejected (fail-closed)

### Audit Trail

All operations logged to `audit-log.jsonl`:

- Timestamps and session IDs
- Tool names and arguments
- Results (success or error)
- Hash chain for tamper detection
- Full context for forensics

---

## Version History

| Version | Date | Key Features |
|---------|------|--------------|
| **2.0.0** | 2026-01-31 | MCP-only sandbox + tool parameter enforcement |
| 1.0.0 | 2026-01-19 | Core governance and audit |
| 0.9.x | Pre-release | Initial alpha/beta |

---

## Support & Resources

### Documentation

- [README.md](./README.md) — Installation and overview
- [EXECUTIVE_OVERVIEW.md](./EXECUTIVE_OVERVIEW.md) — For decision-makers
- [AGENTS.md](./AGENTS.md) — For AI agents and developers
- [SECURITY.md](./SECURITY.md) — Security policy and incident response

### Enforcement Docs

- [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md) — Process sandbox
- [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md) — Tool validation
- [ENFORCEMENT_QUICKSTART.md](./ENFORCEMENT_QUICKSTART.md) — Quick start
- [ENFORCEMENT_SUMMARY.md](./ENFORCEMENT_SUMMARY.md) — Complete overview
- [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md) — Reference card

### Community

- **GitHub**: <https://github.com/dylanmarriner/ATLAS-GATE-MCP-server>
- **Discussions**: <https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/discussions>
- **Security**: <security@ATLAS-GATE-MCP.org>

### Commands

```bash
npm test                            # Run tests
npm run verify                      # Full verification
node bin/ATLAS-GATE-MCP-windsurf.js # Start Windsurf
node bin/ATLAS-GATE-MCP-antigravity.js # Start Antigravity
npm run docs:build                 # Build docs
```

---

## Document Map

### Getting Started

1. [README.md](./README.md) — Installation
2. [EXECUTIVE_OVERVIEW.md](./EXECUTIVE_OVERVIEW.md) — What is this?
3. [AGENTS.md](./AGENTS.md) — How to use (for developers)

### Understanding Enforcement

1. [ENFORCEMENT_SUMMARY.md](./ENFORCEMENT_SUMMARY.md) — Overview
2. [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md) — Deep dive: sandbox
3. [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md) — Deep dive: tool validation
4. [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md) — Quick reference

### Security & Compliance

1. [SECURITY.md](./SECURITY.md) — Security policy
2. [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md) — Process sandbox details
3. [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md) — Parameter validation details

### Contributing

1. [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution workflow
2. [AGENTS.md](./AGENTS.md) — Code standards
3. [DOCUMENTATION_CHANGELOG.md](./DOCUMENTATION_CHANGELOG.md) — Doc updates

---

## Next Steps

**First Time?**

1. Read [README.md](./README.md)
2. Install: `npm install`
3. Read [EXECUTIVE_OVERVIEW.md](./EXECUTIVE_OVERVIEW.md)
4. Read [AGENTS.md](./AGENTS.md)
5. Start server: `node bin/ATLAS-GATE-MCP-windsurf.js`

**Understanding Enforcement?**

1. Read [ENFORCEMENT_SUMMARY.md](./ENFORCEMENT_SUMMARY.md)
2. Read [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md)
3. Read [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md)
4. Use [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md) as reference

**Contributing Code?**

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Read [AGENTS.md](./AGENTS.md)
3. Check [DOCUMENTATION_CHANGELOG.md](./DOCUMENTATION_CHANGELOG.md)
4. Submit PR

**Security Questions?**

1. Read [SECURITY.md](./SECURITY.md)
2. Read [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md)
3. Email: <security@ATLAS-GATE-MCP.org>

---

**Version**: 2.0.0  
**Last Updated**: 2026-01-31  
**Status**: Production-Ready  
**Next Review**: 2026-02-28
