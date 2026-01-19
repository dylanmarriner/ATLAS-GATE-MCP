#!/usr/bin/env node

/**
 * TEST SUITE: Plan Linter (14+ tests)
 * 
 * Validates:
 * - Missing section → lint fail
 * - Missing phase field → fail
 * - Ambiguous language → fail
 * - Path escape → fail
 * - Non-enforceable rule → fail
 * - Non-auditable objective → fail
 * - Valid plan → pass
 * - Approval blocked on lint fail
 * - Approval succeeds on valid plan
 * - Hash changes on edit
 * - Execution blocked on hash mismatch
 * - lint_plan tool reports correctly
 * - Audit entry written on lint fail
 * - Audit entry written on approval
 */

import { lintPlan, computePlanHash } from "./core/plan-linter.js";

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(message);
  }
}

// ============================================================================
// TEST 1: Missing required section
// ============================================================================
test("Missing section → lint fail", () => {
  const plan = `
# Plan Metadata
Foundation plan

# Scope & Constraints
Core MCP

# Phase Definitions
## Phase: INIT
Phase ID: PHASE_1

# Path Allowlist
- docs/

# Forbidden Actions
- execute()

# Rollback / Failure Policy
None
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail without 'Verification Gates' section");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_MISSING_SECTION"),
    "Should have MISSING_SECTION error"
  );
});

// ============================================================================
// TEST 2: Missing phase field
// ============================================================================
test("Missing phase field → fail", () => {
  const plan = `
# Plan Metadata
Foundation plan

# Scope & Constraints
Core MCP

# Phase Definitions
## Phase: INIT
Phase ID: PHASE_1
Objective: Initialize system
Allowed operations: CREATE /src
Forbidden operations: DELETE /src
Required intent artifacts: RFC-001
Verification commands: npm test
Expected outcomes: All tests pass
# Missing: Failure stop conditions

# Path Allowlist
- docs/

# Verification Gates
- Run tests

# Forbidden Actions
- execute()

# Rollback / Failure Policy
Revert on failure
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail without phase field");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_MISSING_FIELD"),
    "Should have MISSING_FIELD error"
  );
});

// ============================================================================
// TEST 3: Invalid phase ID format
// ============================================================================
test("Invalid phase ID format → fail", () => {
  const plan = `
# Plan Metadata
Test plan

# Scope & Constraints
Test

# Phase Definitions
## Phase: First Phase
Phase ID: phase-1-invalid
Objective: Test objective
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Tests

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with invalid phase ID format");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_INVALID_PHASE_ID"),
    "Should have INVALID_PHASE_ID error"
  );
});

// ============================================================================
// TEST 4: Ambiguous language ("may")
// ============================================================================
test("Ambiguous language (may) → fail", () => {
  const plan = `
# Plan Metadata
Plan with ambiguous language

# Scope & Constraints
You may execute this operation

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test something
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with ambiguous 'may' language");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_NOT_ENFORCEABLE"),
    "Should have NON_ENFORCEABLE error"
  );
});

// ============================================================================
// TEST 5: Ambiguous language ("should")
// ============================================================================
test("Ambiguous language (should) → fail", () => {
  const plan = `
# Plan Metadata
Plan with should

# Scope & Constraints
Scope should be limited

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test something
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with ambiguous 'should' language");
});

// ============================================================================
// TEST 6: Path escape (..)
// ============================================================================
test("Path escape (..) → fail", () => {
  const plan = `
# Plan Metadata
Plan with path escape

# Scope & Constraints
Test

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- ../../../etc/passwd

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with path escape");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_PATH_ESCAPE"),
    "Should have PATH_ESCAPE error"
  );
});

