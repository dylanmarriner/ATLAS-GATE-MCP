#!/usr/bin/env node

/**
 * COMPREHENSIVE KAIZA MCP TOOL TEST SUITE
 * 
 * Tests all critical tools for both WINDSURF and ANTIGRAVITY roles
 * to ensure they work correctly without mock data or stubs.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");

// Import core modules
import { lockWorkspaceRoot, resetWorkspaceRootForTesting, getRepoRoot } from "../core/path-resolver.js";
import { lintPlan, computePlanHash } from "../core/plan-linter.js";
import { bootstrapPlanHandler } from "../tools/bootstrap_tool.js";
import { beginSessionHandler } from "../tools/begin_session.js";
import { listPlansHandler } from "../tools/list_plans.js";
import { readFileHandler } from "../tools/read_file.js";
import { readAuditLogHandler } from "../tools/read_audit_log.js";

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║  COMPREHENSIVE KAIZA MCP TOOL TEST SUITE                  ║");
console.log("║  Testing: WINDSURF (executor) & ANTIGRAVITY (planner)    ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

let testsPassed = 0;
let testsFailed = 0;

/**
 * TEST UTILITIES
 */
function logTest(name, status, message = "") {
  const icon = status === "PASS" ? "✓" : "✗";
  const color = status === "PASS" ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${color}${icon}${reset} ${name}${message ? " - " + message : ""}`);
  
  if (status === "PASS") {
    testsPassed++;
  } else {
    testsFailed++;
  }
}

function logSection(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

/**
 * TEST 1: CORE MODULE IMPORTS
 */
logSection("TEST 1: Core Module Imports");

try {
  await import("../core/governance.js");
  logTest("governance.js", "PASS", "core governance module loads");
} catch (err) {
  logTest("governance.js", "FAIL", err.message);
}

try {
  await import("../core/audit-system.js");
  logTest("audit-system.js", "PASS", "audit system module loads");
} catch (err) {
  logTest("audit-system.js", "FAIL", err.message);
}

try {
  await import("../core/plan-enforcer.js");
  logTest("plan-enforcer.js", "PASS", "plan enforcer module loads");
} catch (err) {
  logTest("plan-enforcer.js", "FAIL", err.message);
}

try {
  await import("../core/role-parser.js");
  logTest("role-parser.js", "PASS", "role parser module loads");
} catch (err) {
  logTest("role-parser.js", "FAIL", err.message);
}

/**
 * TEST 2: WINDSURF TOOLS (EXECUTION)
 */
logSection("TEST 2: WINDSURF Role Tools");

// Test write_file tool exists
try {
  const { writeFileHandler } = await import("../tools/write_file.js");
  logTest("write_file.js imports", "PASS", "Windsurf executor tool available");
} catch (err) {
  logTest("write_file.js imports", "FAIL", err.message);
}

/**
 * TEST 3: ANTIGRAVITY TOOLS (PLANNING)
 */
logSection("TEST 3: ANTIGRAVITY Role Tools");

// Test bootstrap tool
try {
  const { bootstrapPlanHandler } = await import("../tools/bootstrap_tool.js");
  logTest("bootstrap_tool.js imports", "PASS", "Antigravity bootstrap tool available");
} catch (err) {
  logTest("bootstrap_tool.js imports", "FAIL", err.message);
}

// Test lint tool
try {
  const { lintPlanHandler } = await import("../tools/lint_plan.js");
  logTest("lint_plan.js imports", "PASS", "Antigravity lint tool available");
} catch (err) {
  logTest("lint_plan.js imports", "FAIL", err.message);
}

/**
 * TEST 4: SESSION INITIALIZATION
 */
logSection("TEST 4: Session Initialization");

try {
  resetWorkspaceRootForTesting();
  lockWorkspaceRoot(REPO_ROOT);
  logTest("begin_session", "PASS", "Can lock workspace root");
} catch (err) {
  logTest("begin_session", "FAIL", err.message);
}

/**
 * TEST 5: PLAN LINTING
 */
logSection("TEST 5: Plan Linting");

const validPlan = `---
FILENAME: TEST_PLAN.md
STATUS: APPROVED
SCOPE: TEST_ONLY
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test plan for tool validation
---

# Plan Metadata

This is a valid test plan for testing.

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
- .kaiza/**

# Verification Gates

All gates pass.

# Forbidden Actions

None forbidden.

# Rollback / Failure Policy

No rollback needed.
`;

try {
  const lintResult = lintPlan(validPlan);
  if (lintResult.passed) {
    logTest("lintPlan - valid", "PASS", `Hash: ${lintResult.hash.substring(0, 8)}...`);
  } else {
    logTest("lintPlan - valid", "FAIL", `Errors: ${lintResult.errors.length}`);
  }
} catch (err) {
  logTest("lintPlan - valid", "FAIL", err.message);
}

// Test that stubs are rejected
const planWithTodo = validPlan.replace(
  "# Scope & Constraints\n\nTest scope only.",
  "# Scope & Constraints\n\nTODO: add constraints"
);

try {
  const lintResult = lintPlan(planWithTodo);
  if (!lintResult.passed) {
    logTest("lintPlan - TODO rejection", "PASS", "Stub markers correctly rejected");
  } else {
    logTest("lintPlan - TODO rejection", "FAIL", "Should have rejected TODO marker");
  }
} catch (err) {
  logTest("lintPlan - TODO rejection", "FAIL", err.message);
}

/**
 * TEST 6: READ-ONLY TOOLS
 */
logSection("TEST 6: Read-Only Tools");

// Test read_file
try {
  const result = await readFileHandler({ path: "package.json" });
  if (result.content && result.content[0].text.includes("kaiza")) {
    logTest("read_file", "PASS", "Can read package.json");
  } else {
    logTest("read_file", "FAIL", "Package.json content missing");
  }
} catch (err) {
  logTest("read_file", "FAIL", err.message);
}

// Test list_plans
try {
  const result = await listPlansHandler({});
  logTest("list_plans", "PASS", `Found ${result.content[0].text.split('\n').length} plans`);
} catch (err) {
  logTest("list_plans", "FAIL", err.message);
}

// Test read_audit_log
try {
  const result = await readAuditLogHandler({});
  logTest("read_audit_log", "PASS", "Audit log readable");
} catch (err) {
  logTest("read_audit_log", "FAIL", err.message);
}

/**
 * TEST 7: PLAN CREATION & GOVERNANCE
 */
logSection("TEST 7: Plan Creation & Governance");

// Test that bootstrap works with valid plan
const SECRET = "test-secret-for-comprehensive-test";
process.env.KAIZA_BOOTSTRAP_SECRET = SECRET;

// Clean governance state
const govPath = path.join(REPO_ROOT, ".kaiza", "governance.json");
if (fs.existsSync(govPath)) {
  const state = JSON.parse(fs.readFileSync(govPath, "utf8"));
  if (!state.bootstrap_enabled) {
    logTest("bootstrap tool - fresh state", "SKIP", "Bootstrap already completed in repo");
  } else {
    // Test bootstrap
    try {
      const payload = {
        repoIdentifier: "test",
        timestamp: Date.now(),
        nonce: crypto.randomUUID(),
        action: "BOOTSTRAP_CREATE_FOUNDATION_PLAN"
      };
      
      const hmac = crypto.createHmac("sha256", SECRET);
      hmac.update(JSON.stringify(payload));
      
      const result = await bootstrapPlanHandler({
        path: REPO_ROOT,
        planContent: validPlan,
        payload,
        signature: hmac.digest("hex")
      });
      
      logTest("bootstrap tool", "PASS", "Plan creation and governance state update");
    } catch (err) {
      logTest("bootstrap tool", "FAIL", err.message);
    }
  }
}

/**
 * TEST 8: AUDIT TRAIL
 */
logSection("TEST 8: Audit Trail");

try {
  const auditPath = path.join(REPO_ROOT, "audit-log.jsonl");
  if (fs.existsSync(auditPath)) {
    const content = fs.readFileSync(auditPath, "utf8");
    const lines = content.trim().split("\n").length;
    logTest("audit-log.jsonl", "PASS", `${lines} entries recorded`);
  } else {
    logTest("audit-log.jsonl", "FAIL", "Audit log file not found");
  }
} catch (err) {
  logTest("audit-log.jsonl", "FAIL", err.message);
}

/**
 * TEST 9: INFRASTRUCTURE CHECK
 */
logSection("TEST 9: Infrastructure");

try {
  const dirs = [
    ".kaiza",
    "docs",
    "docs/plans",
    "core",
    "tools"
  ];
  
  let allExist = true;
  for (const dir of dirs) {
    const dirPath = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`  Missing: ${dir}`);
      allExist = false;
    }
  }
  
  if (allExist) {
    logTest("directory structure", "PASS", "All required directories exist");
  } else {
    logTest("directory structure", "FAIL", "Some directories missing");
  }
} catch (err) {
  logTest("directory structure", "FAIL", err.message);
}

/**
 * TEST 10: ERROR HANDLING
 */
logSection("TEST 10: Error Handling");

// Test that invalid paths are rejected
try {
  await readFileHandler({ path: "/../../../etc/passwd" });
  logTest("path traversal protection", "FAIL", "Should have rejected path traversal");
} catch (err) {
  if (err.message.includes("outside") || err.message.includes("traversal")) {
    logTest("path traversal protection", "PASS", "Path traversal blocked");
  } else {
    logTest("path traversal protection", "FAIL", `Wrong error: ${err.message}`);
  }
}

/**
 * SUMMARY
 */
logSection("TEST SUMMARY");
console.log(`\n  Passed: ${testsPassed}`);
console.log(`  Failed: ${testsFailed}`);
console.log(`  Total:  ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log("  ✓ ALL TESTS PASSED");
  process.exit(0);
} else {
  console.log("  ✗ SOME TESTS FAILED");
  process.exit(1);
}
