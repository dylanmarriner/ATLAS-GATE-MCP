# Plan Linter Implementation - Complete Summary

**Status**: ✓ COMPLETE  
**Date**: 2026-01-19  
**Test Results**: 14/14 PASSING  
**Example Plan**: LINTING PASSING

---

## What Was Implemented

### Core Linter Module: `core/plan-linter.js`

A deterministic validation system that enforces plan structure, enforceability, and auditability:

- **computePlanHash()** - Deterministic SHA256 hashing of plan content
- **lintPlan()** - Main validation function that returns structured violations
- **Five validation stages**:
  1. Structure validation (7 required sections in order)
  2. Phase validation (8 required fields per phase)
  3. Path validation (no escapes, workspace-relative only)
  4. Enforceability (binary language, no human judgment)
  5. Auditability (non-coder readable, no code symbols)

### Test Suite: `test-plan-linter.js`

14 comprehensive tests validating all lint rules:
- ✓ Missing section detection
- ✓ Missing phase field detection
- ✓ Invalid phase ID format detection
- ✓ Ambiguous language detection (may, should, if possible)
- ✓ Path escape detection (.., absolute paths)
- ✓ Non-auditable objective detection (code symbols)
- ✓ Valid plan acceptance
- ✓ Hash computation determinism
- ✓ Hash change on edit
- ✓ Hash mismatch detection
- ✓ Duplicate phase ID detection
- ✓ Absolute path detection
- ✓ Human judgment clause detection

### Documentation

1. **MCP_PLAN_LINTER_SPEC.md** - Complete specification
   - Required plan structure (7 sections)
   - Phase definition requirements (8 fields)
   - Path allowlist rules
   - Enforceability rules (binary language)
   - Auditability rules (non-coder readable)
   - Error codes and invariants
   - How to read a plan (non-coder guide)

2. **PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md** - Implementation report
   - Files created/modified
   - Tests added
   - Lint rules enforced
   - Integration points (pending)

3. **EXAMPLE_VALID_PLAN.md** - Example of a valid plan
   - Demonstrates proper structure
   - Shows all required sections
   - Passes all linting checks
   - Hash: `d8bb32317a7c1fa04b8203a75388afc6b58a9aa5cad210b85a3e826850b72112`

---

## Error Codes & Invariants

| Code | Invariant | Severity |
|------|-----------|----------|
| `PLAN_MISSING_SECTION` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_MISSING_FIELD` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_INVALID_PHASE_ID` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_INVALID_PATH` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_PATH_ESCAPE` | `PLAN_SCOPE_LAW` | ERROR |
| `PLAN_NOT_ENFORCEABLE` | `MECHANICAL_LAW_ONLY` | ERROR |
| `PLAN_NOT_AUDITABLE` | `PUBLIC_LAW_READABLE` | ERROR |
| `PLAN_HASH_MISMATCH` | `PLAN_IMMUTABILITY` | ERROR |

---

## Key Design Decisions

### 1. Hash Computation Excludes Header
- Plans embed their hash in an HTML comment header
- Hash is computed on content WITHOUT the header
- Avoids circular dependency (plan contains its own hash)
- Enables validation without modifying plan file

### 2. Regex-Based Extraction
- Phase extraction: Looks for `## Phase:` or `### Phase:` sections
- Path allowlist: Extracts lines under `# Path Allowlist`
- Section validation: Checks for required section headers in order

### 3. Deterministic Validation
- No file I/O during validation
- No external dependencies
- Same input → same result (idempotent)
- Can be called multiple times safely

### 4. Fail-Closed Enforcement
- ANY lint error blocks approval/execution
- Warnings are reported but don't block
- No "warn-only" validation mode

---

## Linting Rules Summary

### Structure Requirements
```
Required sections (in order):
1. Plan Metadata
2. Scope & Constraints
3. Phase Definitions
4. Path Allowlist
5. Verification Gates
6. Forbidden Actions
7. Rollback / Failure Policy
```

### Phase Requirements (per phase)
```
Each phase must have:
- Phase ID (UPPERCASE_UNDERSCORE format)
- Objective (plain English, no code symbols)
- Allowed operations (explicit paths/operations)
- Forbidden operations (explicit list)
- Required intent artifacts (documentation)
- Verification commands (runnable)
- Expected outcomes (clear success criteria)
- Failure stop conditions (deterministic)
```

### Enforceability Rules
- FORBIDDEN: "may", "should", "if possible", "optional", "try to", "attempt to"
- FORBIDDEN: "use best judgment", "use judgment"
- REQUIRED: "MUST", "MUST NOT", "SHALL", "REQUIRED", "FORBIDDEN"
- REQUIRED: Binary conditions ("IF X THEN Y" or "UNLESS Z DO NOT W")

