# KAIZA MCP

**Enterprise Governance Gateway for AI-Driven Development**

[![CI Status](https://github.com/dylanmarriner/KAIZA-MCP-server/workflows/CI/badge.svg)](https://github.com/dylanmarriner/KAIZA-MCP-server/actions)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Security Score](https://img.shields.io/badge/security-A-brightgreen.svg)](./SECURITY.md)

KAIZA MCP is a production-grade Model Context Protocol implementation that transforms unconstrained AI agents into governed execution authorities. It provides enterprise-grade security, auditability, and role-based governance for AI-driven software development.

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or later
- Compatible MCP client (Claude Desktop, Windsurf, etc.)

### Installation
```bash
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
cd KAIZA-MCP-server
npm install
```

### Configuration

#### For Windsurf:
Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "kaiza-windsurf": {
      "command": "node",
      "args": ["/absolute/path/to/KAIZA-MCP-server/bin/kaiza-mcp-windsurf.js"],
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
      "args": ["/absolute/path/to/KAIZA-MCP-server/bin/kaiza-mcp-antigravity.js"],
      "type": "stdio",
      "disabled": false
    }
  }
}
```

Replace `/absolute/path/to/KAIZA-MCP-server` with the actual installation path.

### Verification
```bash
npm run verify
```

## 📖 Documentation

**Start here:** [📘 Absolute Beginner's Guide](./docs/guides/ABSOLUTE_BEGINNER_GUIDE.md) — No computer experience needed.

### Quick Links
- **Executive Summary**: [One-page overview for stakeholders](./docs/EXECUTIVE_OVERVIEW.md)
- **Complete Docs**: [Full documentation index](./docs/README.md)
- **Glossary**: [Plain-English definitions](./docs/GLOSSARY.md)

### For Different Audiences

**I'm New to Computers**
- [Absolute Beginner's Guide](./docs/guides/ABSOLUTE_BEGINNER_GUIDE.md) — Start here
- [Glossary for Humans](./docs/GLOSSARY.md) — Define unfamiliar terms
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Help when stuck

**I'm a Developer/Operator**
- [Architecture Overview](./docs/ARCHITECTURE.md) — System design
- [Complete Usage Guide](./docs/MCP_USAGE_GUIDE.md) — How to use KAIZA MCP
- [Quick Reference](./docs/MCP_QUICK_REFERENCE.md) — One-page cheat sheet
- [Security & Governance](./docs/SECURITY_AND_GOVERNANCE.md) — Security model

**I'm Making Business Decisions**
- [Executive Overview](./docs/EXECUTIVE_OVERVIEW.md) — Strategic summary (1 page)
- [Maturity Model](./docs/MATURITY_MODEL.md) — Capabilities & roadmap
- [Security Policy](./SECURITY.md) — Risk & compliance

**I'm Contributing Code**
- [Contributing Guide](./CONTRIBUTING.md) — How to contribute
- [Security Policy](./SECURITY.md) — Vulnerability reporting
- [Architecture Decision Records](./adr/) — Why we made key decisions
- [Documentation Standards](./docs/DOCUMENTATION_LIFECYCLE.md) — Maintaining docs

**I Need Governance Details**
- [Architecture Decision Records (ADRs)](./adr/) — Technical decisions
- [Governance Model](./docs/SECURITY_AND_GOVERNANCE.md) — Authority & control
- [Dual-Role Design](./docs/ARCHITECTURE.md#dual-role-governance) — Separation of duties

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

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

Licensed under the [ISC License](./LICENSE).

## 🆘 Support

- **Documentation**: [Complete documentation](./docs/)
- **Quick Reference**: [One-page reference card](./docs/MCP_QUICK_REFERENCE.md)
- **Usage Guide**: [Complete usage guide](./docs/MCP_USAGE_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/dylanmarriner/KAIZA-MCP-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions)
- **Security**: [Security Policy](./SECURITY.md)

---

**Repository**: https://github.com/dylanmarriner/KAIZA-MCP-server  
**Issues**: https://github.com/dylanmarriner/KAIZA-MCP-server/issues  
**Discussions**: https://github.com/dylanmarriner/KAIZA-MCP-server/discussions  
**Security Reports**: https://github.com/dylanmarriner/KAIZA-MCP-server/security/advisories
