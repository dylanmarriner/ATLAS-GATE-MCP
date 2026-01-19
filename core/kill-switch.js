/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Global kill-switch for catastrophic failures
 * AUTHORITY: MCP CATASTROPHIC FAILURE SPEC
 * 
 * Kill-switch behavior (NON-NEGOTIABLE):
 * - Triggered by critical invariant breach, audit tamper, or operator abuse
 * - Persists to /.kaiza/kill_switch.json (survives process restart)
 * - On trigger: refuse ALL non-read tools
 * - On trigger: allow ONLY read-only inspection tools
 * - Startup gate: check kill-switch before serving tools
 * - Recovery: human-only gate with explicit acknowledgement
 */

import fs from "fs";
import path from "path";
import { getRepoRoot } from "./path-resolver.js";
import { SystemError, SYSTEM_ERROR_CODES } from "./system-error.js";

const KILL_SWITCH_DIR = ".kaiza";
const KILL_SWITCH_FILE = "kill_switch.json";

// Kill-switch responses
export const KILL_SWITCH_RESPONSES = {
  HALT: "HALT",           // Stop all writes, block tool execution
  DEGRADED: "DEGRADED",   // Warn but allow reads
  REFUSE: "REFUSE"        // Refuse specific operations
};

/**
 * Kill-switch state object stored in /.kaiza/kill_switch.json
 */
export class KillSwitchState {
  constructor(config = {}) {
    this.engaged = config.engaged || false;
    this.timestamp = config.timestamp || new Date().toISOString();
    this.trigger_failure_ids = config.trigger_failure_ids || [];
    this.trigger_invariant_ids = config.trigger_invariant_ids || [];
    this.trigger_reason = config.trigger_reason || null;
    this.triggered_by_role = config.triggered_by_role || null;
    this.triggered_by_tool = config.triggered_by_tool || null;
    this.halt_report_path = config.halt_report_path || null;
    this.recovery_attempted = config.recovery_attempted || false;
    this.recovery_timestamp = config.recovery_timestamp || null;
    this.recovery_required_verifications = config.recovery_required_verifications || [
      "audit_verify",
      "plan_lint",
      "maturity_recompute"
    ];
    this.recovery_verifications_passed = config.recovery_verifications_passed || {};
  }

  static fromJSON(json) {
    return new KillSwitchState(json);
  }

  toJSON() {
    return {
      engaged: this.engaged,
      timestamp: this.timestamp,
      trigger_failure_ids: this.trigger_failure_ids,
      trigger_invariant_ids: this.trigger_invariant_ids,
      trigger_reason: this.trigger_reason,
      triggered_by_role: this.triggered_by_role,
      triggered_by_tool: this.triggered_by_tool,
      halt_report_path: this.halt_report_path,
      recovery_attempted: this.recovery_attempted,
      recovery_timestamp: this.recovery_timestamp,
      recovery_required_verifications: this.recovery_required_verifications,
      recovery_verifications_passed: this.recovery_verifications_passed
    };
  }
}

/**
 * Get kill-switch file path
 */
function getKillSwitchPath(workspaceRoot) {
  return path.join(workspaceRoot, KILL_SWITCH_DIR, KILL_SWITCH_FILE);
}

/**
 * Load kill-switch state from disk
 */
export function loadKillSwitchState(workspaceRoot) {
  const filePath = getKillSwitchPath(workspaceRoot);

  if (!fs.existsSync(filePath)) {
    return new KillSwitchState({ engaged: false });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return KillSwitchState.fromJSON(data);
  } catch (err) {
    console.error(`[WARN] Failed to load kill-switch state: ${err.message}`);
    // Default to safe state if corrupted
    return new KillSwitchState({ engaged: true, trigger_reason: "CORRUPTED_STATE" });
  }
}

/**
 * Persist kill-switch state to disk
 */
export function saveKillSwitchState(workspaceRoot, state) {
  const filePath = getKillSwitchPath(workspaceRoot);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(state.toJSON(), null, 2));
    return true;
  } catch (err) {
    console.error(`[ERROR] Failed to persist kill-switch state: ${err.message}`);
    return false;
  }
}

