# Cosign Implementation Audit

## Critical Issues Found

### Issue 1: governance.js - Missing keyPair argument

**File**: `core/governance.js:100`
**Problem**: `signWithCosign(planContent)` called with NO keyPair argument
**Function Signature**: `signWithCosign(content, keyPair)` REQUIRES keyPair object
**Expected**: Should pass `{ publicKey, privateKey }` object
**Impact**: Will throw error: "signWithCosign requires keyPair with privateKey"

```javascript
// WRONG (current)
const planSignature = await signWithCosign(planContent);

// CORRECT (should be)
const planSignature = await signWithCosign(planContent, keyPair);
```

---

### Issue 2: audit-log.js - Passing file path instead of keyPair object

**File**: `core/audit-log.js:24-28`
**Problem**: `signWithCosign(payload, privateKeyPath)` passes file path as second arg
**Function Signature**: `signWithCosign(content, keyPair)` expects keyPair object, not a file path
**Expected**: Should load key from path and pass keyPair object
**Impact**: Will throw error because privateKeyPath is a string, not an object with privateKey property

```javascript
// WRONG (current)
async function signAuditEntry(entry, privateKeyPath) {
  const payload = Buffer.from(JSON.stringify(entry));
  const signature = await signWithCosign(payload, privateKeyPath);
  return signature;
}

// CORRECT (should be)
async function signAuditEntry(entry, keyPair) {
  const payload = Buffer.from(JSON.stringify(entry));
  const signature = await signWithCosign(payload, keyPair);
  return signature;
}
```

---

### Issue 3: Inconsistent API - governance.js doesn't have keyPair available

**File**: `core/governance.js:80-100`
**Problem**: Function signature `bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature)` doesn't accept/have keyPair
**Expected**: Need to either:

- Load keyPair from somewhere (e.g., .atlas-gate/)
- Pass keyPair as parameter
- Generate new keyPair for this operation

---

## Current Correct Usage

### ✅ plan-linter.js:154

```javascript
const signature = await signWithCosign(canonicalized, keyPair);
```

CORRECT - passes canonicalized content and keyPair object

### ✅ audit-system.js:319

```javascript
const signature = await signWithCosign(canonical, keyPair);
```

CORRECT - passes canonical content and keyPair object

---

## Implementation Specification (from thread)

According to the implementation plan, cosign must:

1. **Use ECDSA P-256** with SHA256 hashing
2. **Return URL-safe Base64** (+ → -, / → _, no padding =)
3. **Require keyPair parameter**: `{ publicKey, privateKey }` objects in PEM format
4. **Fail hard**: Any signing/verification failure must throw, no fallbacks
5. **Key Format**:
   - Public Key: SPKI in PEM format
   - Private Key: PKCS8 in PEM format

---

## Summary of Fixes Applied

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `core/governance.js` | 100 | Missing keyPair argument | ✅ FIXED - Added keyPair parameter to function |
| `core/audit-log.js` | 24-28 | Passing file path instead of keyPair | ✅ FIXED - Changed to accept keyPair object |
| `core/governance.js` | 80-100 | No keyPair available in bootstrap | ✅ FIXED - Load/generate keyPair before signing |
| `tools/begin_session.js` | 16+ | Key generation deferred until first use | ✅ FIXED - Explicit key generation on session start |
| `core/audit-system.js` | 87 | loadOrGenerateKeyPair not exported | ✅ FIXED - Made function public export |

---

## Verification Checklist

- [ ] governance.js has keyPair available in bootstrapCreateFoundationPlan
- [ ] audit-log.js signAuditEntry accepts keyPair object, not file path
- [ ] All signWithCosign calls pass (content, keyPair) arguments
- [ ] All verifyWithCosign calls pass (content, signature, publicKey) arguments
- [ ] No file path strings passed where keyPair objects expected
- [ ] Test signing and verification work end-to-end
