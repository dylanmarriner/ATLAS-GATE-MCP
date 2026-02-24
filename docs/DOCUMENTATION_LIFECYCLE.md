# Documentation Lifecycle & Governance

**Version**: 1.0.0  
**Last Updated**: 2026-01-21

## Overview

This document defines how documentation is maintained, versioned, and evolved in ATLAS-GATE MCP. It establishes a Docs-as-a-Product discipline with clear ownership, lifecycle rules, and quality standards.

---

## 1. Documentation System Structure

### 1.1 Version Strategy

ATLAS-GATE MCP uses **semantic versioning for documentation**, aligned with software releases:

```
docs/
├── v1/                  ← Documentation for v1.x releases (stable)
├── v2/                  ← Documentation for v2.x releases (in development)
├── latest -> v1/        ← Symlink to current production version
├── guides/              ← Version-agnostic getting-started guides
├── diagrams/            ← Architecture diagrams (source + rendered)
└── adr/                 ← Architecture Decision Records (version-independent)
```

### 1.2 Documentation Ownership

| Component | Owner | Review | Update Frequency |
|-----------|-------|--------|-------------------|
| README.md | DevEx Lead | PM + Tech Lead | Per release |
| Architecture docs | Tech Lead | Architecture Review Board | Quarterly |
| API Reference | API Owner | Tech Lead | Per release |
| Getting Started | DevEx Lead | Community feedback | Per release |
| Security docs | Security Lead | Security audit | Per vulnerability |
| ADRs | Decision owner | Tech Lead | Per decision |
| Diagrams | Architect | Tech Lead | Per architecture change |

### 1.3 Document Lifecycle States

Every documentation page has an implicit status:

- **DRAFT**: In development, not yet reviewed
- **REVIEW**: Ready for peer review
- **STABLE**: Approved, current version
- **DEPRECATED**: Scheduled for removal
- **ARCHIVED**: Old version, kept for reference

---

## 2. Documentation Changelog

### 2.1 Mandatory DOCUMENTATION_CHANGELOG.md

This file tracks **documentation-level changes** (not code changes).

**Location**: `/docs/DOCUMENTATION_CHANGELOG.md`

**Format** (per semantic versioning):

```markdown
# Documentation Changelog

All notable changes to ATLAS-GATE MCP documentation are recorded here.

## [1.0.2] - 2026-02-10

### Added
- New troubleshooting section in Beginner's Guide
- Diagram source files for PlantUML (docs/diagrams/source/)

### Changed
- Reorganized security docs into v1/security/ module
- Updated quick reference with new plan syntax

### Deprecated
- Old Windsurf configuration format (use mcp_config.json instead)

### Removed
- Legacy configuration examples (v0.9)

### Fixed
- Corrected npm script paths in installation guide
- Fixed broken links in sidebar navigation

### Security
- Documented secret rotation best practices

### Docs-to-Code Mapping
- Maps to software release v1.0.2
- Docs commit: abc1234
- Code commit: def5678

## [1.0.1] - 2026-01-25

... (same format)
```

### 2.2 Release-Aligned Documentation

**Every software release includes a documentation change section:**

1. **In CHANGELOG.md** (code release notes):

   ```markdown
   ## [1.0.2] - 2026-02-10
   
   ### Changes
   - Feature X (see docs/guides/feature-x.md)
   - Security fix Y (see SECURITY.md)
   ```

2. **In DOCUMENTATION_CHANGELOG.md**:
   - Reference the software version
   - List all docs changes
   - Include commit hashes for both docs and code

3. **In versioned docs** (e.g., `docs/v1/CHANGELOG.md`):
   - Version-specific documentation changes
   - Deprecation timelines
   - Migration guides

### 2.3 Deprecation Policy

**Documentation deprecation timeline:**

| Stage | Duration | Action |
|-------|----------|--------|
| **Active** | ∞ | Current best practice; all examples use this |
| **Deprecated** | 2 releases | Clearly marked; old docs available but not featured |
| **Archived** | Forever | Kept in `/docs/vX/` folders; not linked from `/latest` |

**Deprecation workflow:**

1. **Mark as deprecated** in the document:

   ```markdown
   > ⚠️ **Deprecated as of v1.1.0**  
   > This feature will be removed in v2.0.  
   > See [Migration Guide](./migration-v1-to-v2.md) for alternatives.
   ```

2. **Update related pages** to point to new approaches

3. **Create migration guide** for affected users

4. **Archive in version folder** when removed

---

## 3. Documentation Standards

### 3.1 File Naming

- **Markdown**: `PascalCase.md` (e.g., `GettingStarted.md`)
- **Diagrams (source)**: `kebab-case.mmd` (Mermaid) or `.puml` (PlantUML)
- **Diagrams (rendered)**: Same name as source, with `.svg` or `.png`

### 3.2 Metadata (Front Matter)

Every major documentation file should include:

```markdown
---
title: "Feature Name"
description: "One-sentence summary"
version: "1.0.0"
status: "stable"
last_updated: "2026-01-21"
audience: ["developers", "operators", "stakeholders"]
---
```

