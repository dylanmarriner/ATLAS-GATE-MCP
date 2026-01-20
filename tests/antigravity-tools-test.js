#!/usr/bin/env node

/**
 * ANTIGRAVITY TOOLS COMPREHENSIVE TEST
 * 
 * Tests all Antigravity (planning) tools:
 * - bootstrap_create_foundation_plan: Create first approved plan
 * - lint_plan: Validate plan structure before approval
 * - read_prompt: Get ANTIGRAVITY_CANONICAL instructions
 * - read_file: Read workspace files
 * - list_plans: See approved plans
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");

// Import tools
import { readPromptHandler } from "../tools/read_prompt.js";
import { readFileHandler } from "../tools/read_file.js";
import { listPlansHandler } from "../tools/list_plans.js";
import { lintPlanHandler } from "../tools/lint_plan.js";
import { lintPlan, computePlanHash } from "../core/plan-linter.js";

// Session setup
import { SESSION_STATE } from "../session.js";
import { lockWorkspaceRoot, resetWorkspaceRootForTesting } from "../core/path-resolver.js";

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║  ANTIGRAVITY TOOLS COMPREHENSIVE TEST                     ║");
console.log("║  Testing: Planning/Governance Tools for Antigravity Role ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

let passed = 0;
let failed = 0;

function logTest(name, status, detail = "") {
  const icon = status === "PASS" ? "✓" : "✗";
  const color = status === "PASS" ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${color}${icon}${reset} ${name}${detail ? " - " + detail : ""}`);
  status === "PASS" ? passed++ : failed++;
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

// Initialize session
section("Session Initialization");
try {
  resetWorkspaceRootForTesting();
  lockWorkspaceRoot(REPO_ROOT);
  logTest("lockWorkspaceRoot", "PASS");
} catch (err) {
  logTest("lockWorkspaceRoot", "FAIL", err.message);
  process.exit(1);
}

/**
 * TEST 1: read_prompt (ANTIGRAVITY_CANONICAL)
 */
section("TEST 1: Read Prompt (ANTIGRAVITY_CANONICAL)");

try {
  const result = await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" }, "ANTIGRAVITY");
  if (result.content && result.content[0].text.includes("ANTIGRAVITY")) {
    logTest("read_prompt", "PASS", `Fetched ${result.content[0].text.length} chars`);
    
    // Verify session state was updated
    if (SESSION_STATE.hasFetchedPrompt && SESSION_STATE.fetchedPromptName === "ANTIGRAVITY_CANONICAL") {
      logTest("session state update", "PASS", "Prompt gate enabled");
    } else {
      logTest("session state update", "FAIL", "Session state not updated");
    }
  } else {
    logTest("read_prompt", "FAIL", "Invalid prompt content");
  }
} catch (err) {
  logTest("read_prompt", "FAIL", err.message);
}

// Test that Antigravity cannot read WINDSURF prompt
try {
  await readPromptHandler({ name: "WINDSURF_CANONICAL" }, "ANTIGRAVITY");
  logTest("role isolation - negative", "FAIL", "Should reject WINDSURF prompt");
} catch (err) {
  if (err.message && err.message.includes("cannot read")) {
    logTest("role isolation - negative", "PASS", "WINDSURF prompt rejected");
  } else {
    logTest("role isolation - negative", "FAIL", `Wrong error: ${err.message}`);
  }
}

/**
 * TEST 2: read_file
 */
section("TEST 2: Read File");

try {
  const result = await readFileHandler({ path: "package.json" });
  if (result.content && result.content[0].text.includes("kaiza")) {
    logTest("read_file - package.json", "PASS");
  } else {
    logTest("read_file - package.json", "FAIL", "Package.json missing kaiza");
  }
} catch (err) {
  logTest("read_file - package.json", "FAIL", err.message);
}

// Test reading a plan
try {
  const result = await readFileHandler({ path: ".kaiza/governance.json" });
  if (result.content && result.content[0].text.includes("bootstrap")) {
    logTest("read_file - governance.json", "PASS");
  } else {
    logTest("read_file - governance.json", "FAIL", "Invalid governance.json");
  }
} catch (err) {
  logTest("read_file - governance.json", "FAIL", err.message);
}

/**
 * TEST 3: list_plans
 */
section("TEST 3: List Plans");

try {
  const result = await listPlansHandler({});
  if (result.content && result.content[0].text.includes("plan(s)")) {
    const text = result.content[0].text;
    logTest("list_plans", "PASS", text.substring(0, 50) + "...");
  } else {
    logTest("list_plans", "FAIL", "Invalid response format");
  }
} catch (err) {
  logTest("list_plans", "FAIL", err.message);
}

/**
 * TEST 4: lint_plan - Core Linting Tests
 */
section("TEST 4: lint_plan - Core Linting");

// Create a valid test plan
const validPlan = `---
FILENAME: TEST_PLAN.md
STATUS: APPROVED
SCOPE: TEST_ONLY
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test plan for Antigravity validation
---

# Plan Metadata

This is a valid test plan.

# Scope & Constraints

Test scope only. No production changes.

# Phase Definitions

## Phase: TEST_PHASE

- Phase ID: TEST_PHASE
- Objective: Test the tools work correctly
- Allowed operations: file write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: all tests pass
- Failure stop conditions: none

# Path Allowlist

- docs/test.md

# Verification Gates

All gates pass.

# Forbidden Actions

None forbidden.

# Rollback / Failure Policy

No rollback needed.
`;

