# ATLAS-GATE MCP Documentation Index

Complete reference for the zero-trust Model Context Protocol security gateway.

## Quick Links

| Need | Document |
|------|----------|
| **First time?** | [00-GETTING_STARTED.md](./00-GETTING_STARTED.md) |
| **Create a plan** | [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md) |
| **Execute a plan** | [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md) |
| **AI prompts & templates** | [03-TEMPLATE_REFERENCE.md](./03-TEMPLATE_REFERENCE.md) |
| **Security & governance** | [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) |
| **Architecture** | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **Original README** | [README.md](../README.md) |

## Documentation Structure

### Core Documentation (Read in Order)

1. **[00-GETTING_STARTED.md](./00-GETTING_STARTED.md)** — Start here
   - What ATLAS-GATE is
   - 5-minute setup
   - Core concepts (Plans Are Laws, Two Agents, Five Gates)
   - First plan walkthrough

2. **[01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md)** — Design plans
   - Complete plan structure (10 sections)
   - Linting 7-stage validation
   - Common mistakes
   - Real-world examples

3. **[02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md)** — Run plans
   - Execution sequence (5 steps)
   - Five-gate write pipeline (detailed)
   - Rollback & recovery
   - Audit trail structure

4. **[03-TEMPLATE_REFERENCE.md](./03-TEMPLATE_REFERENCE.md)** — Prompts for AI
   - ANTIGRAVITY planning prompt (copy-paste ready)
   - WINDSURF execution prompt (copy-paste ready)
   - Intent artifact template
   - Language rules & examples

5. **[04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md)** — Compliance & ops
   - Security model & threat mitigation
   - Cryptography (cosign ECDSA P-256)
   - Hard block policy (absolute violations)
   - Recovery procedures
   - Compliance (SOC 2, HIPAA, PCI-DSS, NIST)

### Reference Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design
  - Lifecycle & request pipeline
  - Five execution gates
  - Subsystems
  - Failure semantics

- **[README.md](../README.md)** — Original overview
  - Project vision
  - Core security philosophy
  - Feature list

## Key Concepts

### Plans Are Laws
Every code change must be pre-approved via a cryptographically signed JSON plan. Plans cannot be modified without invalidating the signature.

**Documents**: [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md), [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md)

### Two-Agent Architecture
- **ANTIGRAVITY** (Planning): Designs plans, validates with linting, signs with cosign
- **WINDSURF** (Execution): Executes signed plans, passes 5-gate pipeline, creates audit trail

**Documents**: [00-GETTING_STARTED.md](./00-GETTING_STARTED.md), [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md), [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md)

### Five-Gate Pipeline
Every file write must pass:
1. **Schema Validation** (Zod) — Correct field types
2. **Plan Authority** (cosign verify) — Signature valid
3. **Intent Artifact** (must exist) — `.intent.md` file present
4. **Stub Detection** (AST + regex) — No TODO/mock/fake/empty code
5. **Audit Commit** (append-only) — Immutable log entry

**Documents**: [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md)

### Fail-Closed Design
Any gate failure → entire operation rejected → no partial writes → audit entry created → session marked failed

**Documents**: [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md)

### Immutable Audit Trail
All operations logged in `audit-log.jsonl` with:
- Monotonic sequence number
- Session ID
- Cryptographic hash chain (detects tampering)
- Plan signature
- File path and timestamp

**Documents**: [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md), [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md)

## Workflows

### Workflow: Create & Execute a Feature

1. **Operator** specifies: "Add JWT authentication"

2. **ANTIGRAVITY**:
   - Read docs → [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md)
   - Analyze codebase
   - Design phases
   - Output JSON plan
   - Run lint_plan()

3. **Plan** signed with cosign, saved to `docs/plans/<SIGNATURE>.json`

4. **WINDSURF**:
   - Read docs → [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md)
   - Call begin_session()
   - Create intent artifacts
   - Call write_file() for each file (5 gates)
   - Run verification commands
   - Call commit_phase()

5. **Audit Trail** immutable in `audit-log.jsonl`

### Workflow: Fix Issues During Execution

1. Phase fails verification
2. Rollback executes automatically
3. Operator reviews audit log for failure reason
4. Operator either:
   - Fixes code issue and resubmits, or
   - Revises plan and resubmits for linting

## Common Questions

**Q: How do I get started?**
A: Read [00-GETTING_STARTED.md](./00-GETTING_STARTED.md) first (5 minutes).

**Q: How do I create a valid plan?**
A: Read [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md) (30 minutes).

**Q: How do I execute a plan?**
A: Read [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md) (30 minutes).

**Q: What prompts should I use for AI agents?**
A: Read [03-TEMPLATE_REFERENCE.md](./03-TEMPLATE_REFERENCE.md) (copy-paste ready).

**Q: Why was my write rejected?**
A: Check which of the 5 gates failed. See [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md) for solutions.

**Q: What code patterns are hard-blocked?**
A: See [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) — Hard Block Policy.

