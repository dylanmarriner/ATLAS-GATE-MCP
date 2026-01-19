/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Failure simulation harness for testing kill-switch and drills
 * AUTHORITY: MCP CATASTROPHIC FAILURE SPEC
 * 
 * Implements deterministic failure injection (test/drill mode only):
 * - Scoped to single run
 * - Auditable
 * - Never enabled in production by default
 * - Repeatable and deterministic
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// Simulation modes
export const SIMULATION_MODE = {
  DISABLED: "DISABLED",
  TEST: "TEST",
  DRILL: "DRILL"
};

// Failure types that can be simulated
export const SIMULABLE_FAILURES = {
  AUDIT_WRITE_FAILURE: "audit_write_failure",
  AUDIT_HASH_MISMATCH: "audit_hash_mismatch",
  POLICY_ENGINE_CRASH: "policy_engine_crash",
  REPLAY_DIVERGENCE: "replay_divergence",
  OPERATOR_FATIGUE_BREACH: "operator_fatigue_breach",
  FILESYSTEM_PERMISSION_DENIED: "filesystem_permission_denied",
  PLAN_HASH_MISMATCH: "plan_hash_mismatch",
  STARTUP_GATE_FAILURE: "startup_gate_failure"
};

/**
 * Simulation context - stores active simulation state for current run
 */
class SimulationContext {
  constructor(mode = SIMULATION_MODE.DISABLED) {
    this.mode = mode;
    this.failures = new Set();
    this.seed = null;
    this.injection_points = {};
    this.results = {};
    this.start_time = null;
    this.end_time = null;
  }

  inject(failureType) {
    if (this.mode === SIMULATION_MODE.DISABLED) {
      return false;
    }
    this.failures.add(failureType);
    return true;
  }

  shouldFail(failureType) {
    return this.failures.has(failureType);
  }

  recordResult(failureType, result) {
    this.results[failureType] = result;
  }

  toJSON() {
    return {
      mode: this.mode,
      failures: Array.from(this.failures),
      seed: this.seed,
      injection_points: this.injection_points,
      results: this.results,
      duration_ms: this.end_time - this.start_time || null
    };
  }
}

// Global simulation context (reset per session)
let GLOBAL_SIMULATION_CONTEXT = new SimulationContext(SIMULATION_MODE.DISABLED);

/**
 * Initialize simulation mode for the session
 */
export function initializeSimulation(mode = SIMULATION_MODE.TEST, seed = null) {
  if (mode === SIMULATION_MODE.DISABLED) {
    GLOBAL_SIMULATION_CONTEXT = new SimulationContext(SIMULATION_MODE.DISABLED);
    return { initialized: false };
  }

  GLOBAL_SIMULATION_CONTEXT = new SimulationContext(mode);
  GLOBAL_SIMULATION_CONTEXT.seed = seed || crypto.randomBytes(16).toString("hex");
  GLOBAL_SIMULATION_CONTEXT.start_time = Date.now();

  return {
    initialized: true,
    mode,
    seed: GLOBAL_SIMULATION_CONTEXT.seed
  };
}

/**
 * Disable simulation mode (for production safety)
 */
export function disableSimulation() {
  GLOBAL_SIMULATION_CONTEXT = new SimulationContext(SIMULATION_MODE.DISABLED);
  return { disabled: true };
}

/**
 * Get current simulation mode
 */
export function getSimulationMode() {
  return GLOBAL_SIMULATION_CONTEXT.mode;
}

/**
 * Inject a failure for current simulation
 */
export function injectFailure(failureType) {
  if (GLOBAL_SIMULATION_CONTEXT.mode === SIMULATION_MODE.DISABLED) {
    throw new Error(
      `Cannot inject failure: simulation mode is ${SIMULATION_MODE.DISABLED}`
    );
  }

  if (!Object.values(SIMULABLE_FAILURES).includes(failureType)) {
    throw new Error(`Unknown simulable failure type: ${failureType}`);
  }

  return GLOBAL_SIMULATION_CONTEXT.inject(failureType);
}

/**
 * Check if a failure should occur at this injection point
 */
export function checkSimulatedFailure(failureType) {
  if (GLOBAL_SIMULATION_CONTEXT.mode === SIMULATION_MODE.DISABLED) {
    return false;
  }

  return GLOBAL_SIMULATION_CONTEXT.shouldFail(failureType);
}

/**
 * Record simulation result
 */
export function recordSimulationResult(failureType, result) {
  GLOBAL_SIMULATION_CONTEXT.recordResult(failureType, result);
}

/**
 * Finalize simulation and get results
 */