### 3.3 Content Standards

#### Headings

- H1 (`#`): Document title only (once per file)
- H2 (`##`): Major sections
- H3 (`###`): Subsections
- H4 and beyond: Rare; reconsider structure

#### Code Blocks

```markdown
# Always specify language for syntax highlighting
\`\`\`bash
npm install
\`\`\`

# Include descriptive comments
\`\`\`javascript
// Initialize ATLAS-GATE MCP with security context
const atlas-gate = new KaizaMCP(config);
\`\`\`

# Callouts for important notes
\`\`\`
> ⚠️ **Warning**: Never commit secrets to Git
> ✓ **Good**: Use environment variables
> ❌ **Bad**: Hardcode in source
\`\`\`
```

#### Links

- **Internal**: `[Guide](./GUIDE.md)` (relative)
- **External**: `[GitHub](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server)` (absolute)
- **Anchors**: `[Section](#section-heading)`

#### Tables

Use 3-column maximum for GitHub rendering clarity. For complex data, split into multiple tables.

### 3.4 Tone & Language

**Rules:**

- Plain English, short sentences
- Active voice ("Users can configure" not "Configuration is possible")
- No marketing hype or emojis (except in callouts like ⚠️ ✓ ❌)
- Specific examples over generic statements
- Assume reader may not be a programmer

**Bad example:**
> The system provides a cutting-edge governance layer that enables seamless orchestration of AI-driven workflows.

**Good example:**
> ATLAS-GATE MCP controls which AI tools can make changes and records every action they take.

---

## 4. Diagram System

### 4.1 Diagram Governance

**All diagrams must have:**

1. **Source file** (editable, in version control)
2. **Rendered output** (SVG or PNG for GitHub display)
3. **Documentation** (how to regenerate)

### 4.2 Diagram Directory Structure

```
docs/diagrams/
├── source/
│   ├── architecture.mmd
│   ├── audit-flow.mmd
│   ├── governance-model.puml
│   └── README.md (how to edit)
├── rendered/
│   ├── architecture.svg
│   ├── audit-flow.svg
│   └── governance-model.svg
└── DIAGRAM_GUIDE.md (tool instructions)
```

### 4.3 Supported Diagram Tools

| Tool | Extension | When to Use | Pros | Cons |
|------|-----------|-------------|------|------|
| **Mermaid** | `.mmd` | Flowcharts, sequences, architectures | Lightweight, Git-friendly | Limited styling |
| **PlantUML** | `.puml` | Complex architectures, entity diagrams | Very flexible | Steep learning curve |
| **Draw.io** | `.drawio` | Custom diagrams | Visual editor | Not text-based |

### 4.4 Regenerating Diagrams

**For Mermaid:**

```bash
npm run docs:render
# or manually:
npx mmdc -i docs/diagrams/source/architecture.mmd -o docs/diagrams/rendered/architecture.svg
```

**For PlantUML:**

```bash
java -jar plantuml.jar docs/diagrams/source/*.puml -svg -o ../rendered/
```

**Document regeneration in:**

- Commit message: "docs: regenerate diagrams for ADR-007"
- CI/CD pipeline: `npm run docs:build`

---

## 5. Architecture Decision Records (ADRs)

### 5.1 ADR Location & Naming

```
adr/
├── README.md               ← Index of all ADRs
├── TEMPLATE.md             ← Standard template
├── STATUS_TAXONOMY.md      ← Status definitions
├── 001-dual-role-governance.md
├── 002-plan-based-authorization.md
└── ...
```

**Naming:** `NNN-kebab-case-title.md` (e.g., `007-versioned-documentation-system.md`)

### 5.2 ADR Template

```markdown
# ADR-NNN: Title of Decision

## Status
PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED

## Context
Why did we face this decision? What were the constraints?

## Decision
What did we decide and why?

## Consequences
- **Positive**: Benefits and advantages
- **Negative**: Tradeoffs and downsides
- **Neutral**: Other implications

## Alternatives Considered
1. Alternative A — rejected because...
2. Alternative B — rejected because...

## Related ADRs
- [ADR-NNN](./NNN-title.md) — explains prerequisite concept

## References
- Link to issue or discussion
- Link to implementation
- Link to relevant docs
```

### 5.3 ADR Status Lifecycle

| Status | Meaning | Action |
|--------|---------|--------|
| **PROPOSED** | Under review | Awaiting decision |
| **ACCEPTED** | Approved | Implement; use in new designs |
| **DEPRECATED** | Replaced | Still used; being phased out |
| **SUPERSEDED** | Explicitly replaced | Refer to newer ADR |

---

## 6. Quality Checks & CI/CD

### 6.1 Documentation Build Pipeline

```bash
npm run docs:build
# Runs:
# 1. docs:render    → Generate diagrams from source
# 2. docs:validate  → Check links, formatting, metadata
```

### 6.2 Link Validation

**Checks:**

- Internal links resolve (`[Guide](./GUIDE.md)` → file exists)
- External links are reachable (optional, slower)
- No circular references in navigation

**Run manually:**

```bash
node scripts/validate-docs.js
```

