# Project Governance

*This document defines how decisions are made, how authority is structured, and how the ATLAS-GATE-MCP project is governed.*

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Decision-Making Framework](#decision-making-framework)
3. [Roles & Responsibilities](#roles--responsibilities)
4. [Approval Authority](#approval-authority)
5. [Issue Triage & Prioritization](#issue-triage--prioritization)
6. [Release Management](#release-management)
7. [Dispute Resolution](#dispute-resolution)
8. [Amendment Process](#amendment-process)

---

## Core Principles

ATLAS-GATE-MCP governance is based on these principles:

### **1. Transparency**
- Decisions are made openly
- Rationale is documented
- Community input is welcomed
- Process is public (GitHub Issues/Discussions)

### **2. Meritocracy**
- Decisions based on technical merit, not status
- Community members earn authority through contributions
- Expertise and effort are valued
- New contributors get fair consideration

### **3. Consensus When Possible**
- Major decisions seek community consensus
- Disagreements are handled constructively
- Compromise is preferred when reasonable
- Escalation to governance body as last resort

### **4. Accountability**
- Authority comes with responsibility
- Leaders explain their decisions
- Mistakes are acknowledged and corrected
- Term limits prevent power concentration

### **5. Inclusivity**
- Community members from diverse backgrounds welcome
- Different expertise valued (code, docs, community)
- New contributors actively encouraged
- Barriers to participation minimized

---

## Decision-Making Framework

### **Decision Types & Authority**

Decisions fall into four categories:

#### **Type 1: Consensus Decisions**
**Examples**: Minor bug fixes, documentation improvements, dependency updates

**Authority**: Any contributor  
**Approval**: Code review (1+ core team member)  
**Escalation**: None needed  
**Timeline**: Immediate

**Process**:
1. Create pull request
2. Propose change in description
3. Core team reviews
4. Approved if no objections (24 hours)
5. Merge

#### **Type 2: Majority Decisions**
**Examples**: New features, API changes, major refactors

**Authority**: Contributors with merge rights  
**Approval**: 2+ core team members + community discussion  
**Discussion**: GitHub Discussions (5+ business days)  
**Timeline**: 5-10 business days

**Process**:
1. Open GitHub Discussion (design proposal)
2. Community provides feedback
3. Proposal refined based on input
4. Voting: 2+ core team members approve
5. Implementation approved

#### **Type 3: RFC Decisions (Request for Comments)**
**Examples**: Major architectural changes, breaking changes, roadmap shifts

**Authority**: Core team + community consensus  
**Approval**: Formal RFC document + supermajority (2/3 of active core team)  
**Discussion**: Dedicated RFC issue (2+ weeks)  
**Timeline**: 2-4 weeks minimum

**Process**:
1. Author submits RFC (document in `/docs/rfcs/`)
2. Community discussion (GitHub Discussions)
3. Core team reviews and debates
4. Vote: 2/3 supermajority required for approval
5. ADR created documenting decision
6. Implementation begins

#### **Type 4: Governance Decisions**
**Examples**: Code of Conduct changes, governance structure changes, authority delegation

**Authority**: Maintainer Council  
**Approval**: Unanimous or supermajority (depending on severity)  
**Discussion**: Community input + council deliberation (2+ weeks)  
**Timeline**: 2-4 weeks

**Process**:
1. Proposal submitted to governance discussion
2. Public comment period (14+ days)
3. Council deliberation (closed session if needed)
4. Vote: Unanimous preferred, supermajority if necessary
5. Public announcement of decision

---

## Roles & Responsibilities

### **Role Hierarchy**

```
┌─────────────────────────────────────┐
│  Maintainer Council (Final Authority)│
│  - Dylan Marriner (Founder)         │
│  - Core Maintainers (3-5)           │
└────────────────┬────────────────────┘
                 │
    ┌────────────┴───────────┐
    │                        │
┌───v───────────┐    ┌──────v────────┐
│ Core Team     │    │ Working Groups │
│ (8-12)        │    │ (Ad-hoc)       │
│ Merge rights  │    │ No direct      │
│ Final say     │    │ authority      │
└───┬───────────┘    └────────────────┘
    │
┌───v──────────────────┐
│ Contributors         │
│ (Everyone!)          │
│ Can create PRs, etc. │
└──────────────────────┘
```

### **Maintainer Council**

**Purpose**: Final decision authority for governance matters

**Members**:
- **Dylan Marriner** (Founder, Executive Decision)
- 3-5 core maintainers (elected by core team annually)

**Responsibilities**:
- Approve major architectural changes (RFCs)
- Resolve governance disputes
- Amend project governance
- Set strategic direction
- Handle Code of Conduct violations

**Authority**:
- Veto power (used sparingly)
- Unilateral decision on critical security issues
- Final say on governance disputes

**Meeting Cadence**:
- Monthly (or as needed for urgent matters)
- Minutes published (with confidential items redacted)

---

### **Core Team**

**Purpose**: Day-to-day project leadership

**Members** (8-12 contributors):
- Active contributors with merge rights
- Demonstrated judgment and expertise
- Community respect
- 6+ months of sustained contributions

**Responsibilities**:
- Review and merge pull requests
- Triage issues and assign priority
- Guide new contributors
- Maintain code quality
- Plan releases

**Authority**:
- Approve/reject Type 1 & 2 decisions
- Veto individual changes (with explanation)
- Nominate new core team members

**Selection Process**:
- Nominated by existing core team
- 2+ core team approvals
- No objections from maintainer council
- 3-month trial period

**Term**: 2 years (renewable)

---

### **Working Groups** (Ad-hoc)

**Purpose**: Focus on specific areas (documentation, performance, security)

**When Created**: When needed (e.g., "Release Manager for v3.0")

**Authority**:
- None (advisory only)
- Recommendations go through normal approval process

**Example Groups**:
- **Documentation Working Group**: Docs improvements
- **Performance Task Force**: Speed optimization
- **Security Audit Working Group**: Security assessment
- **Compliance Task Force**: Regulatory alignment

---

### **Contributors**

**Purpose**: Everyone else

**How to Contribute**:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Participate in discussions

**Authority**:
- None (direct)
- Influence through participation and quality contributions
- Can advance to core team

---

## Approval Authority

### **Quick Reference Matrix**

| Decision Type | Small Change | Medium Change | Major Change | Breaking Change |
|---|---|---|---|---|
| **Bug Fix** | Self-merge | 1 reviewer | 2 reviewers | Type 3 RFC |
| **Feature** | Not applicable | 2 reviewers | Type 2 | Type 3 RFC |
| **API Change** | Not applicable | Not applicable | Type 2 | Type 3 RFC |
| **Architecture** | Not applicable | Not applicable | Type 3 | Type 3 RFC |
| **Governance** | Not applicable | Not applicable | Not applicable | Type 4 |

### **Code Review Requirements**

| Category | Reviewers Needed | Min Review Time | Can Merge Self? |
|---|---|---|---|
| **Documentation** | 1 | 24 hours | Yes (after review) |
| **Tests/Tooling** | 1 | 24 hours | No (need approval) |
| **Non-critical Bug** | 1 | 24 hours | No |
| **Features** | 2 | 48 hours | No |
| **Core Modules** | 2 | 48 hours | No |
| **Breaking API** | Type 2 approval | Discussion period | No |

---

## Issue Triage & Prioritization

### **Priority Levels**

| Level | Definition | SLA | Examples |
|---|---|---|---|
| **Critical** | Affects core function, security, data loss risk | 24 hours | Audit log loss, auth bypass, crashes |
| **High** | Significantly impacts users or developers | 3 days | Major feature broken, confusing docs |
| **Medium** | Nice to have, improves experience | 2 weeks | Minor bugs, performance issues |
| **Low** | Polish, edge cases, nice improvements | Backlog | Typos, style issues, optimizations |

### **Triage Process**

1. **Review** new issues (3x weekly minimum)
2. **Classify** by category (bug, feature, docs, etc.)
3. **Prioritize** using matrix above
4. **Assign** to relevant core team member
5. **Label** with priority + category + status

### **Status Labels**

- `status:needs-clarification` — More info needed
- `status:needs-design` — Needs discussion before code
- `status:ready` — Ready to work on
- `status:in-progress` — Someone is working on it
- `status:needs-review` — PR submitted, awaiting review
- `status:blocked` — Depends on other work
- `status:closed` — Done or decided not to fix

---

## Release Management

### **Release Cadence**

| Type | Frequency | Content | Process |
|------|-----------|---------|---------|
| **Patch** (x.x.Z) | Monthly | Bug fixes, minor improvements | Fast-track (3-day review) |
| **Minor** (x.Y.0) | Quarterly | New features, non-breaking changes | Standard (5-day review) |
| **Major** (X.0.0) | Annually | Breaking changes, significant rewrites | Extended (RFC + 2-week review) |

### **Release Authority**

**Who can release**: Core team members with release rights (3+ people)

**Process**:
1. Create release candidate branch
2. Test thoroughly (manual + automated)
3. Update CHANGELOG.md
4. Tag with version
5. Build artifacts
6. Publish to npm
7. Create GitHub Release
8. Announce to community

---

## Dispute Resolution

### **Level 1: Discussion**
**When**: Disagreement about design, priority, or approach

**Process**:
1. Discuss in GitHub issue/PR comments
2. Try to understand different perspectives
3. Seek compromise
4. Document decision rationale

**Timeline**: 5-7 business days

---

### **Level 2: Escalation to Core Team**
**When**: Level 1 discussion doesn't resolve

**Process**:
1. Present both positions to core team
2. Core team discusses (in meeting or Discussions)
3. Vote if necessary (majority wins)
4. Decision documented in issue

**Timeline**: 1-2 weeks

---

### **Level 3: Maintainer Council**
**When**: Core team divided or fundamental disagreement

**Process**:
1. Escalate to Maintainer Council
2. Council deliberates (closed session)
3. Council votes (unanimity preferred, supermajority if needed)
4. Decision is final

**Timeline**: 2 weeks

---

### **Special Cases: Code of Conduct**

**If dispute involves Code of Conduct violation**:
1. Follow Code of Conduct investigation process
2. Not a governance dispute (separate authority)
3. See [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) for procedures

---

## Amendment Process

### **How to Change This Document**

This governance document can be amended through Type 4 (Governance) decisions.

**Process**:
1. **Propose change**: Create GitHub Discussion with "Governance Change" tag
2. **Gather feedback**: Community input (14+ days)
3. **Refine proposal**: Incorporate feedback
4. **Vote**: Maintainer Council votes
5. **Announce**: Publish updated governance
6. **Transition**: If affects roles, provide transition period

**Amendment requires**: Unanimous or supermajority (2/3) Maintainer Council approval

---

## Communication & Transparency

### **Where Decisions Are Made**

- **Public**: GitHub Issues, Discussions, PRs
- **Semi-public**: RFC documents (discussion period is public)
- **Private**: Code of Conduct investigations, security issues
- **Published**: Monthly meeting notes (public)

### **Information Sharing**

- All decisions published (except security/conduct)
- Rationale documented
- Community can understand "why" not just "what"
- Decisions can be appealed/revisited

### **Transparency Report**

Quarterly transparency report published:
- Decisions made (summary)
- Disputes resolved
- New contributors
- Community feedback
- Strategic updates

---

## Conflict of Interest

### **Policy**

- Core team members disclose conflicts of interest
- Conflicted person recuses from voting on that decision
- Financial interests must be disclosed
- Employment conflicts trigger recusal

### **Examples**

| Situation | Action |
|---|---|
| Voting on feature benefiting your employer | Disclose and don't vote |
| Dispute with someone you know | Can discuss, but don't vote |
| You have a patent related to proposal | Disclose immediately |

---

## Summary

**ATLAS-GATE-MCP governance is:**
- Transparent (decisions open, rationale explained)
- Meritocratic (based on contributions, expertise)
- Consensus-driven (seek agreement when possible)
- Accountable (leaders justify decisions)
- Inclusive (all voices welcome)

---

**Version**: 2.0.0  
**Last Updated**: February 2026  
**Status**: Active  
**Questions?**: governance@atlas-gate-mcp.org