/**
 * Engage the global kill-switch
 * 
 * Triggers:
 * - Critical invariant breach
 * - Audit tamper detection
 * - Operator abuse threshold
 * - Explicit human invocation (OWNER only)
 */
export function engageKillSwitch(workspaceRoot, config = {}) {
  const {
    failure_ids = [],
    invariant_ids = [],
    trigger_reason = "UNKNOWN",
    triggered_by_role = null,
    triggered_by_tool = null,
    halt_report_path = null
  } = config;

  const state = new KillSwitchState({
    engaged: true,
    timestamp: new Date().toISOString(),
    trigger_failure_ids: failure_ids,
    trigger_invariant_ids: invariant_ids,
    trigger_reason,
    triggered_by_role,
    triggered_by_tool,
    halt_report_path
  });

  saveKillSwitchState(workspaceRoot, state);

  return {
    engaged: true,
    state,
    message: `Kill-switch engaged: ${trigger_reason}`
  };
}

/**
 * Check if kill-switch is currently engaged
 */
export function isKillSwitchEngaged(workspaceRoot) {
  const state = loadKillSwitchState(workspaceRoot);
  return state.engaged;
}

/**
 * Get current kill-switch state
 */
export function getKillSwitchState(workspaceRoot) {
  return loadKillSwitchState(workspaceRoot);
}

/**
 * Check if tool is allowed while kill-switch is engaged
 */
export function isToolAllowedUnderKillSwitch(toolName) {
  // Read-only tools are always allowed
  const readOnlyTools = new Set([
    "read_file",
    "read_audit_log",
    "read_prompt",
    "list_plans",
    "replay_execution",
    "verify_workspace_integrity",
    "generate_attestation_bundle",
    "verify_attestation_bundle",
    "export_attestation_bundle"
  ]);

  return readOnlyTools.has(toolName);
}

/**
 * Refuse tool execution due to engaged kill-switch
 */
export function throwKillSwitchEngaged(state) {
  throw SystemError.toolFailure(
    SYSTEM_ERROR_CODES.SESSION_LOCKED,
    {
      human_message: `Kill-switch is engaged. Only read-only tools allowed. ` +
        `Reason: ${state.trigger_reason}. ` +
        `See ${state.halt_report_path || "docs/reports/"} for details.`,
      tool_name: "any",
      invariant_id: state.trigger_invariant_ids?.[0] || null
    }
  );
}

/**
 * Clear the kill-switch (human-only, requires verification)
 */
export function clearKillSwitch(workspaceRoot) {
  const state = loadKillSwitchState(workspaceRoot);
  
  if (!state.engaged) {
    return {
      already_cleared: true,
      message: "Kill-switch was not engaged"
    };
  }

  state.engaged = false;
  state.recovery_timestamp = new Date().toISOString();
  saveKillSwitchState(workspaceRoot, state);

  return {
    cleared: true,
    previous_state: state,
    message: "Kill-switch cleared"
  };
}

/**
 * Mark recovery verification as passed
 */
export function markRecoveryVerificationPassed(
  workspaceRoot,
  verificationName
) {
  const state = loadKillSwitchState(workspaceRoot);
  
  if (!state.engaged) {
    return false;
  }

  state.recovery_verifications_passed[verificationName] = {
    passed: true,
    timestamp: new Date().toISOString()
  };

  saveKillSwitchState(workspaceRoot, state);
  return true;
}

/**
 * Check if all recovery verifications have passed
 */
export function areAllRecoveryVerificationsPassed(workspaceRoot) {
  const state = loadKillSwitchState(workspaceRoot);
  
  if (!state.engaged) {
    return true;
  }

  for (const verification of state.recovery_required_verifications) {
    if (!state.recovery_verifications_passed[verification]?.passed) {
      return false;
    }
  }

  return true;
}

/**
 * Get recovery verification status
 */
export function getRecoveryVerificationStatus(workspaceRoot) {
  const state = loadKillSwitchState(workspaceRoot);
  
  const status = {
    engaged: state.engaged,
    required: state.recovery_required_verifications,
    passed: [],
    pending: []
  };

  for (const verification of state.recovery_required_verifications) {
    if (state.recovery_verifications_passed[verification]?.passed) {
      status.passed.push(verification);
    } else {
      status.pending.push(verification);
    }
  }

  return status;
}
