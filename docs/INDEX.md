# ATLAS-GATE MCP Documentation Index

**Complete guide to all documentation organized by audience and purpose.**

---

## 🎯 Quick Navigation by Role

### 👶 Complete Novice (Never used a computer)
Start here if you have no computer experience:
1. [Absolute Beginner's Guide](./ABSOLUTE_BEGINNER_GUIDE.md) — Installation from zero
2. [Glossary](./GLOSSARY.md) — Define unfamiliar terms
3. [Troubleshooting](./TROUBLESHOOTING.md) — Common problems and fixes
4. [Safety & Data Handling](./SAFETY_AND_DATA_HANDLING.md) — Security best practices

### 👨‍💻 Developer / Engineer
For technical implementation and usage:
1. [Architecture Overview](./ARCHITECTURE.md) — System design and concepts
2. [MCP Usage Guide](./MCP_USAGE_GUIDE.md) — How to use ATLAS-GATE MCP
3. [Security & Governance](./SECURITY_AND_GOVERNANCE.md) — Technical security model
4. [ADRs](../adr/) — Design decisions and rationale
5. [API Reference](./reference/) — Tool definitions and schemas

### 🔧 Operator / DevOps Engineer
For deployment and operations:
1. [Bootstrap Secret Guide](./BOOTSTRAP_SECRET_GUIDE.md) — Initial setup
2. [Getting Started Guide](./guides/) — Deployment procedures
3. [Troubleshooting](./TROUBLESHOOTING.md) — Common operational issues
4. [Audit Log Analysis](./guides/AUDIT_LOG_ANALYSIS.md) — Monitoring and verification
5. [Maturity Model](./MATURITY_MODEL.md) — Operational capabilities roadmap

### 🏢 Executive / Decision-Maker
For business and strategy:
1. [Executive Overview](../EXECUTIVE_OVERVIEW.md) — 1-page strategic summary
2. [Maturity Model & Roadmap](./MATURITY_MODEL.md) — Capabilities and timeline
3. [SECURITY.md](../SECURITY.md) — Risk posture and compliance

### 🤝 Contributor
For code and documentation contributions:
1. [Contributing Guide](../CONTRIBUTING.md) — Workflow and standards
2. [ADRs](../adr/) — Technical decision framework
3. [Documentation Lifecycle](./DOCUMENTATION_LIFECYCLE.md) — Doc standards and versioning
4. [Diagram Guide](./diagrams/DIAGRAM_GUIDE.md) — Creating architecture diagrams

---

## 📚 Documentation by Topic

### Getting Started
- [Absolute Beginner's Guide](./ABSOLUTE_BEGINNER_GUIDE.md) — No experience needed
- [Bootstrap Secret Guide](./BOOTSTRAP_SECRET_SETUP_QUICK_START.md) — Initial setup
- [Quick Reference Card](./MCP_QUICK_REFERENCE.md) — 1-page cheat sheet

### Architecture & Design
- [Architecture Overview](./ARCHITECTURE.md) — System design
- [ADRs (Architecture Decision Records)](../adr/) — Why things are designed a certain way
  - [ADR-001: Dual-Role Governance](../adr/001-dual-role-governance.md)
  - [ADR-002: Plan-Based Authorization](../adr/002-plan-based-authorization.md)
  - [ADR-003: Cryptographic Audit Logging](../adr/003-cryptographic-audit-logging.md)
  - [ADR-004: Zero-Trust Execution](../adr/004-zero-trust-execution.md)
  - [ADR-005: Role-Based Access Control](../adr/005-role-based-access-control.md)
  - [ADR-006: Content Integrity Verification](../adr/006-content-integrity-verification.md)

### Usage & Integration
- [Complete Usage Guide](./MCP_USAGE_GUIDE.md) — How to use ATLAS-GATE MCP
- [MCP Quick Reference](./MCP_QUICK_REFERENCE.md) — Commands and options
- [Usage Examples](./examples/) — Real-world scenarios
- [Prompt Templates](./PROMPT_TEMPLATES.md) — Template prompts for common tasks

### Security & Governance
- [Security & Governance](./SECURITY_AND_GOVERNANCE.md) — Technical security model
- [Safety & Data Handling](./SAFETY_AND_DATA_HANDLING.md) — Secret management, secure defaults
- [Security Policy](../SECURITY.md) — Vulnerability reporting, incident response

### Operations & Monitoring
- [Audit Log Analysis](./guides/AUDIT_LOG_ANALYSIS.md) — Monitoring and verification
- [Troubleshooting](./TROUBLESHOOTING.md) — Common issues and solutions
- [Bootstrap Governance System Plan](./BOOTSTRAP_GOVERNANCE_SYSTEM_PLAN.md) — Detailed governance setup

### Enterprise & Roadmap
- [Executive Overview](../EXECUTIVE_OVERVIEW.md) — Strategic 1-page summary
- [Maturity Model & Roadmap](./MATURITY_MODEL.md) — Capabilities, levels, timeline
- [Documentation Changelog](../DOCUMENTATION_CHANGELOG.md) — Doc updates per release

### Documentation & Contribution
- [Contributing Guide](../CONTRIBUTING.md) — How to contribute
- [Documentation Lifecycle](./DOCUMENTATION_LIFECYCLE.md) — Doc standards and versioning
- [Diagram Management Guide](./diagrams/DIAGRAM_GUIDE.md) — Creating/editing diagrams

### Reference & Glossary
- [Glossary](./GLOSSARY.md) — Plain-English term definitions
- [API Reference](./reference/) — Tool definitions and schemas
- [Status Taxonomy](../adr/STATUS_TAXONOMY.md) — ADR status definitions

---

## 🗂️ Directory Structure

```
ATLAS-GATE-MCP-server/
├── docs/
│   ├── v1/                             ← Production version (v1.x)
│   ├── v2/                             ← Development version (v2.x)
│   ├── latest -> v1/                   ← Symlink to current production
│   │
│   ├── guides/                         ← Step-by-step walkthroughs
│   │   ├── ABSOLUTE_BEGINNER_GUIDE.md
│   │   ├── AUDIT_LOG_ANALYSIS.md
│   │   └── ...
│   │
│   ├── diagrams/                       ← Architecture diagrams
│   │   ├── source/                     ← Editable source (Mermaid/PlantUML)
│   │   ├── rendered/                   ← Generated outputs (SVG/PNG)
│   │   └── DIAGRAM_GUIDE.md
│   │
│   ├── examples/                       ← Usage examples and code samples
│   ├── reference/                      ← API reference and schemas
│   ├── audit/                          ← Audit log examples and analysis tools
│   │
│   ├── ABSOLUTE_BEGINNER_GUIDE.md     ← Start here (no experience needed)
│   ├── ARCHITECTURE.md                 ← System design overview
│   ├── DOCUMENTATION_LIFECYCLE.md      ← How docs are maintained
│   ├── GLOSSARY.md                     ← Term definitions (30+ terms)
│   ├── MATURITY_MODEL.md               ← Capabilities and roadmap
│   ├── MCP_QUICK_REFERENCE.md          ← 1-page cheat sheet
│   ├── MCP_USAGE_GUIDE.md              ← Complete usage guide
│   ├── SAFETY_AND_DATA_HANDLING.md     ← Secret management
│   ├── SECURITY_AND_GOVERNANCE.md      ← Technical security details
│   ├── TROUBLESHOOTING.md              ← Common problems and fixes
│   └── README.md                       ← Docs overview
│
├── adr/                                ← Architecture Decision Records
│   ├── README.md                       ← ADR index
│   ├── TEMPLATE.md                     ← ADR template
│   ├── STATUS_TAXONOMY.md              ← Status definitions
│   ├── 001-dual-role-governance.md
│   ├── 002-plan-based-authorization.md
│   └── ...
│
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md               ← Bug report template
│       └── feature_request.md          ← Feature request template
│
├── CONTRIBUTING.md                     ← Contribution guidelines
├── DOCUMENTATION_CHANGELOG.md          ← Doc updates per release
├── EXECUTIVE_OVERVIEW.md               ← 1-page strategic summary
├── README.md                           ← Main overview
├── SECURITY.md                         ← Security policy & reporting
└── ...
```

---

## 🔗 Cross-References

### Learning Path: Novice to Expert

**Week 1: Foundation**
1. [Absolute Beginner's Guide](./ABSOLUTE_BEGINNER_GUIDE.md)
2. [Glossary](./GLOSSARY.md) (reference as needed)
3. [Quick Reference](./MCP_QUICK_REFERENCE.md)

**Week 2-3: Core Concepts**
1. [Architecture Overview](./ARCHITECTURE.md)
2. [Security & Governance](./SECURITY_AND_GOVERNANCE.md)
3. [MCP Usage Guide](./MCP_USAGE_GUIDE.md)

**Week 4+: Deep Dives**
1. [ADRs](../adr/) (understand design decisions)
2. [Audit Log Analysis](./guides/AUDIT_LOG_ANALYSIS.md) (monitoring)
3. [Contributing Guide](../CONTRIBUTING.md) (if contributing)

### Common Questions Answered

**Q: How do I get started?**  
A: See [Absolute Beginner's Guide](./ABSOLUTE_BEGINNER_GUIDE.md)

**Q: What does ATLAS-GATE MCP do?**  
A: See [Executive Overview](../EXECUTIVE_OVERVIEW.md) (quick) or [Architecture Overview](./ARCHITECTURE.md) (detailed)

**Q: How do I use it?**  
A: See [MCP Usage Guide](./MCP_USAGE_GUIDE.md) and [Quick Reference](./MCP_QUICK_REFERENCE.md)

**Q: How is it secured?**  
A: See [Security & Governance](./SECURITY_AND_GOVERNANCE.md) and [SECURITY.md](../SECURITY.md)

**Q: What are my responsibilities?**  
A: See [Safety & Data Handling](./SAFETY_AND_DATA_HANDLING.md)

**Q: Something's broken. Help!**  
A: See [Troubleshooting](./TROUBLESHOOTING.md)

**Q: How do I contribute?**  
A: See [Contributing Guide](../CONTRIBUTING.md)

**Q: Where is the architecture diagram?**  
A: See [Architecture Overview](./ARCHITECTURE.md) and [diagrams/](./diagrams/)

**Q: What's the roadmap?**  
A: See [Maturity Model & Roadmap](./MATURITY_MODEL.md)

---

## 📊 Documentation Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Core Guides** | 10+ | ✅ Complete |
| **API References** | 5+ | ✅ Complete |
| **Examples** | 15+ | ✅ Complete |
| **ADRs** | 6+ | ✅ Complete |
| **Diagrams** | 3+ | ✅ Complete |
| **Troubleshooting Topics** | 20+ | ✅ Complete |
| **Glossary Terms** | 30+ | ✅ Complete |

---

## 📝 Documentation Maintenance

**Responsibility**: See [DOCUMENTATION_LIFECYCLE.md](./DOCUMENTATION_LIFECYCLE.md)

**Update Frequency**:
- Core guides: Per release
- API reference: Per release
- Troubleshooting: As needed
- Architecture diagrams: Per major change
- ADRs: Per new decision

**Changelog**: [DOCUMENTATION_CHANGELOG.md](../DOCUMENTATION_CHANGELOG.md)

**Version Control**: Docs versioned with code (v1, v2, etc.)

---

## 🔍 Search & Filtering

### By Audience
- **Beginners**: [ABSOLUTE_BEGINNER_GUIDE.md](./ABSOLUTE_BEGINNER_GUIDE.md), [GLOSSARY.md](./GLOSSARY.md)
- **Developers**: [ARCHITECTURE.md](./ARCHITECTURE.md), [ADRs](../adr/)
- **Operators**: [Guides](./guides/), [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Executives**: [EXECUTIVE_OVERVIEW.md](../EXECUTIVE_OVERVIEW.md), [MATURITY_MODEL.md](./MATURITY_MODEL.md)
- **Contributors**: [CONTRIBUTING.md](../CONTRIBUTING.md), [DOCUMENTATION_LIFECYCLE.md](./DOCUMENTATION_LIFECYCLE.md)

### By Topic
- **Security**: [SECURITY_AND_GOVERNANCE.md](./SECURITY_AND_GOVERNANCE.md), [SECURITY.md](../SECURITY.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md), [ADRs](../adr/), [diagrams/](./diagrams/)
- **Operations**: [guides/](./guides/), [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Contribution**: [CONTRIBUTING.md](../CONTRIBUTING.md), [DOCUMENTATION_LIFECYCLE.md](./DOCUMENTATION_LIFECYCLE.md)

### By Format
- **Text Guides**: [guides/](./guides/), [GLOSSARY.md](./GLOSSARY.md)
- **Diagrams**: [diagrams/](./diagrams/)
- **Code Examples**: [examples/](./examples/)
- **References**: [reference/](./reference/)

---

## 🆘 Still Can't Find What You Need?

1. **Check Glossary**: [GLOSSARY.md](./GLOSSARY.md)
2. **Search Issues**: [GitHub Issues](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/issues)
3. **Ask in Discussions**: [GitHub Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/discussions)
4. **Report a Bug**: [Bug Report Template](./.github/ISSUE_TEMPLATE/bug_report.md)

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-21  
**Status**: Complete
