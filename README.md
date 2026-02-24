# ATLAS-GATE-MCP

**The Level-5 Governance Gateway for Autonomous Execution**

[![CI](https://github.com/dylanmarriner/ATLAS-GATE-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/dylanmarriner/ATLAS-GATE-MCP/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

ATLAS-GATE is a zero-trust, cryptography-verified implementation of the Model Context Protocol (MCP). It is explicitly designed for regulated enterprises, financial institutions, and security-conscious organizations that require deterministic, auditable, and restrictively permissioned AI agent capabilities.

### Why ATLAS-GATE?

By default, giving an LLM access to file structures and execution binaries is incredibly dangerous. ATLAS-GATE reverses this risk by enforcing a **"Plans are Laws"** architecture:

1. **Zero-Trust Execution**: The gateway exposes *no* operations to the AI without prior cryptographic authorization.
2. **Deterministic Boundaries**: Paths are restricted to isolated tenant workspaces dynamically via strict chroot-esque bounds. No `../` escapes.
3. **Immutable Audit Trials**: Every byte read, written, or deleted generates a cryptographically signed SIEM-ready JSONL audit log.
4. **Cosign Plan Verification**: The AI agent can only execute actions pre-approved via an external human-in-the-loop signing ceremony.

## 🏛 Architecture

ATLAS-GATE adheres strictly to Domain-Driven Design principles, segregating core governance rules from infrastructural transport layers:

- **Domain Layer**: Contains immutable governance invariants and system error taxonomies.
- **Application Layer**: Orchestrates tool handlers, session logic, and auditing workflows.
- **Infrastructure Layer**: IO-bound cryptographic adapters (Cosign verification) and restricted File System access.
- **Interface Layer**: StdIO MCP Server, HTTP Admin APIs, and CLI configuration.

## 🚀 Quick deployment

### Kubernetes / Container environments

ATLAS-GATE ships as a distroless Docker image, minimizing attack surface.

```bash
docker pull ghcr.io/dylanmarriner/atlas-gate-mcp:latest
docker run -v /your/workspace:/workspace -e SESSION_TTL=30000 atlas-gate-mcp:latest
```

## 🔐 Security Features

- **Hardened Session Locking**: Single tenant execution runs per instantiated container.
- **Disallowed Globals**: Node `child_process.exec()` is hard-blocked. There are no reverse-shells.
- **Single-use Nonces**: Bootstrapping operations demand single-use replay-resistant tokens.

*For responsible disclosure and security policies, read [SECURITY.md](./SECURITY.md)*

## 📚 Documentation

- Architecture Constraints: `./docs/architecture/`
- Infrastructure Blueprint: `./docs/deployment/`
- Validated Execution Plans: `./docs/plans/`

## ⚖️ License

(c) 2026 Dylan Marriner & ATLAS-GATE Enterprise. All Rights Reserved.
