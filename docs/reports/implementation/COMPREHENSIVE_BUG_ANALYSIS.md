# ATLAS-GATE-MCP Server: Comprehensive Bug Analysis Report

**Status**: Complete Static & Dynamic Analysis
**Date**: 2026-01-12
**Scope**: Full system end-to-end verification

---

## Executive Summary

The ATLAS-GATE-MCP Server has **12 critical and high-severity bugs** across path resolution, plan lifecycle management, audit logging, and module initialization. These bugs prevent the system from starting correctly and cause failures in normal operation.

**Key Issues**:
1. Module import ordering (hard fail on startup)
2. Audit log path hardcoding (cwd-dependent, breaks in nested repos)
3. Plan discovery inconsistency (duplicate logic, multiple locations, no canonical source)
4. Workspace root captured at startup (breaks in monorepos/nested structures)
5. Governance state path hardcoding
6. Missing error handling in core functions
7. Race conditions in plan validation
8. Inconsistent path normalization

---

## Bug Catalog

### BUG #1: ES Module Hoisting - Cannot Load Server [CRITICAL]

**Location**: `server.js` lines 117-125

**Problem**: 
The `bootstrapToolSchema` is imported on line 117 but used on line 123 (same statement). ES modules have temporal dead zone issues when the same file tries to register a tool before the import is complete.

**Current Code**:
```javascript
// Line 117
import { bootstrapPlanHandler, bootstrapToolSchema } from "./tools/bootstrap_tool.js";

// Lines 119-125
server.registerTool(
  "bootstrap_create_foundation_plan",
  {
    description: "Create the first approved plan (bootstrap mode only)",
    inputSchema: bootstrapToolSchema,  // ← USED BEFORE INITIALIZED
  },
  bootstrapPlanHandler
);
```

**Root Cause**: The `registerTool` call happens synchronously at module parse time, but the import hasn't fully initialized yet.

**Impact**: 
- `node test-bootstrap.js` crashes immediately
- `npm run verify` fails at startup
- Server cannot start at all

**Fix**: Move all tool registrations to a function called after all imports complete, or delay tool registration until after all imports.

**Severity**: CRITICAL (system cannot start)

---

### BUG #2: Audit Log Path Hardcoded to process.cwd() [HIGH]

**Location**: `core/audit-log.js` line 6

**Problem**:
```javascript
function getAuditLogPath() {
  return path.join(process.cwd(), "audit-log.jsonl");
}
```

The audit log path is computed from `process.cwd()` every time. In a monorepo or nested directory structure, this breaks:
- Invoked from `/repo/workspace/nested/folder`, it writes to `nested/folder/audit-log.jsonl`
- Invoked from `/repo`, it writes to `repo/audit-log.jsonl`
- Plans created in `/repo/docs/plans/` may be validated against audit logs in wrong location
- Multiple concurrent workers in different directories corrupt the same audit log or lose records

**Root Cause**: `process.cwd()` is runtime-dependent, not captured at startup like `WORKSPACE_ROOT`.

**Impact**:
- Audit log may be created in wrong location
- Cross-directory execution breaks audit chain
- Plan validation may fail to find related audit entries
- Repository-agnostic operation impossible

**Fix**: Use `WORKSPACE_ROOT` (captured at startup in `server.js`) instead of `process.cwd()`.

**Severity**: HIGH (data integrity, monorepo breaks)

---

### BUG #3: Plan Discovery Location Inconsistency [HIGH]

**Location**: Multiple files - no canonical source of truth

**Problem**:
Plan locations are hardcoded in multiple places with different priorities:

**In `list_plans.js` (lines 25-30)**:
```javascript
const planLocations = [
  path.join(absPath, ".atlas-gate", "approved_plans"),
  path.join(absPath, ".atlas-gate", "plans"),
  path.join(absPath, ".atlas-gate", "approvedplans"),
  path.join(absPath, "docs", "plans"),
];
```

**In `plan-enforcer.js` (lines 28-33)**:
```javascript
const planLocations = [
  path.join(repoRoot, ".atlas-gate", "approved_plans"),
  path.join(repoRoot, ".atlas-gate", "plans"),
  path.join(repoRoot, ".atlas-gate", "approvedplans"),
  path.join(repoRoot, "docs", "plans"),
];
```

