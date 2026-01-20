# Bootstrap Tool Setup Fixes

## Summary

The bootstrap tool has been corrected to work properly in any repository without hardcoded paths or mock data. All changes follow the BOOTSTRAP_GOVERNANCE_SYSTEM_PLAN specification exactly.

## Issues Fixed

### 1. **Hardcoded Fallback Path in `core/governance.js`** ✅
**Problem:** The `verifyBootstrapAuth()` function had a hardcoded path:
```javascript
const fallbackPath = "/media/ubuntux/DEVELOPMENT/empire-ai/.kaiza/bootstrap_secret.json";
```

**Fix:** Changed to use workspace-relative path resolution:
```javascript
const repoRoot = getRepoRoot();
const fallbackPath = path.join(repoRoot, ".kaiza", "bootstrap_secret.json");
```

**Impact:** The bootstrap tool now works in ANY repository, not just the hardcoded path.

### 2. **Stub Detection in Plan Linter** ✅
**Problem:** The plan linter wasn't detecting stub code (TODO, FIXME, mock, placeholder, etc.) per BOOTSTRAP_GOVERNANCE_SYSTEM_PLAN section 6 ("Reject stubs, incomplete code").

**Fix:** Added comprehensive stub pattern detection:
- Added `STUB_PATTERNS` regex array detecting TODO, FIXME, XXX, HACK, stub, mock, placeholder, temp, TBD, WIP
- Added validation phase in `validateEnforceability()` that rejects plans containing any stub markers
- Error severity: **ERROR** (hard rejection, no plan override possible)

**Impact:** Plans cannot ship with incomplete code or test markers, enforcing production-ready code standard.

### 3. **Hardcoded Path in Verification Script** ✅
**Problem:** `tools/verification/verify-example-plan.js` had:
```javascript
const planPath = "/media/linnyux/development3/developing/KAIZA-MCP-server/docs/examples/EXAMPLE_VALID_PLAN.md";
```

**Fix:** Changed to workspace-relative path using `import.meta.url`:
```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const planPath = path.join(__dirname, "../../docs/examples/EXAMPLE_VALID_PLAN.md");
```

**Impact:** Verification script is now portable and works in any workspace.

## Verification

Bootstrap has been tested in multiple scenarios:

### Test 1: Fresh Repository Bootstrap ✅
- Created new workspace `/tmp/test-kaiza-bootstrap`
- Successfully bootstrapped with test plan
- Plan file created at `docs/plans/{hash}.md`
- Governance state written to `.kaiza/governance.json`
- Bootstrap flag set to `bootstrap_enabled: false`

### Test 2: Different Repository Bootstrap ✅
- Created separate workspace `/tmp/other-repo`
- Successfully bootstrapped with different secret
- Confirmed plan stored with correct hash
- Governance state independent from first repo

### Test 3: Bootstrap Disabled on Second Attempt ✅
- Attempted second bootstrap in same workspace
- Correctly rejected with `BOOTSTRAP_DISABLED` error
- First plan remains immutable

### Test 4: Stub Detection (TODO Rejection) ✅
- Tested plan containing "TODO:" in Scope & Constraints
- Correctly rejected by linter with error: `Stub/incomplete code detected`
- Plans with any stub markers (TODO, FIXME, mock, etc.) are hard-rejected

## Code Quality

All changes contain:
- ✅ **No mock data** - Only real working code
- ✅ **No hardcoded paths** - All paths workspace-relative via `getRepoRoot()`
- ✅ **No stubs** - Actual implementation, no TODOs or FIXMEs
- ✅ **Error handling** - Proper try/catch with meaningful errors
- ✅ **Logging** - Debug output for troubleshooting (`[BOOTSTRAP]` prefix)

## Files Modified

1. **`core/governance.js`**
   - Line 43-72: Fixed `verifyBootstrapAuth()` to use workspace-relative paths

2. **`core/plan-linter.js`**
   - Line 58-70: Added `STUB_PATTERNS` array
   - Line 248-264: Added stub detection validation phase

3. **`tools/verification/verify-example-plan.js`**
   - Line 1-13: Fixed imports and added dynamic path resolution

## Deployment

The bootstrap system is now ready for:
- ✅ Calling from external repositories
- ✅ Different secret management strategies (env var or file-based)
- ✅ Guaranteeing production-ready plans (no stubs allowed)
- ✅ Atomic governance state creation
- ✅ One-time bootstrap enforcement

## Authority

These changes implement **BOOTSTRAP_GOVERNANCE_SYSTEM_PLAN** sections:
- Section 5: Bootstrap Creation Path (pre-conditions, validation)
- Section 6: Plan Validation (linting requirements)
- Section 9: Failure & Recovery Scenarios

All code follows the plan specification verbatim with zero deviation.
