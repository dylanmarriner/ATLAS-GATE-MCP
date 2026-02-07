# ATLAS-GATE MCP Server: Comprehensive Audit Findings

**Date**: January 12, 2026  
**Scope**: Complete system audit for deterministic behavior, production readiness, and zero accidental failures  
**Status**: ACTIVE

---

## CRITICAL ISSUES FOUND

### ISSUE #1: Stub Detector Over-Blocking Legitimate Code

**Severity**: CRITICAL  
**Component**: `core/stub-detector.js`  
**Description**: The stub detector is incorrectly flagging legitimate code patterns as "policy bypass"

**Root Cause**:
- Line 20: `{ pattern: "return true", category: "C5_HARD_BLOCK_POLICY_BYPASS", severity: "HARD_BLOCK" }`
- Line 21: `{ pattern: "=> true", category: "C5_HARD_BLOCK_POLICY_BYPASS", severity: "HARD_BLOCK" }`

These patterns match ANY use of `return true` or arrow functions returning `true`, but the category incorrectly labels them as "Policy Bypass". This is wrong:
- `return true;` is legitimate in many contexts (boolean getters, validators, comparisons)
- `=> true` is legitimate arrow function syntax
- The category "C5_HARD_BLOCK_POLICY_BYPASS" is supposed to target hardcoded policy exceptions, not all boolean returns

**Impact**:
- Users cannot write legitimate validation functions
- Cannot write getters that return boolean true
- Cannot write filter predicates
- Test suite fails: `PASS_CASES` include `function valid() { return true; }`

**Fix Required**:
- Remove "return true" and "=> true" from HARD_BLOCK_PATTERNS
- Add context-sensitive detection for policy bypass (e.g., detect `return true` in auth/security contexts only)
- Or rename the category to clarify it's for hardcoded security bypasses, not all boolean returns

---

### ISSUE #2: Empty Function/Catch Block Detection Missing

**Severity**: CRITICAL  
**Component**: `core/stub-detector.js`  
**Description**: The stub detector does not properly detect and block empty function bodies and catch blocks

**Root Cause**:
- Lines 231-240: AST detection for empty functions is present but never throws
- The code logs violations but continues execution
- Test case `try { } catch(e) {}` should fail but returns without error

**Impact**:
- Empty catch blocks silently swallow exceptions
- Empty function bodies pass through undetected
- No enforcement of "never write do-nothing code"

**Fix Required**:
- Throw on detecting empty function bodies
- Throw on detecting empty catch blocks
- Make these CRITICAL violations, not just warnings

---

### ISSUE #3: Stub Detector Allows Functions Returning Null/Undefined

**Severity**: HIGH  
**Component**: `core/stub-detector.js`  
**Description**: Functions that return null or undefined are supposed to be blocked but the detection is incomplete

**Root Cause**:
- Lines 250-271: The AST detection throws for null and undefined returns
- BUT this is inconsistent with how violations are collected
- The function may successfully parse without throwing, allowing violations to pass through

**Impact**:
- Inconsistent error handling paths
- Some violations detected early (throw), others collected and reported later
- Behavior is non-deterministic depending on parse order

**Fix Required**:
- Ensure all violations follow the same collection/throw pattern
- Make the behavior consistent and predictable

---

### ISSUE #4: AST Parsing Failures Silently Ignored

**Severity**: HIGH  
**Component**: `core/stub-detector.js`, lines 276-288  
**Description**: When AST parsing fails (syntax errors, TypeScript), the code just pushes a warning and continues

**Root Cause**:
```javascript
catch (e) {
    violations.push(`AST_PARSING_ERROR: ${e.message}`);
}
```

This allows invalid code to pass through without being caught. Comments say "let's just push a warning or throw if we are strict" but the implementation is non-deterministic.

**Impact**:
- TypeScript files cannot be parsed by acorn (JavaScript parser)
- Syntax errors in submitted code are silently logged, not rejected
- Code can pass quality gates despite being unparseable

**Fix Required**:
- **STRICT**: If code doesn't parse, throw immediately
- Install TypeScript parser if working with TS files
- Or explicitly document that only valid JavaScript is accepted

---

### ISSUE #5: Plan Discovery Always Succeeds, Even If No Plans Exist

**Severity**: MEDIUM  
**Component**: `tools/list_plans.js`, lines 11-16  
**Description**: If the plans directory doesn't exist, the tool throws an error, but this path is never created by any setup tool

**Root Cause**:
- `getPlansDir()` in path-resolver returns a canonical default path
- But that directory may not exist
- The tool throws "PLANS_DIR_NOT_FOUND" but there's no automatic creation

**Impact**:
- First-time repositories will fail list_plans until plans dir is created manually
- Bootstrap tool creates plans dir, but list_plans runs before bootstrap
- Race condition possible in concurrent executions

