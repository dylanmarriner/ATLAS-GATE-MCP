import { appendAuditLog } from "./audit-log.js";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Audit trail including human-factor metadata
 * FAILURE MODES: Lost operator context, unattributable decisions, missing risk metadata
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 7:
 * Human-Factor Audit Trail (MANDATORY)
 * 
 * - Audit entries include operator_id, operator_role, action type, risk level
 * - Confirmation timestamps and delay durations recorded
 * - Refusal reasons documented
 */

/**
 * Log human-factor decision to audit trail
 * @param {Object} decision - Decision data
 * @param {string} sessionId - Session identifier
 * @returns {Promise} Audit entry created
 */
export async function logHumanFactorDecision(decision, sessionId) {
  const entry = {
    type: "HUMAN_FACTOR_DECISION",
    
    // Operator identity
    operator_id: decision.operator_id,
    operator_role: decision.operator_role,
    
    // Action context
    action_id: decision.action_id,
    action_type: decision.action_type, // e.g., "PLAN_APPROVAL", "POLICY_EXCEPTION"
    
    // Risk metadata
    risk_level: decision.risk_level,
    blast_radius: decision.blast_radius,
    reversibility: decision.reversibility,
    
    // Confirmation metadata
    confirmation_required: decision.confirmation_required || false,
    confirmation_initiated_at: decision.confirmation_initiated_at || null,
    confirmation_completed_at: decision.confirmation_completed_at || null,
    confirmation_delay_ms: decision.confirmation_delay_ms || 0,
    
    // Decision outcome
    decision_outcome: decision.decision_outcome, // APPROVED, REFUSED, CANCELLED
    
    // Refusal reason (if applicable)
    refusal_reason: decision.refusal_reason || null,
    
    // Additional context
    context: decision.context || {},
    
    timestamp: new Date().toISOString()
  };

  return appendAuditLog(entry, sessionId);
}

/**
 * Log operator identity binding
 * @param {Object} binding - Binding data
 * @param {string} sessionId - Session identifier
 */
export async function logOperatorBinding(binding, sessionId) {
  return appendAuditLog({
    type: "OPERATOR_IDENTITY_BOUND",
    operator_id: binding.operator_id,
    operator_role: binding.operator_role,
    authentication_context: binding.authentication_context,
    bound_at: binding.bound_at,
    timestamp: new Date().toISOString()
  }, sessionId);
}

/**
 * Log fatigue guard trigger
 * @param {Object} fatigueData - Fatigue check data
 * @param {string} sessionId - Session identifier
 */
export async function logFatigueGuardTrigger(fatigueData, sessionId) {
  return appendAuditLog({
    type: "FATIGUE_GUARD_TRIGGERED",
    operator_id: fatigueData.operator_id,
    reasons: fatigueData.reasons,
    session_approvals: fatigueData.session_approvals,
    max_session_approvals: fatigueData.max_session_approvals,
    hourly_approvals: fatigueData.hourly_approvals,
    consecutive_approvals: fatigueData.consecutive_approvals,
    timestamp: new Date().toISOString()
  }, sessionId);
}

/**
 * Log refusal with operator context
 * @param {Object} refusalData - Refusal data
 * @param {string} sessionId - Session identifier
 */
export async function logRefusal(refusalData, sessionId) {
  return appendAuditLog({
    type: "ACTION_REFUSED",
    operator_id: refusalData.operator_id,
    operator_role: refusalData.operator_role,
    action_id: refusalData.action_id,
    action_type: refusalData.action_type,
    refusal_reason: refusalData.refusal_reason,
    error_code: refusalData.error_code,
    context: refusalData.context || {},
    timestamp: new Date().toISOString()
  }, sessionId);
}

/**
 * Log mandatory pause
 * @param {Object} pauseData - Pause data
 * @param {string} sessionId - Session identifier
 */
export async function logMandatoryPause(pauseData, sessionId) {
  return appendAuditLog({
    type: "MANDATORY_PAUSE_RECORDED",
    operator_id: pauseData.operator_id,
    pause_duration_ms: pauseData.pause_duration_ms || 60000,
    consecutive_approvals_before_pause: pauseData.consecutive_approvals_before_pause,
    timestamp: new Date().toISOString()
  }, sessionId);
}

/**
 * Log two-step confirmation initiation
 * @param {Object} confirmationData - Confirmation data
 * @param {string} sessionId - Session identifier
 */
export async function logConfirmationInitiated(confirmationData, sessionId) {
  return appendAuditLog({
    type: "CONFIRMATION_INITIATED",
    operator_id: confirmationData.operator_id,
    action_id: confirmationData.action_id,
    confirmation_token: confirmationData.confirmation_token,
    minimum_wait_ms: confirmationData.minimum_wait_ms,
    consequences_count: (confirmationData.consequences || []).length,
    timestamp: new Date().toISOString()
  }, sessionId);
}

/**
 * Log two-step confirmation completion
 * @param {Object} confirmationData - Confirmation data
 * @param {string} sessionId - Session identifier
 */
export async function logConfirmationCompleted(confirmationData, sessionId) {
  return appendAuditLog({
    type: "CONFIRMATION_COMPLETED",
    operator_id: confirmationData.operator_id,
    action_id: confirmationData.action_id,
    elapsed_ms: confirmationData.elapsed_ms,
    consequences_verified: confirmationData.consequences_verified,
    confirmation_hash: confirmationData.confirmation_hash,
    timestamp: new Date().toISOString()
  }, sessionId);
}

/**
 * Log risk acknowledgement
 * @param {Object} ackData - Acknowledgement data
 * @param {string} sessionId - Session identifier
 */
export async function logRiskAcknowledgement(ackData, sessionId) {
  return appendAuditLog({
    type: "RISK_ACKNOWLEDGED",
    operator_id: ackData.operator_id,
    action_id: ackData.action_id,
    risk_level: ackData.risk_level,
    blast_radius_count: (ackData.blast_radius || []).length,
    reversibility: ackData.reversibility,
    operator_confirmation: ackData.operator_confirmation,
    acknowledgement_hash: ackData.acknowledgement_hash,
    timestamp: new Date().toISOString()
  }, sessionId);
}