### Path Rules
- ✓ Workspace-relative: `core/plan-linter.js`
- ✓ Globs: `tools/**/*.js`
- ✗ Absolute paths: `/absolute/path`
- ✗ Parent escape: `../../../etc`
- ✗ Unresolved variables: `${VAR}`

### Auditability Rules
- FORBIDDEN in objectives: Code symbols, `` `backticks` ``, function calls
- REQUIRED: Plain English, clear success/failure, defined terms

---

## Usage

### Run Tests
```bash
node test-plan-linter.js
```

### Validate a Plan
```javascript
import { lintPlan } from './core/plan-linter.js';

const result = lintPlan(planContent, expectedHash);
if (result.passed) {
  console.log('Plan is valid');
} else {
  console.log('Errors:', result.errors);
}
```

### Compute Plan Hash
```javascript
import { computePlanHash } from './core/plan-linter.js';

const hash = computePlanHash(planContent);
// Returns 64-char hex string: d8bb323...
```

---

## Integration Points (Pending Next Phase)

### 1. Plan Proposal (tools/bootstrap_tool.js)
```javascript
const { lintPlan } = await import('./core/plan-linter.js');
const result = lintPlan(planContent);
if (!result.passed) {
  throw SystemError.toolFailure(...);
}
```

### 2. Plan Approval (core/governance.js)
```javascript
const result = lintPlan(planContent, expectedHash);
if (!result.passed) {
  throw new Error('APPROVAL_BLOCKED: Plan lint failed');
}
```

### 3. Plan Execution (tools/write_file.js)
```javascript
const planContent = fs.readFileSync(planFile, 'utf8');
const result = lintPlan(planContent, planHash);
if (!result.passed) {
  throw SystemError.toolFailure(...);
}
```

### 4. Lint Plan Tool (server.js)
```javascript
server.registerTool(
  'lint_plan',
  { description: 'Validate a plan', ... },
  lintPlanHandler
);
```

---

## Files Created

1. **core/plan-linter.js** (370 lines)
   - Core linter implementation
   - Exports: computePlanHash, lintPlan
   - No external dependencies (uses crypto, invariant)

2. **test-plan-linter.js** (450+ lines)
   - 14 comprehensive tests
   - All passing (0 failures)
   - Run with: `node test-plan-linter.js`

3. **docs/reports/MCP_PLAN_LINTER_SPEC.md**
   - Complete specification document
   - Non-coder guide: "How to Read a Plan"
   - Implementation files reference

4. **docs/reports/PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md**
   - Implementation report
   - Deliverables checklist
   - Integration roadmap

5. **docs/examples/EXAMPLE_VALID_PLAN.md**
   - Working example of valid plan
   - Demonstrates all required sections
   - Passes linting with hash: d8bb32317a...

---

## Verification Status

```
✓ Core linter implemented and tested
✓ 14/14 tests passing
✓ Example plan linting passes
✓ Documentation complete
✓ Error codes and invariants defined
✓ Hash computation deterministic
✓ Path validation working
✓ Enforceability checks working
✓ Auditability checks working
```

---

## Next Phase: Integration

### Required Work
1. Integrate linter into bootstrap_tool.js (plan proposal)
2. Integrate linter into governance.js (plan approval)
3. Integrate linter into write_file.js (plan execution)
4. Add lint_plan read-only tool to server.js
5. Create end-to-end tests (proposal → approval → execution)
6. Update audit logging to record lint results

### Estimated Effort
- Integration: 2-3 hours
- Testing: 1-2 hours
- Documentation: 30 minutes

### Success Criteria
- Plans cannot be created without passing linting
- Plans cannot be approved without passing linting
- Plans cannot be executed if hash doesn't match
- Lint results are logged to audit trail
- All integration tests pass

---

## Known Limitations & Future Improvements

### Current Limitations
1. Jargon detection is heuristic (may have false positives)
2. Phase extraction uses regex (may fail on unusual formatting)
3. Path validation doesn't simulate filesystem
4. Ambiguous language detection is pattern-based

### Future Enhancements
1. Formal glossary section in plans
2. Structured YAML/JSON plan format
3. Automated rollback script validation
4. Phase dependency graph validation
5. Intent artifact schema validation
6. Plan versioning and migration

---

## References

- **Spec**: docs/reports/MCP_PLAN_LINTER_SPEC.md
- **Report**: docs/reports/PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md
- **Example**: docs/examples/EXAMPLE_VALID_PLAN.md
- **Tests**: test-plan-linter.js
- **Code**: core/plan-linter.js

---

## Sign-Off

**Status**: Phase Complete  
**Date**: 2026-01-19  
**Tests**: 14/14 Passing  
**Documentation**: Complete  
**Ready for Integration**: YES

The Plan Linter foundation is ready for integration into the ATLAS-GATE MCP approval and execution gates.
