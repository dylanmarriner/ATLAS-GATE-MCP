#!/usr/bin/env node

/**
 * BOOTSTRAP FIX VERIFICATION TEST
 * 
 * Tests that the bootstrap system works correctly in any repository without
 * hardcoded paths or mock data.
 * 
 * Run: node tests/bootstrap-fix-verification.js
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  lockWorkspaceRoot,
  resetWorkspaceRootForTesting,
} from "../core/path-resolver.js";
import { bootstrapPlanHandler } from "../tools/bootstrap_tool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");

console.log("\n=== BOOTSTRAP FIX VERIFICATION TEST ===\n");

// Reset and lock workspace
resetWorkspaceRootForTesting();
lockWorkspaceRoot(REPO_ROOT);

const SECRET = "test-bootstrap-secret";
process.env.KAIZA_BOOTSTRAP_SECRET = SECRET;

// Clean state for testing
const govPath = path.join(REPO_ROOT, ".kaiza", "governance.json");
if (fs.existsSync(govPath)) {
  const state = JSON.parse(fs.readFileSync(govPath, "utf8"));
  if (!state.bootstrap_enabled) {
    console.warn("⚠️  Bootstrap already completed in this repo.");
    console.warn("   This test needs a fresh workspace. Skipping tests.");
    process.exit(0);
  }
}

// Valid test plan
const VALID_PLAN = `---
FILENAME: BOOTSTRAP_FIX_TEST.md
STATUS: APPROVED
SCOPE: BOOTSTRAP_ONLY
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Test bootstrap system fixes
---

# Plan Metadata

This plan verifies the bootstrap system works without hardcoded paths.

# Scope & Constraints

Bootstrap only. No hardcoded paths. Uses workspace-relative resolution.

# Phase Definitions

## Phase: BOOTSTRAP_VERIFICATION

- Phase ID: BOOTSTRAP_VERIFICATION
- Objective: Verify bootstrap system is portable
- Allowed operations: file write
- Forbidden operations: none
- Required intent artifacts: none
- Verification commands: none
- Expected outcomes: bootstrap succeeds with workspace-relative paths
- Failure stop conditions: none

# Path Allowlist

- docs/plans/**
- .kaiza/governance.json

# Verification Gates

All gates pass.

# Forbidden Actions

None forbidden.

# Rollback / Failure Policy

No rollback needed.
`;

// Plan with TODO (should be rejected)
const PLAN_WITH_TODO = `---
FILENAME: TODO_PLAN.md
STATUS: APPROVED
SCOPE: TEST
VERSION: 1.0.0
CREATED: 2026-01-20
PURPOSE: Plan with TODO
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
- Expected outcomes: fail
- Failure stop conditions: none

# Path Allowlist

- docs/test.md

# Verification Gates

Pass.

# Forbidden Actions

None.

# Rollback / Failure Policy

None.
`;

function createPayload() {
  return {
    repoIdentifier: "bootstrap-test",
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    action: "BOOTSTRAP_CREATE_FOUNDATION_PLAN",
  };
}

function signPayload(payload) {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

async function testValidBootstrap() {
  console.log("TEST 1: Valid Plan Bootstrap (No Hardcoded Paths)");
  console.log("─".repeat(50));

  const payload = createPayload();
  const signature = signPayload(payload);

  try {
    const result = await bootstrapPlanHandler({
      path: REPO_ROOT,
      planContent: VALID_PLAN,
      payload,
      signature,
    });

    const parsed = JSON.parse(result.content[0].text);
    console.log("✓ Bootstrap succeeded");
    console.log(`  Plan ID: ${parsed.planId}`);
    console.log(`  Plan Path: ${parsed.planPath}`);

    // Verify governance state
    const govState = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, ".kaiza", "governance.json"), "utf8")
    );
    if (govState.bootstrap_enabled === false && govState.approved_plans_count === 1) {
      console.log("✓ Governance state correct (bootstrap_enabled=false)");
    } else {
      throw new Error("Governance state incorrect");
    }

    // Verify plan file exists
    if (fs.existsSync(parsed.planPath)) {
      console.log("✓ Plan file created at workspace-relative path");
      const content = fs.readFileSync(parsed.planPath, "utf8");
      if (content.includes("BOOTSTRAP_VERIFICATION")) {
        console.log("✓ Plan content verified on disk");
      }
    } else {
      throw new Error("Plan file not found");
    }

    return true;
  } catch (err) {
    console.error("✗ FAILED:", err.message);
    return false;
  }
}

async function testStubRejection() {
  console.log("\nTEST 2: Stub Detection (TODO Rejection)");
  console.log("─".repeat(50));

  const payload = createPayload();
  const signature = signPayload(payload);

  try {
    await bootstrapPlanHandler({
      path: REPO_ROOT,
      planContent: PLAN_WITH_TODO,
      payload,
      signature,
    });

    console.error("✗ FAILED: Plan with TODO should have been rejected");
    return false;
  } catch (err) {
    if (
      err.message.includes("TODO") ||
      err.message.includes("stub") ||
      err.message.includes("incomplete")
    ) {
      console.log("✓ Plan with TODO correctly rejected");
      console.log(`  Error: ${err.message.substring(0, 80)}...`);
      return true;
    } else {
      console.error("✗ FAILED: Wrong error:", err.message);
      return false;
    }
  }
}

async function testDoubleBootstrap() {
  console.log("\nTEST 3: Bootstrap Disabled on Second Attempt");
  console.log("─".repeat(50));

  const payload = createPayload();
  const signature = signPayload(payload);

  try {
    await bootstrapPlanHandler({
      path: REPO_ROOT,
      planContent: VALID_PLAN,
      payload,
      signature,
    });

    console.error("✗ FAILED: Second bootstrap should have been rejected");
    return false;
  } catch (err) {
    if (err.message.includes("BOOTSTRAP_DISABLED")) {
      console.log("✓ Second bootstrap correctly rejected");
      console.log(`  Error: ${err.message}`);
      return true;
    } else {
      console.error("✗ FAILED: Wrong error:", err.message);
      return false;
    }
  }
}

async function runTests() {
  const results = [];

  results.push(await testValidBootstrap());
  results.push(await testStubRejection());
  results.push(await testDoubleBootstrap());

  console.log("\n=== SUMMARY ===\n");
  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`Tests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("\n✓ All bootstrap fixes verified successfully!");
    console.log("  - No hardcoded paths");
    console.log("  - Stub detection working");
    console.log("  - One-time bootstrap enforced");
    process.exit(0);
  } else {
    console.error("\n✗ Some tests failed");
    process.exit(1);
  }
}

// Run all tests
runTests();