**Q: How do I verify my plan?**
A: Read linting stages in [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md#linting-7-stage-validation).

**Q: What's the security model?**
A: Read [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) — Security Model section.

**Q: How do I implement recovery?**
A: Read [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) — Recovery Procedures section.

## File Locations

| Path | Purpose |
|------|---------|
| `docs/plans/` | Signed, immutable plans |
| `audit-log.jsonl` | Append-only audit trail |
| `.atlas-gate/.cosign-keys/` | Cosign key pair |
| `docs/00-GETTING_STARTED.md` | Quick start guide |
| `docs/01-PLANNING_GUIDE.md` | Plan design guide |
| `docs/02-EXECUTION_GUIDE.md` | Execution guide |
| `docs/03-TEMPLATE_REFERENCE.md` | AI prompts & templates |
| `docs/04-SECURITY_GOVERNANCE.md` | Security & compliance |
| `src/interfaces/server.js` | MCP server entry point |
| `src/application/plan-linter.js` | 7-stage plan validation |
| `src/application/stub-detector.js` | Stub/pattern detection |
| `src/infrastructure/path-resolver.js` | Path confinement |

## Key Terminology

| Term | Definition |
|------|-----------|
| **Plan** | JSON document specifying what WINDSURF can do |
| **Phase** | One logical unit within a plan (e.g., "Create auth module") |
| **Signature** | ECDSA P-256 cosign hash (43 chars, proves plan authenticity) |
| **Intent Artifact** | `.intent.md` file justifying a file write |
| **Gate** | One validation step in the write pipeline |
| **Path Allowlist** | List of files that can be modified |
| **Stub** | Incomplete code (TODO, mock, fake, empty function) |
| **Hard Block** | Code pattern that absolutely cannot be written |
| **Audit Entry** | Immutable log entry for one operation |
| **Hash Chain** | Linked hash of audit entries (detects tampering) |
| **Rollback** | Automatic reversal of changes on failure |
| **ANTIGRAVITY** | Planning agent (generates plans) |
| **WINDSURF** | Execution agent (runs plans) |

## Checklist: Before First Use

- [ ] Read [00-GETTING_STARTED.md](./00-GETTING_STARTED.md)
- [ ] Run `npm install`
- [ ] Generate cosign key pair
- [ ] Start `npm run start:windsurf`
- [ ] Create first plan JSON
- [ ] Run `lint_plan()` on the plan
- [ ] Save plan to `docs/plans/<SIGNATURE>.json`
- [ ] Create intent artifacts
- [ ] Run first `write_file()`
- [ ] Verify audit log entry created
- [ ] Read [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) for operations

## Checklist: Before Production

- [ ] Cosign keys stored securely
- [ ] Public key distributed to execution environment
- [ ] Audit log backed up regularly
- [ ] Recovery procedure tested
- [ ] SIEM integration configured (if required)
- [ ] Hard block patterns understood by team
- [ ] Plan validation process documented
- [ ] Operator training completed
- [ ] Kill switch procedure tested (once)
- [ ] Compliance checklist passed

## Integration with Other Tools

### Git Integration
Plans include git commit information:
```
commit_phase() → Creates git commit with plan signature
```

### SIEM Integration
Audit log ready for Splunk/Datadog:
```
cat audit-log.jsonl | [your-siem-agent]
```

### Policy as Code
Plans enforce policy through:
- Path allowlist (which files)
- Verification gates (what to test)
- Constraints (how to implement)
- Forbidden actions (what never)

## Advanced Topics

### Custom Spectral Rules
Plans use Spectral for linting. See `src/application/spectral-ruleset.js` for custom rules.

### Hash Chain Verification
See [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) — Hash Chain section.

### Key Rotation
See [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) — Cryptography section.

### SIEM Configuration
See [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) — Compliance section.

## Support & Resources

| Resource | Location |
|----------|----------|
| Quick Start | [00-GETTING_STARTED.md](./00-GETTING_STARTED.md) |
| Planning Guide | [01-PLANNING_GUIDE.md](./01-PLANNING_GUIDE.md) |
| Execution Guide | [02-EXECUTION_GUIDE.md](./02-EXECUTION_GUIDE.md) |
| Templates | [03-TEMPLATE_REFERENCE.md](./03-TEMPLATE_REFERENCE.md) |
| Security | [04-SECURITY_GOVERNANCE.md](./04-SECURITY_GOVERNANCE.md) |
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Examples | `/examples/` directory |
| Issues | GitHub repository |

## Document Versions

| Document | Version | Date | Status |
|----------|---------|------|--------|
| 00-GETTING_STARTED.md | 2.0 | 2026-03-07 | Final |
| 01-PLANNING_GUIDE.md | 2.0 | 2026-03-07 | Final |
| 02-EXECUTION_GUIDE.md | 2.0 | 2026-03-07 | Final |
| 03-TEMPLATE_REFERENCE.md | 2.0 | 2026-03-07 | Final |
| 04-SECURITY_GOVERNANCE.md | 2.0 | 2026-03-07 | Final |
| ARCHITECTURE.md | 1.0 | 2026-03-07 | Current |

## Feedback & Contributions

Found an issue in the docs? Missing something important?

1. Check if your question is answered in one of the main docs
2. Review the examples in `/examples/`
3. Check GitHub issues
4. Submit a pull request with your improvement

## Legal

ATLAS-GATE MCP is open source under the ISC license. See LICENSE file.

---

**Last Updated**: 2026-03-07
**Authority**: ATLAS-GATE Governance
**Maintained By**: Dylan Marriner

## Navigation

- **← Previous**: [README.md](../README.md) (project overview)
- **Next →**: [00-GETTING_STARTED.md](./00-GETTING_STARTED.md) (start here)
