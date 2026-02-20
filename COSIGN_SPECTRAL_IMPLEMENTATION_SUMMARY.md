# Cosign & Spectral Implementation Summary

## What Was Done

All linting, hashing, and signing operations are now **fully aligned** with cosign and spectral integration.

### 1. **Core Module (plan-linter.js)**

✅ **Key Generation**
- `generateCosignKeys()` - Generates ECDSA P-256 key pairs
- Auto-creates `.cosign-keys/` directory
- Returns private + public keys with paths

✅ **Signing**
- `signPlan()` - Signs plan content with cosign
- Uses canonical content (stripped of comments, normalized)
- Returns base64-encoded signature

✅ **Verification**
- `verifyPlanSignature()` - Verifies signatures with cosign
- Uses same canonicalization as signing
- Returns boolean verification result

✅ **Hashing**
- `hashPlanContent()` - Computes SHA256 hash
- Exported for external use
- Uses same canonicalization as signing/verification

✅ **Spectral Linting**
- `initializeSpectral()` - Configures Spectral with 3 plan-specific rules
- `runSpectralLinting()` - Executes spectral linting in-process
- Integrated as Stage 6 of linting pipeline

✅ **Main Linting Function**
```javascript
lintPlan(planContent, privateKeyPath?, publicKeyPath?, expectedSignature?)
  Stage -1: Generate cosign keys if needed
  Stage 0:  Hash plan (SHA256)
  Stage 1:  Validate structure
  Stage 2:  Validate phases
  Stage 3:  Validate paths
  Stage 4:  Validate enforceability
  Stage 5:  Validate auditability
  Stage 6:  Spectral linting
  Stage 7:  Sign with cosign
  Stage 8:  Verify signature (if provided)
  Returns: { passed, errors, warnings, hash, signature, generatedKeys }
```

### 2. **Tool Handler (tools/lint_plan.js)**

✅ Fixed: Now properly awaits `lintPlan()`
✅ Returns: hash, signature, and generatedKeys in response
✅ Handles: path, hash, and content input modes

### 3. **Plan Enforcement (core/plan-enforcer.js)**

✅ Fixed: `enforcePlan()` is now async
✅ Awaits `lintPlan()` at execution time
✅ Re-lints plans before execution (fail-if-modified)

### 4. **Governance (core/governance.js)**

✅ Fixed: `bootstrapCreateFoundationPlan()` is now async
✅ Awaits `lintPlan()` at approval time
✅ Lints foundation plans before creation

### 5. **Bootstrap Tool (tools/bootstrap_tool.js)**

✅ Fixed: Awaits `lintPlan()` during proposal validation
✅ Fixed: Awaits `bootstrapCreateFoundationPlan()` during creation
✅ Properly reports linting violations to callers

### 6. **Write File Tool (tools/write_file.js)**

✅ Fixed: Awaits `enforcePlan()` during policy gate
✅ Enforces plan authorization before writes

### 7. **Verification Script (tools/verification/verify-example-plan.js)**

✅ Fixed: Wrapped in async IIFE for proper async/await
✅ Uses `lintPlan()` to compute hash and sign
✅ Displays generated keys and signature in output

### 8. **Attestation Engine (core/attestation-engine.js)**

✅ Fixed: `gatherEvidence()` is now async
✅ Verifies all plans with `lintPlan()` during evidence gathering
✅ Fixed: `generateAttestationBundle()` awaits `gatherEvidence()`
✅ Includes `planVerifications` in attestation evidence

### 9. **Test Suite (tests/system/test-plan-linter.js)**

✅ Fixed: All 14+ test functions are now async
✅ Fixed: All `lintPlan()` calls use await
✅ Fixed: Test runner handles async functions with `await fn()`
✅ Test coverage includes:
  - Missing sections
  - Missing phase fields
  - Invalid phase IDs
  - Ambiguous language (may, should)
  - Path escapes (..)
  - Non-auditable objectives
  - Valid plans
  - Hash computation
  - Signature verification
  - Duplicate phase IDs
  - Absolute paths
  - Human judgment clauses

## Alignment Verification

### Cosign Integration
| Component | Cosign Signing | Cosign Verification | Key Generation |
|-----------|---|---|---|
| plan-linter.js | ✅ `signPlan()` | ✅ `verifyPlanSignature()` | ✅ `generateCosignKeys()` |
| lint_plan tool | ✅ Used | N/A (read-only) | ✅ Auto-generated |
| plan-enforcer.js | N/A (exec-only) | N/A (checks hash) | ✅ Auto-uses |
| governance.js | N/A (approval) | N/A (trusts lint) | ✅ Auto-uses |
| attestation-engine.js | N/A (bundle HMAC) | N/A | ✅ Verifies plans |

