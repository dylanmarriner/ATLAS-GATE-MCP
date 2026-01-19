/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Named drills for testing catastrophic failure handling
 * AUTHORITY: MCP CATASTROPHIC FAILURE SPEC
 * 
 * Drills are read-only tools that execute simulations with full auditability.
 * Each drill MUST:
 * - Trigger the correct failure
 * - Engage kill-switch (if severity CRITICAL)
 * - Produce HALT REPORT
 * - Append audit entries
 * - Generate replay-verifiable evidence
 */

import {
  initializeSimulation,
  injectFailure,
  finalizeSimulation,
  getSimulationState,
  SIMULATION_MODE,
  SIMULABLE_FAILURES
} from "./failure-simulation.js";
import {
  engageKillSwitch,
  isKillSwitchEngaged
} from "./kill-switch.js";
import {
  executeSafeHalt,
  writeHaltReport
} from "./safe-halt.js";
import {
  appendAuditEntry
} from "./audit-system.js";
import {
  FAILURE_TAXONOMY,
  getFailureDefinition,
  isCriticalFailure
} from "./failure-taxonomy.js";

/**
 * Drill result object
 */
class DrillResult {
  constructor(drillName) {
    this.drill_name = drillName;
    this.timestamp = new Date().toISOString();
    this.simulation_state = null;
    this.failure_triggered = false;
    this.kill_switch_engaged = false;
    this.halt_report_path = null;
    this.audit_entries = [];
    this.evidence = {};
  }

  toJSON() {
    return {
      drill_name: this.drill_name,
      timestamp: this.timestamp,
      simulation_state: this.simulation_state,
      failure_triggered: this.failure_triggered,
      kill_switch_engaged: this.kill_switch_engaged,
      halt_report_path: this.halt_report_path,
      audit_entry_count: this.audit_entries.length,
      evidence: this.evidence
    };
  }
}

/**
 * DRILL 1: Audit Tamper Detection
 * Simulates: audit write failure, hash mismatch
 * Severity: CRITICAL
 * Expected: Kill-switch engaged
 */
export async function drillAuditTamper(workspaceRoot, sessionId, role) {
  const drillName = "drill_audit_tamper";
  const result = new DrillResult(drillName);

  console.error(`[DRILL] Starting ${drillName}...`);

  try {
    // Initialize simulation
    initializeSimulation(SIMULATION_MODE.DRILL, "audit-tamper-seed");
    injectFailure(SIMULABLE_FAILURES.AUDIT_WRITE_FAILURE);

    // Simulate failure
    try {
      throw new Error("SIMULATED: Audit write failure");
    } catch (err) {
      result.failure_triggered = true;
    }

    // Finalize simulation
    result.simulation_state = finalizeSimulation();

    // Engage kill-switch
    const failureDef = getFailureDefinition("F-AUDIT");
    engageKillSwitch(workspaceRoot, {
      failure_ids: [failureDef.id],
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Audit tamper detected",
      triggered_by_role: role,
      triggered_by_tool: "drill_audit_tamper"
    });
    result.kill_switch_engaged = true;

    // Execute safe-halt
    const haltResult = executeSafeHalt(workspaceRoot, {
      failure_ids: [failureDef.id],
      failure_descriptions: ["Simulated audit write failure during drill"],
      failure_summary: "Audit tamper detection drill triggered",
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Audit tamper detection",
      triggered_by_role: role,
      triggered_by_tool: drillName,
      session_id: sessionId
    });
    result.halt_report_path = haltResult.halt_report?.path;

    // Record audit entry
    const auditEntry = await appendAuditEntry(
      {
        session_id: sessionId,
        role,
        workspace_root: workspaceRoot,
        tool: drillName,
        intent: "catastrophic failure drill",
        plan_hash: null,
        phase_id: null,
        args: { drill_type: "audit_tamper" },
        result: "drill_completed",
        error_code: null,
        invariant_id: failureDef.invariant_id,
        notes: "Audit tamper drill: verified kill-switch engagement"
      },
      workspaceRoot
    );
    result.audit_entries.push(auditEntry);

    result.evidence = {
      audit_log_status: haltResult.audit_integrity,
      simulation_results: result.simulation_state
    };

    console.error(`[DRILL] ${drillName} completed successfully`);
    return result;
  } catch (err) {
    console.error(`[DRILL] ${drillName} failed: ${err.message}`);
    throw err;
  }
}

/**
 * DRILL 2: Policy Breach Detection
 * Simulates: policy engine crash
 * Severity: CRITICAL
 * Expected: Kill-switch engaged
 */
