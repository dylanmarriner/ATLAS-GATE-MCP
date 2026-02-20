# Cosign-Only Cryptography Migration

**Status:** In Progress  
**Directive:** Remove ALL SHA256 hashing. Use cosign (ECDSA P-256) for ALL cryptographic operations.

## Problem Statement

Current architecture mixes two systems:
- SHA256 hashing (for content addressing and verification)
- Cosign signing (for attestation)

**New directive:** Cosign is the ONLY cryptographic source. No SHA256, no HMAC, no direct crypto.

## Key Changes Required

### 1. Audit Log Chain (CRITICAL)

**OLD:** Hash-chained entries using SHA256
```javascript
// OLD - SHA256 hash chain
entry_hash: sha256(canonicalized)
prev_hash: previousHash
```

**NEW:** Signed entries using cosign
```javascript
// NEW - Cosign signature chain
signature: await signWithCosign(canonicalized, keyPair)
prev_signature: previousSignature
```

### 2. Plan Content Hashing (CRITICAL)

**OLD:** Plans identified by SHA256 hash
```javascript
// OLD
const planHash = sha256(planContent);  // 64-char hex
```

**NEW:** Plans identified by cosign signature
```javascript
// NEW
const planSignature = await signWithCosign(planContent, keyPair);  // Base64
```

### 3. Content Integrity Checks

**OLD:** Hash verification
```javascript
// OLD
const currentHash = sha256(fileContent);
if (currentHash !== expectedHash) { error }
```

**NEW:** Signature verification
```javascript
// NEW
const isValid = await verifyWithCosign(fileContent, signature, publicKey);
if (!isValid) { error }
```

### 4. Data Structures

#### Audit Entry Format
```javascript
// OLD (SHA256)
{
  seq: 1,
  ts: "2026-02-14T...",
  tool: "write_file",
  entry_hash: "a1b2c3...",  // 64 hex chars
  prev_hash: "GENESIS",
}

// NEW (Cosign)
{
  seq: 1,
  ts: "2026-02-14T...",
  tool: "write_file",
  signature: "MEYCIQDx...",  // Base64 cosign signature
  prev_signature: null,
}
```

#### Plan Registry
```javascript
// OLD (SHA256 keys)
plans: {
  "a1b2c3d4e5f6...": { /* plan */ }  // 64-char hex key
}

// NEW (Cosign signature keys)
plans: {
  "MEYCIQDx...": { /* plan */ }  // Base64 signature key
}
```

#### Attestation Bundle
```javascript
// OLD (HMAC-SHA256)
{
  bundle_id: sha256(content),
  signature: hmacSha256(content, secret),
}

// NEW (Cosign only)
{
  signature: await signWithCosign(content, keyPair),
}
```

## Files Requiring Major Changes

### Core Infrastructure
1. **audit-system.js** - Remove sha256, use cosign for chain
2. **attestation-engine.js** - Replace HMAC with cosign
3. **plan-linter.js** - Replace sha256 with cosign
4. **replay-engine.js** - Verify signatures instead of hashes
5. **remediation-engine.js** - Use signatures for proposals
6. **operator-identity.js** - Remove identity hash
7. **two-step-confirmation.js** - Remove confirmation hash
8. **audit-storage-file.js** - Cosign signatures instead of hashes
9. **maturity-scoring-engine.js** - Remove score hashing
10. **maturity-report-generator.js** - Remove report hashing
11. **governance.js** - Replace HMAC with cosign
12. **intent-schema.js** - Remove intent hashing

### Tools (6 files)
1. **write_file.js** - Verify signatures, not hashes
2. **generate-remediation-proposals.js** - Sign evidence, not hash
3. **verify-audit-log.js** - Verify signatures, not hashes
4. **lint_plan.js** - Already uses cosign, verify it's complete
5. **generate_attestation_bundle.js** - Use cosign, not HMAC
6. **verify_attestation_bundle.js** - Verify cosign sigs, not HMAC

## Implementation Strategy

### Phase 1: Core Infrastructure (cosign-hash-provider.js)
- ✅ Remove sha256() function
- ✅ Remove hmacSha256() function
- ✅ Remove timingSafeEqual() function
- ✅ Keep only: signWithCosign(), verifyWithCosign(), generateCosignKeyPair(), canonicalizeForSigning()

### Phase 2: Audit System
- Replace entry_hash with cosign signature
- Replace prev_hash with prev_signature
- Update hash chain verification to signature verification
- Update hash format validation

### Phase 3: Plan System
- Replace plan hash keys with plan signatures
- Update plan storage/retrieval
- Update plan-based lookups
- Update replay engine filtering

### Phase 4: Attestation System
- Replace bundle_id hashing with cosign
- Replace HMAC signing with cosign
- Update bundle verification

### Phase 5: Tools & Utilities
- Update all tools to use signatures
- Update verification utilities
- Update evidence hashing to signing

## Key Architectural Decisions

### 1. Signature as Content Address
Instead of hashing content to get an address, use the signature itself:
```javascript
// Content → Signature (deterministic with fixed key)
content: "audit entry" → signature: "MEYCIQDx..."
// Signature IS the address
plansBySignature.set(signature, planData)
```

### 2. Async All the Way
Cosign operations are async:
```javascript
// All functions using cosign must be async
async function appendAuditEntry(entry, keyPair) {
  const signature = await signWithCosign(entry, keyPair);
  // ...
}
```

### 3. Key Management
Need consistent key pair for content addressing:
```javascript
// Load workspace key pair once
const keyPair = await loadOrGenerateWorkspaceKeyPair(workspaceRoot);
// Use same pair for all signing in workspace
```

### 4. Signature Length
Cosign signatures are ~88 chars (Base64 encoded ECDSA P-256)
- Plan "hashes" will be longer than SHA256
- Plan file names will change
- Database/storage keys will be Base64 instead of hex

## Migration Timeline

| Phase | Task | Status |
|-------|------|--------|
| 1 | Update cosign-hash-provider.js | ✅ DONE |
| 2 | Migrate audit system | ⏳ PENDING |
| 3 | Migrate plan system | ⏳ PENDING |
| 4 | Migrate attestation system | ⏳ PENDING |
| 5 | Update tools | ⏳ PENDING |
| 6 | Update utilities/tests | ⏳ PENDING |
| 7 | Migration testing | ⏳ PENDING |

## Backward Compatibility

⚠️ **This is a breaking change.** 
- Existing audit logs with SHA256 hashes will need migration
- Existing plan files with SHA256 keys will need reindexing
- Existing attestation bundles with HMAC signatures will need re-signing

## Notes

- Cosign provides deterministic signatures (same content + key = same signature)
- Key pair must be stored securely in workspace
- All signatures are base64-encoded
- Verification is public-key only (no secret needed)
