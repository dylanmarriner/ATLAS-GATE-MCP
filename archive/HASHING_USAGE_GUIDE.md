# Hashing Usage Guide for Developers

**CRITICAL RULE:** All hashing must go through `core/cosign-hash-provider.js`

## Quick Reference

### For SHA256 Hashing
```javascript
import { sha256 } from "../core/cosign-hash-provider.js";

// Simple string
const hash = sha256("content");

// Objects (auto-canonicalized)
const hash = sha256(JSON.stringify(obj));
```

### For Deterministic JSON
```javascript
import { canonicalizeForHash } from "../core/cosign-hash-provider.js";

// Ensures same object → same hash regardless of key order
const canonical = canonicalizeForHash(obj);
const hash = sha256(canonical);
```

### For Signature Verification (Timing-Safe)
```javascript
import { timingSafeEqual } from "../core/cosign-hash-provider.js";

// Prevents timing attacks
if (timingSafeEqual(signatureA, signatureB)) {
  // Safe comparison
}
```

### For HMAC-SHA256 (Deprecated - Backward Compatibility Only)
```javascript
import { hmacSha256 } from "../core/cosign-hash-provider.js";

// Only for existing attestation bundles
const signature = hmacSha256(content, secret);
```

### For Cosign Signing (Preferred - Use This)
```javascript
import { signWithCosign, verifyWithCosign } from "../core/cosign-hash-provider.js";

// Sign content with ECDSA P-256
const signature = await signWithCosign(content, keyPair);

// Verify signature
const isValid = await verifyWithCosign(content, signature, keyPair);
```

## DO ❌ DON'T

```javascript
// ❌ WRONG - Direct crypto
import crypto from "crypto";
const hash = crypto.createHash("sha256").update(content).digest("hex");

// ✅ RIGHT - Use provider
import { sha256 } from "../core/cosign-hash-provider.js";
const hash = sha256(content);
```

```javascript
// ❌ WRONG - Direct HMAC
import crypto from "crypto";
const hmac = crypto.createHmac("sha256", secret);

// ✅ RIGHT - Use provider
import { hmacSha256 } from "../core/cosign-hash-provider.js";
const hmac = hmacSha256(content, secret);
```

```javascript
// ❌ WRONG - Unsafe comparison
if (signature === expectedSignature) { }

// ✅ RIGHT - Timing-safe
import { timingSafeEqual } from "../core/cosign-hash-provider.js";
if (timingSafeEqual(signature, expectedSignature)) { }
```

## Implementation Checklist

When adding hashing to a new module:

- [ ] Import from `core/cosign-hash-provider.js`
- [ ] Remove any `import crypto from "crypto"` lines
- [ ] Replace all `crypto.createHash()` with `sha256()`
- [ ] Replace all `crypto.createHmac()` with `hmacSha256()`
- [ ] Replace all `crypto.timingSafeEqual()` with `timingSafeEqual()`
- [ ] Remove any unused imports
- [ ] Test hashing produces deterministic results
- [ ] Run tests to verify no regressions

## Common Patterns

### Audit Log Entry Hashing
```javascript
import { sha256, canonicalizeForHash } from "../core/cosign-hash-provider.js";

const canonicalWithoutHash = { ...entry };
delete canonicalWithoutHash.entry_hash;
const entryHash = sha256(canonicalizeForHash(canonicalWithoutHash));
```

### Plan Content Hashing
```javascript
import { sha256 } from "../core/cosign-hash-provider.js";

const stripedContent = stripComments(planContent);
const canonicalized = stripedContent
  .trim()
  .split("\n")
  .map(line => line.trimRight())
  .join("\n");
const hash = sha256(canonicalized);
```

### File Content Integrity Check
```javascript
import { sha256 } from "../core/cosign-hash-provider.js";

const currentHash = sha256(fileContent);
if (currentHash !== expectedHash) {
  throw new Error("File modified");
}
```

### Evidence Hashing for Proposals
```javascript
import { sha256 } from "../core/cosign-hash-provider.js";

const evidence_map = new Map();
for (const finding of forensic_findings) {
  const hash = sha256(JSON.stringify(finding));
  evidence_map.set(hash, finding);
}
```

## Provider API Reference

### `sha256(input: string | object): string`
- **Input:** String or object (auto-JSON.stringify)
- **Output:** 64-char hex string (SHA256)
- **Determinism:** Yes, uses canonical JSON for objects

### `canonicalizeForHash(obj: any): string`
- **Input:** Any object
- **Output:** Canonical JSON string with sorted keys
- **Use:** When you need the canonical form separately

### `timingSafeEqual(a: string | Buffer, b: string | Buffer): boolean`
- **Input:** Two buffers or hex strings
- **Output:** Boolean (true if equal)
- **Security:** Timing-safe comparison prevents attacks

### `hmacSha256(content: string, secret: string): string`
- **Input:** Content and HMAC secret
- **Output:** HMAC-SHA256 hex digest
- **Status:** Deprecated - use signWithCosign for new code
- **Use:** Only for backward compatibility with existing bundles

### `signWithCosign(content: string | Buffer, keyPair: Object): Promise<string>`
- **Input:** Content and cosign key pair
- **Output:** Base64 signature
- **Use:** New ECDSA P-256 signing (preferred)

### `verifyWithCosign(content: string | Buffer, signature: string, keyPair: Object): Promise<boolean>`
- **Input:** Content, signature, and public key
- **Output:** Boolean (true if valid)
- **Use:** Verify cosign signatures

## Migration Path (Old → New)

```javascript
// OLD CODE
import crypto from "crypto";
function hashData(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// NEW CODE
import { sha256 } from "../core/cosign-hash-provider.js";
function hashData(data) {
  return sha256(JSON.stringify(data));
}
```

## Testing Hashing

```javascript
import { sha256 } from "../core/cosign-hash-provider.js";

// Determinism test
const content = { b: 2, a: 1 };
const hash1 = sha256(JSON.stringify(content));
const hash2 = sha256(JSON.stringify({ a: 1, b: 2 }));
console.assert(hash1 === hash2, "Hashing not deterministic!");
```

## FAQ

**Q: Can I use crypto.randomUUID()?**
A: Yes, that's not hashing. UUID generation is acceptable from crypto module.

**Q: What about Node.js crypto for other uses?**
A: This guide only covers hashing. Other crypto functions (encryption, signing with different algorithms) can use crypto directly if needed.

**Q: Can test files use crypto directly?**
A: Yes, test files are exempt for backward compatibility.

**Q: When should I use cosign signing instead of HMAC?**
A: Use `signWithCosign()` for all new code. Only use `hmacSha256()` for existing attestation bundles that haven't been migrated yet.

**Q: What if I need to hash binary data?**
A: Convert to string or pass as-is. The `sha256()` function handles both via `JSON.stringify()` fallback.

## Questions?

Refer to `core/cosign-hash-provider.js` for the complete API and implementation details.