### Spectral Integration
| Component | Spectral Rules | Execution | Error Handling |
|-----------|---|---|---|
| plan-linter.js | ✅ 3 custom rules | ✅ Stage 6 | ✅ Fail-open (warns) |
| lint_plan tool | ✅ Inherited | ✅ Via lintPlan | ✅ Reports violations |
| Tests | ✅ Coverage | ✅ Test 8+ | ✅ Assertions |

### Async/Await Alignment
| Function | Async | Awaited At | Status |
|----------|---|---|---|
| `lintPlan()` | ✅ Yes | All call sites | ✅ Fixed |
| `enforcePlan()` | ✅ Yes | `write_file.js` | ✅ Fixed |
| `bootstrapCreateFoundationPlan()` | ✅ Yes | `bootstrap_tool.js` | ✅ Fixed |
| `gatherEvidence()` | ✅ Yes | `attestation-engine.js` | ✅ Fixed |
| `generateAttestationBundle()` | ✅ Yes | Tests/scripts | ✅ Fixed |

## Key Generation Flow

```
lintPlan() called
  → No keys provided?
    → generateCosignKeys()
      → generateKeyPair() [from @sigstore/cosign]
      → mkdir(.cosign-keys/, { recursive: true })
      → writeFileSync(cosign.key)
      → writeFileSync(cosign.pub)
      → Return { privateKeyPath, publicKeyPath, privateKey, publicKey }
  → Sign phase
    → signPlan(content, privateKeyPath)
      → canonicalize content (strip comments, normalize whitespace)
      → sign({ payload: Buffer, keyPath: privateKeyPath })
      → Return base64 signature
  → Return { hash, signature, generatedKeys }
```

## Signing & Verification Flow

```
Signing Phase (lintPlan with privateKeyPath):
  1. Canonicalize: strip HTML comments, trim whitespace
  2. Hash: SHA256(canonicalized)
  3. Sign: cosign.sign({ payload, keyPath })
  4. Return: base64 signature

Verification Phase (lintPlan with publicKeyPath + expectedSignature):
  1. Canonicalize: same as signing
  2. Verify: cosign.verifyBlob({ payload, signature, keyPath })
  3. Throw if invalid
  4. Return: true/false
```

## Spectral Rules

Three custom rules are configured:

1. **plan-required-sections**
   - Check: All required sections present
   - Severity: ERROR
   - Function: truthy()

2. **plan-no-stubs**
   - Check: No TODO, FIXME, mock, placeholder, etc.
   - Severity: ERROR
   - Function: pattern() with STUB_PATTERNS

3. **plan-phase-format**
   - Check: Phase IDs are uppercase alphanumeric + underscore
   - Severity: ERROR
   - Function: pattern() with `^[A-Z0-9_]+$`

## Output Format

Every `lintPlan()` call returns:
```javascript
{
  passed: boolean,              // true iff no errors
  errors: Array<Violation>,     // ERROR-level violations
  warnings: Array<Violation>,   // WARNING-level violations
  violations: Array<Violation>, // errors + warnings
  hash: string,                 // SHA256 hex digest
  signature: string|null,       // base64 cosign signature (if signed)
  generatedKeys: {              // only if auto-generated
    privateKeyPath: string,
    publicKeyPath: string,
    privateKey: string,
    publicKey: string
  } | null
}
```

## Testing

All changes are backward compatible with existing tests. The test suite:
- Runs 14+ plan linting tests
- Tests cosign signing/verification flows
- Tests hash determinism
- Tests spectral rule violations
- Uses async test functions where needed

Run tests with:
```bash
npm test
node tests/system/test-plan-linter.js
```

## Documentation

- [COSIGN_SPECTRAL_MIGRATION.md](./COSIGN_SPECTRAL_MIGRATION.md) - Detailed migration guide
- [docs/templates/LINTING_AND_SIGNING_GUIDE.md](./docs/templates/LINTING_AND_SIGNING_GUIDE.md) - Comprehensive linting guide
- [adr/003-cryptographic-audit-logging.md](./adr/003-cryptographic-audit-logging.md) - Audit trail architecture

## Next Steps (Optional)

1. **Persistent Key Storage**: Store keys in `.atlas-gate/` instead of `.cosign-keys/`
2. **Key Rotation**: Implement key rotation policy
3. **Hardware Keys**: Support hardware-backed cosign keys (YubiKey, TPM)
4. **Extended Spectral Rules**: Add more domain-specific linting rules
5. **CI/CD Integration**: Integrate linting into deployment pipelines
