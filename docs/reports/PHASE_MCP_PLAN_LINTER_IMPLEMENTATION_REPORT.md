# Phase: MCP Plan Linter Implementation Report

**Status**: COMPLETE  
**Date**: 2026-01-19  
**Implementation Phase**: FOUNDATION  
**Validation**: ALL TESTS PASSING (14/14)

---

## Deliverables

### 1. Files Created
- `core/plan-linter.js` - Plan linter core module
- `test-plan-linter.js` - Test suite (14 comprehensive tests)
- `docs/reports/MCP_PLAN_LINTER_SPEC.md` - Specification documentation
- `docs/reports/PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md` - This report

### 2. Files Modified (Queued for Next Phase)
- `tools/bootstrap_tool.js` - Will integrate linter into plan proposal
- `core/governance.js` - Will integrate linter into plan approval
- `tools/write_file.js` - Will integrate linter into plan execution
- `server.js` - Will add `lint_plan` read-only tool

---

## Lint Rules Enforced

### Structure Validation
- ✓ `PLAN_SCOPE_LAW` - Mandatory 7 sections in order
- ✓ `PLAN_SCOPE_LAW` - All phase fields required
- ✓ `PLAN_SCOPE_LAW` - Phase IDs unique and valid format

### Enforceability
- ✓ `MECHANICAL_LAW_ONLY` - Detects ambiguous language (may, should, if possible, etc.)
- ✓ `MECHANICAL_LAW_ONLY` - Rejects human judgment clauses
- ✓ `MECHANICAL_LAW_ONLY` - Requires binary (MUST/MUST NOT) language

### Path Validation
- ✓ `PLAN_SCOPE_LAW` - Detects parent directory escape (`..`)
- ✓ `PLAN_SCOPE_LAW` - Rejects absolute paths
- ✓ `PLAN_SCOPE_LAW` - Detects unresolved variables

### Auditability
- ✓ `PUBLIC_LAW_READABLE` - Rejects code symbols in objectives
- ✓ `PUBLIC_LAW_READABLE` - Detects undefined jargon

### Hash Binding
- ✓ `PLAN_IMMUTABILITY` - Deterministic SHA256 hash computation
- ✓ `PLAN_IMMUTABILITY` - Hash mismatch detection on validation

---

## Tests Added

```
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
```

**Result**: 14/14 passed

---

## Commands Execution & Verification

