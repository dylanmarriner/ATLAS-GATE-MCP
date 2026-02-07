---
title: "ADR Status Taxonomy"
description: "Definitions and lifecycle for ADR status states"
version: "1.0.0"
last_updated: "2026-01-20"
---

# ADR Status Taxonomy

Standardized status definitions for Architecture Decision Records (ADRs) in ATLAS-GATE MCP.

---

## Status Lifecycle

```
Proposed → Accepted → Deprecated/Superseded
   ↓
Rejected
```

---

## Status Definitions

### Proposed

**What it means:** This decision has been proposed but not yet formally accepted by the project leadership.

**Characteristics:**
- Under discussion
- May be revised based on feedback
- Not yet binding on the project
- Open for stakeholder comments

**When to use:**
- When proposing a new architectural direction
- When exploring alternatives
- During design review phase

**Duration:** 1–4 weeks (depending on complexity and team feedback)

**Example:** ADR-009: "Proposed" while we gather feedback from core team.

---

### Accepted

**What it means:** This decision has been formally approved and is now binding on the project. New code and architectural decisions should follow this ADR.

**Characteristics:**
- Officially decided
- Informs future work
- Binding on all future decisions in this domain
- Can still be superseded if needed (with justification)

**When to use:**
- After leadership review and approval
- When decision is ready to guide implementation
- For all major decisions in active development

**How decisions become Accepted:**
1. ADR is written and proposed
2. Team discussion and feedback (async or sync)
3. Stakeholders review and approve
4. ADR status changed to "Accepted"
5. Implementation begins (or was already in progress)

**Example:** ADR-001 (Dual-Role Governance) is Accepted—all new features follow this model.

---

### Deprecated

**What it means:** This decision is no longer recommended, but the implementation remains in the codebase for backward compatibility.

**Characteristics:**
- No longer the preferred approach
- Old code using this pattern is still supported
- Should not be used in new code
- Will be removed in a future major version

**When to use:**
- When a better solution emerges
- When a feature is being phased out
- When best practices change

**Migration path:**
- Mark as "Deprecated" with sunset date
- Provide migration guide to replacement pattern
- Support for 1–2 major versions
- Then "Superseded" status

**Example:** "ADR-010: API v1 Endpoints (Deprecated)" — v1 API still works but v2 is preferred.

---

### Superseded

**What it means:** This decision has been replaced by a newer decision. The old pattern should not be used. Old implementations may be gradually migrated.

**Characteristics:**
- No longer valid
- Replaced by a better approach
- Old code may still exist but is legacy
- New code must use the superseding ADR

**When to use:**
- When a decision has been completely replaced
- After deprecation period has ended
- When a major architectural shift occurs

**Migration path:**
- Plan migration of old implementations
- Provide timeline for full migration
- May require multiple releases
- Legacy code eventually removed

**Related fields:**
- `supersedes`: References the ADR this replaces
- `superseded_by`: References the newer ADR (only filled in old ADR)

**Example:** ADR-001 v1.0 → Superseded by ADR-001 v2.0 (enhanced governance model)

---

### Rejected

**What it means:** This proposal was considered but not accepted. It is included in documentation for historical reference and to avoid re-discussing the same decision.

**Characteristics:**
- Was proposed but not adopted
- Included for completeness and historical context
- Should not be used (decision was made against it)
- Explains why we chose alternative path

**When to use:**
- When a significant proposal was rejected
- To document decisions that were made against
- To provide context for future discussions

**Why keep Rejected ADRs:**
- Explains past decisions
- Prevents re-debating same topics
- Provides history for new team members
- May become relevant again with changing circumstances

**Example:** ADR-011: "Proposed: Custom Cryptography (Rejected)" — We chose OpenSSL instead, but this documents why.

---

## Status Field Format

In ADR frontmatter, use one of these values:

```yaml
status: "Proposed"
status: "Accepted"
status: "Deprecated"
status: "Superseded"
status: "Rejected"
```

