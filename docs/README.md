---
title: "KAIZA MCP Documentation Index"
description: "Complete documentation guide and navigation"
version: "1.0.0"
last_updated: "2026-01-20"
---

# KAIZA MCP Documentation

Complete reference for KAIZA Model Context Protocol.

---

## Quick Navigation

**New to KAIZA?** Start here:
- [📘 Absolute Beginner's Guide](./guides/ABSOLUTE_BEGINNER_GUIDE.md) — Zero computer knowledge assumed
- [🚀 Bootstrap Setup Quick Start](./BOOTSTRAP_SETUP_QUICK_START.md) — 5-minute bootstrap secret setup
- [🔐 Bootstrap Secret Guide](./BOOTSTRAP_SECRET_GUIDE.md) — Understand the bootstrap secret

**For Decision-Makers:**
- [📊 Executive Overview](./EXECUTIVE_OVERVIEW.md) — One-page strategic summary
- [📈 Maturity Model](./MATURITY_MODEL.md) — Capabilities and 18-month roadmap
- [🎯 Level 5 Roadmap](./LEVEL_5_ROADMAP.md) — Path to world-class maturity

**For Developers & Operators:**
- [🏗️ Architecture Overview](./ARCHITECTURE.md) — System design and concepts
- [📖 Complete Usage Guide](./MCP_USAGE_GUIDE.md) — How to use KAIZA effectively
- [⚡ Quick Reference](./MCP_QUICK_REFERENCE.md) — One-page cheat sheet
- [🔧 Troubleshooting Guide](./TROUBLESHOOTING.md) — Common issues and fixes
- [🛡️ Safety & Data Handling](./SAFETY_AND_DATA_HANDLING.md) — Secrets, API keys, privacy

**For Contributors:**
- [🤝 Contributing Guide](../CONTRIBUTING.md) — How to contribute to KAIZA
- [📋 Architecture Decisions (ADRs)](./adr/) — Technical decision records
- [📝 ADR Template](./adr/TEMPLATE.md) — How to write an ADR
- [🏷️ ADR Status Taxonomy](./adr/STATUS_TAXONOMY.md) — Decision lifecycle

**System & Process Documentation:**
- [📚 Documentation Lifecycle](./DOCUMENTATION_LIFECYCLE.md) — Versioning and support policy
- [📝 Documentation Changelog](./DOCUMENTATION_CHANGELOG.md) — Version-by-version updates
- [🎨 Diagram Editing Guide](./diagrams/EDITING_GUIDE.md) — Create and render diagrams
- [🔒 Security Policy](../SECURITY.md) — Vulnerability reporting

**Reference & Audit:**
- [📖 Glossary for Humans](./GLOSSARY.md) — Plain-English term definitions
- [📊 Security & Governance](./SECURITY_AND_GOVERNANCE.md) — Governance model and security
- [📋 Enterprise Upgrade Summary](./ENTERPRISE_UPGRADE_SUMMARY.md) — What was upgraded
- [📦 Upgrade Manifest](./UPGRADE_MANIFEST.txt) — Complete file inventory

---

## Documentation by Audience

### I'm New to KAIZA

**Time commitment:** 45 minutes

1. Read [Executive Overview](./EXECUTIVE_OVERVIEW.md) (5 min)
2. Follow [Absolute Beginner's Guide](./guides/ABSOLUTE_BEGINNER_GUIDE.md) (40 min)
3. Reference [Glossary](./GLOSSARY.md) as needed

**Result:** You'll have KAIZA installed and understand what it does.

---

### I'm a Developer or Operator

**Time commitment:** 2–4 hours

1. [Architecture Overview](./ARCHITECTURE.md) — System design
2. [Complete Usage Guide](./MCP_USAGE_GUIDE.md) — How to use it
3. [Safety & Data Handling](./SAFETY_AND_DATA_HANDLING.md) — Security practices
4. [Troubleshooting Guide](./TROUBLESHOOTING.md) — Common issues
5. [ADRs](./adr/) — Why we made key decisions

**Result:** You can deploy KAIZA, create plans, and troubleshoot issues.

---

### I'm Making Business Decisions

**Time commitment:** 30 minutes

1. [Executive Overview](./EXECUTIVE_OVERVIEW.md) (5 min)
2. [Maturity Model](./MATURITY_MODEL.md) (15 min)
3. [Security Policy](../SECURITY.md) (10 min)

**Result:** You understand KAIZA's capabilities, roadmap, and risk posture.

---

### I'm Contributing Code

**Time commitment:** 1–2 hours (once)

1. [Contributing Guide](../CONTRIBUTING.md)
2. [ADR Process](./adr/TEMPLATE.md)
3. [Documentation Lifecycle](./DOCUMENTATION_LIFECYCLE.md)
4. [Architecture Decisions](./adr/) — Read relevant ADRs

**Result:** You can contribute code that meets standards and follows decisions.

---

### I'm Responsible for Governance

**Time commitment:** 3–4 hours

1. [Governance Model](./SECURITY_AND_GOVERNANCE.md)
2. [ADRs](./adr/) — All architecture decisions
3. [Maturity Model](./MATURITY_MODEL.md) — Audit capabilities
4. [Documentation Lifecycle](./DOCUMENTATION_LIFECYCLE.md) — Process documentation

**Result:** You can audit KAIZA deployments and governance compliance.

---

## Documentation Structure

```
docs/
├── README.md (this file - documentation index)
├── ABSOLUTE_BEGINNER_GUIDE.md (new users)
├── BOOTSTRAP_SECRET_GUIDE.md (bootstrap authentication)
├── BOOTSTRAP_SETUP_QUICK_START.md (quick setup)
├── EXECUTIVE_OVERVIEW.md (one-page summary)
├── MATURITY_MODEL.md (capabilities and roadmap)
├── LEVEL_5_ROADMAP.md (path to level 5 maturity)
├── GLOSSARY.md (plain-English definitions)
├── SAFETY_AND_DATA_HANDLING.md (secrets, privacy)
├── TROUBLESHOOTING.md (common issues)
├── DOCUMENTATION_LIFECYCLE.md (versioning policy)
├── DOCUMENTATION_CHANGELOG.md (release notes)
├── ENTERPRISE_UPGRADE_SUMMARY.md (what was upgraded)
├── UPGRADE_MANIFEST.txt (complete file inventory)
├── ARCHITECTURE.md (system design)
├── MCP_USAGE_GUIDE.md (how to use)
├── MCP_QUICK_REFERENCE.md (one-page cheat sheet)
├── SECURITY_AND_GOVERNANCE.md (governance model)
├── v1/ (version 1.0.0 documentation)
├── v2/ (placeholder for v2.0.0)
├── guides/ (step-by-step tutorials)
│   ├── ABSOLUTE_BEGINNER_GUIDE.md
│   ├── COMPLETE_SETUP_GUIDE.md
│   └── README_GETTING_STARTED.md
├── adr/ (architecture decision records)
│   ├── TEMPLATE.md
│   ├── STATUS_TAXONOMY.md
│   ├── 001-dual-role-governance.md
│   ├── 002-plan-based-authorization.md
│   ├── 003-cryptographic-audit-logging.md
│   ├── 004-zero-trust-execution.md
│   ├── 005-role-based-access-control.md
│   └── 006-content-integrity-verification.md
├── diagrams/ (source + rendered)
│   ├── EDITING_GUIDE.md
│   ├── source/ (Mermaid .mmd files)
│   └── rendered/ (generated SVG)
├── audit/ (security and compliance audits)
├── reference/ (quick references)
├── standards/ (coding standards)
├── examples/ (usage examples)
├── plans/ (approved plans)
└── reports/ (audit reports)
```

---

## Using This Documentation

### Finding Information

**Search by topic:**
- Glossary: [Glossary.md](./GLOSSARY.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Security: [SAFETY_AND_DATA_HANDLING.md](./SAFETY_AND_DATA_HANDLING.md)
- Governance: [SECURITY_AND_GOVERNANCE.md](./SECURITY_AND_GOVERNANCE.md)

**Search by role:**
- Beginner: [ABSOLUTE_BEGINNER_GUIDE.md](./guides/ABSOLUTE_BEGINNER_GUIDE.md)
- Developer: [ARCHITECTURE.md](./ARCHITECTURE.md) + [MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md)
- Executive: [EXECUTIVE_OVERVIEW.md](./EXECUTIVE_OVERVIEW.md)
- Decision maker: [MATURITY_MODEL.md](./MATURITY_MODEL.md)

**Search by task:**
- Install KAIZA: [Bootstrap Setup Quick Start](./BOOTSTRAP_SETUP_QUICK_START.md)
- Create first plan: [Absolute Beginner's Guide](./guides/ABSOLUTE_BEGINNER_GUIDE.md)
- Troubleshoot issue: [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Understand architecture: [Architecture Decisions (ADRs)](./adr/)

---

## Documentation Standards

All KAIZA MCP documentation:

✅ Has YAML metadata (title, version, audience)  
✅ Is audience-appropriate (plain language for beginners, technical for engineers)  
✅ Includes real examples and use cases  
✅ Links to related documentation  
✅ Is kept current with releases  
✅ Follows consistent formatting and tone  
✅ Is version-tracked and release-aligned  

See [DOCUMENTATION_LIFECYCLE.md](./DOCUMENTATION_LIFECYCLE.md) for complete standards.

---

## Quick Links

**Most Popular Pages:**
- [Absolute Beginner's Guide](./guides/ABSOLUTE_BEGINNER_GUIDE.md) — Get started in 45 minutes
- [Executive Overview](./EXECUTIVE_OVERVIEW.md) — Understand KAIZA in 5 minutes
- [Bootstrap Secret Guide](./BOOTSTRAP_SECRET_GUIDE.md) — Understand bootstrap authentication
- [Maturity Model](./MATURITY_MODEL.md) — See roadmap and capabilities
- [Troubleshooting](./TROUBLESHOOTING.md) — Fix common issues

**Community:**
- [Contributing Guide](../CONTRIBUTING.md) — How to contribute
- [Security Policy](../SECURITY.md) — Report vulnerabilities
- [GitHub Issues](https://github.com/dylanmarriner/KAIZA-MCP-server/issues) — Ask questions
- [GitHub Discussions](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions) — Discuss ideas

---

## Feedback & Suggestions

Found an error or unclear explanation?

- [Open an issue](https://github.com/dylanmarriner/KAIZA-MCP-server/issues)
- [Start a discussion](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions)
- [Submit a PR](../CONTRIBUTING.md)

---

**Last Updated:** 2026-01-20  
**Version:** 1.0.0  
**Audience:** All users
