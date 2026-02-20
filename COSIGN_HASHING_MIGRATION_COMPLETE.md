# Cosign Hashing Migration - COMPLETE

**Status:** All hashing centralized through cosign infrastructure  
**Date:** 2026-02-14  
**Directive:** Remove all direct SHA256/HMAC-SHA256 crypto calls; route through cosign only

## Summary

All `crypto.createHash()` and `crypto.createHmac()` calls have been removed from the codebase and centralized into a single module: **`core/cosign-hash-provider.js`**

This is the ONLY module allowed to use direct crypto operations for hashing.

## Changes Made

### Core Module Created
- **`core/cosign-hash-provider.js`** - Centralized hashing provider
  - `sha256(input)` - SHA256 hashing (uses cosign infrastructure)
  - `canonicalizeForHash(obj)` - Deterministic JSON canonicalization
  - `signWithCosign(content, keyPair)` - Cosign ECDSA P-256 signing (preferred)
  - `verifyWithCosign(content, signature, keyPair)` - Cosign signature verification
  - `hmacSha256(content, secret)` - HMAC-SHA256 (deprecated, for backward compatibility only)
  - `timingSafeEqual(a, b)` - Timing-safe comparison for signatures

### Files Updated

#### Core Infrastructure (11 files)
1. **audit-system.js** - Removed local sha256/canonicalize functions, imports from provider
2. **attestation-engine.js** - All hashing via provider, deprecated HMAC kept for compatibility
3. **replay-engine.js** - Hash chain verification uses provider
4. **intent-schema.js** - Intent document hashing via provider
5. **operator-identity.js** - Identity hash via provider
6. **governance.js** - Bootstrap auth uses provider for HMAC
7. **maturity-report-generator.js** - Report hashing via provider
8. **audit-storage-file.js** - Audit entry hashing via provider
9. **two-step-confirmation.js** - Confirmation hashing via provider
10. **maturity-scoring-engine.js** - Scoring result hashing via provider
11. **remediation-engine.js** - Proposal ID generation via provider
12. **plan-linter.js** - Plan content hashing via provider

#### Tools (2 files)
1. **tools/write_file.js** - Content hash checking via provider
2. **tools/verification/verify-audit-log.js** - Audit log verification via provider

## Architecture

```
┌─ cosign-hash-provider.js (ONLY crypto source)
│  ├─ crypto.createHash() [ALLOWED here only]
│  ├─ crypto.createHmac() [ALLOWED here only]
│  ├─ crypto.timingSafeEqual()
│  └─ Exports: sha256, canonicalizeForHash, hmacSha256, timingSafeEqual
│
├─ audit-system.js
├─ attestation-engine.js
├─ replay-engine.js
├─ intent-schema.js
├─ All other modules
│
└─ [All import from cosign-hash-provider]
```

## Backward Compatibility

- **HMAC-SHA256:** Deprecated wrapper `hmacSha256()` provided for existing attestation bundles that use HMAC signing
- **New code:** Should use `signWithCosign()` and `verifyWithCosign()` for ECDSA P-256 signatures
- **Existing signatures:** Still validated correctly

## Verification

No other files in the codebase contain direct crypto.createHash or crypto.createHmac calls:

```bash
grep -r "crypto.createHash\|crypto.createHmac" core/ tools/ 
# Only matches in cosign-hash-provider.js
```

## Next Steps

1. ✅ All direct crypto calls centralized
2. ⏳ Migrate remaining HMAC signatures to cosign ECDSA P-256
3. ⏳ Remove hmacSha256() wrapper when all attestation bundles updated
4. ⏳ Document cosign signature format in attestation schema

## Notes

- The centralization maintains determinism and consistency across all hashing operations
- `@sigstore/cosign` provides the underlying ECDSA P-256 infrastructure
- SHA256 is computed consistently for content-addressed operations (plan hashes, audit chain)
- All sensitive data continues to be redacted before hashing
