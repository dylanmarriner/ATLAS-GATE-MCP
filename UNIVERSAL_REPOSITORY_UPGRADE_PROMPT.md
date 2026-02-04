# Universal Repository Upgrade Prompt

**A Production-Ready, Reusable Prompt for Elevating Any GitHub Repository to Elite, Enterprise-Grade Standards**

This prompt can be applied to ANY GitHub repository to systematically upgrade it to world-class, enterprise-grade status. No modifications needed—use as-is for any project.

---

## MASTER PROMPT: Enterprise-Grade Repository Transformation

### **Context & Authority**

Assume the role of a world-leading GitHub authority and enterprise software repository architect with deep expertise in:
- Open-source governance and community management
- Fortune-100 engineering standards and best practices
- Enterprise compliance frameworks (SOC 2, ISO 27001, GDPR, HIPAA)
- Documentation science and developer experience (DX)
- Security policy and incident response
- Long-term software maintainability

You are operating with the assumption that this repository will be:
- Audited by enterprise security and compliance teams
- Adopted by organizations with zero institutional knowledge
- Read by non-technical stakeholders (legal, executives, board members)
- Used by first-time developers and senior architects
- Deployed to regulated environments (healthcare, finance, government)

Your task is to deliver a **complete, executable transformation plan** that upgrades the repository to elite status—suitable for global adoption and enterprise deployment.

---

## PHASE 1: Repository Audit & Assessment

### **1.1 Current State Analysis**

Examine the repository and provide:

**Structural Assessment**:
- Existing directory structure and organization
- Root-level file clutter or confusion
- Documentation file count and location
- GitHub configuration (.github/ contents)
- CI/CD pipeline presence and quality

**Documentation Assessment**:
- README quality and audience assumptions
- User/contributor documentation completeness
- Architecture documentation presence
- Security documentation coverage
- Glossary or terminology explanations

**Governance Assessment**:
- Contribution guidelines clarity
- Code of Conduct presence
- Issue/PR template sophistication
- Authority structure definition
- Decision-making process documentation

**Compliance Assessment**:
- Security policy documentation
- License clarity and compliance
- Dependency management practices
- Audit readiness evidence
- Vulnerability disclosure process

**Community Assessment**:
- Community guidelines friendliness
- Support infrastructure (email, discussions, etc.)
- Response time SLAs
- Contributor recognition
- Onboarding experience

### **1.2 Gap Identification**

For each of the eight dimensions below, identify:
- Current capability level (0-100%)
- Target capability level (always 95%+)
- Specific gaps to address
- Priority for remediation

**Eight Dimensions**:
1. **Discovery & Onboarding**: Can non-technical stakeholders understand the project in 5 minutes?
2. **Documentation Architecture**: Is documentation organized by audience with clear routing?
3. **Security & Compliance Posture**: Is the project audit-ready and compliance-aligned?
4. **Accessibility & Inclusivity**: Is documentation written for absolute beginners?
5. **Governance & Process Clarity**: Are decision-making and authority structures explicit?
6. **Automation & Quality Assurance**: Are CI/CD pipelines comprehensive and automated?
7. **Community & Support Infrastructure**: Are multiple communication channels available?
8. **Regulatory & Enterprise Compliance**: Is the project aligned with SOC 2, ISO 27001, GDPR?

### **1.3 Benchmark Against Elite Standards**

Define what "elite/world-class" means for this specific repository:
- Comparable projects to benchmark against (Kubernetes, Terraform, Docker, Flask, Django)
- Specific quality metrics for each dimension
- Success criteria for each improvement area

---

## PHASE 2: Canonical Repository Structure

### **2.1 Define Optimal Directory Layout**

Create a complete directory structure design that:
- Organizes documentation by clear audience (users, contributors, maintainers, enterprises)
- Separates concerns (source code, tests, docs, tooling, configuration)
- Enables discovery and navigation
- Scales with project growth
- Follows open-source best practices

**Template Structure** (customize for your project):

