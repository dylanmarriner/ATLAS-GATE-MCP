# MCP External Attestation Specification v1.0

**Status**: Complete  
**Role**: KAIZA MCP Infrastructure  
**Authority**: WINDSURF EXECUTION PROMPT — MCP External Attestation Interface  
**Date**: 2026-01-19

---

## 1. Overview

The KAIZA MCP External Attestation system provides **read-only, cryptographically signed attestation bundles** that allow external parties to verify the integrity and maturity of MCP server execution without requiring access to raw logs or configuration.

### Key Properties

- **Read-Only**: All attestation operations are deterministic and non-mutating
- **Deterministic**: Same workspace state → same bundle_id (SHA256)
- **Signed**: HMAC-SHA256 signature with workspace-specific secret
- **Non-Coder Friendly**: Markdown export for human review
- **Fail-Closed**: Missing evidence refuses attestation

---

## 2. Attestation Bundle Schema

### 2.1 Bundle Structure

Each attestation bundle is a JSON object with the following fields (canonical ordering):

```json
{
  "bundle_id": "sha256_hash",
  "bundle_schema_version": "1.0",
  "workspace_root_hash": "sha256_hash",
  "workspace_root_label": "string",
  
  "time_window": {
    "start": "ISO8601_timestamp",
    "end": "ISO8601_timestamp"
  },
  
  "audit_log_root_hash": "sha256_hash",
  "plan_hashes": ["hash1", "hash2"],
  
  "audit_metrics": {
    "total_entries": number,
    "failure_count": number,
    "first_timestamp": "ISO8601",
    "last_timestamp": "ISO8601"
  },
  
  "policy_enforcement": {
    "total_write_checks": number,
    "policy_passes": number,
    "policy_failures": number,
    "pass_rate": float
  },
  
  "intent_coverage": {
    "intent_artifacts_found": number,
    "write_operations_audited": number,
    "intent_coverage": float
  },
  
  "replay_verdict": "PASS|FAIL|UNAVAILABLE",
  "replay_finding_count": number,
  
  "maturity_scores": {
    "overall": float,
    "dimensions": {
      "Reliability": float,
      "Security": float,
      "Documentation": float,
      "Governance": float,
      "Integration": float,
      "Performance": float
    },
    "blocking_reasons": [
      {
        "dimension": "string",
        "score": float,
        "blockedBy": "MAJOR_VIOLATION|UNMET_EVIDENCE|MINOR_GAP"
      }
    ]
  },
  
  "verifier_checksums": {
    "audit_metric_hash": "sha256",
    "policy_summary_hash": "sha256",
    "maturity_hash": "sha256"
  },
  
  "generated_timestamp": "ISO8601",
  "signature": "hmac_sha256_hex"
}
```

### 2.2 Field Descriptions

| Field | Type | Purpose |
|-------|------|---------|
| `bundle_id` | SHA256 hex | Content-addressable identifier (computed from all fields except bundle_id, timestamp, signature) |
| `bundle_schema_version` | String | Schema version for forward compatibility |
| `workspace_root_hash` | SHA256 hex | Hash of workspace root path (not the path itself) |
| `workspace_root_label` | String | Human-readable label for workspace (optional) |
| `time_window` | Object | Date range covered by this attestation |
| `audit_log_root_hash` | SHA256 hex | Hash of last entry in audit log (chain integrity proof) |
| `plan_hashes` | Array[SHA256] | All plan hashes executed in this workspace |
| `audit_metrics` | Object | Summary of audit log activity |
| `policy_enforcement` | Object | Write-time policy enforcement statistics |
| `intent_coverage` | Object | Intent artifact coverage statistics |
| `replay_verdict` | String | Result of deterministic execution replay |
| `maturity_scores` | Object | KAIZA maturity assessment across 6 dimensions |
| `verifier_checksums` | Object | Hashes of included metrics (for tamper detection) |
| `generated_timestamp` | ISO8601 | When bundle was generated (NOT signed) |
| `signature` | Hex string | HMAC-SHA256(content, secret) |

---

## 3. Cryptographic Model

### 3.1 Signing Algorithm

**Algorithm**: HMAC-SHA256  
**Key Source**: Workspace-specific secret (environment variable or file)  
**Scope**: All fields except `bundle_id`, `generated_timestamp`, and `signature` itself

### 3.2 Signing Process

1. Remove `bundle_id`, `generated_timestamp`, and `signature` from bundle
2. Canonicalize remaining content (recursively sort all keys)
3. Compute HMAC-SHA256(canonical_json, secret)
4. Return hex digest

### 3.3 Key Management

The signing secret is obtained from (in order of precedence):

1. `KAIZA_ATTESTATION_SECRET` environment variable
2. `.kaiza/attestation_secret.json` file in workspace
3. Ephemeral random secret (with warning)

