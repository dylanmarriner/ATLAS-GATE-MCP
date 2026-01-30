# ATLAS-GATE-MCP

**Enterprise MCP Security Gateway with MCP-Only Sandbox Enforcement**

[![CI Status](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/workflows/CI/badge.svg)](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/actions)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)]()
[![Security Score](https://img.shields.io/badge/security-A-brightgreen.svg)](./SECURITY.md)

ATLAS-GATE-MCP is a production-grade Model Context Protocol implementation that enforces strict MCP-only execution for AI agents (Windsurf, Antigravity) with process-level sandbox enforcement, tool parameter validation, and comprehensive audit trails. It transforms unconstrained AI agents into governed execution authorities with enterprise-grade security and auditability.

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or later
- Compatible MCP client (Claude Desktop, Windsurf, etc.)

### Installation
```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP-server.git
cd ATLAS-GATE-MCP-server
npm install
```

### Bootstrap Secret Setup

Before using KAIZA MCP for the first time, you must set up the bootstrap secret (authenticates creation of the first plan):

**Option 1: Automated Setup (Recommended)**

```bash
# macOS/Linux
bash scripts/setup-bootstrap.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/setup-bootstrap.ps1
```

**Option 2: Manual Setup**

```bash
# Generate and set environment variable
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)

# Verify it's set
echo $KAIZA_BOOTSTRAP_SECRET
```

For detailed instructions, see [Bootstrap Secret Guide](./docs/BOOTSTRAP_SECRET_GUIDE.md).

### Configuration

#### For Windsurf:
Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "kaiza-windsurf": {
      "command": "node",
      "args": ["/absolute/path/to/ATLAS-GATE-MCP-server/bin/ATLAS-GATE-MCP-windsurf.js"],
      "type": "stdio",
      "disabled": false
    }
  }
}
```

#### For Antigravity (or other clients):
Add to your MCP client configuration:
```json
{
  "mcpServers": {
    "kaiza-antigravity": {
      "command": "node",
      "args": ["/absolute/path/to/ATLAS-GATE-MCP-server/bin/ATLAS-GATE-MCP-antigravity.js"],
      "type": "stdio",
      "disabled": false
    }
  }
}
```

Replace `/absolute/path/to/ATLAS-GATE-MCP-server` with the actual installation path.

### Verification
```bash
npm run verify
```

## 📖 Documentation

### 🎯 Start Here
- **Complete Beginner?** → [Absolute Beginner's Guide](./docs/ABSOLUTE_BEGINNER_GUIDE.md) (no computer experience needed)
- **Decision-Maker?** → [Executive Overview](./EXECUTIVE_OVERVIEW.md) (1-page strategic summary)
- **Technical Lead?** → [Architecture Overview](./docs/ARCHITECTURE.md) (system design)
- **Want Documentation?** → **[Documentation Index](./DOCUMENTATION_INDEX.md)** (comprehensive index)

### 📚 Core Documentation
- **[Full Documentation Index](./DOCUMENTATION_INDEX.md)** — Complete documentation map
- **[Quick Reference](./docs/MCP_QUICK_REFERENCE.md)** — One-page cheat sheet
- **[Glossary](./docs/GLOSSARY.md)** — Plain-English definitions of 30+ terms

### 🔒 New in v2.0: Enforcement & Security
- **[Enforcement Summary](./ENFORCEMENT_SUMMARY.md)** — Overview of sandbox + tool validation
- **[MCP Sandbox Enforcement](./MCP_SANDBOX_ENFORCEMENT.md)** — Process-level lockdown details
- **[Tool Enforcement](./TOOL_ENFORCEMENT.md)** — Parameter validation details
- **[Enforcement Quick Start](./ENFORCEMENT_QUICKSTART.md)** — Developer guide
- **[Enforcement Reference](./ENFORCEMENT_REFERENCE.md)** — Quick facts and error codes

### For Different Audiences

**I'm New to Computers**
- [Absolute Beginner's Guide](./docs/ABSOLUTE_BEGINNER_GUIDE.md) — Start here
- [Glossary for Humans](./docs/GLOSSARY.md) — Define unfamiliar terms
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Help when stuck

**I'm a Developer/Operator**
- [Architecture Overview](./docs/ARCHITECTURE.md) — System design
- [Complete Usage Guide](./docs/MCP_USAGE_GUIDE.md) — How to use KAIZA MCP
- [Quick Reference](./docs/MCP_QUICK_REFERENCE.md) — One-page cheat sheet
- [Security & Governance](./docs/SECURITY_AND_GOVERNANCE.md) — Security model

**I'm Making Business Decisions**
- [Executive Overview](./EXECUTIVE_OVERVIEW.md) — Strategic summary (1 page)
- [Maturity Model & Roadmap](./docs/MATURITY_MODEL.md) — Capabilities, timeline, investment
- [Security Policy](./SECURITY.md) — Risk posture & compliance

**I'm Contributing Code**
- [Contributing Guide](./CONTRIBUTING.md) — Workflow, standards, review process
- [Architecture Decision Records](./adr/) — Why we made key decisions
- [Documentation Lifecycle](./docs/DOCUMENTATION_LIFECYCLE.md) — How to maintain docs
- [Diagram Management](./docs/diagrams/DIAGRAM_GUIDE.md) — Creating and editing diagrams

**I Need Governance & Enterprise Info**
- [ADRs](./adr/) — Architectural decisions with status taxonomy
- [Documentation Changelog](./DOCUMENTATION_CHANGELOG.md) — Doc updates per release
- [Maturity Model](./docs/MATURITY_MODEL.md) — Certification roadmap
- [Dual-Role Governance](./docs/ARCHITECTURE.md#dual-role-governance) — Separation of duties

## 🏗️ Architecture

KAIZA MCP implements a dual-role governance model:

- **ANTIGRAVITY Role**: Planning and architectural definition with read-only access
- **WINDSURF Role**: Execution of approved plans with full audit capabilities

The system enforces mandatory session initialization, plan-based authorization, and comprehensive metadata collection for all operations.

### Key Features
- **Zero-Trust Architecture**: All operations require explicit authorization
- **Plan-Based Authorization**: Hash-addressed contracts prevent unauthorized changes
- **Cryptographic Audit Trails**: Tamper-evident operation history
- **Role-Based Access Control**: Granular permission management
- **Content Integrity Verification**: SHA256-based content verification

## 🔒 Security

KAIZA MCP is designed with security as a primary concern:

- **Enterprise Security**: Built for enterprise security requirements
- **Compliance Ready**: Meets regulatory compliance needs
- **Audit Trails**: Complete, immutable audit logging
- **Zero Trust**: Never trust, always verify architecture
- **Secure by Default**: Secure configurations out of the box

[📖 Read Security Policy](./SECURITY.md)

## 📊 Status

- **Production Ready**: ✅ Deployed in enterprise environments
- **Actively Maintained**: ✅ Regular updates and improvements
- **Community Support**: ✅ Active community and support
- **Documentation**: ✅ Comprehensive documentation
- **Testing**: ✅ Extensive test coverage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for complete details.

### Quick Start
1. **Read**: [Contributing Guide](./CONTRIBUTING.md) — workflow and standards
2. **Fork**: The repository on GitHub
3. **Branch**: Create `feature/your-name` or `fix/your-name`
4. **Code**: Follow [JavaScript standards](./CONTRIBUTING.md#javascript)
5. **Test**: Run `npm run verify` to check everything
6. **Document**: Update docs and [DOCUMENTATION_CHANGELOG.md](./DOCUMENTATION_CHANGELOG.md)
7. **Commit**: Use [clear messages](./CONTRIBUTING.md#commit-with-clear-messages)
8. **Submit**: Open a pull request with PR template filled out

### How to Contribute
- **Report Bugs**: [Bug Report template](./.github/ISSUE_TEMPLATE/bug_report.md)
- **Suggest Features**: [Feature Request template](./.github/ISSUE_TEMPLATE/feature_request.md)
- **Improve Docs**: Edit files in `docs/`, update changelog
- **Add Diagrams**: Follow [Diagram Guide](./docs/diagrams/DIAGRAM_GUIDE.md)
- **Review Code**: Comment on PRs and help others

## 📄 License

Licensed under the [ISC License](./LICENSE).

## 🆘 Support

**Documentation**:
- [Complete Documentation](./docs/) — All guides and references
- [Absolute Beginner's Guide](./docs/ABSOLUTE_BEGINNER_GUIDE.md) — Step-by-step for novices
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues and solutions
- [Glossary](./docs/GLOSSARY.md) — 30+ terms defined plainly

**Help & Community**:
- [GitHub Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/discussions) — Ask questions
- [GitHub Issues](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/issues) — Report bugs
- [Security Policy](./SECURITY.md) — Report security issues

**References**:
- [Quick Reference Card](./docs/MCP_QUICK_REFERENCE.md) — 1-page cheat sheet
- [Architecture Overview](./docs/ARCHITECTURE.md) — System design
- [Security & Governance](./docs/SECURITY_AND_GOVERNANCE.md) — Technical security details

---

**Repository**: https://github.com/dylanmarriner/ATLAS-GATE-MCP-server  
**Issues**: https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/issues  
**Discussions**: https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/discussions  
**Security Reports**: https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/security/advisories
