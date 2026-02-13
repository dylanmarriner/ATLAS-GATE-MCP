# Atlas-Gate Hash System - SHA256 Implementation

## Hash Algorithm
All plan hashes use **SHA256** (64 hexadecimal character strings).

BLAKE3 is NOT used - it requires external dependency not in package.json.

## Hash Footer Format
Plans embed their own hash using format: `[SHA256_HASH: <64-char-hex>]`

## Hash Computation
The `computePlanHash()` function in `/core/plan-linter.js` strips:
1. HTML comment headers (`<!--...-->`)
2. `[SHA256_HASH: ...]` footers (with flexible whitespace)

Then computes SHA256 of remaining content.

### Code
```javascript
// Strip HTML comment and hash footer before computing hash
let stripped = planContent
    .replace(/<!--[\s\S]*?-->\s*/m, "")
    .replace(/\s*\[SHA256_HASH:\s*[^\]]*\]\s*$/m, "");

// Compute SHA256 hash
return crypto.createHash("sha256").update(canonicalized).digest("hex");
```

## Why Strip Footer?
This allows plans to embed their own hash without circular dependency:
- Plan includes `[SHA256_HASH: placeholder]`
- Linter computes hash of content (excluding footer)
- Linter inserts actual hash into footer
- Hash is now embedded and verifiable

## Hash Verification
WINDSURF verifies plan integrity by:
1. Reading plan file
2. Stripping HTML comment (lines 1-5)
3. Computing SHA256 of remaining content
4. Comparing computed hash to provided Plan Hash
5. If mismatch → STOP, plan not approved

## File Locations
- Implementation: `/core/plan-linter.js` lines 86-118
- Plans directory: `docs/plans/`
- Plan filename: `<SHA256_HASH>.md`

Example: `docs/plans/aeb41114559a6c480b2750d5c8df73806b5bcfc9627a66b3e9f67a0cd1ba4ff2.md`