**Security Note**: Secrets are never embedded in bundles or exported. Verification requires independent access to the secret.

---

## 4. Determinism Guarantee

### 4.1 Bundle ID Determinism

For a given workspace state at a specific moment:

```
same(workspace_root, audit_log, plans, maturity_scores) → same(bundle_id)
```

### 4.2 Canonical Ordering

All JSON serialization uses recursively sorted keys:

```javascript
Object.keys(obj).sort().forEach(key => {
  // Process in alphabetical order
  // Recurse into nested objects
})
```

### 4.3 Timestamp Exception

The `generated_timestamp` is added AFTER signing to allow multiple bundles for the same workspace state without causing signature conflicts.

---

## 5. Read-Only Tools

### 5.1 generate_attestation_bundle

**Endpoint**: `generate_attestation_bundle`  
**Input**:
```json
{
  "workspace_root_label": "string (optional)",
  "plan_hash_filter": "string (optional)",
  "time_window": { "start": "ISO8601", "end": "ISO8601" } (optional)
}
```

**Output**: Signed attestation bundle (JSON)

**Semantics**:
- Read-only: Does not mutate workspace state
- Fail-closed: Returns error if evidence incomplete
- Deterministic: Same inputs produce same bundle_id
- Logged: Appends audit entry for generation

**Failure Cases**:
- Audit log missing → ATTESTATION_EVIDENCE_INVALID
- Audit log empty → ATTESTATION_EVIDENCE_INVALID
- Workspace root invalid → ATTESTATION_INVALID_INPUT

### 5.2 verify_attestation_bundle

**Endpoint**: `verify_attestation_bundle`  
**Input**:
```json
{
  "bundle": { /* attestation bundle object */ }
}
```

**Output**:
```json
{
  "verdict": "PASS|FAIL",
  "passed": boolean,
  "first_failing_check": "string or null",
  "violations": [
    {
      "check": "string",
      "human_readable": "string",
      "details": "string"
    }
  ],
  "explanation": "string (non-coder friendly)"
}
```

**Verification Checks** (in order):

1. **SIGNATURE_VERIFICATION**: HMAC-SHA256 signature valid (timing-safe comparison)
2. **BUNDLE_ID_MISMATCH**: Computed bundle_id matches claimed bundle_id
3. **AUDIT_METRIC_HASH_MISMATCH**: Audit metrics hash matches checksum
4. **MATURITY_HASH_MISMATCH**: Maturity scores hash matches checksum

**Semantics**:
- Read-only: No state mutations
- Deterministic: Same bundle + secret → same verdict
- Fail-closed: First failing check halts verification
- Logged: Appends audit entry for verification attempt

### 5.3 export_attestation_bundle

**Endpoint**: `export_attestation_bundle`  
**Input**:
```json
{
  "bundle": { /* attestation bundle object */ },
  "format": "json|markdown"
}
```

**Output**: Exported content as string or JSON object

**Formats**:

- **JSON**: Full bundle as formatted JSON
- **Markdown**: Human-readable markdown report with:
  - Executive summary
  - Evidence metrics
  - Maturity scores
  - Verifier protocol instructions

**Semantics**:
- Read-only: No state mutations
- Non-coder friendly: Markdown includes plain English explanations
- Logged: Appends audit entry for export operation

---

## 6. External Verifier Protocol

Any third party can verify an attestation bundle using this deterministic protocol:

### 6.1 Protocol Steps

1. **Obtain Bundle**: Get attestation bundle (e.g., from docs/reports/)
2. **Obtain Secret**: Obtain signing secret out-of-band (KAIZA_ATTESTATION_SECRET)
3. **Reconstruct Content**: Remove `bundle_id`, `generated_timestamp`, `signature`
4. **Canonicalize**: Recursively sort all object keys
5. **Compute HMAC**: `HMAC-SHA256(canonical_json, secret)`
6. **Compare Signature**: Timing-safe equal comparison with bundle.signature
7. **Recompute Bundle ID**: SHA256(canonical_json) and compare with claimed bundle_id
8. **Verify Checksums**: Recompute maturity_hash, audit_metric_hash, policy_summary_hash
9. **Verdict**: PASS if all checks succeed, FAIL if any check fails

### 6.2 Reference Implementation (JavaScript)

