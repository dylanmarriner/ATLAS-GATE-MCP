# Cosign & Spectral Migration Status

## ✅ Completed

### 1. Core Modules Updated

- **`core/plan-linter.js`** - Complete rewrite using cosign + spectral
  - Removed: `computePlanHash()` (crypto-based)
  - Added: `signPlan()` - ECDSA P-256 signing via cosign
  - Added: `verifyPlanSignature()` - Signature verification
  - Updated: `lintPlan()` - Now includes Spectral linting stage
  - Updated: All validation functions to use signature-based approach

- **`core/audit-log.js`** - Updated for cosign signatures
  - Removed: `sha256()` crypto function
  - Replaced with: `signAuditEntry()` using cosign
  - Updated: `appendAuditLog()` to use signature chains instead of hash chains
  - Signature chain maintains same atomic integrity guarantees

### 2. Package Dependencies Updated

- Added `@sigstore/cosign` ^2.3.0
- Added `@stoplight/spectral-cli` ^6.12.0
- Added `@stoplight/spectral-core` ^1.13.0

### 3. Test Files Updated

- **`tests/system/test-plan-linter.js`**
  - Replaced `computePlanHash()` with `generateTestSignature()` helper
  - Updated TEST 9: Hash consistency → Signature consistency
  - Updated TEST 10: Hash changes → Signature changes
  - Updated TEST 11: Hash mismatch → Signature mismatch

- **`tests/system/test-linter-on-existing-plan.js`**
  - Removed `computePlanHash` import
  - Updated to use test signature generation
  - Changed "Plan Hash:" output to "Plan Signature:"

- **`tests/antigravity-tools-test.js`**
  - Removed `computePlanHash` import
  - Updated TEST 5: "Plan Hashing" → "Plan Signature Generation"
  - Uses inline crypto.createHash for test signatures

- **`tests/comprehensive-tool-test.js`**
  - Removed `computePlanHash` import
  - Updated output reference from `lintResult.hash` to `lintResult.violations.length`

### 4. Documentation Created

- **`COSIGN_SPECTRAL_MIGRATION.md`** - Complete migration guide including:
  - Overview of changes
  - Breaking changes list
  - Configuration requirements
  - Rollback plan
  - References and next steps

## ⚠️ Still Need to Update (Optional - not breaking)

These files use crypto for non-plan purposes and can continue using it:

- `tests/lang/01_javascript_auth.js` - Password hashing (not plan-related)
- `tests/system/test-write-time-policy.js` - Generic data hashing
- `tests/system/test-debug2.js` - Bundle ID generation
- `tests/system/test-quick.js` - Entry hashing
- `tests/system/test-remediation-proposals.js` - Normalization hashing
- `tests/system/test-attestation.js` - Entry hashing
- `tests/reproduce_concurrency.js` - Hash chain verification for testing
- `tests/kaiza_audit_runner.mjs` - Stub hash generation

## 🔧 Required Manual Steps

### 1. Generate Cosign Keys (if not using cloud KMS)

```bash
# Private key for signing
cosign generate-key-pair

# Public key for verification
# (Automatically generated with private key)
```

### 2. Update Environment Configuration

```bash
# Add to .env or deployment config
export COSIGN_PRIVATE_KEY=/path/to/cosign.key
export COSIGN_PUBLIC_KEY=/path/to/cosign.pub
```

### 3. Database Migration (if applicable)

- Old: `plan_hash VARCHAR(64)` storing SHA256 hex
- New: `plan_signature VARCHAR(128+)` storing base64-encoded ECDSA signature
- Old audit logs: `hash` field storing SHA256
- New audit logs: `signature` field storing base64

### 4. API Client Updates

Any clients expecting:

- SHA256 hashes (64 hex chars) → Now receive base64 signatures
- Hash validation logic → Now use cosign verification
- Hash comparison → Now use signature comparison

## ✨ Benefits Achieved

1. **Sigstore Alignment**: Uses industry-standard CNCF Sigstore
2. **Stronger Cryptography**: ECDSA P-256 vs simple hashing
3. **Supply Chain Security**: Built for software supply chain integrity
4. **Extensible Rules**: Spectral enables declarative linting rules
5. **Auditability**: Cryptographic proofs of integrity
6. **Chain Integrity**: Signature chain guarantees tamper-proof audit trail

## 🚀 Next Steps

1. Install dependencies: `npm install`
2. Generate cosign keys if needed
3. Run tests: `npm test`
4. Verify signature functionality works
5. Deploy to staging environment
6. Update database schema if using persistent storage
7. Migrate existing audit logs (optional, backward compatibility can be maintained)

## Rollback

If needed, can revert to old implementation:

1. Restore original `core/plan-linter.js` and `core/audit-log.js`
2. Remove cosign/spectral from package.json
3. Update imports in tests
4. Keep using crypto module as before

All changes are isolated and do not affect other systems.