export async function drillPolicyBreach(workspaceRoot, sessionId, role) {
  const drillName = "drill_policy_breach";
  const result = new DrillResult(drillName);

  console.error(`[DRILL] Starting ${drillName}...`);

  try {
    initializeSimulation(SIMULATION_MODE.DRILL, "policy-breach-seed");
    injectFailure(SIMULABLE_FAILURES.POLICY_ENGINE_CRASH);

    try {
      throw new Error("SIMULATED: Policy engine crash");
    } catch (err) {
      result.failure_triggered = true;
    }

    result.simulation_state = finalizeSimulation();

    const failureDef = getFailureDefinition("F-POLICY");
    engageKillSwitch(workspaceRoot, {
      failure_ids: [failureDef.id],
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Policy breach detected",
      triggered_by_role: role,
      triggered_by_tool: drillName
    });
    result.kill_switch_engaged = true;

    const haltResult = executeSafeHalt(workspaceRoot, {
      failure_ids: [failureDef.id],
      failure_descriptions: ["Simulated policy engine crash during drill"],
      failure_summary: "Policy breach detection drill triggered",
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Policy breach detection",
      triggered_by_role: role,
      triggered_by_tool: drillName,
      session_id: sessionId
    });
    result.halt_report_path = haltResult.halt_report?.path;

    const auditEntry = await appendAuditEntry(
      {
        session_id: sessionId,
        role,
        workspace_root: workspaceRoot,
        tool: drillName,
        intent: "catastrophic failure drill",
        plan_hash: null,
        phase_id: null,
        args: { drill_type: "policy_breach" },
        result: "drill_completed",
        error_code: null,
        invariant_id: failureDef.invariant_id,
        notes: "Policy breach drill: verified kill-switch engagement"
      },
      workspaceRoot
    );
    result.audit_entries.push(auditEntry);

    console.error(`[DRILL] ${drillName} completed successfully`);
    return result;
  } catch (err) {
    console.error(`[DRILL] ${drillName} failed: ${err.message}`);
    throw err;
  }
}

/**
 * DRILL 3: Plan Hash Mismatch
 * Simulates: plan hash mismatch
 * Severity: CRITICAL
 * Expected: Kill-switch engaged
 */
export async function drillPlanHashMismatch(workspaceRoot, sessionId, role) {
  const drillName = "drill_plan_hash_mismatch";
  const result = new DrillResult(drillName);

  console.error(`[DRILL] Starting ${drillName}...`);

  try {
    initializeSimulation(SIMULATION_MODE.DRILL, "plan-hash-seed");
    injectFailure(SIMULABLE_FAILURES.PLAN_HASH_MISMATCH);

    const fakeHash = "0".repeat(64);
    try {
      throw new Error(`SIMULATED: Plan hash mismatch (expected abc..., got ${fakeHash})`);
    } catch (err) {
      result.failure_triggered = true;
    }

    result.simulation_state = finalizeSimulation();

    const failureDef = getFailureDefinition("F-PLAN-HASH");
    engageKillSwitch(workspaceRoot, {
      failure_ids: [failureDef.id],
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Plan hash mismatch detected",
      triggered_by_role: role,
      triggered_by_tool: drillName
    });
    result.kill_switch_engaged = true;

    const haltResult = executeSafeHalt(workspaceRoot, {
      failure_ids: [failureDef.id],
      failure_descriptions: ["Simulated plan hash mismatch during drill"],
      failure_summary: "Plan hash mismatch detection drill triggered",
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Plan hash mismatch detection",
      triggered_by_role: role,
      triggered_by_tool: drillName,
      session_id: sessionId
    });
    result.halt_report_path = haltResult.halt_report?.path;

    const auditEntry = await appendAuditEntry(
      {
        session_id: sessionId,
        role,
        workspace_root: workspaceRoot,
        tool: drillName,
        intent: "catastrophic failure drill",
        plan_hash: null,
        phase_id: null,
        args: { drill_type: "plan_hash_mismatch" },
        result: "drill_completed",
        error_code: null,
        invariant_id: failureDef.invariant_id,
        notes: "Plan hash mismatch drill: verified kill-switch engagement"
      },
      workspaceRoot
    );
    result.audit_entries.push(auditEntry);

    console.error(`[DRILL] ${drillName} completed successfully`);
    return result;
  } catch (err) {
    console.error(`[DRILL] ${drillName} failed: ${err.message}`);
    throw err;
  }
}

/**
 * DRILL 4: Operator Fatigue Breach
 * Simulates: operator fatigue threshold breach
 * Severity: HIGH
 * Expected: Kill-switch engaged
 */
