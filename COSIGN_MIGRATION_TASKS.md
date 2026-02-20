# Cosign-Only Migration - Task List

**Status:** In Progress  
**Completed:** audit-system.js  
**Remaining:** 24+ files

## Summary of Changes Per File

### ✅ COMPLETED

#### core/cosign-hash-provider.js
- Removed: `sha256()`, `hmacSha256()`, `timingSafeEqual()`, `crypto` module
- Kept: `signWithCosign()`, `verifyWithCosign()`, `generateCosignKeyPair()`, `canonicalizeForSigning()`

#### core/audit-system.js
- Replaced: SHA256 entry hashes with cosign signatures
- Changed: `entry_hash` → `signature`, `prev_hash` → `prev_signature`
- Added: Key pair loading, cosign signing in append
- Updated: Verification to use `verifyWithCosign()`
- Made async: `appendAuditEntry()`, `verifyAuditLogIntegrity()`

---

### ⏳ TO DO

#### core/attestation-engine.js (CRITICAL)
**Changes:**
- Remove: `hmacSha256()` import and all HMAC signing
- Replace: Bundle ID generation (remove SHA256)
- Replace: Signature generation (use cosign instead of HMAC)
- Update: Verification logic (use cosign verification)
- Change: `bundle_id` field to just use signature
- Make async: All functions using signing

**Key methods:**
- `computeBundleId()` → Remove or return signature
- `signBundle()` → Replace with `signWithCosign()`
- `verifyBundleSignature()` → Use `verifyWithCosign()`
- `generateAttestationBundle()` → Add cosign signing
- `verifyAttestationBundle()` → Use cosign verification

**Data structure:**
```javascript
// OLD
{
  bundle_id: "a1b2c3d4...",  // SHA256 hash
  signature: "d4e5f6g7...",    // HMAC-SHA256
}

// NEW
{
  signature: "MEYCIQDx...",     // Cosign signature (replaces both)
}
```

---

#### core/replay-engine.js
**Changes:**
- Remove: `sha256()`, `canonicalizeForHash()` imports
- Replace: Hash chain verification with signature verification
- Change: `plan_hash` → `plan_signature` throughout
- Change: `result_hash` → `result_signature`
- Update: All FINDING_CODES that reference hashes
- Make async: All verification functions

**Key methods:**
- `validateDeterminism()` → Compare signatures, not hashes
- `verifyHashChain()` → `verifySignatureChain()`
- `replayExecution()` → Make async
- All validators → Make async

---

#### core/plan-linter.js
**Changes:**
- Already imports cosign ✓
- Replace: `sha256()` imports with cosign
- Change: `hashPlanContent()` → `signPlanContent()`
- Replace: Plan hash with plan signature
- Update: Plan metadata to store signature not hash
- Make async: All signing/verification methods

**Key:**
- `export function hashPlanContent()` → `export async function signPlanContent()`

---

#### core/intent-schema.js
**Changes:**
- Remove: `sha256()` import
- Replace: `hashIntent()` with signature
- Change: Return signature instead of hash
- Make async: `hashIntent()`

---

#### core/operator-identity.js
**Changes:**
- Remove: `sha256()` import
- Remove: `identity_hash` field completely
- Delete: Hash generation from operator binding

---

#### core/governance.js
**Changes:**
- Remove: `hmacSha256()` import
- Replace: HMAC verification with cosign verification
- Change: Bootstrap signature from HMAC to cosign
- Make async: `verifyBootstrapAuth()`

---

#### core/maturity-report-generator.js
**Changes:**
- Remove: `sha256()` import
- Remove: `hashReport()` function
- Remove: Report hashing from report generation

---

#### core/maturity-scoring-engine.js
**Changes:**
- Remove: `sha256()` import
- Remove: `hashScoringResult()` function
- Remove: Score hashing

---

#### core/audit-storage-file.js
**Changes:**
- Remove: `sha256()` import
- Replace: `_calculateHash()` with signature method
- Change: `hash` field → `signature`
- Make async: All methods using hashing
- Update: Entry structure

