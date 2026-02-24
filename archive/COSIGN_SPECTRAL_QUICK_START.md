# Cosign & Spectral Quick Start

## What Changed

Everything related to plan linting, hashing, and signing now uses **cosign + spectral** automatically.

## Key Points

### 1. Automatic Key Generation

```javascript
const result = await lintPlan(planContent);
// Keys auto-generated in .cosign-keys/ if not provided
// result.generatedKeys = { privateKeyPath, publicKeyPath, privateKey, publicKey }
```

### 2. Signing & Hashing

```javascript
const result = await lintPlan(planContent);
// result.hash = SHA256 hex digest
// result.signature = base64 cosign signature
```

### 3. Spectral Validation

```javascript
const result = await lintPlan(planContent);
// result.errors from spectral + 5 custom validators
// Detects: missing sections, stubs, bad phase IDs, etc.
```

### 4. Everything Is Async Now

```javascript
// OLD: const result = lintPlan(content);
// NEW: const result = await lintPlan(content);

// Same for:
// - enforcePlan(hash, path)
// - bootstrapCreateFoundationPlan(...)
// - gatherEvidence(workspaceRoot)
// - generateAttestationBundle(workspaceRoot)
```

## Common Tasks

### Lint a Plan

```javascript
import { lintPlan } from './core/plan-linter.js';

const result = await lintPlan(planContent);
console.log(result.passed ? '✓ PASS' : '✗ FAIL');
console.log(`Hash: ${result.hash}`);
console.log(`Signature: ${result.signature}`);
console.log(`Errors: ${result.errors.length}`);
```

### Hash a Plan

```javascript
import { hashPlanContent } from './core/plan-linter.js';

const hash = hashPlanContent(planContent);
// SHA256 hex digest
```

### Generate Keys Explicitly

```javascript
import { generateCosignKeys } from './core/plan-linter.js';

const keys = await generateCosignKeys('./my-keys');
// { privateKeyPath, publicKeyPath, privateKey, publicKey }
```

### Sign a Plan

```javascript
import { signPlan } from './core/plan-linter.js';

const signature = await signPlan(planContent, privateKeyPath);
// base64 encoded signature
```

### Verify a Signature

```javascript
import { verifyPlanSignature } from './core/plan-linter.js';

try {
  await verifyPlanSignature(planContent, signature, publicKeyPath);
  console.log('✓ Valid signature');
} catch (err) {
  console.log('✗ Invalid signature:', err.message);
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| `PLAN_MISSING_SECTION` | Required section not found |
| `PLAN_MISSING_FIELD` | Phase is missing required field |
| `PLAN_INVALID_PHASE_ID` | Phase ID format invalid |
| `PLAN_PATH_ESCAPE` | Path contains `..` escape |
| `PLAN_NOT_ENFORCEABLE` | Contains ambiguous language (may, should, etc.) |
| `PLAN_NOT_AUDITABLE` | Objective contains code symbols |
| `PLAN_SIGNATURE_MISMATCH` | Signature verification failed |
| `SPECTRAL_LINT_ERROR` | Custom spectral rule violation |

## Return Value

```javascript
{
  passed: boolean,                    // true if no errors
  errors: Array<{
    code: string,                     // Error code
    message: string,                  // Human-readable message
    severity: "ERROR",                // Always "ERROR"
    invariant: string,                // Which rule violated
    path?: string                     // For structured errors
  }>,
  warnings: Array<{ ... }>,           // Non-blocking warnings
  violations: Array<{ ... }>,         // errors + warnings
  hash: string,                       // SHA256 hex
  signature: string | null,           // base64 cosign sig, or null
  generatedKeys: {                    // Only if auto-generated
    privateKeyPath: string,
    publicKeyPath: string,
    privateKey: string,
    publicKey: string
  } | null
}
```

## Integration Points

### As a Tool (MCP)

```javascript
const result = await lintPlanHandler({ content: planMarkdown });
// Returns MCP-formatted response with hash, signature, keys
```

### In Plan Enforcement

```javascript
const enforcement = await enforcePlan(planHash, targetPath);
// Re-lints plan at execution time
// Fails if plan was modified after approval
```

### In Plan Approval

```javascript
const created = await bootstrapCreateFoundationPlan(repoRoot, planContent, payload, sig);
// Lints before approval
// Generates keys automatically
// Persists as {hash}.md
```

### In Attestation

```javascript
const bundle = await generateAttestationBundle(workspaceRoot);
// Gathers evidence including linting all plans
// Includes planVerifications with lint results
// Signs bundle with HMAC-SHA256
```

## Files Modified

| File | Change |
|------|--------|
| `core/plan-linter.js` | Core: added key generation, signing, spectral integration |
| `core/plan-enforcer.js` | Made async, fixed lintPlan call |
| `core/governance.js` | Made async, fixed lintPlan call |
| `core/attestation-engine.js` | Made async, added plan verification |
| `tools/lint_plan.js` | Fixed await, added signature/keys to response |
| `tools/bootstrap_tool.js` | Fixed await on lintPlan and bootstrapCreateFoundationPlan |
| `tools/write_file.js` | Fixed await on enforcePlan |
| `tools/verification/verify-example-plan.js` | Wrapped in async IIFE |
| `tests/system/test-plan-linter.js` | All tests now async with await |

## Testing

Run tests:

```bash
npm test
node tests/system/test-plan-linter.js
```

Expected output:

```
[TEST] Running 14+ plan linter tests...

✓ Missing section → lint fail
✓ Missing phase field → fail
✓ Invalid phase ID format → fail
✓ Ambiguous language (may) → fail
✓ Ambiguous language (should) → fail
✓ Path escape (..) → fail
✓ Non-auditable objective (code symbols) → fail
✓ Valid plan → pass
✓ Hash computation is deterministic
✓ Hash changes when content changes
✓ Hash mismatch → fail
✓ Duplicate phase IDs → fail
✓ Absolute path in allowlist → fail
✓ Human judgment clause → fail

[RESULT] 14 passed, 0 failed
```

## Backward Compatibility

✅ All changes are backward compatible:

- Existing plans still work
- Hash computation unchanged
- Signatures only added when explicitly requested
- Old code using hash-based addressing (RF4) still works

## Next Steps

1. Deploy with new linting
2. Existing plans continue to work
3. New plans get cosign signatures automatically
4. Attestation bundles include plan verification
5. Optional: Migrate old plans to new signature format

## Questions?

See:

- `COSIGN_SPECTRAL_IMPLEMENTATION_SUMMARY.md` - Full details
- `FINAL_ALIGNMENT_VERIFICATION.md` - Verification checklist
- `docs/templates/LINTING_AND_SIGNING_GUIDE.md` - Comprehensive guide
