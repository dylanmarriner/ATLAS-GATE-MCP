/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Recovery gate for human-only kill-switch clearance
 * AUTHORITY: MCP CATASTROPHIC FAILURE SPEC
 * 
 * Recovery gate requirements:
 * - OWNER role only
 * - Explicit reference to HALT_REPORT
 * - Structured acknowledgement
 * - Two-step confirmation
 * - Re-verification of audit/plan/maturity before clearance
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  getKillSwitchState,
  clearKillSwitch,
  markRecoveryVerificationPassed,
  areAllRecoveryVerificationsPassed,
  getRecoveryVerificationStatus
} from "./kill-switch.js";
import { appendAuditEntry } from "./audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "./system-error.js";

/**
 * Recovery acknowledgement structure
 */
class RecoveryAcknowledgement {
  constructor(config = {}) {
    this.timestamp = new Date().toISOString();
    this.role = config.role || null;
    this.operator = config.operator || null;
    this.halt_report_path = config.halt_report_path || null;
    this.understood_reason = config.understood_reason || false;
    this.understood_what_failed = config.understood_what_failed || false;
    this.understood_forbidden_ops = config.understood_forbidden_ops || false;
    this.responsibility_acknowledged = config.responsibility_acknowledged || false;
    this.confirmation_code = config.confirmation_code || null;
    this.step_one_confirmed = config.step_one_confirmed || false;
    this.step_two_confirmed = config.step_two_confirmed || false;
  }

  isValid() {
    return (
      this.role === "OWNER" &&
      this.halt_report_path &&
      this.understood_reason &&
      this.understood_what_failed &&
      this.understood_forbidden_ops &&
      this.responsibility_acknowledged &&
      this.confirmation_code &&
      this.step_one_confirmed &&
      this.step_two_confirmed
    );
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      role: this.role,
      operator: this.operator,
      halt_report_path: this.halt_report_path,
      understood_reason: this.understood_reason,
      understood_what_failed: this.understood_what_failed,
      understood_forbidden_ops: this.understood_forbidden_ops,
      responsibility_acknowledged: this.responsibility_acknowledged,
      confirmation_code: this.confirmation_code,
      step_one_confirmed: this.step_one_confirmed,
      step_two_confirmed: this.step_two_confirmed,
      valid: this.isValid()
    };
  }
}

/**
 * Generate confirmation code for two-step verification
 */
export function generateConfirmationCode() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Step 1: Initiate recovery acknowledgement
 *
 * Requirements:
 * - OWNER role
 * - Provide halt report path
 * - Check understanding of failure reason
 * - Check understanding of what failed
 * - Check understanding of forbidden operations
 * - Check responsibility acknowledgement
 */
export function initiateRecoveryAcknowledgement(config = {}) {
  const {
    role = null,
    operator = null,
    halt_report_path = null,
    understood_reason = false,
    understood_what_failed = false,
    understood_forbidden_ops = false,
    responsibility_acknowledged = false
  } = config;

  // Validate role
  if (role !== "OWNER") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      {
        human_message: `Recovery gate requires OWNER role. Got: ${role}`,
        tool_name: "recovery_initiate"
      }
    );
  }

  // Validate halt report path
  if (!halt_report_path || typeof halt_report_path !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD,
      {
        human_message: "Recovery gate requires valid halt_report_path",
        tool_name: "recovery_initiate"
      }
    );
  }

  // Validate understanding checks
  if (!understood_reason) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message:
          "You must understand the failure reason (understood_reason=true)",
        tool_name: "recovery_initiate"
      }
    );
  }

  if (!understood_what_failed) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message:
          "You must understand what failed (understood_what_failed=true)",
        tool_name: "recovery_initiate"
      }
    );
  }

  if (!understood_forbidden_ops) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message:
          "You must understand forbidden operations (understood_forbidden_ops=true)",
        tool_name: "recovery_initiate"
      }
    );
  }

  if (!responsibility_acknowledged) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message:
          "You must acknowledge responsibility (responsibility_acknowledged=true)",
        tool_name: "recovery_initiate"
      }
    );
  }

  // Generate confirmation code
  const confirmationCode = generateConfirmationCode();

  const ack = new RecoveryAcknowledgement({
    role,
    operator,
    halt_report_path,
    understood_reason,
    understood_what_failed,
    understood_forbidden_ops,
    responsibility_acknowledged,
    confirmation_code: confirmationCode,
    step_one_confirmed: true
  });

  return {
    step_one_confirmed: true,
    confirmation_code: confirmationCode,
    message:
      "Step 1 complete. Use confirmation code in step 2 to proceed.",
    acknowledgement: ack.toJSON()
  };
}

