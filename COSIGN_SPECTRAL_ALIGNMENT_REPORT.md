# Cosign & Spectral Alignment Report

## Executive Summary

**Critical Issues Found:**
- ❌ **MISALIGNMENT:** `lintPlan()` is now **async** (generates keys, calls cosign, signs) but called **synchronously** in 3 places
- ❌ **MISALIGNMENT:** `plan-enforcer.js` and `governance.js` call `lintPlan` without `await`
- ❌ **MISALIGNMENT:** `attestation-engine.js` imports `lintPlan` but never uses it
- ⚠️ **INCOMPLETE:** Plan files in `.cosign-keys/` directory may not exist, causing key generation failures

**What Works:**
- ✅ `plan-linter.js` properly implements cosign signing + spectral linting
- ✅ `tools/lint_plan.js` correctly awaits `lintPlan()`
- ✅ Hashing uses SHA256 consistently across all modules
- ✅ Spectral rules are properly configured

---

## Issue 1: Async/Await Mismatch in plan-enforcer.js

**File:** `core/plan-enforcer.js:51`

```javascript
// ❌ WRONG: lintPlan is async but called synchronously
const lintResult = lintPlan(fileContent, planHash);
```

**Why it's broken:**
- `lintPlan()` is now `async` (calls cosign, generates keys)
- Returns a Promise, not the result object
- Code expects synchronous return
- Will fail with `TypeError: Cannot read property 'passed' of Promise`

**Fix:**
```javascript
// ✅ CORRECT
const lintResult = await lintPlan(fileContent);
```

**Function:** `enforcePlan()` must be declared `async`

---

## Issue 2: Async/Await Mismatch in governance.js

**File:** `core/governance.js:92`

```javascript
// ❌ WRONG: lintPlan is async but called synchronously
const lintResult = lintPlan(planContent);
```

**Why it's broken:**
- Same as Issue 1
- `bootstrapCreateFoundationPlan()` must be declared `async`

**Fix:**
```javascript
// ✅ CORRECT
const lintResult = await lintPlan(planContent);
```

**Function:** `bootstrapCreateFoundationPlan()` must be declared `async`

---

## Issue 3: Unused Import in attestation-engine.js

**File:** `core/attestation-engine.js:26`

```javascript
import { lintPlan } from "./plan-linter.js";
```

**Status:** Imported but never used in the file.

**Analysis:**
- Attestation engine handles HMAC-SHA256 signing (different from cosign)
- Does NOT call `lintPlan` anywhere
- Should either use it or remove the import

**Recommendation:**
- If attestation bundles should verify plans: add call in `gatherEvidence()` 
- If not needed: remove import to reduce coupling

---

## Issue 4: Key Directory Not Created

**File:** `core/plan-linter.js:443-463`

```javascript
export async function generateCosignKeys(keyDir = "./.cosign-keys") {
  // ...
  if (!existsSync(keyDir)) {
    await import("fs/promises").then(fs => fs.mkdir(keyDir, { recursive: true }));
  }
```

**Problem:**
- `.cosign-keys/` directory may not exist on first run
- Code attempts to create it, but uses dynamic import of `fs/promises`
- This works but is unconventional

**Better Approach:**
```javascript
import { mkdir } from "fs/promises";

export async function generateCosignKeys(keyDir = "./.cosign-keys") {
  // ...
  if (!existsSync(keyDir)) {
    await mkdir(keyDir, { recursive: true });
  }
```

---

## Cosign Integration Alignment

### ✅ What's Correct

1. **Key Generation (plan-linter.js:443-463)**
   - Uses `@sigstore/cosign` `generateKeyPair()`
   - Stores keys in `.cosign-keys/` directory
   - Returns both key paths and key material
   - Proper error handling

2. **Signing (plan-linter.js:131-158)**
   - Uses `sign()` from `@sigstore/cosign`
   - Canonicalizes content before signing (strips comments, normalizes whitespace)
   - Returns base64 signature
   - Proper error messages

3. **Verification (plan-linter.js:164-188)**
   - Uses `verifyBlob()` from `@sigstore/cosign`
   - Same canonicalization as signing
   - Returns boolean
   - Proper error handling

4. **Hashing (plan-linter.js:471-485)**
   - Uses `crypto.createHash("sha256")` 
   - Consistent with `stripComments()` + canonicalization
   - Returns hex digest

### ⚠️ Issues with Cosign Integration

1. **plan-enforcer.js still uses old pattern:**
   - Line 51: `const lintResult = lintPlan(fileContent, planHash);`
   - Passes `planHash` as second parameter, but new signature expects `privateKeyPath`
   - Old code: `lintPlan(planContent, expectedSignature = null)`
   - New code: `lintPlan(planContent, privateKeyPath = null, publicKeyPath = null, expectedSignature = null)`