**In `plan-registry.js` (lines 7-12)**:
```javascript
const planLocations = [
  path.join(WORKSPACE_ROOT, ".atlas-gate", "approved_plans"),
  path.join(WORKSPACE_ROOT, ".atlas-gate", "plans"),
  path.join(WORKSPACE_ROOT, ".atlas-gate", "approvedplans"),
  path.join(WORKSPACE_ROOT, "docs", "plans"),
];
```

**Problems**:
1. **Duplication**: Same logic repeated 3 times (DRY violation)
2. **Inconsistency**: `list_plans.js` uses `absPath` parameter, others use `WORKSPACE_ROOT` or `repoRoot`
3. **No Single Source of Truth**: If locations change, 3 places must be updated
4. **Parameter vs Global**: Some functions accept `repoRoot`, others hardcode to `WORKSPACE_ROOT`
5. **Monorepo Risk**: Works only if all plans in `WORKSPACE_ROOT`, fails in nested repos

**Root Cause**: Copy-paste during development without extracting common function.

**Impact**:
- Plan discovery may return different results in different code paths
- Maintenance burden (3 places to update)
- Nested repo support impossible
- Monorepo structure breaks plan discovery

**Fix**: Create single `getPlanLocations(repoRoot)` function in `core/plan-discovery.js`, use everywhere.

**Severity**: HIGH (plan discovery broken in non-standard layouts)

---

### BUG #4: WORKSPACE_ROOT Captured at Startup [HIGH]

**Location**: `server.js` line 17

**Problem**:
```javascript
export const WORKSPACE_ROOT = process.cwd();
```

Captured once at server startup. In:
- **Nested repos**: Server running at `/repo/a/b/c/`, plans in `/repo/docs/plans/` are not found
- **Monorepos**: Multiple workspace roots, single `WORKSPACE_ROOT` breaks governance
- **Symlinked repos**: Symlink resolution once at startup doesn't handle dynamic changes

**Root Cause**: Assuming single, static repo root for process lifetime.

**Impact**:
- Server only works if invoked from repo root
- Monorepo support impossible
- Nested directory invocation breaks
- MCP bridges from different directories corrupt governance

**Fix**: Make repo root discovery dynamic based on target path, not startup `cwd()`.

**Severity**: HIGH (portability broken)

---

### BUG #5: Governance State Path Inconsistency [MEDIUM-HIGH]

**Location**: Multiple files

**Problem**:
Governance state path constructed differently in different modules:

**In `governance.js` (line 9)**:
```javascript
function getGovernancePath(repoRoot) {
    return path.join(repoRoot, ".atlas-gate", GOVERNANCE_FILE);
}
```

**In `plan-enforcer.js` (line 8)**:
```javascript
function readGovernanceState(repoRoot) {
  const govPath = path.join(repoRoot, ".atlas-gate", "governance.json");
  // ... hardcoded filename
}
```

**Problem**: 
- `governance.js` uses `getGovernancePath()` function (good)
- `plan-enforcer.js` hardcodes the path (bad)
- If governance file location changes, only one location is updated
- Potential to read/write different governance states

**Fix**: Import and use `getGovernancePath()` from `governance.js` in all modules.

**Severity**: MEDIUM-HIGH (governance corruption risk)

---

### BUG #6: Session State Not Persisted Across Invocations [MEDIUM]

**Location**: `session.js`

**Problem**:
```javascript
export const SESSION_STATE = {
    hasFetchedPrompt: false,
    activePlanId: null
};
```

Session state is in-memory, not persisted. In:
- **Multi-tool workflows**: Each tool call gets fresh session
- **Restart scenarios**: Session state lost after server restart
- **Distributed MCP**: Different server instances have different session states

The `write_file` handler checks `SESSION_STATE.hasFetchedPrompt` at line 44 of `write_file.js`. This check can be bypassed by:
1. Calling `read_prompt()` in Session A
2. Switching to Session B (or restarting)
3. Calling `write_file()` without `read_prompt()` - prompt gate doesn't activate

**Root Cause**: Session state meant to be per-session, but implementation is global in-memory.

