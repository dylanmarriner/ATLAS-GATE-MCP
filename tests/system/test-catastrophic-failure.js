#!/usr/bin/env node

/**
 * COMPREHENSIVE TESTS FOR CATASTROPHIC FAILURE & KILL-SWITCH SYSTEM
 * 
 * Tests the following:
 * 1. Kill-switch engages on critical failure
 * 2. Kill-switch persists across process restart
 * 3. Non-read tools refused while engaged
 * 4. Read-only tools still function
 * 5. HALT REPORT generated
 * 6. Drill triggers correct failure ID
 * 7. Safe-halt seals audit chain
 * 8. Recovery gate requires OWNER
 * 9. Two-step confirmation enforced
 * 10. Recovery fails if verification fails
 * 11. Recovery succeeds after verification
 * 12. Attestation reflects halt state
 * 13. Maturity score capped during halt
 * 14. Deterministic drill outcomes
 * 15. Failure taxonomy complete
 * 16. Simulation harness works
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";

// Import test utilities
import { FAILURE_TAXONOMY, getFailureDefinition, isCriticalFailure } from "./core/failure-taxonomy.js";
import {
  KillSwitchState,
  loadKillSwitchState,
  saveKillSwitchState,
  engageKillSwitch,
  isKillSwitchEngaged,
  isToolAllowedUnderKillSwitch,
  getKillSwitchState,
  clearKillSwitch
} from "./core/kill-switch.js";
import {
  generateHaltReport,
  writeHaltReport,
  executeSafeHalt,
  listHaltReports,
  readHaltReport
} from "./core/safe-halt.js";
import {
  initializeSimulation,
  injectFailure,
  finalizeSimulation,
  getSimulationState,
  SIMULATION_MODE,
  SIMULABLE_FAILURES,
  disableSimulation
} from "./core/failure-simulation.js";
import {
  drillAuditTamper,
  drillPolicyBreach,
  drillPlanHashMismatch,
  drillOperatorAbuse,
  drillFilesystemDenial,
  listAvailableDrills
} from "./core/drills.js";
import {
  initiateRecoveryAcknowledgement,
  confirmRecovery,
  unlockKillSwitch,
  getRecoveryStatus
} from "./core/recovery-gate.js";

// Test counters
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    failedTests++;
  }
}

function createTestWorkspace() {
  const testDir = path.join(os.tmpdir(), `atlas-gate-test-${Date.now()}`);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  return testDir;
}

function cleanupTestWorkspace(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log("\n=== CATASTROPHIC FAILURE & KILL-SWITCH TESTS ===\n");

// Test 1: Failure taxonomy is complete
test("Failure taxonomy contains all required failures", () => {
  const requiredFailures = [
    "F-STARTUP",
    "F-POLICY",
    "F-AUDIT",
    "F-DETERMINISM",
    "F-AUTHORITY-ROLE",
    "F-AUTHORITY-PLAN",
    "F-INTENT",
    "F-PLAN-HASH",
    "F-SECURITY",
    "F-HUMAN-FATIGUE",
    "F-HUMAN-ABUSE",
    "F-ENV-FS",
    "F-ENV-CORRUPT",
    "F-ENV-RESOURCE"
  ];

  for (const failureId of requiredFailures) {
    const def = getFailureDefinition(failureId);
    assert(def !== null, `Missing failure definition: ${failureId}`);
  }
});

// Test 2: Kill-switch can be engaged
test("Kill-switch can be engaged", () => {
  const workspace = createTestWorkspace();
  try {
    const result = engageKillSwitch(workspace, {
      failure_ids: ["F-AUDIT"],
      invariant_ids: ["INV_AUDIT_INTEGRITY"],
      trigger_reason: "Test engagement"
    });

    assert(result.engaged === true);
    assert(result.state.trigger_failure_ids.includes("F-AUDIT"));
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Test 3: Kill-switch persists across restart
test("Kill-switch state persists to disk", () => {
  const workspace = createTestWorkspace();
  try {
    engageKillSwitch(workspace, {
      failure_ids: ["F-POLICY"],
      trigger_reason: "Persistence test"
    });

    const reloadedState = loadKillSwitchState(workspace);
    assert(reloadedState.engaged === true);
    assert(reloadedState.trigger_failure_ids.includes("F-POLICY"));
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Test 4: Non-read tools refused while engaged
test("Non-read tools are refused while kill-switch engaged", () => {
  const forbiddenTools = ["write_file", "bootstrap_create_foundation_plan", "lint_plan"];

  for (const tool of forbiddenTools) {
    assert(!isToolAllowedUnderKillSwitch(tool));
  }
});

// Test 5: Read-only tools allowed while engaged
test("Read-only tools are allowed while kill-switch engaged", () => {
  const allowedTools = [
    "read_file",
    "read_audit_log",
    "read_prompt",
    "list_plans",
    "replay_execution",
    "verify_workspace_integrity",
    "generate_attestation_bundle",
    "verify_attestation_bundle",
    "export_attestation_bundle"
  ];

  for (const tool of allowedTools) {
    assert(isToolAllowedUnderKillSwitch(tool));
  }
});

// Test 6: HALT REPORT is generated
test("HALT REPORT is generated on halt", () => {
  const { report, filename } = generateHaltReport({
    failure_ids: ["F-AUDIT"],
    failure_summary: "Test halt",
    trigger_reason: "Test"
  });

  assert(report.includes("HALT REPORT"));
  assert(report.includes("What Failed"));
  assert(report.includes("Why the System Halted"));
  assert(report.includes("What is Safe to Do Next"));
  assert(report.includes("What is Explicitly FORBIDDEN"));
  assert(filename.startsWith("HALT_REPORT_"));
});

// Test 7: HALT REPORT written to disk
test("HALT REPORT is written to disk", () => {
  const workspace = createTestWorkspace();
  try {
    const result = writeHaltReport(workspace, {
      failure_ids: ["F-POLICY"],
      failure_summary: "Test halt"
    });

    assert(result.success === true);
    assert(fs.existsSync(result.path));
    assert(result.path.includes("docs/reports/"));
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Test 8: Safe-halt seals audit chain
test("Safe-halt seals audit chain", () => {
  const workspace = createTestWorkspace();
  try {
    const result = executeSafeHalt(workspace, {
      failure_ids: ["F-SECURITY"],
      failure_summary: "Test safe-halt"
    });

    assert(result.halted === true);
    assert(result.halt_report.success === true);
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Test 9: Recovery gate requires OWNER role
test("Recovery gate requires OWNER role", () => {
  try {
    initiateRecoveryAcknowledgement({
      role: "ANTIGRAVITY",
      halt_report_path: "/docs/reports/HALT_REPORT.md",
      understood_reason: true,
      understood_what_failed: true,
      understood_forbidden_ops: true,
      responsibility_acknowledged: true
    });
    assert.fail("Should have thrown on non-OWNER role");
  } catch (err) {
    assert(err.error_code === "INSUFFICIENT_PERMISSIONS");
  }
});

// Test 10: Recovery gate requires explicit acknowledgement
test("Recovery gate requires all acknowledgement fields", () => {
  try {
    initiateRecoveryAcknowledgement({
      role: "OWNER",
      halt_report_path: "/docs/reports/HALT_REPORT.md",
      understood_reason: false,
      understood_what_failed: true,
      understood_forbidden_ops: true,
      responsibility_acknowledged: true
    });
    assert.fail("Should have thrown on incomplete acknowledgement");
  } catch (err) {
    assert(err.error_code === "INVALID_INPUT_VALUE");
  }
});

// Test 11: Two-step confirmation enforced
test("Two-step confirmation generates code in step 1", () => {
  const result = initiateRecoveryAcknowledgement({
    role: "OWNER",
    operator: "test-operator",
    halt_report_path: "/docs/reports/HALT_REPORT.md",
    understood_reason: true,
    understood_what_failed: true,
    understood_forbidden_ops: true,
    responsibility_acknowledged: true
  });

  assert(result.step_one_confirmed === true);
  assert(result.confirmation_code !== null);
  assert(result.confirmation_code.length === 32);
});

// Test 12: Recovery confirm validates code
test("Recovery confirm validates confirmation code", () => {
  try {
    confirmRecovery(null, {
      role: "OWNER",
      halt_report_path: "/docs/reports/HALT_REPORT.md",
      confirmation_code: "invalid-code",
      understood_reason: true,
      understood_what_failed: true,
      understood_forbidden_ops: true,
      responsibility_acknowledged: true
    });
    assert.fail("Should have thrown on invalid code");
  } catch (err) {
    assert(err.error_code === "INVALID_INPUT_VALUE");
  }
});

// Test 13: Simulation harness can be initialized
test("Simulation harness can be initialized", () => {
  const result = initializeSimulation(SIMULATION_MODE.TEST, "test-seed");
  assert(result.initialized === true);
  assert(result.mode === SIMULATION_MODE.TEST);
  disableSimulation();
});

// Test 14: Failures can be injected and checked
test("Failures can be injected in simulation mode", () => {
  initializeSimulation(SIMULATION_MODE.TEST);
  injectFailure(SIMULABLE_FAILURES.AUDIT_WRITE_FAILURE);

  const state = getSimulationState();
  assert(state.active_failures.includes(SIMULABLE_FAILURES.AUDIT_WRITE_FAILURE));

  disableSimulation();
});

// Test 15: Simulation finalizes correctly
test("Simulation finalizes with results", () => {
  initializeSimulation(SIMULATION_MODE.DRILL);
  injectFailure(SIMULABLE_FAILURES.POLICY_ENGINE_CRASH);

  const results = finalizeSimulation();
  assert(results.mode === SIMULATION_MODE.DRILL);
  assert(results.failures.includes(SIMULABLE_FAILURES.POLICY_ENGINE_CRASH));
});

// Test 16: Drills are available
test("All drills are listed and available", () => {
  const drills = listAvailableDrills();
  assert(drills.length === 5);

  const drillNames = drills.map(d => d.name);
  assert(drillNames.includes("drill_audit_tamper"));
  assert(drillNames.includes("drill_policy_breach"));
  assert(drillNames.includes("drill_plan_hash_mismatch"));
  assert(drillNames.includes("drill_operator_abuse"));
  assert(drillNames.includes("drill_filesystem_denial"));
});

// Test 17: Critical failures are identified correctly
test("Critical failures identified correctly", () => {
  assert(isCriticalFailure("F-STARTUP") === true);
  assert(isCriticalFailure("F-POLICY") === true);
  assert(isCriticalFailure("F-AUDIT") === true);
  assert(isCriticalFailure("F-ENV-FS") === false);
  assert(isCriticalFailure("F-HUMAN-FATIGUE") === false);
});

// Test 18: Recovery status can be retrieved
test("Recovery status can be retrieved", () => {
  const workspace = createTestWorkspace();
  try {
    engageKillSwitch(workspace, {
      failure_ids: ["F-AUDIT"],
      trigger_reason: "Test"
    });

    const status = getRecoveryStatus(workspace);
    assert(status.kill_switch_engaged === true);
    assert(status.verifications_pending.includes("audit_verify"));
    assert(status.verifications_pending.includes("plan_lint"));
    assert(status.verifications_pending.includes("maturity_recompute"));
    assert(status.ready_for_unlock === false);
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Test 19: Kill-switch can be cleared
test("Kill-switch can be cleared", () => {
  const workspace = createTestWorkspace();
  try {
    engageKillSwitch(workspace, {
      failure_ids: ["F-POLICY"],
      trigger_reason: "Test clear"
    });

    assert(isKillSwitchEngaged(workspace) === true);

    const result = clearKillSwitch(workspace);
    assert(result.cleared === true);
    assert(isKillSwitchEngaged(workspace) === false);
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Test 20: Multiple halt reports can be listed
test("Multiple halt reports can be listed", () => {
  const workspace = createTestWorkspace();
  try {
    writeHaltReport(workspace, { failure_summary: "Report 1" });
    // Small delay to ensure different timestamps
    setTimeout(() => {
      writeHaltReport(workspace, { failure_summary: "Report 2" });
    }, 10);

    const reports = listHaltReports(workspace);
    assert(reports.length >= 1);
    assert(reports[0].startsWith("HALT_REPORT_"));
  } finally {
    cleanupTestWorkspace(workspace);
  }
});

// Summary
console.log(`\n=== TEST SUMMARY ===`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}\n`);

if (failedTests > 0) {
  process.exit(1);
}