### 6.3 Pre-Commit Checklist

Before committing documentation changes:

- [ ] Spell check (no typos)
- [ ] Link check (internal links valid)
- [ ] Heading hierarchy (proper H1 → H2 → H3)
- [ ] Code blocks syntax-highlighted
- [ ] Diagrams regenerated from source
- [ ] Metadata updated (version, date)
- [ ] DOCUMENTATION_CHANGELOG.md updated

---

## 7. Documentation for Different Audiences

### 7.1 Navigation Map

| Audience | Start Here | Primary Path | Deep Dives |
|----------|-----------|--------------|-----------|
| **Complete Novice** | Absolute Beginner's Guide | MCP Usage Guide → Architecture | Glossary, Troubleshooting |
| **Developer** | README → Quick Reference | Architecture, API Docs | ADRs, Source Code |
| **Operator** | Getting Started, Operations Guide | Troubleshooting, Monitoring | Security, Audit Logs |
| **Executive** | Executive Overview | Maturity Model | Security, Roadmap |
| **Contributor** | Contributing.md | Architecture, ADRs | Source Code, Design |

### 7.2 Audience-Specific Callouts

```markdown
> 👤 **For Beginners**: This means... [define term]

> 👨‍💻 **For Developers**: This uses the X API, see [reference](./API.md)

> 🔐 **For Security Teams**: This feature uses [encryption](./SECURITY.md#encryption)

> 📊 **For Executives**: This reduces risk by [business value]
```

---

## 8. Versioning Strategy

### 8.1 Docs-to-Code Version Mapping

Each documentation version corresponds to a code release:

```
Code v1.0.2     →    Docs v1.0.2 (in /docs/v1/)
Code v2.0.0     →    Docs v2.0.0 (in /docs/v2/)
```

### 8.2 Backwards Compatibility

- `/docs/v1/` — Maintained for v1.x series (bug fixes only)
- `/docs/v2/` — New features, breaking changes
- `/docs/latest` → `/docs/v1/` (points to current production version)
- All old versions kept in `/docs/vX/` for reference

### 8.3 Transition Between Major Versions

**When releasing v2.0.0:**

1. Copy `/docs/v1/` to `/docs/v2/`
2. Create `docs/v2/MIGRATION_GUIDE.md`
3. Update links from v1 to v2
4. Update `/docs/latest` symlink
5. Add deprecation notices in v1 docs
6. Update README.md to highlight new version

---

## 9. Documentation Contribution Workflow

### 9.1 Contributing to Docs

1. **Create a feature branch**:

   ```bash
   git checkout -b docs/add-feature-guide
   ```

2. **Follow the template**:
   - Use provided front matter
   - Follow naming conventions
   - Follow style guide

3. **Build and validate**:

   ```bash
   npm run docs:build
   ```

4. **Submit pull request**:
   - Link to related issue
   - Explain changes
   - Request review from doc owner

5. **Review & merge**:
   - Doc owner reviews
   - At least one peer review
   - Merge to main

6. **Update changelog**:
   - Add entry to DOCUMENTATION_CHANGELOG.md
   - Link to PR/commit

### 9.2 Documentation Review Checklist

- [ ] Follows style guide
- [ ] Audience is clear
- [ ] Links are valid
- [ ] Examples are correct and tested
- [ ] No secrets in examples
- [ ] Spelling and grammar
- [ ] Metadata complete
- [ ] Changelog updated

---

## 10. Support & Maintenance

### 10.1 Documentation Support Timeline

- **Current version** (e.g., v1.0.x): Full support, updates per release
- **Previous major version** (e.g., v1.x): Security docs only, no new features
- **Older versions** (archived): Reference only, no updates

### 10.2 Issue Triage for Docs

**Doc issues are labeled and prioritized:**

- `docs`: General documentation
- `docs/bug`: Incorrect information
- `docs/clarity`: Unclear explanation
- `docs/missing`: Missing topic
- `docs/feature`: Request for new guide

**SLA for doc issues:**

- Critical (incorrect security info): 24 hours
- High (broken setup guide): 1 week
- Medium (clarity improvements): 2 weeks
- Low (nice-to-have): As time permits

---

## 11. Release Documentation Checklist

**Before each release:**

- [ ] All diagrams regenerated from source
- [ ] Breaking changes documented in MIGRATION guide
- [ ] New features have examples
- [ ] Security changes documented
- [ ] DOCUMENTATION_CHANGELOG.md updated
- [ ] Diagrams committed to repo
- [ ] Links validated
- [ ] Version numbers bumped in metadata
- [ ] Release notes link to relevant docs

---

## Appendix: Tools & Scripts

### Documentation Build

```bash
npm run docs:build        # Full build: render + validate
npm run docs:render       # Regenerate diagrams only
npm run docs:validate     # Check links and metadata
```

### Diagram Regeneration

```bash
npx mmdc -i docs/diagrams/source/*.mmd -o docs/diagrams/rendered/
```

### Link Validation

```bash
node scripts/validate-docs.js
```

---

**For questions about this process, open an issue or see [CONTRIBUTING.md](../CONTRIBUTING.md).**
