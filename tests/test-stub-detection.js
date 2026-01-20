#!/usr/bin/env node

/**
 * STUB DETECTION VERIFICATION TEST
 * 
 * Tests that the plan linter correctly rejects plans with TODO, FIXME, 
 * mock, stub, and other incomplete code markers.
 * 
 * Run: node tests/test-stub-detection.js
 */

import { lintPlan } from "../core/plan-linter.js";

console.log("\n=== STUB DETECTION VERIFICATION TEST ===\n");

const testCases = [
  {
    name: "TODO Marker",
    content: `---
STATUS: APPROVED
SCOPE: TEST
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test
---

# Plan Metadata
Test.

# Scope & Constraints
TODO: add constraints

# Phase Definitions
## Phase: TEST
- Phase ID: TEST
- Objective: Test
- Allowed operations: write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: test
- Failure stop conditions: none

# Path Allowlist
- docs/test.md

# Verification Gates
Pass.

# Forbidden Actions
None.

# Rollback / Failure Policy
None.
`,
    shouldFail: true,
    keyword: "TODO",
  },
  {
    name: "FIXME Marker",
    content: `---
STATUS: APPROVED
SCOPE: TEST
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test
---

# Plan Metadata
Test.

# Scope & Constraints
FIXME: implement validation

# Phase Definitions
## Phase: TEST
- Phase ID: TEST
- Objective: Test
- Allowed operations: write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: test
- Failure stop conditions: none

# Path Allowlist
- docs/test.md

# Verification Gates
Pass.

# Forbidden Actions
None.

# Rollback / Failure Policy
None.
`,
    shouldFail: true,
    keyword: "FIXME",
  },
  {
    name: "Mock Data",
    content: `---
STATUS: APPROVED
SCOPE: TEST
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test
---

# Plan Metadata
Test.

# Scope & Constraints
Use mock data for testing

# Phase Definitions
## Phase: TEST
- Phase ID: TEST
- Objective: Test
- Allowed operations: write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: test
- Failure stop conditions: none

# Path Allowlist
- docs/test.md

# Verification Gates
Pass.

# Forbidden Actions
None.

# Rollback / Failure Policy
None.
`,
    shouldFail: true,
    keyword: "mock",
  },
  {
    name: "Placeholder",
    content: `---
STATUS: APPROVED
SCOPE: TEST
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test
---

# Plan Metadata
Test.

# Scope & Constraints
This is a placeholder implementation

# Phase Definitions
## Phase: TEST
- Phase ID: TEST
- Objective: Test
- Allowed operations: write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: test
- Failure stop conditions: none

# Path Allowlist
- docs/test.md

# Verification Gates
Pass.

# Forbidden Actions
None.

# Rollback / Failure Policy
None.
`,
    shouldFail: true,
    keyword: "placeholder",
  },
  {
    name: "Valid Complete Plan",
    content: `---
STATUS: APPROVED
SCOPE: TEST
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Complete production-ready plan
---

# Plan Metadata
This is a complete and valid plan.

# Scope & Constraints
Bootstrap scope only. Production-ready.

# Phase Definitions
## Phase: VALID_PHASE
- Phase ID: VALID_PHASE
- Objective: Demonstrate valid plan
- Allowed operations: file write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: plan passes all validation
- Failure stop conditions: none

# Path Allowlist
- docs/plans/**
- .kaiza/**

# Verification Gates
All gates pass.

# Forbidden Actions
None forbidden.

# Rollback / Failure Policy
No rollback needed.
`,
    shouldFail: false,
    keyword: "none",
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = lintPlan(testCase.content);

  if (testCase.shouldFail) {
    if (!result.passed && result.errors.length > 0) {
      const hasStubError = result.errors.some(
        (e) =>
          e.code === "PLAN_NOT_ENFORCEABLE" &&
          e.message.includes("Stub/incomplete code")
      );

      if (hasStubError) {
        console.log(`✓ ${testCase.name}`);
        console.log(
          `  Correctly rejected: Stub/incomplete code (${testCase.keyword})`
        );
        passed++;
      } else {
        console.log(`✗ ${testCase.name}`);
        console.log(
          `  Expected stub detection, got: ${result.errors[0]?.message}`
        );
        failed++;
      }
    } else {
      console.log(`✗ ${testCase.name}`);
      console.log(`  Expected rejection, but plan passed`);
      failed++;
    }
  } else {
    if (result.passed) {
      console.log(`✓ ${testCase.name}`);
      console.log(`  Correctly accepted as production-ready`);
      passed++;
    } else {
      console.log(`✗ ${testCase.name}`);
      console.log(`  Expected acceptance, but got errors:`);
      result.errors.forEach((e) => console.log(`    - ${e.message}`));
      failed++;
    }
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log("\n✓ All stub detection tests passed!");
  process.exit(0);
} else {
  console.error("\n✗ Some tests failed");
  process.exit(1);
}
