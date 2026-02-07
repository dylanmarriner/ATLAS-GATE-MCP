# Atlas-Gate Hash System Fix

## Problem
The `lint_plan` tool was not stripping the `[BLAKE3_HASH: ...]` footer before computing plan hashes, causing hash mismatches.

## Root Cause
In `/core/plan-linter.js`, the `computePlanHash()` function only stripped HTML comments (`<!-- -->`), but did not strip the `[BLAKE3_HASH: ...]` footer format documented in the templates.

## Solution Applied
Modified `computePlanHash()` to strip both:
1. HTML comments (`<!-- -->`)
2. `[BLAKE3_HASH: ...]` footers (with flexible whitespace handling)

### Changed File
- `/home/linnyux/Documents/ATLAS-GATE-MCP/core/plan-linter.js` (lines 86-115)

### Key Change
```javascript
// Before: Only stripped HTML comments
const stripped = planContent.replace(/<!--[\s\S]*?-->\s*/m, "");

// After: Strips both HTML comments and [BLAKE3_HASH: ...] footers
let stripped = planContent
    .replace(/<!--[\s\S]*?-->\s*/m, "")
    .replace(/\s*\[BLAKE3_HASH:\s*[^\]]*\]\s*$/m, "");
```

## Verification
Tested with the official template `docs/templates/antigravity_output_plan_example.md`:

1. Hash computed with `[BLAKE3_HASH: placeholder]` in file
2. Same hash computed without footer
3. Hash remains consistent when actual hash is injected

Result: ✓ All hash computations match

## Impact
- Plans can now embed their own hash using `[BLAKE3_HASH: ...]` format
- `lint_plan` correctly validates hash consistency
- No circular dependency in hash computation
- Fully compatible with template format

## Notes
- Uses SHA256 (not BLAKE3) - BLAKE3 requires external dependency not in package.json
- Hash footer can appear anywhere and with flexible whitespace
- Deterministic: same content always produces same hash