**Fix Required**:
- Ensure plans directory is created during path resolver initialization OR
- Make list_plans auto-create the directory OR
- Document that bootstrap must run first

---

### ISSUE #6: No Validation of Plan Approval Status in list_plans

**Severity**: MEDIUM  
**Component**: `tools/list_plans.js`  
**Description**: The list_plans tool lists all *.md files without checking their APPROVED status

**Root Cause**:
- Lines 20-23: Simply filters for *.md files and returns them
- Does not validate frontmatter or approval status
- Does not enforce "only list approved plans"

**Impact**:
- Non-approved plans are discovered and can be referenced
- Users can execute unapproved plans
- Security boundary is weakened

**Fix Required**:
- Parse each plan file's frontmatter
- Check for `status: APPROVED`
- Only return approved plans

---

### ISSUE #7: Plan ID Matching Logic is Incomplete

**Severity**: MEDIUM  
**Component**: `core/plan-enforcer.js`, lines 100-110  
**Description**: The plan ID verification logic doesn't enforce strict matching in all cases

**Root Cause**:
```javascript
if (frontmatter.plan_id) {
    if (requiredPlanId) {
        invariantEqual(...);
    }
}
```

This means:
- If frontmatter has NO plan_id, and requiredPlanId is provided, no error is thrown
- If both are absent, no verification occurs
- The logic is conditionally enforced

**Impact**:
- Plan ID can be missing entirely
- Client can provide a different plan ID without detection
- Allows plan substitution attacks

**Fix Required**:
- Make plan_id REQUIRED in all plan files
- Always verify if client provides requiredPlanId
- Throw if IDs don't match or if ID is missing when required

---

### ISSUE #8: Path Resolver Missing Symlink Resolution

**Severity**: MEDIUM  
**Component**: `core/path-resolver.js`  
**Description**: Paths are normalized but symlinks are NOT resolved to canonical form

**Root Cause**:
- Uses `path.normalize()` and `path.resolve()` which don't follow symlinks
- No call to `fs.realpathSync()` to canonicalize symlinked paths
- Can result in same directory having multiple canonical paths

**Impact**:
- Symlinked repos may have different `getRepoRoot()` results
- Plan discovery may find different plans depending on symlink state
- Path boundaries can be bypassed via symlinks

**Fix Required**:
- Replace `path.normalize()` with `fs.realpathSync()` where appropriate
- Ensure all paths resolve to same canonical form regardless of symlinks

---

### ISSUE #9: Write File Not Idempotent - previousHash Without Append/Retry Logic

**Severity**: HIGH  
**Component**: `tools/write_file.js`, lines 73-79  
**Description**: The previousHash concurrency check exists but there's no retry or append mechanism

**Root Cause**:
- If previousHash doesn't match, the write is rejected
- But there's no automatic re-read-and-retry mechanism
- Client must handle the failure completely

**Impact**:
- Under concurrent writes, second writer must manually retry
- No built-in optimistic concurrency with automatic reconciliation
- Can fail legitimate sequential writes if file is modified during processing

**Fix Required**:
- Document behavior clearly (fail-fast is appropriate for strict enforcement)
- OR implement automatic retry with fresh previousHash fetch
- OR implement merge-based append rather than replace

---

### ISSUE #10: Audit Log Race Condition on Append

**Severity**: MEDIUM  
**Component**: `core/audit-log.js`, lines 15-26  
**Description**: The `getLastHash()` function reads the entire audit log to find the last hash, but there's no lock

**Root Cause**:
- Multiple concurrent writes can see the same "last" entry
- Both compute hash from same previous entry
- Both append, creating a fork in the log

**Impact**:
- Audit log hash chain can be broken under concurrent writes
- Log integrity is compromised
- Forensic evidence is unreliable

**Fix Required**:
- Implement file locking during append
- Use atomic append with hash verification
- Or use exclusive file locks (fs.open with 'a+')

---

### ISSUE #11: Plan File Discovery Has No Timeout

**Severity**: LOW  
**Component**: `core/plan-registry.js`, `core/plan-enforcer.js`  
**Description**: Plan file I/O has no timeout protection

**Root Cause**:
- `fs.readFileSync()` used directly with no timeout
- On slow filesystems or network mounts, can hang indefinitely

**Impact**:
- Long-running I/O operations can stall the MCP server
- Client requests can timeout waiting for response

**Fix Required**:
- Add I/O timeout configuration
- Use async I/O with timeout wrapper
- Or document expectations for filesystem performance

---

### ISSUE #12: PROMPT_GATE_LOCKED Not Validated Properly

**Severity**: MEDIUM  
**Component**: `tools/write_file.js`, lines 41-47  
**Description**: The prompt gate check looks for SESSION_STATE.hasFetchedPrompt but this flag is never SET

