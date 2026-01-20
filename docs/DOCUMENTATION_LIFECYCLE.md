---
title: "Documentation Lifecycle & Support Policy"
description: "Documentation versioning, support timelines, ownership model, and deprecation process"
version: "1.0.0"
last_updated: "2026-01-20"
owners: ["documentation-team"]
audience: ["technical", "managers", "all"]
---

# Documentation Lifecycle & Support Policy

This document defines how KAIZA MCP manages documentation as a production asset, including versioning, support policies, deprecation procedures, and ownership structures.

---

## Table of Contents

1. [Overview](#overview)
2. [Documentation Versioning](#documentation-versioning)
3. [Support Lifecycle](#support-lifecycle)
4. [Ownership Model](#ownership-model)
5. [Deprecation Policy](#deprecation-policy)
6. [Code-to-Documentation Mapping](#code-to-documentation-mapping)
7. [Governance](#governance)

---

## Overview

Documentation is treated as a critical production asset alongside code. Every documentation release is versioned, tracked, and supported on a defined lifecycle that mirrors software versioning.

### Goals

- **Alignment**: Documentation versions track software releases explicitly
- **Stability**: Clear support windows and deprecation timelines
- **Discoverability**: Users always know which documentation version matches their code version
- **Governance**: Clear ownership and review accountability

---

## Documentation Versioning

### Version Structure

Documentation uses semantic versioning aligned to software releases:

```
/docs/v1/          → Code version 1.x.x
/docs/v2/          → Code version 2.x.x
/docs/latest       → Symlink/alias to current stable version
```

### Metadata Requirements

Every documentation file includes a YAML frontmatter header:

```yaml
---
title: "Page Title"
description: "Short one-line description"
version: "1.0.0"                    # Doc version matching /docs/vX
last_updated: "2026-01-20"
owners: ["team-name"]               # Who maintains this doc
audience: ["technical", "manager"]  # Intended readers
tags: ["governance", "security"]
canonical_url: "/docs/v1/section/page.md"  # For disambiguation
---
```

### Versioning Rules

| Scenario | Action | Example |
|----------|--------|---------|
| **Patch release** (1.0.0 → 1.0.1) | Update documentation in /docs/v1; tag in DOCUMENTATION_CHANGELOG.md | Bug fix docs, clarifications |
| **Minor release** (1.0.0 → 1.1.0) | Update /docs/v1; may create new sections; tag in DOCUMENTATION_CHANGELOG.md | New feature docs, improved guides |
| **Major release** (1.0.0 → 2.0.0) | Copy /docs/v1 → /docs/v2; add migration guide in /docs/v1; update /docs/latest symlink | Breaking API changes, new architecture |
| **Out-of-support** | Archive in /docs/v1/DEPRECATED/; add sunset notice to README | 12+ months old |

---

## Support Lifecycle

### Support Tiers

| Tier | Duration | Support | Updates | Security Fixes |
|------|----------|---------|---------|----------------|
| **Active LTS** | 24 months | Full | Yes | Yes |
| **Maintenance** | 12 months after LTS | Limited | Security/critical only | Yes |
| **Deprecated** | Open-ended | Archived | No | No |

### Release Support Timeline

**KAIZA MCP 1.0.0 (January 2026)**
- **Active LTS**: Jan 2026 → Jan 2028
- **Maintenance**: Jan 2028 → Jan 2029
- **Archived**: Jan 2029+

**Doc Version 1.0.0** inherits software support dates.

### Deprecation Dates

When documentation enters deprecation:

1. Add visible deprecation notice to all pages in /docs/v1/:
   ```markdown
   > ⚠️ **DEPRECATED**: This documentation is deprecated as of {DATE}. 
   > See [latest documentation](../latest/) for current version.
   ```

2. Archive old pages to /docs/v1/DEPRECATED/

3. Create "Migration Guides" in new version (e.g., /docs/v2/MIGRATION_FROM_V1.md)

---

## Ownership Model

### Ownership Structure

| Role | Responsibility | Examples |
|------|-----------------|----------|
| **Owner** | Maintain, accuracy, updates, reviews | CONTRIBUTING.md → Development Team |
| **Editor** | Consistency, style, linking, cross-doc coherence | All markdown files → Documentation Lead |
| **Reviewer** | Technical accuracy, completeness check | Architecture docs → Principal Engineer |

### Ownership Assignment

Every documentation file includes an `owners` field in metadata:

```yaml
owners: ["documentation-team"]  # GitHub team reference
```

Teams are defined in OWNERS file:

```
# .github/OWNERS
docs/ARCHITECTURE.md @kaiza/architecture-team
docs/guides/ @kaiza/documentation-team
adr/ @kaiza/technical-leadership
```

### Review Process

1. **Author** submits documentation change via PR
2. **Assigned Owner** reviews for accuracy and completeness
3. **Editor** reviews for style and consistency
4. **Optional Specialist Reviewer** (for architecture/security docs)
5. **Merge** when all required reviews are approved

---

## Deprecation Policy

### When to Deprecate

Deprecate documentation when:

- Software feature is marked deprecated (with 2 release lead time)
- Documentation contains outdated information with no longer-term value
- Architecture decision is superseded by newer approach
- Best practice guidance changes significantly

### Deprecation Process

**Phase 1: Notice (Release N)**
- Add deprecation notice to page
- Create entry in DOCUMENTATION_CHANGELOG.md
- Link to replacement documentation

**Phase 2: Transition (Release N+1)**
- Maintain page but update all inbound links to point to replacement
- Monitor metrics for remaining traffic
- Add sunset date to deprecation notice

**Phase 3: Archive (Release N+2 or 24 months)**
- Move to /docs/v{N}/DEPRECATED/
- Keep for searchability/SEO, but add "archived" banner
- Redirect from old URL to archive location if possible

### Deprecation Notice Template

```markdown
---
deprecated: true
deprecated_date: "2026-06-15"
sunset_date: "2026-12-15"
replacement: "/docs/v1/new-section/replacement.md"
---

# {Old Title} [DEPRECATED]

⚠️ **This documentation is deprecated.** Sunset date: 2026-12-15.

See [updated documentation]({LINK}) for current guidance.

---

{REMAINING CONTENT FOR ARCHIVE REFERENCE}
```

---

## Code-to-Documentation Mapping

### Automated Mapping

In package.json scripts:

```json
{
  "docs:build": "npm run docs:render && npm run docs:validate",
  "docs:validate": "node scripts/validate-docs.js",
  "release:prepare": "npm run quality:check && npm run docs:build && node scripts/prepare-release.js"
}
```

The `validate-docs.js` script:

1. Verifies all docs have metadata headers
2. Checks all links resolve
3. Validates code-to-docs version alignment
4. Generates DOCS_TO_CODE_MAPPING.json:

```json
{
  "1.0.0": {
    "docs_version": "v1",
    "release_date": "2026-01-20",
    "path": "/docs/v1",
    "features": ["core-governance", "audit-trails", "plan-authorization"],
    "migration_guide": "/docs/v1/MIGRATION.md"
  }
}
```

### Version Compatibility Matrix

File: /docs/COMPATIBILITY.md

```markdown
# Code-to-Documentation Compatibility

| Software Version | Doc Version | Release Date | Status |
|------------------|-------------|-------------|--------|
| 1.0.0            | v1.0.0      | 2026-01-20  | Active |
| 1.1.0            | v1.1.0      | TBD         | Planned |
| 2.0.0            | v2.0.0      | TBD         | Planned |
```

---

## Governance

### Documentation Review Board

Meets quarterly to:

1. Review deprecation candidates
2. Approve major documentation changes
3. Assess maturity model progress (see MATURITY_MODEL.md)
4. Plan next doc version based on roadmap

### Metrics & Quality Assurance

Tracked via /docs/audit/:

- **Link Health**: Automated link checker run on every PR
- **Metadata Compliance**: All files have required frontmatter
- **Update Recency**: Files reviewed/updated within 12 months
- **Audience Coverage**: Docs for all user personas (beginner, operator, architect)
- **Example Freshness**: Code examples validate against current version

### Escalation & Disputes

If documentation ownership is disputed or accuracy is questioned:

1. File issue in GitHub with `docs-dispute` label
2. Documentation Review Board reviews within 7 days
3. Technical expert (owner) and Documentation Lead reach consensus
4. Decision documented in issue

---

## Checklist for Documentation Releases

Use this checklist when releasing new documentation (major/minor version):

- [ ] All new files have YAML metadata frontmatter
- [ ] All owners assigned in .github/OWNERS file
- [ ] All internal links tested (link checker passes)
- [ ] DOCUMENTATION_CHANGELOG.md updated with Added/Changed/Removed sections
- [ ] COMPATIBILITY.md updated with new version row
- [ ] /docs/latest symlink updated (if major version)
- [ ] Diagram source files in /docs/diagrams/source/
- [ ] Diagram rendered SVGs in /docs/diagrams/rendered/
- [ ] README.md updated with link to new version
- [ ] Deprecation notices added to superseded docs (if applicable)
- [ ] npm run docs:validate passes (100% compliance)

---

## Related Documents

- [Documentation Changelog](./DOCUMENTATION_CHANGELOG.md) - Version history
- [Maturity Model](./MATURITY_MODEL.md) - Quality dimensions
- [ADR Process](./adr/README.md) - Architectural decisions
- [Diagram Editing Guide](./diagrams/EDITING_GUIDE.md) - Source + rendered workflow

---

**Document Owner**: KAIZA MCP Documentation Team  
**Review Frequency**: Quarterly  
**Last Updated**: 2026-01-20  
**Version**: 1.0.0
