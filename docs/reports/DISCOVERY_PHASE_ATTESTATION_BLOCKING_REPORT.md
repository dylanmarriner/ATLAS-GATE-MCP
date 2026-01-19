# DISCOVERY PHASE ATTESTATION BLOCKING REPORT

**Date**: 2025-01-19  
**Role**: WINDSURF (Execution, Read-Only Analysis)  
**Status**: DISCOVERY COMPLETE - DESIGN CLARIFICATION REQUIRED

---

## DISCOVERY FINDINGS

### Evidence Systems Located ✓

All required evidence systems from prompts P02-P09 are present and mapped:

| Evidence System | Location | Status |
|---|---|---|
| **P02: Error Envelope** | `core/error.js`, `core/system-error.js` | ✓ PRESENT |
| **P03: Audit Log** | `core/audit-log.js`, `core/audit-system.js` | ✓ PRESENT |
| **P04: Write-Time Policy** | `core/write-time-policy-engine.js` | ✓ PRESENT |
| **P05: Intent Validation** | `core/intent-validator.js`, `core/intent-schema.js` | ✓ PRESENT |
| **P06: Plan Linter** | `core/plan-linter.js`, `core/plan-registry.js` | ✓ PRESENT |
| **P07: Replay/Forensics** | `core/replay-engine.js`, `core/forensic-report-generator.js` | ✓ PRESENT |
| **P09: Maturity Scoring** | `core/maturity-scoring-engine.js` | ✓ PRESENT |

**Data Contracts**: All modules export deterministic hashing, structured result objects, and fail-closed error semantics.

---

## CRITICAL DESIGN QUESTIONS REQUIRING CLARIFICATION

Before proceeding to attestation bundle implementation, the following must be explicitly decided:

### 1. **Cryptographic Signing Method**

**Current Status**: Environment has Node.js `crypto` module (FIPS-capable SHA256, HMAC-SHA256 available).

**Question**: 
- Should attestation bundles be signed with:
  - (A) HMAC-SHA256 (requires shared secret key in workspace)?
  - (B) RSA-4096 (requires key pair management)?
  - (C) Ed25519 (lightweight, modern)?
  - (D) Simple deterministic hash chain only (no cryptographic signing)?

**Guidance Missing**: The prompt specifies "deterministic signing" but does not define the mechanism or key management model.

### 2. **Public Verification Material Distribution**

**Question**: How should external verifiers obtain public keys/material?
- (A) Embedded in the attestation bundle itself (audit risk)?
- (B) Served from a canonical endpoint?
- (C) Assumed pre-shared?
- (D) Use hash-based verification only (no asymmetric crypto)?

### 3. **Attestation Artifact Scope**

**Question**: What should be included in the bundle?

The prompt specifies:
- ✓ Bundle metadata + bundle_id
- ✓ Workspace root hash (not path)
- ✓ Plan hashes (approved + executed)
- ✓ Audit log root hash
- ✓ Policy enforcement summary
- ✓ Intent coverage summary
- ✓ Replay verdicts
- ✓ Maturity scores
- ✓ Time window (explicit range)
- ✓ Verifier checksums

**Missing**: 
- Should raw audit entries be exportable separately (requested via separate tool)?
- Should attestation bundles themselves be immutable (appended to special attestation log)?
- Should bundle generation itself be audited (meta-audit)?

### 4. **Time Window Semantics**

**Question**: What defines the time window for attestation?
- (A) Audit log entries between `start_ts` and `end_ts`?
- (B) Plan execution span (from first to last audit entry for a plan)?
- (C) Request time ± configurable window?
- (D) Cumulative (all history)?

### 5. **External Verifier Protocol Format**

**Question**: Should the protocol be:
- (A) JSON with explicit verification algorithm steps (reproducible)?
- (B) YAML-based configuration?
- (C) Custom DSL?
- (D) Markdown document for non-coders, JSON for machines?

### 6. **Fail-Closed Semantics for Attestation**

**Question**: When should `generate_attestation_bundle` refuse?

Current understanding (from prompt):
- If evidence incomplete → refuse
- If audit chain fails → refuse
- If replay divergence exists → refuse
- If maturity claim exceeds proof → refuse
- If signature verification fails (on verify) → refuse

**Missing specifics**:
- Should attestation refuse if workspace has ANY unresolved audit violations?
- Should attestation refuse if plan is still executing?
- Should attestation bundle be readonly enforced by file permissions?

### 7. **Attestation Bundle Versioning**

**Question**: Should bundles include a schema version?
- (A) Yes, for forward/backward compatibility?
- (B) No, keep immutable?

---

## RECOMMENDATION

Proceed with implementation once the following are decided:

1. **Crypto method** (HMAC, RSA, Ed25519, or hash-only)
2. **Verification material distribution** (embedded, endpoint, pre-shared, or hash-only)
3. **Time window definition** (entries between X-Y, plan span, or cumulative)
4. **Fail-closed policy** (any violation → refuse, or only critical violations)

## NON-BLOCKING DECISIONS MADE INDEPENDENTLY

Based on prompt and existing systems, these are self-determined:

✓ **Bundle Schema**: Deterministic JSON with canonical field ordering  
✓ **Export Formats**: JSON + Markdown (per prompt section 4.2)  
✓ **Audit Integration**: Every attestation action appended to audit log  
✓ **Test Coverage**: ≥12 tests covering generation, verification, export, and read-only constraints  
✓ **Documentation**: `docs/reports/MCP_EXTERNAL_ATTESTATION_SPEC.md` will be created  

---

## NEXT STEPS AWAITING GUIDANCE

Once design decisions are clarified, execution will proceed in this order:

1. Implement cryptographic signing (method TBD)
2. Build attestation bundle generator (with determinism guarantee)
3. Build attestation bundle verifier
4. Add read-only tools (generate, verify, export)
5. Implement audit integration
6. Write 12+ tests
7. Write spec document
8. Run verification gates
9. Write completion report

**BLOCKING ON**: Steps 1-3 require design clarity above.