### Test Run
```bash
$ node test-plan-linter.js
[TEST] Running 14 plan linter tests...

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

**Status**: PASS ✓

---

## API Reference

### Core Functions

#### `computePlanHash(planContent: string) → string`
- **Purpose**: Deterministically compute SHA256 hash of plan
- **Returns**: 64-character hex string
- **Idempotent**: Yes (same input → same hash)

#### `lintPlan(planContent: string, expectedHash?: string) → LintResult`
- **Purpose**: Validate plan structure, enforceability, auditability
- **Returns**:
  ```javascript
  {
    passed: boolean,
    hash: string,
    errors: ViolationObject[],
    warnings: ViolationObject[],
    violations: ViolationObject[]
  }
  ```
- **Invariant**: All errors must be fixed for approval

### Violation Structure
```javascript
{
  code: string,              // e.g., "PLAN_MISSING_SECTION"
  message: string,           // Human-readable description
  severity: "ERROR" | "WARNING",
  invariant: string         // Invariant ID (e.g., "PLAN_SCOPE_LAW")
}
```

---

## Integration Points (Pending)

### Bootstrap Plan Handler (tools/bootstrap_tool.js)
```javascript
// Add before plan creation
const lintResult = lintPlan(planContent);
if (!lintResult.passed) {
  throw SystemError.toolFailure(
    SYSTEM_ERROR_CODES.PLAN_LINT_FAILED,
    { violations: lintResult.errors }
  );
}
```

### Approval Gate (core/governance.js)
```javascript
// Add before writing approved plan
const expectedHash = payload.plan_hash;
const lintResult = lintPlan(planContent, expectedHash);
if (!lintResult.passed) {
  throw new Error("APPROVAL_BLOCKED: Plan lint failed");
}
```

### Execution Gate (tools/write_file.js)
```javascript
// Add in enforcePlan
const planContent = fs.readFileSync(planFile, "utf8");
const lintResult = lintPlan(planContent, planHash);
if (!lintResult.passed) {
  throw SystemError.toolFailure(
    SYSTEM_ERROR_CODES.PLAN_VALIDATION_FAILED
  );
}
```

### Lint Plan Tool (server.js)
```javascript
server.registerTool(
  "lint_plan",
  {
    description: "Validate a plan without approval",
    inputSchema: z.object({
      path: z.string().or(z.object({ hash: z.string() }))
    }),
  },
  wrapHandler(lintPlanHandler, "lint_plan")
);
```

---

## Error Codes Reference

| Code | Invariant | Severity |
|------|-----------|----------|
| `PLAN_MISSING_SECTION` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_MISSING_FIELD` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_INVALID_STRUCTURE` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_INVALID_PHASE_ID` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_INVALID_PATH` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_PATH_ESCAPE` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_NOT_ENFORCEABLE` | `MECHANICAL_LAW_ONLY` | ERROR |
| `PLAN_NOT_AUDITABLE` | `PUBLIC_LAW_READABLE` | ERROR |
| `PLAN_HASH_MISMATCH` | `PLAN_IMMUTABILITY` | ERROR |

---

## Known Limitations

1. **Jargon Detection**: Heuristic-based; checks for undefined terms (may have false positives)
2. **Phase Extraction**: Regex-based; complex formatting may not parse correctly
3. **Path Validation**: Does not simulate filesystem; accepts well-formed paths
4. **Ambiguous Language**: Pattern-based; context-dependent words may be flagged incorrectly

---

## Architecture Diagram

```
Plan Creation Flow:
  ANTIGRAVITY submits plan
    ↓
  lintPlan(content)  ← Proposal validation
    ↓ (if failed)
  REFUSE → Error codes + violations
    ↓ (if passed)
  Compute hash
    ↓
  Approve & write plan file
    ↓
  lintPlan(content, hash)  ← Approval validation
    ↓ (if failed)
  REFUSE approval
    ↓ (if passed)
  Record STATUS: APPROVED

Plan Execution Flow:
  WINDSURF calls write_file with plan hash
    ↓
  enforcePlan(hash) reads plan
    ↓
  lintPlan(content, hash)  ← Execution validation
    ↓ (if failed)
  REFUSE execution
    ↓ (if passed)
  Authorize file write
```

---

## Audit Trail Integration

Every lint operation appends to `audit-log.jsonl`:

```jsonl
{
  "session_id": "...",
  "timestamp": 1705700400000,
  "role": "ANTIGRAVITY",
  "tool": "bootstrap_create_foundation_plan",
  "event": "plan_lint",
  "plan_hash": "6448139...",
  "lint_result": "PASS",
  "error_count": 0,
  "warning_count": 0,
  "invariants_checked": ["PLAN_SCOPE_LAW", "MECHANICAL_LAW_ONLY", "PUBLIC_LAW_READABLE", "PLAN_IMMUTABILITY"]
}
```

---

## Next Steps

1. **Integration** (Next Phase):
   - Add linter invocation to bootstrap_tool.js
   - Add linter invocation to governance.js approval
   - Add linter invocation to write_file enforcement
   - Add lint_plan read-only tool to server.js

2. **Testing** (Next Phase):
   - End-to-end test: Plan creation → approval → execution
   - Test hash mismatch rejection
   - Test approval blocking on lint failure
   - Test audit trail completeness

3. **Documentation** (Next Phase):
   - Add linter section to ATLAS-GATE_COMPLETE_GUIDE.md
   - Create "How to Write a Valid Plan" guide
   - Add examples of valid/invalid plans

---

## Sign-Off

**Implementation**: COMPLETE  
**Tests**: PASSING (14/14)  
**Documentation**: COMPLETE  
**Scope**: On budget  

Ready for integration into approval/execution gates.