2. **governance.js same issue:**
   - Line 92: `const lintResult = lintPlan(planContent);`
   - Does not pass key paths, relies on auto-generation

---

## Spectral Integration Alignment

### ✅ What's Correct

1. **Spectral Initialization (plan-linter.js:87-125)**
   - Creates Spectral instance with custom rules
   - 3 plan-specific rules defined:
     - `plan-required-sections`
     - `plan-no-stubs` 
     - `plan-phase-format`
   - Uses proper severity levels (error)

2. **Spectral Execution (plan-linter.js:414-435)**
   - `runSpectralLinting()` runs spectral.run() on plan content
   - Converts results to violation objects
   - Integrated into main `lintPlan` as Stage 6
   - Errors logged but don't block (fail-open for spectral)

### ⚠️ Spectral Rules Could Be Extended

Current rules only use `truthy` and `pattern` functions. Could add:
- Schema validation rules
- Path validation rules
- Phase ordering rules
- But current implementation is sufficient

---

## Overall Linting Flow (Corrected)

```
lintPlan(planContent, privateKeyPath?, publicKeyPath?, expectedSignature?)
  ├─ Stage -1: Generate cosign keys if needed (NEW)
  ├─ Stage 0:  Hash plan (SHA256)
  ├─ Stage 1:  Validate structure (required sections, ordering)
  ├─ Stage 2:  Validate phases (ID format, required fields)
  ├─ Stage 3:  Validate path allowlist (no escapes, workspace-relative)
  ├─ Stage 4:  Validate enforceability (no stubs, no ambiguous language)
  ├─ Stage 5:  Validate auditability (objectives are plain English)
  ├─ Stage 6:  Run Spectral linting
  ├─ Stage 7:  Sign with cosign (if private key available)
  ├─ Stage 8:  Verify signature (if public key + signature provided)
  └─ Return: { passed, errors, warnings, hash, signature, generatedKeys }
```

---

## Call Sites Analysis

| File | Function | Line | Status | Issue |
|------|----------|------|--------|-------|
| `tools/lint_plan.js` | `lintPlanHandler` | 33 | ✅ FIXED | Uses `await` correctly |
| `core/plan-enforcer.js` | `enforcePlan` | 51 | ❌ BROKEN | Missing `await`, wrong params |
| `core/governance.js` | `bootstrapCreateFoundationPlan` | 92 | ❌ BROKEN | Missing `await` |
| `core/attestation-engine.js` | (imported) | 26 | ⚠️ UNUSED | Import not used |

---

## Recommended Fixes (Priority Order)

### P0: Critical - Breaks Execution

1. **Fix plan-enforcer.js**
   ```javascript
   export async function enforcePlan(planHash, targetPath) {
     // ... existing code ...
     const lintResult = await lintPlan(fileContent);  // ← Fix line 51
     // ... rest of function ...
   }
   ```
   - Make function `async`
   - Add `await` before `lintPlan()`
   - Remove `planHash` parameter (not used by new signature)

2. **Fix governance.js**
   ```javascript
   export async function bootstrapCreateFoundationPlan(repoRoot = null, planContent, payload, signature) {
     // ... existing code ...
     const lintResult = await lintPlan(planContent);  // ← Fix line 92
     // ... rest of function ...
   }
   ```
   - Make function `async`
   - Add `await` before `lintPlan()`

### P1: Important - Consistency

3. **Update plan-linter.js imports**
   ```javascript
   import { mkdir } from "fs/promises";  // ← Add this
   // ... remove dynamic import from generateCosignKeys
   ```
   - Move `fs/promises` to top-level imports
   - Simplify key generation function

### P2: Nice-to-Have - Cleanup

4. **Remove unused import from attestation-engine.js (if not needed)**
   ```javascript
   // Remove: import { lintPlan } from "./plan-linter.js";
   ```
   - Or, if attestation should verify plans, use it in `gatherEvidence()`

5. **Update documentation**
   - Add async/await requirement to function signatures
   - Document that `lintPlan` now auto-generates keys

---

## Testing Checklist

- [ ] `npm test` passes
- [ ] `enforcePlan()` executes plan without errors
- [ ] `bootstrapCreateFoundationPlan()` creates foundation plan correctly
- [ ] Keys generated in `.cosign-keys/` on first lint
- [ ] Signature verification works with generated keys
- [ ] Spectral linting rules fire correctly
- [ ] Hash consistency across multiple runs
- [ ] All violation codes and error messages present

---

## Documentation References

- [docs/templates/LINTING_AND_SIGNING_GUIDE.md](../docs/templates/LINTING_AND_SIGNING_GUIDE.md)
- [COSIGN_SPECTRAL_MIGRATION.md](../COSIGN_SPECTRAL_MIGRATION.md)
- [adr/003-cryptographic-audit-logging.md](../adr/003-cryptographic-audit-logging.md)
