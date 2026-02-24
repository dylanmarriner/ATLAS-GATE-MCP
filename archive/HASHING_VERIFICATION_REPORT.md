# Hashing System Verification Report

**Status:** ✅ COMPLETE - All tools correctly route through cosign infrastructure  
**Date:** 2026-02-14

## Summary

All atlas-gate tools have been verified to correctly use the centralized `cosign-hash-provider.js` module for hashing operations. No direct `crypto.createHash()` or `crypto.createHmac()` calls exist in active production code.

## Verification Results

### ✅ Core Infrastructure (Production Code)

- **audit-system.js** - Uses `sha256()` from provider
- **attestation-engine.js** - Uses `sha256()`, `canonicalizeForHash()`, `timingSafeEqual()`, `hmacSha256()`
- **replay-engine.js** - Uses `sha256()`, `canonicalizeForHash()`
- **intent-schema.js** - Uses `sha256()`
- **operator-identity.js** - Uses `sha256()`
- **governance.js** - Uses `hmacSha256()`, `timingSafeEqual()`
- **maturity-report-generator.js** - Uses `sha256()`
- **audit-storage-file.js** - Uses `sha256()`
- **two-step-confirmation.js** - Uses `sha256()`
- **maturity-scoring-engine.js** - Uses `sha256()`
- **remediation-engine.js** - Uses `sha256()`
- **plan-linter.js** - Uses `sha256()`

### ✅ Tools (All Fixed)

- **write_file.js** - Uses `sha256()` for content hashing ✅ Fixed
- **generate-remediation-proposals.js** - Uses `sha256()` for evidence hashing ✅ Fixed
- **verification/verify-audit-log.js** - Uses `sha256()` for chain verification ✅ Fixed
- **verification/verify_security.js** - Unused crypto import removed ✅ Fixed
- **session.js** - Uses `crypto.randomUUID()` (not hashing) - OK

### Acceptable Exceptions

- **Test files** (`tests/`) - Can use direct crypto for backward compatibility
- **Documentation** (markdown, guides) - Only references, not code
- **cosign-hash-provider.js** - Intentionally uses crypto (only module allowed)

## Detailed Code Changes

### Files Modified

```
core/
├─ audit-system.js              [Import sha256, remove local function]
├─ attestation-engine.js         [Import providers, remove local functions]
├─ replay-engine.js              [Import providers, remove local functions]
├─ intent-schema.js              [Import sha256, replace crypto call]
├─ operator-identity.js          [Import sha256, replace crypto call]
├─ governance.js                 [Import providers, replace crypto calls]
├─ maturity-report-generator.js  [Import sha256, replace crypto call]
├─ audit-storage-file.js         [Import sha256, replace crypto call]
├─ two-step-confirmation.js      [Import sha256, replace crypto call]
├─ maturity-scoring-engine.js    [Import sha256, replace crypto call]
├─ remediation-engine.js         [Import sha256, replace crypto call]
├─ plan-linter.js                [Import sha256, replace crypto call]
└─ cosign-hash-provider.js       [NEW - Centralized provider]

tools/
├─ write_file.js                 [Import sha256, replace 2 crypto calls]
├─ generate-remediation-proposals.js [Import sha256, replace 2 crypto calls]
└─ verification/
   ├─ verify-audit-log.js        [Import sha256, replace crypto call]
   └─ verify_security.js         [Remove unused crypto import]
```

## Hashing Architecture

```
┌─────────────────────────────────────────────────────────┐
│  cosign-hash-provider.js (ONLY crypto source)          │
├─────────────────────────────────────────────────────────┤
│  • sha256(input)                                        │
│  • canonicalizeForHash(obj)                             │
│  • signWithCosign(content, keyPair)                     │
│  • verifyWithCosign(content, signature, keyPair)        │
│  • hmacSha256(content, secret)   [deprecated]           │
│  • timingSafeEqual(a, b)                                │
└────────┬────────────────────────────────────────────────┘
         │
         ├──→ audit-system.js
         ├──→ attestation-engine.js
         ├──→ replay-engine.js
         ├──→ intent-schema.js
         ├──→ operator-identity.js
         ├──→ governance.js
         ├──→ maturity-report-generator.js
         ├──→ audit-storage-file.js
         ├──→ two-step-confirmation.js
         ├──→ maturity-scoring-engine.js
         ├──→ remediation-engine.js
         ├──→ plan-linter.js
         │
         └──→ tools/
             ├──→ write_file.js
             ├──→ generate-remediation-proposals.js
             └──→ verification/verify-audit-log.js
```

## Compliance Verification

### Search Results Summary

```bash
grep -r "crypto.createHash\|crypto.createHmac" core/ tools/
# Result: 0 matches (except provider itself)
```

### Direct Crypto Usage

- **Allowed in:** `core/cosign-hash-provider.js` only
- **Forbidden in:** All other active code
- **Acceptable in:** Test files, documentation

## Migration Completeness

| Component | Status | Notes |
|-----------|--------|-------|
| Core infrastructure | ✅ Complete | All using provider |
| Production tools | ✅ Complete | All using provider |
| API consistency | ✅ Complete | Unified interface |
| Backward compatibility | ✅ Maintained | HMAC wrapper preserved |
| Documentation | ✅ Updated | Migration guide created |
| Test files | ⏳ Optional | Can use crypto directly |

## Key Improvements

1. **Single Source of Truth** - All hashing centralized in one module
2. **Determinism** - Canonical JSON ensures consistent results
3. **Cosign Integration** - Ready for ECDSA P-256 signing migration
4. **Audit Trail** - All hash operations logged and traceable
5. **Security** - Timing-safe comparisons for sensitive operations

## Next Steps

1. ✅ Centralize all hashing
2. ✅ Fix tools to use provider
3. ✅ Remove unused imports
4. ⏳ Migrate HMAC signatures to cosign ECDSA P-256
5. ⏳ Update attestation bundle format for cosign signatures
6. ⏳ Deprecate `hmacSha256()` wrapper

## Notes

- All content-addressed operations (plan hashes, audit chain) use SHA256 for determinism
- Sensitive data is redacted before hashing (already implemented)
- Session IDs use `crypto.randomUUID()` which is not affected (correct location)
- No hashing operations are split across multiple modules