---

#### core/two-step-confirmation.js
**Changes:**
- Remove: `sha256()` import
- Remove: `confirmation_hash` field
- Delete: Confirmation hash generation

---

#### core/remediation-engine.js
**Changes:**
- Remove: `sha256()` import from `generateProposalId()`
- Replace: Hashing with signature for proposal IDs
- Make async: Proposal generation

---

### TOOLS (6 files)

#### tools/write_file.js
**Changes:**
- Remove: `sha256()` calls on lines 179, 236
- Replace: With signature verification
- Make async: Content verification

**Locations:**
- Line 179: `currentHash = sha256(oldContent)`
- Line 236: `contentHash = sha256(finalContent)`

---

#### tools/generate-remediation-proposals.js
**Changes:**
- Remove: `sha256()` calls on evidence hashing
- Replace: With signature generation
- Make async: Evidence processing

---

#### tools/verification/verify-audit-log.js
**Changes:**
- Remove: `sha256()` import
- Replace: Hash verification with signature verification
- Make async: Verification loop

---

#### tools/lint_plan.js
**Changes:**
- Verify already uses cosign ✓
- Update: To return signature instead of hash

---

#### tools/generate_attestation_bundle.js
**Changes:**
- Remove: `sha256()` calls if any
- Ensure: Using cosign for bundle signing
- Make async: Bundle generation

---

#### tools/verify_attestation_bundle.js
**Changes:**
- Remove: HMAC verification
- Replace: With cosign verification
- Make async: Bundle verification

---

#### tools/session.js
**Changes:**
- No changes needed (uses `crypto.randomUUID()` which is OK)

---

### DEPENDENT MODULES (3 files)

#### core/audit-log.js
**Changes:**
- Review imports/usage
- Verify using audit-system correctly

#### core/write-time-policy-engine.js
**Changes:**
- Review plan_hash usage
- Update to plan_signature where needed

#### core/plan-enforcer.js
**Changes:**
- Review plan_hash references
- Update to plan_signature

---

## Data Structure Migrations

### Audit Entry
```javascript
// OLD
{
  seq: 1,
  entry_hash: "a1b2c3...",      // 64-char hex
  prev_hash: "GENESIS",
  plan_hash: "d4e5f6...",         // 64-char hex
  result_hash: "g7h8i9...",       // 64-char hex
  args_hash: "j0k1l2...",         // 64-char hex
}

// NEW
{
  seq: 1,
  signature: "MEYCIQDx...",       // Base64 cosign
  prev_signature: null,
  plan_signature: "ABCDef...",    // Base64 cosign
  args: { /* raw args */ },       // Store args not hash
}
```

### Plan Object
```javascript
// OLD
{
  [SHA256_HASH]: { content, metadata }  // 64-char key
}

// NEW
{
  [BASE64_SIGNATURE]: { content, metadata }  // Base64 key
}
```

### Attestation Bundle
```javascript
// OLD
{
  bundle_id: "a1b2c3...",
  signature: "hmac_value...",
}

// NEW
{
  signature: "MEYCIQDx...",  // Cosign signature
}
```

---

## Testing Considerations

1. **Hash format validation** → Remove 64-char hex validation
2. **Signature format validation** → Add Base64 validation
3. **Migration scripts** → Create for existing audit logs
4. **Backward compatibility** → NO (breaking change)
5. **Key pair generation** → Ensure workspace-level generation

---

## Priority Order

1. ✅ audit-system.js (DONE)
2. attestation-engine.js
3. plan-linter.js
4. replay-engine.js
5. intent-schema.js
6. governance.js
7. Tools (write_file, generate-remediation, verify-audit-log)
8. Remaining core files
9. Tests and documentation

---

## Rollout Checklist

- [ ] All imports updated
- [ ] All direct crypto calls removed
- [ ] All functions made async where needed
- [ ] Data structures migrated
- [ ] Tests updated/fixed
- [ ] Documentation updated
- [ ] Migration guide created for existing workspaces
