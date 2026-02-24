# Cosign & Spectral Migration Guide

## Overview

Replaced all ATLAS-GATE hashing and linting implementations with:

- **Cosign** (@sigstore/cosign): ECDSA P-256 cryptographic signing
- **Spectral** (@stoplight/spectral): API/schema linting engine

## Changes Made

### 1. Package Dependencies

Added to `package.json`:

```json
"@sigstore/cosign": "^2.3.0",
"@stoplight/spectral-cli": "^6.12.0",
"@stoplight/spectral-core": "^1.13.0"
```

### 2. Plan Linter (`core/plan-linter.js`)

#### Replaced Functions

- `computePlanHash()` → Use cosign `signPlan()` instead
- Added new: `signPlan(planContent, privateKeyPath)` - Signs with ECDSA P-256
- Added new: `verifyPlanSignature(planContent, signature, publicKeyPath)` - Verifies cosign signatures
- Updated: `lintPlan()` - Now uses Spectral for rule-based linting

#### New Rule System

- Spectral initialization with custom plan-specific rules
- Rules for required sections, no stubs, phase format validation
- Extensible rule engine for future validation requirements

#### Migration Path

Old hash-based approach:

```javascript
const hash = computePlanHash(planContent);
if (actualHash !== expectedHash) { /* error */ }
```

New signature-based approach:

```javascript
const signature = await signPlan(planContent, privateKeyPath);
const verified = await verifyPlanSignature(planContent, signature, publicKeyPath);
```

### 3. Audit Log (`core/audit-log.js`)

#### Replaced Functions

- `sha256()` → Cosign `sign()` for audit entry signatures
- Updated: `appendAuditLog()` - Now creates cosign signatures instead of SHA256 hashes

#### Chain Integrity

Old: Hash chain (`prevHash` → current hash)
New: Signature chain (`prevSignature` → current signature)

Same atomic file-locking mechanism, but cryptographically signed entries

### 4. Test Files Requiring Updates

The following test files reference old `computePlanHash()`:

- `/tests/system/test-plan-linter.js` - Update to use new signature functions
- `/tests/system/test-linter-on-existing-plan.js` - Update to use new signature functions
- `/tests/antigravity-tools-test.js` - Update to use new signature functions
- `/tests/comprehensive-tool-test.js` - Update to use new signature functions

Other test files using `crypto.createHash()` for non-plan purposes can continue using crypto module for backward compatibility.

### 5. Installation & Setup

```bash
# Install dependencies
npm install

# Verify cosign and spectral are available
npm list @sigstore/cosign @stoplight/spectral-core

# Generate test keys for local testing (optional)
# See https://github.com/sigstore/cosign for key generation
```

## Breaking Changes

1. **Function signatures changed**: Plans no longer use hash for verification, use signatures
2. **Database schema**: Old `plan_hash` VARCHAR(64) fields should be migrated to store base64 signatures
3. **API contracts**: Any clients expecting SHA256 hashes must be updated to handle base64 signatures

## Configuration Required

### Cosign Keys

Set environment variables or provide key paths:

```bash
export COSIGN_PRIVATE_KEY=/path/to/private.key
export COSIGN_PUBLIC_KEY=/path/to/public.key
```

### Spectral Rules

Custom rules can be defined in `core/plan-linter.js` `initializeSpectral()` function

## Benefits

1. **Industry Standard**: Cosign is CNCF Sigstore's production signing tool
2. **Stronger Cryptography**: ECDSA P-256 vs. SHA256 hashes
3. **Better Linting**: Spectral provides declarative, extensible rule engine
4. **Supply Chain Security**: Built for software supply chain integrity
5. **Auditability**: Cryptographic proofs of data integrity

## Rollback Plan

If reverting is needed:

1. Keep old crypto-based functions in separate module
2. Add feature flag to switch between implementations
3. Update database schema to support both hash and signature fields

## Next Steps

1. Update all test files to remove `computePlanHash()` calls
2. Implement key management strategy (KMS, local, etc.)
3. Migrate audit log database schema
4. Update API documentation for signature-based verification
5. Add integration tests for cosign/spectral workflows

## References

- Cosign: <https://github.com/sigstore/cosign>
- Spectral: <https://github.com/stoplightio/spectral>
- Sigstore: <https://www.sigstore.dev/>