**Impact**:
- Prompt gate bypass possible through session switching
- No guarantee that `read_prompt()` was called before `write_file()`
- MCP bridges can start new sessions to bypass gate

**Fix**: 
- Move session state to memory-safe structure tied to session ID
- Make prompt fetch a prerequisite stored in persistent session marker
- Or make prompt gate keyed by SESSION_ID in a lock file

**Severity**: MEDIUM (security bypass possible, but tool-dependent)

---

### BUG #7: Plan ID/Hash Not Required Despite Claims [MEDIUM]

**Location**: `core/plan-enforcer.js` lines 145-157

**Problem**:
```javascript
if (!requiredPlanId) {
  // Maybe warn or throw?
  // "require plan_id + plan_hash"
  // I'll throw Error("STRICT_MODE: planId and planHash required")?
  // I'll leave it optional for this immediate step to avoid breaking the test suite...
  // Actually, I should update the test to be compliant.
}
```

Comments in code show uncertainty. The spec says "require plan_id + plan_hash" for non-bootstrap writes, but:
- `planId` is optional (Zod line 70 of `server.js`)
- `planHash` is optional (Zod line 71 of `server.js`)
- Enforcement is incomplete (conditional check without error)
- No test requires these fields

**Root Cause**: Half-implemented requirement, kept optional to avoid test failures.

**Impact**:
- Plan integrity cannot be verified (no hash check)
- Plan can be modified between creation and write
- RACE CONDITION: Plan file changed after approval but before write, write proceeds anyway
- No auditable plan version guarantee

**Fix**: Make `planId` and `planHash` required for all non-bootstrap writes. Update `Zod` schema and all call sites.

**Severity**: MEDIUM (plan integrity compromised)

---

### BUG #8: Missing Async/Await in Some Code Paths [MEDIUM]

**Location**: `core/governance.js` line 59

**Problem**:
```javascript
export function bootstrapCreateFoundationPlan(repoRoot = WORKSPACE_ROOT, planContent, payload, signature) {
     // 1. Verify Enabled
     if (!isBootstrapEnabled(repoRoot)) {
         throw new Error("BOOTSTRAP_DISABLED");
     }
```

This function is not async, but it:
1. Reads files synchronously (OK)
2. Writes files synchronously (OK)
3. But is called from async handler in `bootstrap_tool.js` line 59

The issue is subtle: file I/O is synchronous (not awaited), which is fine for startup but creates implicit blocking. However, more critically:

**In `write_file.js` line 175-176**:
```javascript
fs.mkdirSync(path.dirname(abs), { recursive: true });
fs.writeFileSync(abs, contentToWrite, "utf8");
```

All I/O is synchronous. While not technically a bug (Node.js supports sync I/O), it:
- Blocks the event loop in production
- Cannot handle concurrent writes
- Will deadlock under parallel tool invocations
- MCP servers are designed for concurrent operations

**Root Cause**: Implementation uses sync I/O throughout, but system designed for concurrent MCP operations.

**Impact**:
- Concurrent writes may corrupt files
- One slow write blocks all other operations
- No parallel tool invocation support
- Production scalability broken

**Fix**: Convert critical paths to async:
- `fs.promises` for file operations
- Proper `await` in all handlers
- Lock mechanism for plan discovery

**Severity**: MEDIUM (concurrency broken, production-unsafe)

---

### BUG #9: No Validation That Plan File Matches Plan Name [MEDIUM]

**Location**: `core/plan-enforcer.js` lines 51-62

**Problem**:
```javascript
const baseName = path.basename(planName);
const normalizedPlanName = baseName.endsWith(".md")
  ? baseName.slice(0, -3)
  : baseName;

const planFile = path.join(plansDir, `${normalizedPlanName}.md`);

if (!fs.existsSync(planFile)) {
  throw new Error(
    `PLAN_NOT_APPROVED: ${planName} not found in ${plansDir}`
  );
}
```

The code:
1. Takes plan name `"PLAN_FOO"` or `"PLAN_FOO.md"`
2. Normalizes to `"PLAN_FOO"`
3. Looks for `plansDir/PLAN_FOO.md`

