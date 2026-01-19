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
Add to your MCP client configuration:
```json
{
  "mcpServers": {
    "kaiza": {
      "command": "node",
      "args": ["/absolute/path/to/KAIZA-MCP-server/server.js"],
      "env": {
        "KAIZA_BOOTSTRAP_SECRET": "your-secure-secret"
      }
    }
  }
}
```

### Verification
```bash
npm run verify
```

## 📖 Documentation

### For Beginners
- [📘 Complete Beginner's Guide](./BEGINNER_GUIDE.md) - Never used a computer before? Start here
- [🚀 Quick Start](./docs/v1/getting-started/quick-start.md) - Get up and running quickly
- [📋 Installation Guide](./docs/v1/getting-started/installation.md) - Detailed setup instructions

### For Users
- [🏗️ Architecture Overview](./docs/v1/architecture/overview.md) - System design and concepts
- [🔧 User Guides](./docs/v1/guides/) - How to use KAIZA MCP effectively
- [📚 API Reference](./docs/v1/api/) - Complete API documentation

### For Developers
- [🛠️ Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project
- [🔒 Security Policy](./SECURITY.md) - Security reporting and policies
- [📋 Architecture Decisions](./adr/) - Technical decision records

### For Enterprise
- [📊 Executive Overview](./EXECUTIVE_OVERVIEW.md) - Business value and strategic positioning
- [🎯 Maturity Model & Roadmap](./MATURITY_MODEL_AND_ROADMAP.md) - Strategic planning and evolution
- [📋 Governance Framework](./DOCUMENTATION_GOVERNANCE.md) - Documentation and process governance

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

- **Documentation**: [Complete documentation](./docs/v1/)
- **Issues**: [GitHub Issues](https://github.com/dylanmarriner/KAIZA-MCP-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions)
- **Security**: [Security Issues](./SECURITY.md)

## 🌟 Enterprise

For enterprise deployments, custom integrations, or commercial support, please contact us at [enterprise@kaiza-mcp.org](mailto:enterprise@kaiza-mcp.org).

---

**Repository**: https://github.com/dylanmarriner/KAIZA-MCP-server  
**Documentation**: https://github.com/dylanmarriner/KAIZA-MCP-server/docs/  
**Community**: https://github.com/dylanmarriner/KAIZA-MCP-server/discussions  
**Security**: https://github.com/dylanmarriner/KAIZA-MCP-server/security
