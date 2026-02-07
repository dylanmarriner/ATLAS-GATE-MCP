---
title: "ADR-{NUMBER}: {TITLE}"
description: "Brief description of the decision"
status: "{STATUS: Proposed|Accepted|Deprecated|Superseded}"
date: "{YYYY-MM-DD}"
authors: ["{Author Name}"]
stakeholders: ["{Stakeholder Name}"]
supersedes: "{Reference to previous ADR if applicable}"
superseded_by: "{Reference to newer ADR if applicable}"
related_to: ["{Other ADR number}"]
---

# ADR-{NUMBER}: {TITLE}

## Status

{STATUS: Proposed|Accepted|Deprecated|Superseded}

## Context

What is the issue that we're seeing that is motivating this decision or change?

Include:
- Background information
- Problem statement
- Constraints
- Assumptions
- Why this decision needs to be made now

## Decision

What is the change that we're proposing and/or doing?

State the decision concisely in an active voice sentence(s).

## Rationale

Why is this the best choice among the considered alternatives?

Include:
- Benefits of this decision
- How it addresses the context/problem
- How it aligns with project goals
- Trade-offs made

## Alternatives Considered

What other options did we consider?

For each alternative, explain:
- How it would work
- Why we didn't choose it
- Trade-offs vs. the chosen decision

### Alternative 1: [Name]
...

### Alternative 2: [Name]
...

## Consequences

What becomes easier or harder to do because of this change?

### Positive Consequences
- ...

### Negative Consequences
- ...

### Risks
- ...

### Mitigation Strategies
- ...

## Implementation

How will this decision be implemented?

Include:
- Required changes
- Timeline
- Dependencies
- Success criteria
- Testing strategy

## Validation

How will we know if this decision was the right one?

Include:
- Metrics to track
- Review schedule
- Success criteria

## References

- [Related ADR](./ADR-{NUMBER}.md)
- [External Reference](https://example.com)
- [Issue #123](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/issues/123)

## History

| Date | Author | Change |
|------|--------|--------|
| {YYYY-MM-DD} | {Name} | Created |
| {YYYY-MM-DD} | {Name} | Updated status to Accepted |

---

## Example: Minimal ADR (Reference)

For a simpler ADR, the minimal sections are:

1. **Status**
2. **Context** (1–2 paragraphs)
3. **Decision** (1 sentence)
4. **Rationale** (1–2 paragraphs)
5. **Consequences** (bulleted list)

See ADR-001 for a good example of a minimal but complete ADR.

---

**Document Owner:** ATLAS-GATE MCP Architecture Team  
**Last Updated:** 2026-01-20  
**Version:** 1.0.0