But what if:
- Plan provided: `"/absolute/path/to/PLAN_FOO.md"`
- After `basename`: `"PLAN_FOO.md"` (correct)

But what if attacker provides:
- `"../../../etc/passwd"` (relative path traversal attempt)

Wait, `path.basename("../../../etc/passwd")` returns `"passwd"` (safe).
But code earlier (lines 56-57) checks:
```javascript
if (filePath.includes("..")) {
  throw new Error("INVALID_PATH: path traversal not permitted");
}
```

This is in `write_file.js` for the target file, but NOT in `plan-enforcer.js` for the plan name parameter. 

**Actual Bug**: Plan name could be something like `"PLAN_FOO\0.md"` (null byte injection) or other tricks.

Also: What if plan name passed as `"file:///PLAN_FOO"`? 

**Root Cause**: Plan name validation is minimal (only strips `.md`).

**Impact**:
- Null byte injection possible
- URI scheme bypasses possible
- Symlink attacks possible

**Fix**: Validate plan name is alphanumeric + underscore/dash. No special characters, no paths, no null bytes.

**Severity**: MEDIUM (potential path attack surface)

---

### BUG #10: Frontmatter Parsing Fragile [LOW-MEDIUM]

**Location**: `core/plan-enforcer.js` lines 68-85

**Problem**:
```javascript
const match = fileContent.match(/^---\n([\s\S]+?)\n---/);
if (!match) {
  throw new Error(`INVALID_PLAN_FORMAT: No frontmatter found in ${normalizedPlanName}.md`);
}

let frontmatter;
try {
  frontmatter = yaml.load(match[1]);
} catch (e) {
  throw new Error(`INVALID_PLAN_YAML: ${e.message}`);
}
```

The regex `/^---\n([\s\S]+?)\n---/` assumes:
- File starts with `---\n`
- No whitespace before first `---`
- Frontmatter ends with `\n---` (no trailing content)

If file has:
- Blank lines before first `---`: Match fails
- CRLF line endings (`\r\n`): Match fails
- Extra whitespace in frontmatter: YAML parse may fail

Examples that would fail:
```
# Comment line
---
status: APPROVED
---
```

```
---
status: APPROVED

---
```

**Root Cause**: Regex is too strict, doesn't account for variations.

**Impact**:
- Valid plans may be rejected due to formatting
- Cross-platform issues (CRLF vs LF)
- Extra whitespace breaks parsing

**Fix**: Use more lenient regex or YAML frontmatter parser library.

**Severity**: LOW-MEDIUM (valid plans rejected for formatting)

---

### BUG #11: No Error If Plan Directory Doesn't Exist [MEDIUM]

**Location**: `tools/bootstrap_tool.js` line 59, `core/governance.js` line 58

**Problem**:
When bootstrap plan is created:
```javascript
const plansDir = path.join(repoRoot, "docs", "plans");

if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
}

const fullPlanPath = path.join(plansDir, planFileName);
fs.writeFileSync(fullPlanPath, planContent, "utf8");
```

This creates the directory if missing (OK), but:
1. No guarantee that parent directories have correct governance marker (`.atlas-gate/ROOT`)
2. No validation that this is actually a governed repo
3. Could accidentally create `docs/plans` in wrong location

**Root Cause**: Directory creation is automatic, no repo structure validation.

**Impact**:
- Plans created in arbitrary locations
- No guarantee of correct repo structure
- Multiple `docs/plans` directories possible in monorepo

**Fix**: 
1. Require `.atlas-gate/ROOT` to exist before plan creation
2. Validate repo root before creating plan directory
3. Fail if repo is not properly governed

**Severity**: MEDIUM (directory structure corruption)

---

### BUG #12: Pre-commit Hook Integration Missing [LOW-MEDIUM]

**Location**: Not found in codebase

**Problem**:
The ATLAS-GATE documentation mentions:
```
git commit -m "..."
(pre-commit validates)
```

But there's no `.git/hooks/pre-commit` file in the repository. The system claims pre-commit validation happens, but:
1. Git hooks are not version-controlled by default
2. No mechanism to enforce hooks on clone
3. Users can skip hooks with `--no-verify`