---

## Related Fields for Status Transitions

### When marking "Deprecated"

```yaml
status: "Deprecated"
deprecation_date: "2026-06-15"      # When this was deprecated
sunset_date: "2026-12-15"            # When it will be removed
replacement_adr: "ADR-015"           # Pointer to new pattern
migration_guide: "./MIGRATION_FROM_ADR-010.md"
```

### When marking "Superseded"

```yaml
status: "Superseded"
superseded_by: "ADR-015"             # Which ADR replaces this
date_superseded: "2026-12-15"        # When it was superseded
migration_timeline: "2 major releases"
```

### When creating new ADR that supersedes old one

```yaml
status: "Accepted"
supersedes: "ADR-010"                # Which older ADR this replaces
migration_guide: "./MIGRATION_FROM_ADR-010.md"
```

---

## ADR Review & Status Change Process

### 1. ADR Submission (Status: Proposed)

- Author submits ADR with `status: Proposed`
- Create GitHub issue linking to the ADR
- Add to agenda for architecture review

### 2. Stakeholder Review (Status: Proposed)

- Minimum 1 week discussion period
- Comments on GitHub issue or PR
- Address concerns and iterate

### 3. Formal Approval (Status: Accepted)

- Architecture lead reviews completeness
- Stakeholders sign off (async)
- Status changed to `Accepted`
- Announce in development channel
- If needed, create implementation tasks

### 4. Implementation & Validation

- Code follows the accepted decision
- Tests validate the implementation
- Document any unexpected learnings

### 5. Deprecation & Superseding

- If newer decision needed, create new ADR
- Mark old ADR as `Deprecated` or `Superseded`
- Provide migration timeline and guide
- Update all referencing code over time

---

## Status at a Glance

| Status | Active? | Use in New Code? | Legacy Code? | Duration | Notes |
|--------|---------|-----------------|--------------|----------|-------|
| **Proposed** | 🔵 | ❌ | N/A | 1–4 weeks | Under discussion |
| **Accepted** | ✅ | ✅ | N/A | Until superseded | The current standard |
| **Deprecated** | ⚠️ | ❌ | ✅ | 1–2 releases | Phase out gradually |
| **Superseded** | ❌ | ❌ | ⚠️ | Legacy only | Old implementation; migrate legacy code |
| **Rejected** | ❌ | ❌ | N/A | Historical | Never implemented |

---

## Examples of Status Transitions

### Example 1: Normal Lifecycle

```
2026-01-15: ADR-008 status: Proposed
  (Team discusses for 2 weeks)

2026-01-29: ADR-008 status: Accepted
  (Code implemented immediately)

2026-06-15: ADR-012 created, supersedes ADR-008
  → ADR-008 status: Deprecated
  → ADR-008 deprecation_date: "2026-06-15"
  → ADR-008 sunset_date: "2027-01-15"
  → ADR-008 replacement_adr: "ADR-012"

2026-12-15: Migration complete
  → ADR-008 status: Superseded
  → ADR-008 superseded_by: "ADR-012"
```

### Example 2: Quick Rejection

```
2026-02-01: ADR-009 status: Proposed
  (Team decides against it after 1 week discussion)

2026-02-08: ADR-009 status: Rejected
  (Documented for historical reference; no migration needed)
```

---

## Querying ADRs by Status

To find ADRs by status, use grep:

```bash
# Find all Accepted ADRs
grep 'status: "Accepted"' adr/*.md

# Find all Deprecated ADRs
grep 'status: "Deprecated"' adr/*.md

# Find all Proposed ADRs (pending decision)
grep 'status: "Proposed"' adr/*.md
```

---

## Governance

**Owner:** ATLAS-GATE MCP Architecture Team  
**Review Schedule:** Quarterly status review  
**Updates Required:** When new status patterns emerge  

---

**Document Owner:** ATLAS-GATE MCP Architecture Team  
**Last Updated:** 2026-01-20  
**Version:** 1.0.0