// Test 1: Valid plan passes linting
try {
  const result = await lintPlanHandler({ content: validPlan });
  const parsed = JSON.parse(result.content[0].text);
  if (parsed.passed) {
    logTest("lint_plan - valid", "PASS", `Hash: ${parsed.hash.substring(0, 8)}...`);
  } else {
    logTest("lint_plan - valid", "FAIL", `${parsed.errors.length} errors`);
  }
} catch (err) {
  logTest("lint_plan - valid", "FAIL", err.message);
}

// Test 2: Plan with TODO is rejected
const planWithTodo = validPlan.replace(
  "# Scope & Constraints\n\nTest scope only.",
  "# Scope & Constraints\n\nTODO: add constraints"
);

try {
  const result = await lintPlanHandler({ content: planWithTodo });
  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.passed && parsed.errors.length > 0) {
    logTest("lint_plan - TODO rejection", "PASS", "Stub markers rejected");
  } else {
    logTest("lint_plan - TODO rejection", "FAIL", "Should have rejected");
  }
} catch (err) {
  logTest("lint_plan - TODO rejection", "FAIL", err.message);
}

// Test 3: Plan with mock data is rejected
const planWithMock = validPlan.replace(
  "# Scope & Constraints",
  "# Scope & Constraints\nUse mock data for testing"
);

try {
  const result = await lintPlanHandler({ content: planWithMock });
  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.passed) {
    logTest("lint_plan - mock rejection", "PASS", "Mock markers rejected");
  } else {
    logTest("lint_plan - mock rejection", "FAIL", "Should have rejected");
  }
} catch (err) {
  logTest("lint_plan - mock rejection", "FAIL", err.message);
}

// Test 4: Missing required section
const planMissingSection = `---
FILENAME: TEST_PLAN.md
STATUS: APPROVED
SCOPE: TEST_ONLY
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Incomplete plan
---

# Plan Metadata
Test.

# Scope & Constraints
Test only.

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
- test.md
`;

try {
  const result = await lintPlanHandler({ content: planMissingSection });
  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.passed) {
    logTest("lint_plan - missing section", "PASS", "Missing sections detected");
  } else {
    logTest("lint_plan - missing section", "FAIL", "Should have detected missing");
  }
} catch (err) {
  logTest("lint_plan - missing section", "FAIL", err.message);
}

/**
 * TEST 5: Plan Hashing
 */
section("TEST 5: Plan Hashing");

try {
  const hash = computePlanHash(validPlan);
  if (hash && hash.length === 64 && /^[a-f0-9]+$/.test(hash)) {
    logTest("computePlanHash", "PASS", `Hash: ${hash.substring(0, 8)}...`);
  } else {
    logTest("computePlanHash", "FAIL", "Invalid hash format");
  }
} catch (err) {
  logTest("computePlanHash", "FAIL", err.message);
}

/**
 * TEST 6: Plan Structure Validation
 */
section("TEST 6: Plan Structure Validation");

// Test ambiguous language detection
const planWithAmbiguous = validPlan.replace(
  "# Scope & Constraints\n\nTest scope only.",
  "# Scope & Constraints\n\nYou should add constraints if possible"
);

try {
  const result = await lintPlanHandler({ content: planWithAmbiguous });
  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.passed && parsed.errors.some(e => e.message.includes("language"))) {
    logTest("lint_plan - ambiguous language", "PASS", "Ambiguous language detected");
  } else {
    logTest("lint_plan - ambiguous language", "FAIL", "Should have detected");
  }
} catch (err) {
  logTest("lint_plan - ambiguous language", "FAIL", err.message);
}

/**
 * TEST 7: Error Handling
 */
section("TEST 7: Error Handling");

// Test invalid input
try {
  await lintPlanHandler({});
  logTest("error handling - missing input", "FAIL", "Should throw error");
} catch (err) {
  logTest("error handling - missing input", "PASS", "Correctly rejected");
}

// Test invalid path
try {
  await readFileHandler({ path: "nonexistent/file.txt" });
  logTest("error handling - missing file", "FAIL", "Should throw error");
} catch (err) {
  logTest("error handling - missing file", "PASS", "Correctly rejected");
}

/**
 * TEST 8: Antigravity Governance Protection
 */
section("TEST 8: Antigravity Governance");

try {
  const govPath = path.join(REPO_ROOT, ".kaiza", "governance.json");
  if (fs.existsSync(govPath)) {
    const state = JSON.parse(fs.readFileSync(govPath, "utf8"));
    if (state.bootstrap_enabled === false) {
      logTest("bootstrap disabled", "PASS", "Bootstrap one-time enforcement active");
    } else {
      logTest("bootstrap disabled", "FAIL", "Bootstrap should be disabled");
    }
  } else {
    logTest("bootstrap disabled", "SKIP", "Governance file not found");
  }
} catch (err) {
  logTest("bootstrap disabled", "FAIL", err.message);
}

/**
 * SUMMARY
 */
section("SUMMARY");
console.log(`\n  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}\n`);

if (failed === 0) {
  console.log("  ✓ ALL ANTIGRAVITY TESTS PASSED");
  process.exit(0);
} else {
  console.log("  ✗ SOME ANTIGRAVITY TESTS FAILED");
  process.exit(1);
}