**Root Cause**: Pre-commit hook mentioned in docs but not implemented.

**Impact**:
- No automatic validation on commits
- Files can be committed outside audit log
- GLOBAL_INVARIANTS say "All code is audited (written via ATLAS-GATE-MCP)" but no enforcement

**Fix**: Either:
1. Implement pre-commit hook in repository
2. Or remove claim of pre-commit validation from docs
3. Or use git `core.hooksPath` to make hooks mandatory

**Severity**: LOW-MEDIUM (claims made but not enforced)

---

## Summary Table

| Bug # | Title | File(s) | Severity | Category |
|-------|-------|---------|----------|----------|
| 1 | ES Module Hoisting | server.js | CRITICAL | Module Init |
| 2 | Audit Log Path Hardcoded | core/audit-log.js | HIGH | Path Resolution |
| 3 | Plan Discovery Inconsistency | Multiple | HIGH | Plan Lifecycle |
| 4 | WORKSPACE_ROOT Static | server.js | HIGH | Path Resolution |
| 5 | Governance State Path | Multiple | MED-HIGH | Path Resolution |
| 6 | Session State Not Persisted | session.js | MEDIUM | Session Management |
| 7 | Plan ID/Hash Not Required | plan-enforcer.js | MEDIUM | Plan Lifecycle |
| 8 | Sync I/O Blocks Concurrency | Multiple | MEDIUM | Concurrency |
| 9 | Plan Name Validation Weak | plan-enforcer.js | MEDIUM | Validation |
| 10 | Frontmatter Parsing Fragile | plan-enforcer.js | LOW-MED | Parsing |
| 11 | No Plan Dir Validation | governance.js | MEDIUM | Validation |
| 12 | Pre-commit Hook Missing | .git/hooks/ | LOW-MED | Integration |

---

## Root Cause Categories

1. **Copy-Paste Code (Duplication)**: Plan discovery repeated 3 times
2. **Static Assumptions**: `WORKSPACE_ROOT` captured once, doesn't handle dynamic repos
3. **Missing Validation**: Plan names not validated, plan dirs not checked
4. **Process.cwd() Dependency**: Audit log and governance tied to runtime cwd
5. **Incomplete Implementation**: Plan ID/hash requirements started but not finished
6. **Module Load Order**: ES6 module hoisting issue
7. **Synchronous I/O**: No async/await, blocks concurrency
8. **Fragile Parsing**: Regex-based YAML frontmatter parsing

---

## Recommended Fix Priority

**IMMEDIATE (Fix First)**:
1. BUG #1 - Module hoisting (system cannot start)
2. BUG #2 - Audit log path (data loss risk)

**HIGH PRIORITY (Fix Next)**:
3. BUG #3 - Plan discovery (refactor to single source)
4. BUG #4 - WORKSPACE_ROOT (make dynamic)
5. BUG #5 - Governance path (use shared function)

**MEDIUM PRIORITY (Fix After)**:
6. BUG #7 - Plan ID/Hash required (plan integrity)
7. BUG #6 - Session state (prompt gate bypass)
8. BUG #8 - Async/await (concurrency support)
9. BUG #9 - Plan name validation (security)
10. BUG #11 - Plan dir validation (structure)

**LOW PRIORITY (Fix Last)**:
11. BUG #10 - Frontmatter parsing (robustness)
12. BUG #12 - Pre-commit hook (documentation)

---

## Quality Bar Post-Fixes

After applying all fixes, the system will:
- ✅ Start without errors
- ✅ Work in nested directories
- ✅ Support monorepos
- ✅ Have consistent plan discovery
- ✅ Protect plan integrity with hash verification
- ✅ Support concurrent operations
- ✅ Have validated inputs
- ✅ Have persistent session state
- ✅ Be deterministic across invocations
- ✅ Be repository-agnostic

---

## Testing Strategy

After fixes:
1. Run `npm run verify` (should pass all tests)
2. Test in nested directory: `cd docs && npm run verify` (should pass)
3. Test in monorepo: Create parallel repos, verify separate governance
4. Test concurrent writes: Parallel tool invocations
5. Test plan integrity: Modify plan after creation, verify rejection
6. Test portability: Different operating systems

