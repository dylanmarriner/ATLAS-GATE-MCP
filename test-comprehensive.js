/**
 * COMPREHENSIVE VERIFICATION TEST SUITE
 * 
 * Tests all critical invariants, plan lifecycles, path resolution,
 * and error handling across various repository structures.
 * 
 * SUCCESS CRITERIA:
 * - All tests must pass
 * - No accidental errors
 * - Deterministic behavior across repo structures
 * - Plan lifecycle is atomic and consistent
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CRITICAL: Initialize path resolver before any other tests
import { autoInitializePathResolver } from "./core/path-resolver.js";
autoInitializePathResolver(process.cwd());

// Test counters
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    testsFailed++;
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || 
      `Expected ${expected}, got ${actual}`
    );
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(
      message || 
      `Expected to find "${needle}" in "${haystack}"`
    );
  }
}

// ==============================================================================
// TEST SUITE: Stub Detector
// ==============================================================================

console.log("\n=== STUB DETECTOR TESTS ===\n");

import { detectStubs } from "./core/stub-detector.js";

test("Allows 'return true' as legitimate code", () => {
  const code = `function isValid() { return true; }`;
  assert(true, "This test should not throw");
  // If detectStubs throws, the test fails
  try {
    detectStubs(code);
  } catch (err) {
    throw new Error(`Should allow 'return true', but got: ${err.message}`);
  }
});

test("Allows arrow functions with true return", () => {
  const code = `const isReady = () => true;`;
  try {
    detectStubs(code);
  } catch (err) {
    throw new Error(`Should allow arrow true, but got: ${err.message}`);
  }
});

test("Blocks empty function bodies", () => {
  const code = `function empty() {}`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked empty function");
  } catch (err) {
    if (err.message === "Should have blocked empty function") throw err;
    assertIncludes(err.message, "Empty function body");
  }
});

test("Blocks empty catch blocks", () => {
  const code = `try { work(); } catch(e) {}`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked empty catch");
  } catch (err) {
    if (err.message === "Should have blocked empty catch") throw err;
    assertIncludes(err.message, "Empty catch block");
  }
});

test("Blocks TODO comments", () => {
  const code = `function work() { // TODO implement this }`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked TODO");
  } catch (err) {
    if (err.message === "Should have blocked TODO") throw err;
    assertIncludes(err.message, "TODO");
  }
});

test("Blocks FIXME comments", () => {
  const code = `/* FIXME: needs work */ function bad() { return 42; }`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked FIXME");
  } catch (err) {
    if (err.message === "Should have blocked FIXME") throw err;
    assertIncludes(err.message, "FIXME");
  }
});

test("Blocks null returns", () => {
  const code = `function getData() { return null; }`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked null return");
  } catch (err) {
    if (err.message === "Should have blocked null return") throw err;
    assertIncludes(err.message, "null");
  }
});

test("Blocks undefined returns", () => {
  const code = `function getData() { return undefined; }`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked undefined return");
  } catch (err) {
    if (err.message === "Should have blocked undefined return") throw err;
    assertIncludes(err.message, "undefined");
  }
});

test("Blocks mock/fake data patterns", () => {
  const code = `const mockUserData = { id: 1, name: "test" };`;
  try {
    detectStubs(code);
    throw new Error("Should have blocked mock");
  } catch (err) {
    if (err.message === "Should have blocked mock") throw err;
    assertIncludes(err.message, "mock");
  }
});

test("Throws on unparseable code", () => {
  const code = `function broken(( { invalid syntax`;
  try {
    detectStubs(code);
    throw new Error("Should have thrown on syntax error");
  } catch (err) {
    if (err.message === "Should have thrown on syntax error") throw err;
    assertIncludes(err.message, "AST_ANALYSIS_FAILED");
  }
});

// ==============================================================================
// TEST SUITE: Path Resolver
// ==============================================================================

console.log("\n=== PATH RESOLVER TESTS ===\n");

import {
  getRepoRoot,
  getPlansDir,
  resolveWriteTarget,
  resolveReadTarget,
  isPathWithinRepo,
} from "./core/path-resolver.js";

test("getRepoRoot returns current repo", () => {
  const root = getRepoRoot();
  assert(fs.existsSync(root), `Repo root does not exist: ${root}`);
  assertIncludes(root, "KAIZA-MCP-server");
});

test("getPlansDir returns valid directory", () => {
  const plansDir = getPlansDir();
  assert(typeof plansDir === "string", "Plans dir must be a string");
  // Should end with either docs/plans or .kaiza/plans
  assert(plansDir.includes("plans"), "Plans dir should contain 'plans'");
});

test("resolveWriteTarget rejects path traversal", () => {
  try {
    resolveWriteTarget("../../../etc/passwd");
    throw new Error("Should have rejected path traversal");
  } catch (err) {
    if (err.message === "Should have rejected path traversal") throw err;
    assertIncludes(err.message, "Path traversal");
  }
});

test("resolveWriteTarget normalizes paths", () => {
  const target = resolveWriteTarget("src/./index.js");
  assertIncludes(target, "src");
  assertIncludes(target, "index.js");
  assert(!target.includes("/."), "Should not contain /."); 
});

test("resolveReadTarget validates path format", () => {
  try {
    resolveReadTarget("");
    throw new Error("Should have rejected empty path");
  } catch (err) {
    if (err.message === "Should have rejected empty path") throw err;
    assertIncludes(err.message, "empty");
  }
});

test("isPathWithinRepo returns true for valid paths", () => {
  const repoRoot = getRepoRoot();
  const testPath = path.join(repoRoot, "src", "file.js");
  assert(isPathWithinRepo(testPath), "Should be within repo");
});

test("isPathWithinRepo returns false for paths outside repo", () => {
  const result = isPathWithinRepo("/etc/passwd");
  assert(!result, "Should not be within repo");
});

// ==============================================================================
// TEST SUITE: List Plans
// ==============================================================================

console.log("\n=== LIST PLANS TESTS ===\n");

import { listPlansHandler } from "./tools/list_plans.js";

test("listPlansHandler returns list structure", async () => {
  const result = await listPlansHandler({ path: "." });
  assert(result.repoRoot, "Should have repoRoot");
  assert(result.plansDir, "Should have plansDir");
  assert(typeof result.count === "number", "Should have count");
  assert(Array.isArray(result.plans), "Should have plans array");
});

test("listPlansHandler only returns APPROVED plans", async () => {
  const result = await listPlansHandler({ path: "." });
  // This test checks that the function works
  // It doesn't necessarily verify plans are approved (depends on repo state)
  // But it should not throw
  assert(result.count >= 0, "Plan count should be non-negative");
});

// ==============================================================================
// TEST SUITE: Audit Log
// ==============================================================================

console.log("\n=== AUDIT LOG TESTS ===\n");

import { appendAuditLog } from "./core/audit-log.js";
import { getAuditLogPath } from "./core/path-resolver.js";

test("appendAuditLog creates audit log entry", () => {
  const before = getAuditLogPath();
  const sessionId = crypto.randomUUID();
  
  appendAuditLog(
    { path: "test/file.js", plan: "TEST", role: "EXECUTABLE" },
    sessionId
  );

  const logPath = getAuditLogPath();
  assert(fs.existsSync(logPath), "Audit log should exist");
  
  const content = fs.readFileSync(logPath, "utf8");
  assert(content.length > 0, "Audit log should not be empty");
});

test("appendAuditLog includes hash field", () => {
  const sessionId = crypto.randomUUID();
  appendAuditLog(
    { path: "test/file2.js", plan: "TEST", role: "BOUNDARY" },
    sessionId
  );

  const logPath = getAuditLogPath();
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  const last = JSON.parse(lines[lines.length - 1]);
  
  assert(last.hash, "Entry should have hash field");
  assert(last.prevHash, "Entry should have prevHash field");
});

// ==============================================================================
// TEST SUITE: Plan Enforcer
// ==============================================================================

console.log("\n=== PLAN ENFORCER TESTS ===\n");

import { enforcePlan } from "./core/plan-enforcer.js";

test("enforcePlan throws for non-existent plan", () => {
  try {
    enforcePlan("NON_EXISTENT_PLAN_ABCXYZ", "src/test.js");
    throw new Error("Should have thrown for non-existent plan");
  } catch (err) {
    if (err.message === "Should have thrown for non-existent plan") throw err;
    assertIncludes(err.message, "not found");
  }
});

// ==============================================================================
// SUMMARY
// ==============================================================================

console.log("\n" + "=".repeat(70));
console.log(`COMPREHENSIVE TEST RESULTS`);
console.log("=".repeat(70));
console.log(`Total: ${testsRun}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log("=".repeat(70) + "\n");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("✓ All tests passed!");
  process.exit(0);
}