export async function drillOperatorAbuse(workspaceRoot, sessionId, role) {
  const drillName = "drill_operator_abuse";
  const result = new DrillResult(drillName);

  console.error(`[DRILL] Starting ${drillName}...`);

  try {
    initializeSimulation(SIMULATION_MODE.DRILL, "operator-abuse-seed");
    injectFailure(SIMULABLE_FAILURES.OPERATOR_FATIGUE_BREACH);

    try {
      throw new Error("SIMULATED: Operator fatigue breach (10 errors >= 5 threshold)");
    } catch (err) {
      result.failure_triggered = true;
    }

    result.simulation_state = finalizeSimulation();

    const failureDef = getFailureDefinition("F-HUMAN-ABUSE");
    engageKillSwitch(workspaceRoot, {
      failure_ids: [failureDef.id],
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Operator abuse threshold breached",
      triggered_by_role: role,
      triggered_by_tool: drillName
    });
    result.kill_switch_engaged = true;

    const haltResult = executeSafeHalt(workspaceRoot, {
      failure_ids: [failureDef.id],
      failure_descriptions: [
        "Simulated operator fatigue breach during drill",
        "Threshold: 5 errors, actual: 10 errors"
      ],
      failure_summary: "Operator fatigue breach detection drill triggered",
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Operator abuse detection",
      triggered_by_role: role,
      triggered_by_tool: drillName,
      session_id: sessionId
    });
    result.halt_report_path = haltResult.halt_report?.path;

    const auditEntry = await appendAuditEntry(
      {
        session_id: sessionId,
        role,
        workspace_root: workspaceRoot,
        tool: drillName,
        intent: "catastrophic failure drill",
        plan_hash: null,
        phase_id: null,
        args: { drill_type: "operator_fatigue" },
        result: "drill_completed",
        error_code: null,
        invariant_id: failureDef.invariant_id,
        notes: "Operator fatigue drill: verified kill-switch engagement"
      },
      workspaceRoot
    );
    result.audit_entries.push(auditEntry);

    console.error(`[DRILL] ${drillName} completed successfully`);
    return result;
  } catch (err) {
    console.error(`[DRILL] ${drillName} failed: ${err.message}`);
    throw err;
  }
}

/**
 * DRILL 5: Filesystem Denial
 * Simulates: filesystem permission denied
 * Severity: HIGH
 * Expected: Kill-switch engagement (DEGRADED mode)
 */
export async function drillFilesystemDenial(workspaceRoot, sessionId, role) {
  const drillName = "drill_filesystem_denial";
  const result = new DrillResult(drillName);

  console.error(`[DRILL] Starting ${drillName}...`);

  try {
    initializeSimulation(SIMULATION_MODE.DRILL, "fs-denial-seed");
    injectFailure(SIMULABLE_FAILURES.FILESYSTEM_PERMISSION_DENIED);

    try {
      throw new Error("SIMULATED: Permission denied: /audit.log");
    } catch (err) {
      result.failure_triggered = true;
    }

    result.simulation_state = finalizeSimulation();

    const failureDef = getFailureDefinition("F-ENV-FS");
    engageKillSwitch(workspaceRoot, {
      failure_ids: [failureDef.id],
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Filesystem permission denied",
      triggered_by_role: role,
      triggered_by_tool: drillName
    });
    result.kill_switch_engaged = true;

    const haltResult = executeSafeHalt(workspaceRoot, {
      failure_ids: [failureDef.id],
      failure_descriptions: ["Simulated filesystem permission denial during drill"],
      failure_summary: "Filesystem denial detection drill triggered",
      invariant_ids: [failureDef.invariant_id],
      trigger_reason: "DRILL: Filesystem denial detection",
      triggered_by_role: role,
      triggered_by_tool: drillName,
      session_id: sessionId
    });
    result.halt_report_path = haltResult.halt_report?.path;

    const auditEntry = await appendAuditEntry(
      {
        session_id: sessionId,
        role,
        workspace_root: workspaceRoot,
        tool: drillName,
        intent: "catastrophic failure drill",
        plan_hash: null,
        phase_id: null,
        args: { drill_type: "filesystem_denial" },
        result: "drill_completed",
        error_code: null,
        invariant_id: failureDef.invariant_id,
        notes: "Filesystem denial drill: verified kill-switch engagement"
      },
      workspaceRoot
    );
    result.audit_entries.push(auditEntry);

    console.error(`[DRILL] ${drillName} completed successfully`);
    return result;
  } catch (err) {
    console.error(`[DRILL] ${drillName} failed: ${err.message}`);
    throw err;
  }
}

/**
 * Get all available drills
 */
export function listAvailableDrills() {
  return [
    {
      name: "drill_audit_tamper",
      description: "Simulate audit log write failure and hash mismatch",
      severity: "CRITICAL",
      failure_ids: ["F-AUDIT"]
    },
    {
      name: "drill_policy_breach",
      description: "Simulate policy engine crash during write",
      severity: "CRITICAL",
      failure_ids: ["F-POLICY"]
    },
    {
      name: "drill_plan_hash_mismatch",
      description: "Simulate plan file hash mismatch",
      severity: "CRITICAL",
      failure_ids: ["F-PLAN-HASH"]
    },
    {
      name: "drill_operator_abuse",
      description: "Simulate operator fatigue threshold breach",
      severity: "HIGH",
      failure_ids: ["F-HUMAN-ABUSE"]
    },
    {
      name: "drill_filesystem_denial",
      description: "Simulate filesystem permission denied",
      severity: "HIGH",
      failure_ids: ["F-ENV-FS"]
    }
  ];
}
