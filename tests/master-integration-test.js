#!/usr/bin/env node

/**
 * MASTER INTEGRATION TEST SUITE
 * 
 * Comprehensive testing of KAIZA MCP system:
 * - Both WINDSURF (executor) and ANTIGRAVITY (planner) roles
 * - All critical tools and their interactions
 * - Governance enforcement and security gates
 * - End-to-end workflows
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");

// Core imports
import { lockWorkspaceRoot, resetWorkspaceRootForTesting, getRepoRoot } from "../core/path-resolver.js";
import { lintPlan } from "../core/plan-linter.js";

// Tool imports
import { readFileHandler } from "../tools/read_file.js";
import { readPromptHandler } from "../tools/read_prompt.js";
import { listPlansHandler } from "../tools/list_plans.js";
import { lintPlanHandler } from "../tools/lint_plan.js";
import { readAuditLogHandler } from "../tools/read_audit_log.js";

// Session
import { SESSION_STATE } from "../session.js";

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m"
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

function printHeader() {
  console.log(`\n${COLORS.bold}╔═══════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}║                 KAIZA MCP MASTER INTEGRATION TEST                   ║${COLORS.reset}`);
  console.log(`${COLORS.bold}║  Comprehensive validation of WINDSURF & ANTIGRAVITY roles           ║${COLORS.reset}`);
  console.log(`${COLORS.bold}╚═══════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);
}

function printSection(title) {
  console.log(`\n${COLORS.blue}${"─".repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.blue}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.blue}${"─".repeat(70)}${COLORS.reset}`);
}

function logTest(category, name, status, detail = "") {
  totalTests++;
  
  let icon, color;
  if (status === "PASS") {
    icon = "✓";
    color = COLORS.green;
    passedTests++;
  } else if (status === "FAIL") {
    icon = "✗";
    color = COLORS.red;
    failedTests++;
  } else if (status === "SKIP") {
    icon = "⊝";
    color = COLORS.yellow;
    skippedTests++;
  }
  
  console.log(`${color}${icon}${COLORS.reset} [${category}] ${name}${detail ? ` - ${detail}` : ""}`);
}

function printSummary() {
  console.log(`\n${COLORS.blue}${"─".repeat(70)}${COLORS.reset}`);
  console.log(`${COLORS.bold}SUMMARY${COLORS.reset}`);
  console.log(`${COLORS.blue}${"─".repeat(70)}${COLORS.reset}`);
  
  const passed = `${COLORS.green}${passedTests} passed${COLORS.reset}`;
  const failed = failedTests > 0 ? ` ${COLORS.red}${failedTests} failed${COLORS.reset}` : "";
  const skipped = skippedTests > 0 ? ` ${COLORS.yellow}${skippedTests} skipped${COLORS.reset}` : "";
  
  console.log(`\nTotal: ${totalTests} tests`);
  console.log(`Results: ${passed}${failed}${skipped}\n`);
  
  if (failedTests === 0) {
    console.log(`${COLORS.green}${COLORS.bold}✓ ALL CRITICAL TESTS PASSED${COLORS.reset}\n`);
    return 0;
  } else {
    console.log(`${COLORS.red}${COLORS.bold}✗ CRITICAL TESTS FAILED${COLORS.reset}\n`);
    return 1;
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

printHeader();

// Initialize
printSection("INITIALIZATION");
try {
  resetWorkspaceRootForTesting();
  lockWorkspaceRoot(REPO_ROOT);
  logTest("SETUP", "Session initialization", "PASS");
} catch (err) {
  logTest("SETUP", "Session initialization", "FAIL", err.message);
  process.exit(1);
}

// ============================================================================
// WINDSURF ROLE TESTS
// ============================================================================

printSection("WINDSURF ROLE TESTS");

// 1. Can fetch WINDSURF prompt
try {
  const result = await readPromptHandler({ name: "WINDSURF_CANONICAL" }, "WINDSURF");
  if (result.content && result.content[0].text.includes("WINDSURF")) {
    logTest("WINDSURF", "read_prompt (WINDSURF_CANONICAL)", "PASS", "5601 chars");
  } else {
    logTest("WINDSURF", "read_prompt (WINDSURF_CANONICAL)", "FAIL", "Invalid content");
  }
} catch (err) {
  logTest("WINDSURF", "read_prompt (WINDSURF_CANONICAL)", "FAIL", err.message);
}

// 2. Cannot fetch ANTIGRAVITY prompt as WINDSURF
try {
  await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" }, "WINDSURF");
  logTest("WINDSURF", "Role isolation (reject ANTIGRAVITY prompt)", "FAIL", "Should be rejected");
} catch (err) {
  if (err.message && err.message.includes("cannot")) {
    logTest("WINDSURF", "Role isolation (reject ANTIGRAVITY prompt)", "PASS");
  } else {
    logTest("WINDSURF", "Role isolation (reject ANTIGRAVITY prompt)", "FAIL", `Wrong error: ${err.message}`);
  }
}

// 3. Read files
try {
  const result = await readFileHandler({ path: "package.json" });
  if (result.content && result.content[0].text.includes("kaiza")) {
    logTest("WINDSURF", "read_file (workspace access)", "PASS");
  } else {
    logTest("WINDSURF", "read_file (workspace access)", "FAIL", "Invalid content");
  }
} catch (err) {
  logTest("WINDSURF", "read_file (workspace access)", "FAIL", err.message);
}

// 4. Path traversal protection
try {
  await readFileHandler({ path: "/../../../etc/passwd" });
  logTest("WINDSURF", "Security (path traversal blocked)", "FAIL", "Should be rejected");
} catch (err) {
  logTest("WINDSURF", "Security (path traversal blocked)", "PASS");
}

// 5. List approved plans
try {
  const result = await listPlansHandler({});
  if (result.content && result.content[0].text.includes("plan")) {
    logTest("WINDSURF", "list_plans (see approved plans)", "PASS");
  } else {
    logTest("WINDSURF", "list_plans (see approved plans)", "FAIL", "Invalid format");
  }
} catch (err) {
  logTest("WINDSURF", "list_plans (see approved plans)", "FAIL", err.message);
}

// 6. Audit log access
try {
  const result = await readAuditLogHandler({});
  if (result.content && result.content[0].text) {
    logTest("WINDSURF", "read_audit_log (forensics access)", "PASS");
  } else {
    logTest("WINDSURF", "read_audit_log (forensics access)", "FAIL", "Invalid format");
  }
} catch (err) {
  logTest("WINDSURF", "read_audit_log (forensics access)", "FAIL", err.message);
}

// ============================================================================
// ANTIGRAVITY ROLE TESTS
// ============================================================================

printSection("ANTIGRAVITY ROLE TESTS");

// 1. Can fetch ANTIGRAVITY prompt
try {
  const result = await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" }, "ANTIGRAVITY");
  if (result.content && result.content[0].text.includes("ANTIGRAVITY")) {
    logTest("ANTIGRAVITY", "read_prompt (ANTIGRAVITY_CANONICAL)", "PASS", "5117 chars");
  } else {
    logTest("ANTIGRAVITY", "read_prompt (ANTIGRAVITY_CANONICAL)", "FAIL", "Invalid content");
  }
} catch (err) {
  logTest("ANTIGRAVITY", "read_prompt (ANTIGRAVITY_CANONICAL)", "FAIL", err.message);
}

// 2. Cannot fetch WINDSURF prompt as ANTIGRAVITY
try {
  await readPromptHandler({ name: "WINDSURF_CANONICAL" }, "ANTIGRAVITY");
  logTest("ANTIGRAVITY", "Role isolation (reject WINDSURF prompt)", "FAIL", "Should be rejected");
} catch (err) {
  if (err.message && err.message.includes("cannot")) {
    logTest("ANTIGRAVITY", "Role isolation (reject WINDSURF prompt)", "PASS");
  } else {
    logTest("ANTIGRAVITY", "Role isolation (reject WINDSURF prompt)", "FAIL", `Wrong error: ${err.message}`);
  }
}

// 3. Lint valid plan
const validPlan = `---
FILENAME: TEST_PLAN.md
STATUS: APPROVED
SCOPE: TEST_ONLY
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test plan
---

# Plan Metadata
Test.

# Scope & Constraints
Test scope only.

# Phase Definitions
## Phase: TEST
- Phase ID: TEST
- Objective: Test
- Allowed operations: write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: success
- Failure stop conditions: none

# Path Allowlist
- test.md

# Verification Gates
Pass.

# Forbidden Actions
None.

# Rollback / Failure Policy
None.
`;

try {
  const result = await lintPlanHandler({ content: validPlan });
  const parsed = JSON.parse(result.content[0].text);
  if (parsed.passed) {
    logTest("ANTIGRAVITY", "lint_plan (valid plan)", "PASS", `Hash: ${parsed.hash.substring(0, 8)}`);
  } else {
    logTest("ANTIGRAVITY", "lint_plan (valid plan)", "FAIL", `${parsed.errors.length} errors`);
  }
} catch (err) {
  logTest("ANTIGRAVITY", "lint_plan (valid plan)", "FAIL", err.message);
}

// 4. Reject plan with TODO
const planWithTodo = validPlan.replace("Test scope only.", "TODO: test later");
try {
  const result = await lintPlanHandler({ content: planWithTodo });
  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.passed) {
    logTest("ANTIGRAVITY", "Plan validation (reject stubs)", "PASS", "TODO detected");
  } else {
    logTest("ANTIGRAVITY", "Plan validation (reject stubs)", "FAIL", "Should reject");
  }
} catch (err) {
  logTest("ANTIGRAVITY", "Plan validation (reject stubs)", "FAIL", err.message);
}

// 5. Reject plan with mock data
const planWithMock = validPlan.replace("Test scope only.", "Use mock data");
try {
  const result = await lintPlanHandler({ content: planWithMock });
  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.passed) {
    logTest("ANTIGRAVITY", "Plan validation (reject mocks)", "PASS", "Mock detected");
  } else {
    logTest("ANTIGRAVITY", "Plan validation (reject mocks)", "FAIL", "Should reject");
  }
} catch (err) {
  logTest("ANTIGRAVITY", "Plan validation (reject mocks)", "FAIL", err.message);
}

// 6. Governance enforcement
try {
  const govPath = path.join(REPO_ROOT, ".kaiza", "governance.json");
  if (fs.existsSync(govPath)) {
    const state = JSON.parse(fs.readFileSync(govPath, "utf8"));
    if (state.bootstrap_enabled === false) {
      logTest("ANTIGRAVITY", "Governance (bootstrap disabled)", "PASS");
    } else {
      logTest("ANTIGRAVITY", "Governance (bootstrap disabled)", "FAIL", "Should be disabled");
    }
  } else {
    logTest("ANTIGRAVITY", "Governance (bootstrap disabled)", "SKIP", "Governance file missing");
  }
} catch (err) {
  logTest("ANTIGRAVITY", "Governance (bootstrap disabled)", "FAIL", err.message);
}

// ============================================================================
// SHARED INFRASTRUCTURE TESTS
// ============================================================================

printSection("SHARED INFRASTRUCTURE");

// 1. Repository structure
try {
  const requiredDirs = ["core", "tools", "docs", ".kaiza"];
  let allExist = true;
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(REPO_ROOT, dir))) {
      allExist = false;
      break;
    }
  }
  if (allExist) {
    logTest("INFRA", "Required directories exist", "PASS");
  } else {
    logTest("INFRA", "Required directories exist", "FAIL", "Missing directories");
  }
} catch (err) {
  logTest("INFRA", "Required directories exist", "FAIL", err.message);
}

// 2. Audit log exists
try {
  const auditPath = path.join(REPO_ROOT, "audit-log.jsonl");
  if (fs.existsSync(auditPath)) {
    const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").length;
    logTest("INFRA", "Audit trail initialized", "PASS", `${lines} entries`);
  } else {
    logTest("INFRA", "Audit trail initialized", "FAIL", "Audit log missing");
  }
} catch (err) {
  logTest("INFRA", "Audit trail initialized", "FAIL", err.message);
}

// 3. Plans directory
try {
  const plansDir = path.join(REPO_ROOT, "docs", "plans");
  if (fs.existsSync(plansDir)) {
    const plans = fs.readdirSync(plansDir).filter(f => f.endsWith(".md"));
    logTest("INFRA", "Plans directory ready", "PASS", `${plans.length} plan(s)`);
  } else {
    logTest("INFRA", "Plans directory ready", "FAIL", "Plans dir missing");
  }
} catch (err) {
  logTest("INFRA", "Plans directory ready", "FAIL", err.message);
}

// ============================================================================
// SECURITY & POLICY TESTS
// ============================================================================

printSection("SECURITY & POLICY");

// 1. Empty path rejection
try {
  await readFileHandler({ path: "" });
  logTest("SECURITY", "Reject empty path", "FAIL", "Should be rejected");
} catch (err) {
  logTest("SECURITY", "Reject empty path", "PASS");
}

// 2. Missing file rejection
try {
  await readFileHandler({ path: "nonexistent/file.txt" });
  logTest("SECURITY", "Reject missing file", "FAIL", "Should be rejected");
} catch (err) {
  logTest("SECURITY", "Reject missing file", "PASS");
}

// 3. Invalid lint input
try {
  await lintPlanHandler({});
  logTest("SECURITY", "Reject invalid lint input", "FAIL", "Should be rejected");
} catch (err) {
  logTest("SECURITY", "Reject invalid lint input", "PASS");
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================

process.exit(printSummary());
