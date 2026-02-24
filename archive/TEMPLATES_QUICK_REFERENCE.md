# Templates Quick Reference Card

**Updated**: February 14, 2026 | **Status**: ✅ All Templates Current

---

## Plan Header Format (CRITICAL)

```
<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->
```

**NOT**:

```
<!--
ATLAS-GATE_PLAN_HASH: [hash]
COSIGN_SIGNATURE: [signature]
-->
```

---

## Plan Structure (7 Required Sections)

1. **# Plan Metadata** - Plan ID, Version, Author, Timestamp, Governance
2. **# Scope & Constraints** - Objective, Affected Files, Constraints
3. **# Phase Definitions** - Phase ID, Objective, Operations, Verification
4. **# Path Allowlist** - Workspace-relative paths only
5. **# Verification Gates** - Commands to run after execution
6. **# Forbidden Actions** - Strictly prohibited actions
7. **# Rollback / Failure Policy** - Failure triggers and recovery steps

---

## Signature Information

| Property | Value |
|----------|-------|
| Format | URL-safe base64 |
| Length | 43 characters |
| Special Chars | None (no `/`, `+`, `=`) |
| Cryptography | ECDSA P-256 |
| Example | `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o` |

---

## File Naming

**Plan filename = Plan signature**

```
Signature: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o
Filename:  y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.md
Location:  docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.md
```

---

## Key Storage

```
.atlas-gate/
├── .cosign-keys/
│   ├── private.pem    (for signing)
│   └── public.pem     (for verification)
```

Auto-generated on first run if missing.

---

## 7-Stage Linting Process

| Stage | Validates | Fails If |
|-------|-----------|----------|
| 1 | Structure | Missing sections or wrong order |
| 2 | Phases | Phase ID not `UPPERCASE_WITH_UNDERSCORES` |
| 3 | Paths | Absolute paths, `..`, or `${}` |
| 4 | Enforceability | TODO, FIXME, or ambiguous language |
| 5 | Auditability | Objectives contain code symbols |
| 6 | Spectral | Custom OpenAPI rules violated |
| 7 | Cosign | Signing fails (key issues) |

---

## Phase ID Format

**MUST be**: `UPPERCASE_WITH_UNDERSCORES`

**Valid**:

- `PHASE_IMPLEMENTATION`
- `PHASE_TESTING`
- `PHASE_1_DEPLOYMENT`

**Invalid**:

- `Phase Implementation` (spaces)
- `phase-implementation` (lowercase, hyphens)
- `PhaseImplementation` (mixed case)

---

## Constraints Language

**MUST use** binary language:

- `MUST ...` ✓
- `MUST NOT ...` ✓
- `SHALL ...` ✓
- `SHALL NOT ...` ✓

**AVOID** ambiguous language:

- `may`, `should`, `might` ✗
- `optional`, `if possible` ✗
- `try to`, `attempt to` ✗

---

## Forbidden Patterns in Plans

**Never include**:

- `TODO`, `FIXME`, `XXX`, `HACK` (stub markers)
- `stub`, `mock`, `placeholder` (incomplete code)
- Code symbols in objectives: backticks, `${}`, `<>`
- Judgment clauses: "use best judgment", "exercise judgment"
- Absolute paths: `/etc/passwd`
- Path escapes: `../../../`
- Unresolved variables: `${HOME}`

---

## Workflow (ANTIGRAVITY)

```
1. Receive: Operator input
2. Analyze: Target files
3. Design: Solution
4. Write: Plan with 7 sections
5. Save: PLAN_NAME.md (temporary)
6. Lint: lint_plan({ path: "PLAN_NAME.md" })
   → Returns: { passed: true, signature: "y6RIU0..." }
7. Rename: PLAN_NAME.md → docs/plans/y6RIU0.../md
8. Fix: If lint errors, modify and re-lint
9. Deliver: Plan path + signature + public key
```

---

## Workflow (WINDSURF)

```
1. Receive: Plan signature
2. Load: docs/plans/<signature>.md
3. Parse: Extract header and sections
4. Verify: Cosign signature with public key
5. Check: All 7 sections valid
6. Extract: Path allowlist, verification gates
7. Execute: File writes (one per file)
8. Verify: Each write → check audit log
9. Run: Verification commands
10. Report: Success or failure
```

---

## Common Lint Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `PLAN_MISSING_SECTION` | Missing required section | Add all 7 sections |
| `PLAN_INVALID_PHASE_ID` | Phase ID wrong format | Use `UPPERCASE_WITH_UNDERSCORES` |
| `PLAN_PATH_ESCAPE` | Path starts with `/` or has `..` | Use workspace-relative paths |
| `PLAN_NON_ENFORCEABLE` | TODO/FIXME or ambiguous language | Remove stubs, use binary language |
| `PLAN_NON_AUDITABLE` | Objective has code symbols | Write plain English |
| `SIGNATURE_MISMATCH` | Plan was modified after signing | Check git history, re-lint |

---

## Template File Reference

| File | Purpose | Use When |
|------|---------|----------|
| `antigravity_planning_prompt_v2.md` | Plan generation guide | Creating new plans |
| `plan_scaffold.md` | Minimal template | Quick plan start |
| `PLAN_EXAMPLE_JWT_AUTH.md` | Real example | Understanding format |
| `LINTING_AND_SIGNING_GUIDE.md` | Technical details | Debugging lint failures |
| `README.md` | Complete reference | Overall understanding |

---

## Verification Checklist

Before submitting plan for execution:

- [ ] Header has `ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE`
- [ ] All 7 sections present and in order
- [ ] Phase IDs are `UPPERCASE_WITH_UNDERSCORES`
- [ ] No TODO, FIXME, or stub markers
- [ ] No ambiguous language (may, should, optional)
- [ ] All paths are workspace-relative
- [ ] Objectives written in plain English (no code symbols)
- [ ] Constraints use binary language (MUST, MUST NOT)
- [ ] Plan passes `lint_plan()` with all 7 stages
- [ ] Plan saved to `docs/plans/<signature>.md`
- [ ] Plan header updated with actual signature
- [ ] Public key available at `.atlas-gate/.cosign-keys/public.pem`

---

## Critical Rules

1. ✅ **7 sections required** in exact order (Structure check fails without them)
2. ✅ **Plain English objectives** (Auditability check fails with code symbols)
3. ✅ **Binary language** in constraints (Enforceability check fails with ambiguous language)
4. ✅ **Workspace-relative paths** (Path check fails with absolute paths)
5. ✅ **Proper Phase IDs** (Phase check fails with wrong format)
6. ✅ **No stub markers** (Enforceability check fails with TODO/FIXME)
7. ✅ **Signature-based naming** (WINDSURF can't find plans without correct filename)

---

## Key Dates & Versions

| Date | Component | Status |
|------|-----------|--------|
| 2026-02-14 | Cosign signature migration | ✅ COMPLETE |
| 2026-02-14 | 7-stage linting | ✅ COMPLETE |
| 2026-02-14 | Template documentation | ✅ UPDATED |
| 2026-02-14 | System tests | ✅ PASSING |

---

## Support

- **Planning help**: See `antigravity_planning_prompt_v2.md`
- **Technical details**: See `LINTING_AND_SIGNING_GUIDE.md`
- **Overall reference**: See `README.md`
- **Examples**: See `PLAN_EXAMPLE_JWT_AUTH.md`

---

**Status**: Current and verified | **Last Updated**: 2026-02-14 | **Tests**: All passing