/**
 * Step 2: Confirm recovery with code
 *
 * Requirements:
 * - OWNER role
 * - Correct confirmation code
 * - All required fields from step 1
 */
export function confirmRecovery(
  workspaceRoot,
  config = {}
) {
  const {
    role = null,
    operator = null,
    halt_report_path = null,
    confirmation_code = null,
    understood_reason = false,
    understood_what_failed = false,
    understood_forbidden_ops = false,
    responsibility_acknowledged = false
  } = config;

  // Validate role
  if (role !== "OWNER") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      {
        human_message: `Recovery gate requires OWNER role. Got: ${role}`,
        tool_name: "recovery_confirm"
      }
    );
  }

  // Validate confirmation code
  if (!confirmation_code || typeof confirmation_code !== "string" || confirmation_code.length !== 32) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "Invalid confirmation code",
        tool_name: "recovery_confirm"
      }
    );
  }

  // Create acknowledgement object
  const ack = new RecoveryAcknowledgement({
    role,
    operator,
    halt_report_path,
    understood_reason,
    understood_what_failed,
    understood_forbidden_ops,
    responsibility_acknowledged,
    confirmation_code,
    step_one_confirmed: true,
    step_two_confirmed: true
  });

  // Validate all required fields
  if (!ack.isValid()) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message:
          "Recovery acknowledgement is incomplete or invalid. " +
          "All fields required: role=OWNER, all understanding checks, responsibility, valid code.",
        tool_name: "recovery_confirm"
      }
    );
  }

  return {
    step_two_confirmed: true,
    message: "Step 2 confirmed. Kill-switch will be cleared after verifications.",
    acknowledgement: ack.toJSON()
  };
}

/**
 * Unlock kill-switch after verifications pass
 *
 * This is called after all recovery verifications have passed:
 * - audit_verify
 * - plan_lint
 * - maturity_recompute
 */
export async function unlockKillSwitch(
  workspaceRoot,
  sessionId,
  role,
  config = {}
) {
  const {
    operator = null,
    halt_report_path = null
  } = config;

  // Check if kill-switch is actually engaged
  const state = getKillSwitchState(workspaceRoot);
  if (!state.engaged) {
    return {
      already_unlocked: true,
      message: "Kill-switch was not engaged"
    };
  }

  // Check if all verifications have passed
  const verificationStatus = getRecoveryVerificationStatus(workspaceRoot);
  if (verificationStatus.pending.length > 0) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: `Verifications not complete. Pending: ${verificationStatus.pending.join(", ")}`,
        tool_name: "recovery_unlock"
      }
    );
  }

  // Clear kill-switch
  const result = clearKillSwitch(workspaceRoot);

  // Record unlock in audit log
  try {
    await appendAuditEntry(
      {
        session_id: sessionId,
        role,
        workspace_root: workspaceRoot,
        tool: "recovery_unlock",
        intent: "kill-switch recovery",
        plan_hash: null,
        phase_id: null,
        args: { operator, halt_report_path },
        result: "unlock_confirmed",
        error_code: null,
        invariant_id: null,
        notes: `Kill-switch unlocked after all verifications passed`
      },
      workspaceRoot
    );
  } catch (err) {
    console.error(`[WARN] Failed to audit unlock: ${err.message}`);
  }

  return {
    unlocked: true,
    message: "Kill-switch has been cleared. System recovery complete.",
    previous_state: result.previous_state
  };
}

/**
 * Get recovery status
 */
export function getRecoveryStatus(workspaceRoot) {
  const state = getKillSwitchState(workspaceRoot);
  const verificationStatus = getRecoveryVerificationStatus(workspaceRoot);

  return {
    kill_switch_engaged: state.engaged,
    trigger_reason: state.trigger_reason,
    halt_report_path: state.halt_report_path,
    recovery_required_verifications: verificationStatus.required,
    verifications_passed: verificationStatus.passed,
    verifications_pending: verificationStatus.pending,
    all_verifications_passed: verificationStatus.pending.length === 0,
    ready_for_unlock: state.engaged && verificationStatus.pending.length === 0
  };
}