```
[PROJECT-NAME]/
├── .github/                              # GitHub-specific configuration
│   ├── workflows/                        # CI/CD automation (GitHub Actions)
│   │   ├── ci.yml                        # Test on every push
│   │   ├── security.yml                  # Security scanning
│   │   ├── docs.yml                      # Documentation validation
│   │   └── release.yml                   # Automated releases
│   ├── ISSUE_TEMPLATE/                   # Standardized issue templates
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── security_report.md
│   ├── pull_request_template.md          # PR template
│   └── dependabot.yml                    # Automated dependency updates
│
├── docs/                                 # Comprehensive documentation (primary hub)
│   ├── README.md                         # Documentation navigation index
│   ├── START_HERE.md                     # First-time visitor guide (plain English)
│   ├── GLOSSARY.md                       # Non-technical terminology
│   │
│   ├── user-guide/                       # End-user documentation
│   │   ├── BEGINNER_GUIDE.md             # Zero-assumptions tutorial
│   │   ├── INSTALLATION.md               # Step-by-step setup
│   │   ├── CONFIGURATION.md              # All configuration options
│   │   ├── USAGE_GUIDE.md                # Daily operations
│   │   ├── EXAMPLES.md                   # Real-world scenarios
│   │   ├── TROUBLESHOOTING.md            # Problem diagnosis
│   │   ├── FAQ.md                        # Frequently asked questions
│   │   └── QUICK_START.md                # 5-minute getting started
│   │
│   ├── architecture/                     # Technical architecture
│   │   ├── ARCHITECTURE.md               # System design overview
│   │   ├── SYSTEM_DESIGN.md              # Component breakdown
│   │   ├── DATA_FLOWS.md                 # Data movement through system
│   │   ├── SECURITY_MODEL.md             # Security architecture
│   │   └── PERFORMANCE.md                # Performance characteristics
│   │
│   ├── contributor-guide/                # For developers contributing code
│   │   ├── CONTRIBUTING.md               # Main contribution guide
│   │   ├── DEVELOPMENT_SETUP.md          # Dev environment setup
│   │   ├── CODE_STANDARDS.md             # Code style & conventions
│   │   ├── TESTING.md                    # Testing requirements
│   │   ├── PULL_REQUEST_GUIDE.md         # PR submission process
│   │   └── COMMIT_CONVENTION.md          # Commit message format
│   │
│   ├── maintainer-guide/                 # For project maintainers
│   │   ├── RELEASE_PROCESS.md            # How to release versions
│   │   ├── TRIAGE_GUIDE.md               # Issue triage procedures
│   │   ├── SECURITY_RESPONSE.md          # Security incident handling
│   │   ├── GOVERNANCE.md                 # Decision-making framework
│   │   └── ROADMAP.md                    # Long-term direction
│   │
│   ├── enterprise-guide/                 # For enterprise adopters
│   │   ├── DEPLOYMENT.md                 # Production deployment
│   │   ├── COMPLIANCE.md                 # Regulatory alignment
│   │   ├── AUDIT_READINESS.md            # Audit procedures
│   │   ├── SECURITY_CONTROLS.md          # Control mapping
│   │   ├── DISASTER_RECOVERY.md          # Business continuity
│   │   └── SUPPORT_SLA.md                # Support agreements
│   │
│   ├── adr/                              # Architecture Decision Records
│   │   ├── TEMPLATE.md                   # ADR template
│   │   ├── 001-initial-decision.md
│   │   └── 002-next-decision.md
│   │
│   ├── changelog/                        # Version history
│   │   ├── CHANGELOG.md                  # Complete change log
│   │   ├── MIGRATION_GUIDES.md           # Upgrade instructions
│   │   └── [VERSION_ARCHIVES]/           # Older versions
│   │
│   ├── reference/                        # Quick reference materials
│   │   ├── QUICK_REFERENCE.md            # API/command quick lookup
│   │   └── CHEAT_SHEET.md                # Common tasks reference
│   │
│   └── templates/                        # Templates for users
│       ├── PLAN_TEMPLATE.md
│       ├── CONFIGURATION_TEMPLATE.md
│       └── [DOMAIN_SPECIFIC]/
│
├── src/                                  # Source code
├── tests/                                # Test files
├── scripts/                              # Utility scripts
│
├── LICENSE                               # License (ISC, MIT, Apache 2.0, etc.)
├── README.md                             # Main README (can reference docs/)
├── SECURITY.md                           # Security policy
├── CODE_OF_CONDUCT.md                    # Community standards
├── CONTRIBUTING.md                       # (can reference docs/contributor-guide/)
├── package.json                          # Project metadata
├── .gitignore                            # Git ignore rules
├── .env.example                          # Environment template
│
└── [ADDITIONAL_CONFIG_FILES]
    └── Docker, K8s, CI/CD configs, etc.
```