export function finalizeSimulation() {
  GLOBAL_SIMULATION_CONTEXT.end_time = Date.now();
  const results = GLOBAL_SIMULATION_CONTEXT.toJSON();

  // Disable simulation after finalization
  disableSimulation();

  return results;
}

/**
 * Get current simulation state (for inspection)
 */
export function getSimulationState() {
  return {
    mode: GLOBAL_SIMULATION_CONTEXT.mode,
    active_failures: Array.from(GLOBAL_SIMULATION_CONTEXT.failures),
    seed: GLOBAL_SIMULATION_CONTEXT.seed
  };
}

/**
 * Simulation helpers - These are called from production code at injection points
 */

/**
 * Simulated audit write failure
 */
export function simulateAuditWriteFailure() {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.AUDIT_WRITE_FAILURE)) {
    recordSimulationResult(SIMULABLE_FAILURES.AUDIT_WRITE_FAILURE, {
      triggered: true,
      timestamp: new Date().toISOString()
    });
    throw new Error("SIMULATED: Audit write failure");
  }
}

/**
 * Simulated hash mismatch
 */
export function simulateHashMismatch(original, computed) {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.AUDIT_HASH_MISMATCH)) {
    recordSimulationResult(SIMULABLE_FAILURES.AUDIT_HASH_MISMATCH, {
      triggered: true,
      original,
      computed_modified: crypto.randomBytes(32).toString("hex"),
      timestamp: new Date().toISOString()
    });
    return true; // Mismatch detected
  }
  return false; // No mismatch
}

/**
 * Simulated policy engine crash
 */
export function simulatePolicyEngineCrash() {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.POLICY_ENGINE_CRASH)) {
    recordSimulationResult(SIMULABLE_FAILURES.POLICY_ENGINE_CRASH, {
      triggered: true,
      timestamp: new Date().toISOString()
    });
    throw new Error("SIMULATED: Policy engine crash");
  }
}

/**
 * Simulated replay divergence
 */
export function simulateReplayDivergence() {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.REPLAY_DIVERGENCE)) {
    recordSimulationResult(SIMULABLE_FAILURES.REPLAY_DIVERGENCE, {
      triggered: true,
      original_hash: crypto.randomBytes(32).toString("hex"),
      replay_hash: crypto.randomBytes(32).toString("hex"),
      timestamp: new Date().toISOString()
    });
    throw new Error("SIMULATED: Replay divergence detected");
  }
}

/**
 * Simulated operator fatigue breach (configurable threshold)
 */
export function simulateOperatorFatigueBreachReached(errorCount, threshold) {
  if (
    checkSimulatedFailure(SIMULABLE_FAILURES.OPERATOR_FATIGUE_BREACH) &&
    errorCount >= threshold
  ) {
    recordSimulationResult(SIMULABLE_FAILURES.OPERATOR_FATIGUE_BREACH, {
      triggered: true,
      error_count: errorCount,
      threshold,
      timestamp: new Date().toISOString()
    });
    throw new Error(
      `SIMULATED: Operator fatigue breach (${errorCount} errors >= ${threshold} threshold)`
    );
  }
}

/**
 * Simulated filesystem permission denial
 */
export function simulateFilesystemPermissionDenied(filePath) {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.FILESYSTEM_PERMISSION_DENIED)) {
    recordSimulationResult(SIMULABLE_FAILURES.FILESYSTEM_PERMISSION_DENIED, {
      triggered: true,
      path: filePath,
      timestamp: new Date().toISOString()
    });
    const err = new Error(`SIMULATED: Permission denied: ${filePath}`);
    err.code = "EACCES";
    throw err;
  }
}

/**
 * Simulated plan hash mismatch
 */
export function simulatePlanHashMismatch(expectedHash) {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.PLAN_HASH_MISMATCH)) {
    const fakeHash = crypto.randomBytes(32).toString("hex");
    recordSimulationResult(SIMULABLE_FAILURES.PLAN_HASH_MISMATCH, {
      triggered: true,
      expected: expectedHash,
      actual: fakeHash,
      timestamp: new Date().toISOString()
    });
    throw new Error(
      `SIMULATED: Plan hash mismatch (expected ${expectedHash}, got ${fakeHash})`
    );
  }
}

/**
 * Simulated startup gate failure
 */
export function simulateStartupGateFailure() {
  if (checkSimulatedFailure(SIMULABLE_FAILURES.STARTUP_GATE_FAILURE)) {
    recordSimulationResult(SIMULABLE_FAILURES.STARTUP_GATE_FAILURE, {
      triggered: true,
      timestamp: new Date().toISOString()
    });
    throw new Error("SIMULATED: Startup gate failure");
  }
}