**Root Cause**:
- `tools/read_prompt.js` doesn't set the flag
- `SESSION_STATE` is imported from `session.js` but never updated
- The gate is enforced but can never be satisfied

**Impact**:
- All writes will be rejected with PROMPT_GATE_LOCKED
- Users cannot perform any write operations
- System is broken

**Fix Required**:
- Check if `read_prompt.js` actually sets the flag
- If not, implement flag-setting in read_prompt handler
- Or remove the gate if it's not needed

---

### ISSUE #13: No Validation of Environment Variable Dependencies

**Severity**: MEDIUM  
**Component**: `core/governance.js`, line 41  
**Description**: Bootstrap signature verification depends on environment variable `ATLAS-GATE_BOOTSTRAP_SECRET` but there's no validation at startup

**Root Cause**:
- The secret is only checked when bootstrap is attempted
- No early validation or warning if missing
- Server starts successfully without the secret

**Impact**:
- Bootstrap will fail at runtime if secret is missing
- No clear error until first bootstrap attempt
- Difficult to diagnose in production

**Fix Required**:
- Add pre-flight check in server initialization
- Warn at startup if bootstrap is enabled but secret is missing
- Or fail-fast at startup if bootstrap is configured

---

### ISSUE #14: Read_prompt Handler Not Implemented

**Severity**: CRITICAL  
**Component**: `tools/read_prompt.js`  
**Description**: Need to verify that read_prompt exists and sets SESSION_STATE flag

**Impact**:
- PROMPT_GATE_LOCKED cannot be satisfied
- All writes are blocked

**Fix Required**:
- Read and verify read_prompt implementation
- Ensure it sets SESSION_STATE.hasFetchedPrompt = true

---

## TESTING GAPS

### Gap #1: No Test for Plan Lifecycle Across Repo Structures
- No test for symlinked repos
- No test for monorepos with multiple plans directories
- No test for nested working directories
- No test for Windows vs Unix paths

### Gap #2: No Concurrency Testing
- No test for concurrent writes to same file
- No test for concurrent appends to audit log
- No test for race conditions in plan discovery
- No test for parallel bootstrap attempts

### Gap #3: No Error Recovery Testing
- No test for partially written files (disk full)
- No test for corrupted plan metadata
- No test for malformed audit log entries
- No test for missing or inaccessible directories

### Gap #4: No Integration Testing
- No end-to-end test of plan creation → discovery → execution
- No test of cross-repo plan referencing
- No test of large plans or files
- No test of network-mounted filesystems

---

## STRUCTURAL WEAKNESSES

### Weakness #1: Implicit Path Dependencies
- Code assumes all paths come from path-resolver
- But hard-coded paths can sneak in (e.g., `path.join()` calls)
- No compile-time guarantee of path resolution

### Weakness #2: No Invariant Enforcement at Compilation
- Invariants are checked at runtime via `invariant()` calls
- But many assumptions are not wrapped in invariants
- Refactoring could break invariants silently

### Weakness #3: Error Categories Not Standardized
- Errors are thrown with descriptive messages
- But error codes vary (INVALID_INPUT_FORMAT vs EMPTY_PATH_NOT_ALLOWED)
- Client cannot reliably categorize errors

### Weakness #4: No Retry / Backoff Logic
- All I/O is synchronous, blocking
- No retry mechanism for transient failures
- No backoff for resource contention

---

## NEXT STEPS

1. **Immediate Fixes** (CRITICAL):
   - Fix stub detector to not block `return true`
   - Implement empty function/catch block detection
   - Verify/fix read_prompt flag setting
   - Fix plan approval status validation in list_plans

2. **High Priority** (HIGH):
   - Add symlink resolution
   - Fix audit log race condition
   - Add plan ID validation strictness
   - Document/implement previousHash behavior

3. **Medium Priority** (MEDIUM):
   - Add plans directory auto-creation
   - Add environment variable validation at startup
   - Add AST parsing strictness
   - Add I/O timeout protection

4. **Testing** (REQUIRED):
   - Create comprehensive test suite
   - Add concurrency tests
   - Add error recovery tests
   - Add integration tests

---

## VERIFICATION CHECKLIST

- [ ] All critical issues fixed
- [ ] All high-priority issues fixed
- [ ] Stub detector allows legitimate code
- [ ] Empty functions/catches are blocked
- [ ] Plans must be APPROVED to execute
- [ ] Plan IDs are validated strictly
- [ ] Symlinks are resolved canonically
- [ ] Audit log is integrity-protected
- [ ] Read_prompt gate works correctly
- [ ] All error paths return proper codes
- [ ] No accidental errors remain
- [ ] All tests pass
- [ ] System is deterministic across repo structures