### **2.2 Rationale for Each Section**

Explain the purpose of every directory and key file:
- Why it exists
- What goes in it
- How it serves users/contributors
- Scalability and long-term maintenance benefits

---

## PHASE 3: Primary README.md (Extreme Detail)

### **3.1 Fully Written, Production-Ready README**

Produce a new, comprehensive README that:

**Assumes Zero Prior Knowledge**:
- No jargon without explanation
- Real-world analogies for complex concepts
- Graduated complexity (beginner → advanced)
- Every command explained before use

**Includes Progressive Learning Path**:
1. **What is this?** (1 paragraph, plain English)
2. **Why does it exist?** (Problem statement with real example)
3. **Who should use it?** (Decision matrix for different personas)
4. **Quick start** (5 minutes, just get it running)
5. **How it works** (High-level overview, no deep tech yet)
6. **Key concepts** (Terminology with plain explanations)
7. **Installation** (Step-by-step for all platforms)
8. **Configuration** (All major options explained)
9. **Usage** (Basic → Intermediate → Advanced)
10. **Architecture** (System design with diagrams)
11. **Examples** (Real-world scenarios)
12. **Troubleshooting** (Common problems & solutions)
13. **FAQ** (Frequently asked questions)
14. **Glossary** (All technical terms explained)
15. **Contributing** (How to get involved)
16. **License** (What you can/can't do)
17. **Support** (How to get help)

**Quality Standards**:
- Meets or exceeds documentation of: Kubernetes, Terraform, Docker, Flask, Django
- Every command has example output shown
- Every concept has working example
- No "TODO" or incomplete sections
- All links verified and working
- Tested by someone with zero prior knowledge

### **3.2 Visual Diagram Descriptions**

Provide Markdown-compatible diagram descriptions (Mermaid-style) for:
1. **System architecture** (high-level component diagram)
2. **Data flow** (how information moves through system)
3. **Deployment model** (how to run it)
4. **User workflows** (common tasks visualized)
5. **CI/CD pipeline** (automation flow)
6. **Decision tree** (how to choose features/options)

Each diagram includes:
- Plain-English explanation for non-technical readers
- Technical interpretation for engineers
- Clear labels and directional flow
- Legend explaining all symbols

---

## PHASE 4: Documentation System (Beyond README)

### **4.1 Complete Documentation Architecture**

Define a full documentation system with:

**Documentation Sets for Each Audience**:

1. **End Users**:
   - Beginner guide (zero assumptions)
   - Installation guide (all platforms)
   - Configuration reference (all options)
   - Usage guide (basic to advanced)
   - Examples (real-world scenarios)
   - Troubleshooting (problem diagnosis)
   - FAQ (80+ common questions)

2. **Contributors**:
   - Contribution guidelines (how to participate)
   - Development setup (environment configuration)
   - Code standards (style, conventions, quality)
   - Testing guide (test requirements, coverage)
   - Pull request process (submission workflow)
   - Commit conventions (message format)

3. **Maintainers**:
   - Release process (how to cut releases)
   - Issue triage (prioritization and assignment)
   - Security response (incident procedures)
   - Governance (decision-making framework)
   - Roadmap (long-term direction)

4. **Enterprise Adopters**:
   - Deployment guide (production setup)
   - Compliance (SOC 2, ISO 27001, GDPR, HIPAA)
   - Audit readiness (procedures and evidence)
   - Security controls (control mapping)
   - Disaster recovery (business continuity)
   - SLA and support (uptime, response times)

### **4.2 Documentation Maintenance Strategy**

Define:
- Update frequency (per release)
- Ownership (who maintains each section)
- Review process (before merging code)
- Versioning strategy (docs for each release)
- Archive process (older versions preserved)
- Link validation (automated checking)

---

## PHASE 5: Documentation Tone Variants

### **5.1 Three Tone Styles with Examples**

Provide explicit guidance and examples for three documentation tones:

**Educational Tone** (Patient, Explanatory, Beginner-Friendly):
- Use analogies and metaphors
- Explain the "why" not just "what"
- Assume no prior knowledge
- Use encouragement and support
- Break complex ideas into steps
- Provide context before details

**Example**:
```markdown
## Understanding Authorization

Think of authorization like keys to a house:
- You might have a key to the front door (can enter)
- But not a key to the master bedroom (restricted area)
- The locks are the system's way of controlling access

ATLAS-GATE-MCP uses "plans" like those keys...
```

**Corporate/Enterprise Tone** (Formal, Precise, Compliance-Aware):
- Technical accuracy paramount
- Emphasize compliance and audit trails
- Executive-friendly language
- Risk and control focus
- Formal terminology
- Regulatory framework alignment

**Example**:
```markdown
## Access Control Framework

ATLAS-GATE-MCP implements role-based access control 
(RBAC) consistent with NIST guidelines and SOC 2 
requirements. All operations are logged with 
cryptographic signatures providing non-repudiation...
```

**Open-Source Community Tone** (Welcoming, Collaborative, Energetic):
- Emphasize community and contribution
- Celebrate diversity
- Encourage participation
- Friendly and informal language
- Focus on shared ownership
- Recognition of contributors

**Example**:
```markdown
## Welcome to Contributors!

We'd love your help making this better. Whether you're 
fixing a typo, improving documentation, or adding 
features—every contribution is valued. Here's how to get started...
```

### **5.2 When to Use Each Tone**

Create a matrix showing:
- Where each tone applies (README, user docs, enterprise docs, etc.)
- How to recognize which audience needs which tone
- How to transition between tones appropriately
- Guidelines for consistency within each section

---

## PHASE 6: Contribution & Governance Model

### **6.1 Production-Ready CONTRIBUTING.md**

Create a comprehensive contribution guide with:

**Simple Language**:
- What contributing means (code, docs, reporting issues, etc.)
- How to start (setup, first steps)
- Communication norms
- Expected behavior

**Precise Technical Terms**:
- Formal processes
- Authority structure
- Decision workflows
- Requirements

**Sections**:
- Code of Conduct (be kind, be respectful)
- Getting started (5 steps to be ready)
- Development workflow (branches, commits, tests)
- Code standards (style, quality, security)
- Testing requirements (what needs testing)
- Documentation expectations (update docs)
- Review process (what reviewers look for)
- Release process (how code becomes a release)
- Getting help (where to ask questions)

### **6.2 Production-Ready CODE_OF_CONDUCT.md**

Create a comprehensive code of conduct with:

**Core Values**:
- Respect for all community members
- Inclusivity and welcoming environment
- Collaborative problem-solving
- Professional standards
- Integrity in all interactions

**Expected Behavior**:
- How to contribute positively
- Communication norms
- Conflict resolution approach
- Inclusion practices

**Unacceptable Behavior**:
- Harassment (explicit, detailed examples)
- Discrimination (based on protected characteristics)
- Hostile conduct (intimidation, threats)
- Misconduct (plagiarism, fraud, trolling)

**Reporting & Enforcement**:
- How to report violations (private email, not public)
- Investigation process (fair, impartial, confidential)
- Consequences (proportional to violation severity)
- Appeals process (fair hearing available)

**Attribution**:
- Based on Contributor Covenant v2.1
- Inspired by Django, Python, CNCF codes of conduct

### **6.3 Production-Ready Governance Model**

Create explicit governance documentation with:

**Decision-Making Framework**:
- Four levels of decisions (simple → complex)
- Who decides at each level
- Discussion periods required
- Voting procedures
- Authority limits

**Roles & Responsibilities**:
- Founder/Lead Maintainer (final authority)
- Core Team (merge rights, daily leadership)
- Contributors (can advance to core team)
- Working Groups (ad-hoc task forces)

**Approval Authority Matrix**:
- Small changes: 1 reviewer
- Medium changes: 2 reviewers + discussion
- Major changes: RFC (Request for Comments)
- Breaking changes: RFC + supermajority vote

**Dispute Resolution**:
- Level 1: Discussion (try to reach consensus)
- Level 2: Core team vote
- Level 3: Maintainer escalation
- Level 4: Community appeal process

**Transparency**:
- All decisions public (except security/conduct)
- Rationale documented
- Monthly transparency reports
- Community input welcomed

---

## PHASE 7: Issue & PR Templates

### **7.1 GitHub Issue Templates**

Create standardized templates for:

**Bug Report**:
- Clear bug description
- Reproduction steps
- Expected vs actual behavior
- Environment (OS, versions, etc.)
- Logs/screenshots
- Checklist before submitting

**Feature Request**:
- What problem it solves
- Proposed solution
- Examples and use cases
- Alternatives considered
- Impact assessment
- Checklist

**Security Report**:
- Warning: Don't use public issues for vulnerabilities
- Pointer to private disclosure process
- Link to SECURITY.md
- For security questions, provide different template

**Discussion Starter**:
- Open-ended question/discussion format
- No requirements, just conversation

### **7.2 GitHub PR Template**

Create comprehensive PR template with:

**Description**:
- What changed and why
- Problem it solves
- How it was tested

**Type of Change**:
- Bug fix, feature, breaking change, docs, perf, etc.

**Testing**:
- How was it tested
- Test coverage added
- Manual testing performed

**Documentation**:
- README updated?
- Docs updated?
- Changelog entry?
- Code comments?

**Quality Checklist**:
- Follows code standards
- No console.log or debug code
- Error handling included
- No security issues
- Tests passing

**Breaking Changes**:
- Does this break anything?
- Deprecation needed?
- Migration guide?

**Author Checklist**:
- Code reviewed by self
- Tests added/passing
- Documentation updated
- Ready for review

---

## PHASE 8: Engineering Excellence & Automation

### **8.1 CI/CD Pipeline Design**

Design comprehensive GitHub Actions workflows for:

**Continuous Integration** (.github/workflows/ci.yml):
- Test matrix (multiple Node/Python/Go versions)
- Run tests on every push and PR
- Build verification
- Code quality checks (linting, complexity)
- Security audit integration
- Documentation validation

**Security Scanning** (.github/workflows/security.yml):
- Dependency vulnerability scanning
- CodeQL static analysis
- Secret scanning (no passwords in code)
- License compliance checking
- Custom security validations

**Documentation** (.github/workflows/docs.yml):
- Markdown linting
- Link validation (no broken links)
- Spell checking
- Build verification

**Release** (.github/workflows/release.yml):
- Automated version bumping
- Changelog generation
- Build artifacts
- Package publishing (npm, PyPI, etc.)
- GitHub release creation

**Performance** (.github/workflows/performance.yml):
- Performance benchmarking
- Regression detection
- Results reporting

### **8.2 Status Badges**

Add badges to README for:
- Build status (passing/failing)
- Test coverage
- Dependencies (up-to-date/outdated)
- License
- Latest version
- Security score
- Uptime/status

---

## PHASE 9: Compliance & Security Overlays

### **9.1 SOC 2 Type II Readiness**

Document:
- Security controls implemented (CC6, CC7, A1, POO, etc.)
- Evidence artifacts (audit logs, configs, procedures)
- Timeline to certification (pre-assessment, 6-month operational period, audit)
- Required documentation
- Control mapping

### **9.2 ISO 27001 Alignment**

Document:
- Information security policy requirements
- Asset management procedures
- Access control implementation
- Change management process
- Logging and monitoring
- Incident response procedures
- Risk assessment methodology

### **9.3 GDPR Compliance**

Document:
- Lawful basis for processing data
- Data subject rights (access, erasure, portability, etc.)
- Data Protection Impact Assessment (DPIA)
- Data Processing Agreement (DPA) template
- Privacy notice template
- Data retention policy
- Data deletion procedures
- Breach notification procedures

### **9.4 HIPAA Support** (if handling health data)

Document:
- Technical safeguards (encryption, audit)
- Administrative safeguards (training, policies)
- Physical safeguards (facility access)
- Business Associate Agreement (BAA) requirements
- Risk assessment procedures
- Incident response for healthcare data

### **9.5 Control Mapping Matrix**

Create table showing:
- Control ID (from standard)
- Control description
- How implemented in project
- Evidence artifacts
- Responsibility (organization vs project)

### **9.6 Security Policy**

Document:
- Vulnerability disclosure process
- Response timeline (48h initial, 14d patch for critical)
- Security team composition
- Supported versions for security updates
- Bug bounty program (if applicable)

---

## PHASE 10: Community & Support Infrastructure

### **10.1 Multiple Communication Channels**

Establish:
- **GitHub Issues**: Bug reports and features
- **GitHub Discussions**: General questions, ideas, requests
- **Email**: General inquiries (info@project.org)
- **Security Email**: Vulnerability reports (security@project.org)
- **Office Hours** (optional): Weekly community calls

### **10.2 Support SLA** (if applicable)

Define:
- **Critical issues**: 24-hour response
- **High priority**: 3-day response
- **Medium priority**: 2-week response
- **Low priority**: Best effort

### **10.3 Community Recognition**

Establish:
- Contributors list (CONTRIBUTORS.md)
- Acknowledgments (project credits)
- Highlight program (feature community members)
- Recognition levels (beginner, contributor, maintainer)

---

## PHASE 11: Universal Implementation Checklist

### **Documentation Checklist**

- [ ] START_HERE.md created (entry point for all audiences)
- [ ] README enhanced (progressive complexity)
- [ ] Beginner's guide (zero-assumption tutorial)
- [ ] User guide (installation, configuration, usage)
- [ ] Architecture documentation (system design)
- [ ] Contributor guide (how to contribute)
- [ ] Maintainer guide (for project leaders)
- [ ] Enterprise guide (deployment, compliance)
- [ ] FAQ (80+ common questions)
- [ ] Glossary (non-technical terms)
- [ ] QUICK_START.md (5-minute getting started)

### **Governance Checklist**

- [ ] CODE_OF_CONDUCT.md created
- [ ] GOVERNANCE.md created (decision framework)
- [ ] Roles and responsibilities defined
- [ ] Dispute resolution process documented
- [ ] Amendment procedure specified
- [ ] Transparency reporting scheduled

### **Community Infrastructure Checklist**

- [ ] Issue templates (bug, feature, security)
- [ ] PR template created
- [ ] Contributing guide updated
- [ ] Communication channels established
- [ ] Support SLA defined
- [ ] Contributors recognized

### **Automation Checklist**

- [ ] CI/CD workflows created (.github/workflows/)
- [ ] Security scanning enabled
- [ ] Documentation validation automated
- [ ] Link checking automated
- [ ] Status badges added to README
- [ ] Automated releases configured

### **Compliance Checklist**

- [ ] SECURITY.md enhanced with procedures
- [ ] LICENSE verified and documented
- [ ] SOC 2 roadmap created
- [ ] ISO 27001 alignment documented
- [ ] GDPR compliance guide written
- [ ] Control mapping matrix created
- [ ] Audit-ready evidence identified
- [ ] Disaster recovery procedure documented

### **Polish Checklist**

- [ ] All links verified
- [ ] Markdown linting (no warnings)
- [ ] Spell checking (no errors)
- [ ] Consistent terminology
- [ ] Examples tested and working
- [ ] Images/diagrams optimized
- [ ] Code snippets syntax-highlighted
- [ ] Mobile-friendly (if website)

---

## PHASE 12: Copy-Paste-Ready Implementation

Below is a complete, ready-to-use template system. Copy, customize, use immediately.

### **Template: START_HERE.md**

```markdown
# START HERE: What is [PROJECT]?

[Follow the structure in "PHASE 3: Primary README.md"]
```

### **Template: Code of Conduct**

```markdown
# Code of Conduct

[Follow structure in "PHASE 6: Governance Model"]

We value respect, inclusivity, collaboration, 
professionalism, and integrity.

[Detailed sections for values, expected behavior, 
unacceptable behavior, reporting, investigation, 
enforcement, appeals]
```

### **Template: GOVERNANCE.md**

```markdown
# Project Governance

[Follow structure in "PHASE 6: Governance Model"]

Decision framework, roles, authority matrix, 
dispute resolution, amendment process.
```

### **Template: CI Workflow (.github/workflows/ci.yml)**

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run verify

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=moderate
        continue-on-error: true

  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run docs:build
      - run: npm run docs:validate
```

### **Template: Issue Templates**

See PHASE 7 for complete templates.

---

## FINAL OUTCOME

When this prompt is fully executed, the repository will be:

✅ **Discoverable** — Multiple entry points for different audiences  
✅ **Accessible** — Non-technical explanations, progressive learning  
✅ **Professional** — Enterprise-grade governance and processes  
✅ **Secure** — Security policy and vulnerability disclosure  
✅ **Compliant** — SOC 2, ISO 27001, GDPR frameworks  
✅ **Automated** — CI/CD pipelines for quality assurance  
✅ **Community-Driven** — Welcoming, inclusive, transparent  
✅ **Scalable** — Governance model supports growth  

**Suitable for**:
- Fortune-100 adoption
- Government and healthcare deployment
- Regulated environments
- Global open-source communities
- Enterprise integration

---

## EXECUTION NOTES

**This prompt is**:
- ✅ Tool-agnostic (works with any repository)
- ✅ Language-agnostic (JavaScript, Python, Go, Rust, etc.)
- ✅ Framework-agnostic (works for any project type)
- ✅ Exhaustive (nothing left to chance)
- ✅ Immediately actionable (no follow-up needed)
- ✅ Copy-paste ready (templates provided)

**To use this prompt**:

1. **Copy this entire document**
2. **Replace [PROJECT-NAME] with your actual project**
3. **Provide it to an AI system or senior engineer**
4. **Execute sequentially (Phase 1 → Phase 12)**
5. **Customize templates for your specific project**
6. **Review and approve before merging**
7. **Announce transformation to community**

**Estimated effort**:
- Small project (< 1000 LOC): 40-80 hours
- Medium project (1k-10k LOC): 80-160 hours
- Large project (10k+ LOC): 160-240 hours

**Success metrics**:
- All 50+ checklist items completed
- External review by enterprise team
- Community feedback positive
- Benchmark projects used as comparison
- Quantifiable improvement in each dimension

---

## FINAL NOTES

This prompt produces **world-class repositories** suitable for:
- Public open-source projects
- Enterprise internal repositories
- Government deployment
- Healthcare environments
- Financial systems
- Mission-critical infrastructure

**The transformation is complete when the repository is indistinguishable in quality from projects like Kubernetes, Terraform, and Django.**

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Production-Ready  
**License**: Creative Commons (Use Freely)  
**Contact**: Use for any project, any industry, any scale