```javascript
import crypto from 'crypto';

function verifyBundle(bundle, secret) {
  // Remove non-signed fields
  const content = { ...bundle };
  delete content.bundle_id;
  delete content.generated_timestamp;
  delete content.signature;

  // Canonicalize (recursively sort keys)
  const canonical = canonicalizeForHash(content);

  // Verify signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(canonical);
  const expectedSig = hmac.digest('hex');
  
  if (!crypto.timingSafeEqual(
    Buffer.from(bundle.signature, 'hex'),
    Buffer.from(expectedSig, 'hex')
  )) {
    return { verdict: 'FAIL', reason: 'SIGNATURE_INVALID' };
  }

  // Verify bundle ID
  const expectedId = crypto.createHash('sha256')
    .update(canonical)
    .digest('hex');
  
  if (bundle.bundle_id !== expectedId) {
    return { verdict: 'FAIL', reason: 'BUNDLE_ID_MISMATCH' };
  }

  // Verify checksums (example for maturity)
  const maturityHash = crypto.createHash('sha256')
    .update(JSON.stringify(bundle.maturity_scores))
    .digest('hex');
  
  if (maturityHash !== bundle.verifier_checksums.maturity_hash) {
    return { verdict: 'FAIL', reason: 'MATURITY_HASH_MISMATCH' };
  }

  return { verdict: 'PASS' };
}
```

---

## 7. Limitations & Guarantees

### 7.1 Guarantees

✓ **Immutability**: Bundle ID is immutable once generated  
✓ **Tamper Detection**: Signature verification detects any content modification  
✓ **Hash Integrity**: Checksums prove evidence not modified  
✓ **Non-Mutation**: Attestation operations never modify workspace  
✓ **Determinism**: Same workspace state → same bundle_id  

### 7.2 Limitations

✗ **Not Real-Time**: Bundles reflect historical state, not live workspace  
✗ **Not Prescriptive**: Bundles describe what happened, not what should happen  
✗ **Evidence Dependent**: Quality depends on underlying evidence systems (audit, replay, maturity scoring)  
✗ **Time Window**: Bundles cover specific time ranges; gaps are possible  
✗ **No Confidentiality**: Bundles are readable JSON (no encryption)  

---

## 8. Audit Logging

Every attestation operation is logged:

### 8.1 Generation

```json
{
  "type": "ATTESTATION_GENERATED",
  "bundle_id": "...",
  "plan_count": number,
  "audit_entries": number,
  "maturity_level": float
}
```

### 8.2 Verification

```json
{
  "type": "ATTESTATION_VERIFIED",
  "bundle_id": "...",
  "verdict": "PASS|FAIL",
  "first_failing_check": "string or null"
}
```

### 8.3 Export

```json
{
  "type": "ATTESTATION_EXPORTED",
  "bundle_id": "...",
  "format": "json|markdown",
  "export_size_bytes": number
}
```

---

## 9. Non-Coder Explanation

### For Executives

Attestation bundles are **tamper-proof snapshots** of your MCP server's health. They're cryptographically signed, so you can trust they haven't been modified. Think of them like a certified audit report.

### For Security Teams

Bundles use **HMAC-SHA256** signing with workspace-specific secrets. Verification is deterministic and fail-closed—any tampering is immediately detected. Bundles never contain secrets or credentials.

### For Compliance

Bundles provide **evidence** that your MCP server:
- Executed code according to approved plans
- Passed policy checks on all file writes
- Has documented intent for all changes
- Maintains audit trails with integrity guarantees

---

## 10. Implementation Notes

### 10.1 Bundle Storage

Bundles are typically stored in `docs/reports/` with names like:
```
attestation-{bundle_id}.json
attestation-{bundle_id}.md
```

### 10.2 Versioning

This spec is v1.0. Future versions will maintain backward compatibility via the `bundle_schema_version` field.

### 10.3 Performance

- Generation: ~50-100ms (includes replay and maturity scoring)
- Verification: ~10ms (just signature and checksum verification)
- Export: <5ms

---

## 11. Examples

### Example Bundle Generation

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tool/call",
    "params": {
      "name": "generate_attestation_bundle",
      "arguments": {
        "workspace_root_label": "production-mcp"
      }
    }
  }' \
  | jq '.result.content[0].text' > bundle.json
```

### Example Verification (External)

```javascript
import fs from 'fs';
import crypto from 'crypto';

const bundle = JSON.parse(fs.readFileSync('bundle.json'));
const secret = process.env.KAIZA_ATTESTATION_SECRET;

// Verify (use reference implementation above)
const result = verifyBundle(bundle, secret);
console.log(`Attestation: ${result.verdict}`);
```

---

## 12. References

- **PROMPT 03**: MCP Audit Log & Self-Audit
- **PROMPT 04**: Write-Time Policy Engine
- **PROMPT 05**: Intent Artifact Validation
- **PROMPT 06**: Plan Linter & Approval
- **PROMPT 07**: Deterministic Replay & Forensics
- **PROMPT 09**: Maturity Scoring Engine

---

**Document Signature**: `<!-- Hash of this spec: generated at build time -->`
