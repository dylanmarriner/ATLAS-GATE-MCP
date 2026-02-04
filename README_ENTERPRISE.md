# ATLAS-GATE-MCP: Enterprise-Grade AI Security Gateway

[![CI Status](https://github.com/dylanmarriner/ATLAS-GATE-MCP/workflows/CI/badge.svg)](https://github.com/dylanmarriner/ATLAS-GATE-MCP/actions)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/dylanmarriner/ATLAS-GATE-MCP/releases)
[![Security Score](https://img.shields.io/badge/security-A-brightgreen.svg)](./SECURITY.md)
[![Compliance](https://img.shields.io/badge/compliance-SOC2%20Ready-orange.svg)](./docs/enterprise-guide/COMPLIANCE.md)

---

## What is ATLAS-GATE-MCP?

**ATLAS-GATE-MCP is a production-grade security gateway that controls, audits, and governs AI agent operations.**

It solves a critical enterprise problem: **How do you safely empower AI assistants to help with important work while maintaining security, compliance, and control?**

### The Problem

Modern AI tools (Claude, ChatGPT, Windsurf) are powerful but risky in enterprise contexts:
- ❌ No way to enforce approval workflows
- ❌ No audit trail of what they changed
- ❌ No compliance evidence for auditors
- ❌ Risk of accidental data exposure or breaking changes

### The Solution

ATLAS-GATE-MCP is a security layer that:
- ✅ **Controls**: Only approved operations execute
- ✅ **Audits**: Every action logged with cryptographic proof
- ✅ **Complies**: Built for SOC 2, ISO 27001, GDPR
- ✅ **Governs**: Plan-based authorization model
- ✅ **Isolates**: Process-level sandbox prevents abuse

---

## Quick Start (3 Minutes)

### **1. Install**
```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
npm install
```

### **2. Start**
```bash
npm run start:windsurf
```

### **3. Try It**
- Use Claude, ChatGPT, or Windsurf IDE
- It will use ATLAS-GATE-MCP to safely execute tasks
- Check `audit-log.jsonl` to see what happened

[Full getting started guide →](./docs/user-guide/BEGINNER_GUIDE.md)

---

## Key Features

### **Authorization & Governance**
- **Plan-Based Approval**: AI operations require explicit authorization
- **Role-Based Access**: Windsurf (read/write) vs Antigravity (read-only)
- **Workspace Isolation**: Operations scoped to approved directories

### **Audit & Compliance**
- **Immutable Audit Trails**: Cryptographically signed operation logs
- **Non-Repudiation**: Proof of who did what, when
- **SOC 2 Ready**: Controls for audit certification
- **ISO 27001 Aligned**: Information security management

### **Security & Isolation**
- **Process Sandbox**: MCP-only, no direct system access
- **Content Validation**: Static analysis prevents malicious patterns
- **Input Validation**: Schema-based request validation
- **Session Isolation**: Independent permission contexts

### **Enterprise Features**
- **Multi-Tenant Support**: Multiple workspaces with separate controls
- **Compliance Frameworks**: GDPR, HIPAA, FedRAMP ready
- **Disaster Recovery**: Audit logs enable forensics
- **Monitoring Integration**: JSON logs for SIEM integration

---

## Documentation

**Choose your path:**

### **New to this project?**
→ [START_HERE.md](./START_HERE.md) — 5-minute overview in plain English

### **Want to use it?**
→ [User Guide](./docs/README.md#for-end-users) — Installation, configuration, usage

### **Want to contribute?**
→ [Contributor Guide](./docs/contributor-guide/CONTRIBUTING.md) — Development setup, standards

### **Deploying to production?**
→ [Enterprise Guide](./docs/enterprise-guide/DEPLOYMENT.md) — Deployment, compliance, audit

### **Understanding the architecture?**
→ [Architecture Docs](./docs/architecture/ARCHITECTURE.md) — System design, security model

---

## Real-World Example

### **Scenario: Code Review with AI**

**Before ATLAS-GATE-MCP:**
```
Developer: "Claude, review this code and make improvements"
Claude: *Reviews and modifies files directly*
Developer: "What changed? When? Did you follow our standards?"
Claude: "I made changes but there's no record..."
```

**With ATLAS-GATE-MCP:**
```
1. Developer creates PLAN: "Review and improve app.js"
2. Manager approves the plan
3. Claude uses ATLAS-GATE-MCP
4. Claude can only modify files in the plan
5. Every change logged: timestamp, user, file, diff
6. Audit log proves compliance to auditors
```

Result: **Full control, complete audit, zero surprises.**

---

## Who Should Use This

### **Yes, if you:**
- Use AI tools to help with development or operations
- Need to pass security audits (SOC 2, ISO 27001)
- Handle regulated data (HIPAA, GDPR)
- Want to prove governance to executives/auditors
- Are risk-averse and want controls

### **Maybe, if you:**
- Are a startup with limited compliance needs
- Prioritize speed over governance
- Have a small trusted team

### **No, if you:**
- Are building a hobby project alone
- Don't use AI for critical work
- Have no compliance requirements

---

## Security Model

### **Five Trust Boundaries**

```
┌─────────────────────────────────────────────────┐
│ AI Assistant (Claude, ChatGPT, Windsurf)       │
└────────────────────┬────────────────────────────┘
                     │
          [Boundary 1: MCP Protocol]
                     ↓
┌─────────────────────────────────────────────────┐
│ ATLAS-GATE-MCP Security Gateway                │
│ ┌──────────────────────────────────────────┐   │
│ │ 1. Plan Validation (is this approved?)   │   │
│ │ 2. Role Checking (Windsurf/Antigravity)  │   │
│ │ 3. Content Scanning (any malicious code?)│   │
│ │ 4. Access Control (can reach this file?) │   │
│ │ 5. Audit Logging (record everything)     │   │
│ └──────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
          [Boundary 5: Audit Trail]
                     ↓
        ┌────────────────────────┐
        │ Immutable Audit Log    │
        │ (Cryptographically     │
        │  signed, tamper-proof) │
        └────────────────────────┘
```

[See detailed security model →](./docs/architecture/SECURITY_MODEL.md)

---

## Compliance Status

| Standard | Status | Documentation |
|----------|--------|---|
| **SOC 2 Type II** | 🟡 In Progress (90%) | [SOC 2 Readiness](./docs/enterprise-guide/COMPLIANCE.md#soc-2-type-ii) |
| **ISO 27001** | 🟡 Ready (85%) | [ISO 27001 Guide](./docs/enterprise-guide/COMPLIANCE.md#iso-27001) |
| **GDPR** | 🟢 Compliant (95%) | [GDPR Compliance](./docs/enterprise-guide/COMPLIANCE.md#gdpr) |
| **HIPAA** | 🟡 Supportable (80%) | [HIPAA Guide](./docs/enterprise-guide/COMPLIANCE.md#hipaa) |
| **NIST CSF** | 🟢 Aligned (90%) | [NIST Framework](./docs/enterprise-guide/COMPLIANCE.md#nist-cybersecurity-framework) |

[Full compliance matrix →](./docs/enterprise-guide/COMPLIANCE.md)

---

## Getting Help

### **Questions About Features?**
→ [FAQ](./docs/user-guide/FAQ.md)

### **Something Not Working?**
→ [Troubleshooting](./docs/user-guide/TROUBLESHOOTING.md)

### **Technical Details?**
→ [Architecture](./docs/architecture/ARCHITECTURE.md)

### **Want to Contribute?**
→ [Contributing Guide](./docs/contributor-guide/CONTRIBUTING.md)

### **Security Issue?**
→ Email: security@atlas-gate-mcp.org

---

## Project Status

- **Version**: 2.0.0 (MCP-Only Sandbox Enforcement)
- **Stability**: Production-Ready
- **Node.js**: 18.0.0+
- **License**: ISC (permissive open-source)
- **Development**: Active
- **Support**: Community + commercial options available

[View releases →](https://github.com/dylanmarriner/ATLAS-GATE-MCP/releases)

---

## How It Works (High-Level)

### **1. Authorization Phase**
```
AI: "I want to write file.js"
ATLAS-GATE-MCP: "Show me the plan"
AI: "Here's plan-001"
ATLAS-GATE-MCP: "✓ Plan is approved, proceed"
```

### **2. Validation Phase**
```
ATLAS-GATE-MCP: "Let me scan the content"
ATLAS-GATE-MCP: "✓ No malicious patterns found"
ATLAS-GATE-MCP: "✓ Schema is valid"
```

### **3. Execution Phase**
```
ATLAS-GATE-MCP: "✓ Operation allowed"
File System: <file modified>
ATLAS-GATE-MCP: "Logging operation..."
```

### **4. Audit Phase**
```
Audit Log: {
  "timestamp": "2026-02-04T14:30:45Z",
  "operation": "file_write",
  "file": "file.js",
  "plan": "plan-001",
  "status": "SUCCESS",
  "signature": "RSA-SHA256:..."
}
```

---

## Architecture

ATLAS-GATE-MCP implements a **multi-layered security architecture**:

```
AI Clients → MCP Protocol Layer → Security & Governance Layer
              ↓
         Request Validation → Plan Authorization → Content Analysis
              ↓
         Tool Registry → File Operations, Plan Mgmt, Audit Logging
              ↓
         Immutable Audit Trail ← Non-repudiation & Compliance
```

[Full architecture diagram →](./docs/architecture/ARCHITECTURE.md)

---

## Contributing

We welcome contributions from the community!

### **Ways to Contribute**
- Report bugs
- Suggest features
- Improve documentation
- Submit code improvements
- Help with testing

### **Getting Started**
1. [Read CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
2. [Follow Contributing Guide](./docs/contributor-guide/CONTRIBUTING.md)
3. [Check out issues](https://github.com/dylanmarriner/ATLAS-GATE-MCP/issues)

---

## License

ATLAS-GATE-MCP is licensed under the **ISC License** (permissive, similar to MIT).

This means you can:
- ✅ Use it commercially
- ✅ Modify it
- ✅ Distribute it
- ✅ Use it privately

Just include the license in distributions.

[Read full license →](./LICENSE)

---

## Support & Community

- **GitHub Issues**: [Report bugs](https://github.com/dylanmarriner/ATLAS-GATE-MCP/issues)
- **GitHub Discussions**: [Ask questions, discuss ideas](https://github.com/dylanmarriner/ATLAS-GATE-MCP/discussions)
- **Email**: info@atlas-gate-mcp.org
- **Security**: security@atlas-gate-mcp.org

---

## Related Resources

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Security Whitepaper](./docs/enterprise-guide/SECURITY_CONTROLS.md)
- [Compliance Framework](./docs/enterprise-guide/COMPLIANCE.md)
- [Architecture Decision Records](./docs/adr/)
- [Changelog](./docs/changelog/CHANGELOG.md)

---

## Acknowledgments

ATLAS-GATE-MCP was built with inspiration from:
- CNCF projects (Kubernetes, Prometheus, etc.)
- Modern security frameworks (NIST, SOC 2)
- Enterprise governance best practices
- Open-source community standards

Special thanks to all contributors and the community.

---

## Roadmap

### **2026 (Current)**
- ✅ v2.0: MCP-Only Sandbox Enforcement
- 🟡 SOC 2 Type II certification
- 🟡 ISO 27001 alignment

### **2027**
- Database integration for enterprise deployments
- Advanced policy engine
- Multi-server deployment support
- HIPAA BAA and PCI-DSS support

[Full roadmap →](./docs/maintainer-guide/ROADMAP.md)

---

## FAQ

**Q: Do I need to understand MCP to use this?**  
A: No. ATLAS-GATE-MCP works transparently with your AI tools. You just use them normally.

**Q: Can I use this in production?**  
A: Yes. v2.0 is production-ready with comprehensive audit logging.

**Q: Will this slow down my AI assistant?**  
A: Minimal overhead (typically <100ms per operation). Built with performance in mind.

**Q: Can I use this offline?**  
A: Yes. All operations are local; no external services required.

**Q: Is it open-source?**  
A: Yes. ISC License (permissive, similar to MIT).

[More FAQ →](./docs/user-guide/FAQ.md)

---

**Latest Update**: February 2026  
**Version**: 2.0.0  
**Status**: Production-Ready  
**Learn More**: [Docs Hub](./docs/README.md) | [START_HERE](./START_HERE.md)