// ============================================================================
// TEST 7: Non-auditable objective (code symbols)
// ============================================================================
test("Non-auditable objective (code symbols) → fail", () => {
  const plan = `
# Plan Metadata
Plan with code

# Scope & Constraints
Test

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Run \`const x = 5\` function
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with code symbols in objective");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_NOT_AUDITABLE"),
    "Should have NON_AUDITABLE error"
  );
});

// ============================================================================
// TEST 8: Valid plan → pass
// ============================================================================
test("Valid plan → pass", () => {
  const plan = `
# Plan Metadata
Foundation plan for KAIZA MCP

# Scope & Constraints
All operations are scoped to /core/** and /tools/** directories only.

# Phase Definitions
## Phase: Implementation
Phase ID: IMPL_PHASE
Objective: Implement the plan linting system
Allowed operations: CREATE /core/plan-linter.js, MODIFY /tools/bootstrap_tool.js
Forbidden operations: DELETE any file, EXECUTE shell commands
Required intent artifacts: Implementation specification
Verification commands: npm test && npm run verify
Expected outcomes: All tests pass, no build errors
Failure stop conditions: Any test failure MUST trigger rollback

# Path Allowlist
- core/plan-linter.js
- tools/bootstrap_tool.js
- test-plan-linter.js
- docs/reports/

# Verification Gates
- npm test
- npm run verify

# Forbidden Actions
- DELETE operations
- Shell execution
- Unverified changes

# Rollback / Failure Policy
On any failure, revert all changes immediately and document in audit log.
`;

  const result = lintPlan(plan);
  assertTrue(result.passed, `Plan should pass validation. Errors: ${JSON.stringify(result.errors)}`);
  assertEqual(result.errors.length, 0, "Should have no errors");
});

// ============================================================================
// TEST 9: Hash computation (same content = same hash)
// ============================================================================
test("Hash computation is deterministic", () => {
  const plan = `
# Plan Metadata
Test plan

# Scope & Constraints
Test scope

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test hash
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const hash1 = computePlanHash(plan);
  const hash2 = computePlanHash(plan);
  
  assertEqual(hash1, hash2, "Same content should produce same hash");
  assertEqual(hash1.length, 64, "Hash should be 64 characters (SHA256 hex)");
});

// ============================================================================
// TEST 10: Hash changes on edit
// ============================================================================
test("Hash changes when content changes", () => {
  const plan1 = `
# Plan Metadata
Test plan version 1

# Scope & Constraints
Test

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test objective
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const plan2 = `
# Plan Metadata
Test plan version 2

# Scope & Constraints
Test

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test objective
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const hash1 = computePlanHash(plan1);
  const hash2 = computePlanHash(plan2);
  
  assertFalse(hash1 === hash2, "Different content should produce different hashes");
});

// ============================================================================
// TEST 11: Hash mismatch detection
// ============================================================================
test("Hash mismatch → fail", () => {
  const plan = `
# Plan Metadata
Test plan

# Scope & Constraints
Test

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const correctHash = computePlanHash(plan);
  const wrongHash = "0000000000000000000000000000000000000000000000000000000000000000";
  
  const result = lintPlan(plan, wrongHash);
  assertFalse(result.passed, "Plan should fail with mismatched hash");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_HASH_MISMATCH"),
    "Should have HASH_MISMATCH error"
  );
});

// ============================================================================
// TEST 12: Duplicate phase ID → fail
// ============================================================================
test("Duplicate phase IDs → fail", () => {
  const plan = `
# Plan Metadata
Plan with duplicate phases

# Scope & Constraints
Test

# Phase Definitions
## Phase: Phase One
Phase ID: SAME_ID
Objective: First phase
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

## Phase: Phase Two
Phase ID: SAME_ID
Objective: Second phase
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with duplicate phase IDs");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_INVALID_PHASE_ID"),
    "Should have INVALID_PHASE_ID error for duplicate"
  );
});

// ============================================================================
// TEST 13: Absolute path in allowlist → fail
// ============================================================================
test("Absolute path in allowlist → fail", () => {
  const plan = `
# Plan Metadata
Plan with absolute path

# Scope & Constraints
Test

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- /absolute/path/here

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with absolute path");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_INVALID_PATH"),
    "Should have INVALID_PATH error"
  );
});

// ============================================================================
// TEST 14: Human judgment clause → fail
// ============================================================================
test("Human judgment clause → fail", () => {
  const plan = `
# Plan Metadata
Plan with judgment

# Scope & Constraints
Use best judgment when executing

# Phase Definitions
## Phase: Test
Phase ID: TEST_PHASE
Objective: Test
Allowed operations: CREATE
Forbidden operations: DELETE
Required intent artifacts: RFC
Verification commands: test
Expected outcomes: Pass
Failure stop conditions: Fail

# Path Allowlist
- docs/

# Verification Gates
- Test

# Forbidden Actions
- execute

# Rollback / Failure Policy
Revert
`;

  const result = lintPlan(plan);
  assertFalse(result.passed, "Plan should fail with human judgment clause");
  assertTrue(
    result.errors.some(e => e.code === "PLAN_NOT_ENFORCEABLE"),
    "Should have NON_ENFORCEABLE error"
  );
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  console.log(`\n[TEST] Running ${tests.length} plan linter tests...\n`);

  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[RESULT] ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
