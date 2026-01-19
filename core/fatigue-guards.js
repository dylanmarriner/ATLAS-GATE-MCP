/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Operator fatigue detection and approval rate limiting
 * FAILURE MODES: Fatigue-induced errors, approval sprawl, decision degradation
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 6:
 * Approval Rate Limiting + Fatigue Guards
 * 
 * - Max approvals per session
 * - Max approvals per time window
 * - Mandatory pause after N approvals
 * - Triggers OPERATOR_FATIGUE_GUARD on violation
 */

/**
 * Configuration
 */
const CONFIG = {
  MAX_APPROVALS_PER_SESSION: 10,
  MAX_APPROVALS_PER_HOUR: 20,
  APPROVALS_BEFORE_MANDATORY_PAUSE: 5,
  MANDATORY_PAUSE_MS: 60000, // 1 minute
  TIME_WINDOW_MS: 3600000 // 1 hour
};

/**
 * Approval tracking per session
 */
const approvalTracker = {
  session_approvals: 0,
  last_approval_time: null,
  approval_timestamps: [],
  last_mandatory_pause_time: null,
  consecutive_approvals_since_pause: 0
};

/**
 * Check if operator is fatigued
 * @returns {Object} {is_fatigued, reasons, remaining_approvals}
 */
export function checkOperatorFatigue() {
  const now = Date.now();
  const reasons = [];

  // Clean old timestamps (outside 1 hour window)
  const cutoff = now - CONFIG.TIME_WINDOW_MS;
  approvalTracker.approval_timestamps = approvalTracker.approval_timestamps.filter(t => t > cutoff);

  // Check session limit
  if (approvalTracker.session_approvals >= CONFIG.MAX_APPROVALS_PER_SESSION) {
    reasons.push(`Session limit reached: ${approvalTracker.session_approvals}/${CONFIG.MAX_APPROVALS_PER_SESSION}`);
  }

  // Check hourly limit
  if (approvalTracker.approval_timestamps.length >= CONFIG.MAX_APPROVALS_PER_HOUR) {
    reasons.push(`Hourly limit exceeded: ${approvalTracker.approval_timestamps.length}/${CONFIG.MAX_APPROVALS_PER_HOUR}`);
  }

  // Check mandatory pause
  if (approvalTracker.consecutive_approvals_since_pause >= CONFIG.APPROVALS_BEFORE_MANDATORY_PAUSE) {
    const timeSinceLastPause = approvalTracker.last_mandatory_pause_time ? now - approvalTracker.last_mandatory_pause_time : Infinity;
    if (timeSinceLastPause < CONFIG.MANDATORY_PAUSE_MS) {
      const remaining = CONFIG.MANDATORY_PAUSE_MS - timeSinceLastPause;
      reasons.push(`Mandatory pause required: ${Math.ceil(remaining / 1000)}s remaining`);
    }
  }

  const is_fatigued = reasons.length > 0;

  return {
    is_fatigued,
    reasons,
    session_approvals: approvalTracker.session_approvals,
    max_session_approvals: CONFIG.MAX_APPROVALS_PER_SESSION,
    remaining_approvals: Math.max(0, CONFIG.MAX_APPROVALS_PER_SESSION - approvalTracker.session_approvals),
    hourly_approvals: approvalTracker.approval_timestamps.length,
    max_hourly_approvals: CONFIG.MAX_APPROVALS_PER_HOUR,
    consecutive_approvals: approvalTracker.consecutive_approvals_since_pause,
    max_consecutive: CONFIG.APPROVALS_BEFORE_MANDATORY_PAUSE
  };
}

/**
 * Enforce fatigue guards before approval
 * @throws {Error} If operator fatigued
 * @returns {Object} Fatigue check result
 */
export function enforceFatigueGuards() {
  const check = checkOperatorFatigue();
  if (check.is_fatigued) {
    throw new Error(
      `OPERATOR_FATIGUE_GUARD_TRIGGERED: ${check.reasons.join("; ")}`
    );
  }
  return check;
}

/**
 * Record approval and update tracking
 * @returns {Object} Updated tracking state
 */
export function recordApproval() {
  const now = Date.now();

  approvalTracker.session_approvals++;
  approvalTracker.approval_timestamps.push(now);
  approvalTracker.last_approval_time = now;
  approvalTracker.consecutive_approvals_since_pause++;

  return {
    approval_recorded: true,
    session_approvals: approvalTracker.session_approvals,
    consecutive_approvals: approvalTracker.consecutive_approvals_since_pause,
    next_pause_required_at: approvalTracker.consecutive_approvals_since_pause >= CONFIG.APPROVALS_BEFORE_MANDATORY_PAUSE
      ? true
      : false
  };
}

/**
 * Record mandatory pause
 * Resets consecutive approval counter
 * @returns {Object} Pause record
 */
export function recordMandatoryPause() {
  const now = Date.now();
  approvalTracker.last_mandatory_pause_time = now;
  approvalTracker.consecutive_approvals_since_pause = 0;

  return {
    pause_recorded: true,
    consecutive_approvals_reset: true,
    pause_time: new Date(now).toISOString()
  };
}

/**
 * Get fatigue status summary
 * @returns {Object} Fatigue status
 */
export function getFatigueStatus() {
  const now = Date.now();
  approvalTracker.approval_timestamps = approvalTracker.approval_timestamps.filter(
    t => t > now - CONFIG.TIME_WINDOW_MS
  );

  return {
    session_approvals: approvalTracker.session_approvals,
    max_session_approvals: CONFIG.MAX_APPROVALS_PER_SESSION,
    hourly_approvals: approvalTracker.approval_timestamps.length,
    max_hourly_approvals: CONFIG.MAX_APPROVALS_PER_HOUR,
    consecutive_approvals: approvalTracker.consecutive_approvals_since_pause,
    max_consecutive: CONFIG.APPROVALS_BEFORE_MANDATORY_PAUSE,
    approvals_until_pause: Math.max(0, CONFIG.APPROVALS_BEFORE_MANDATORY_PAUSE - approvalTracker.consecutive_approvals_since_pause),
    last_approval_time: approvalTracker.last_approval_time ? new Date(approvalTracker.last_approval_time).toISOString() : null,
    last_pause_time: approvalTracker.last_mandatory_pause_time ? new Date(approvalTracker.last_mandatory_pause_time).toISOString() : null
  };
}

/**
 * Reset fatigue guards (for testing only)
 */
export function resetFatigueGuards() {
  approvalTracker.session_approvals = 0;
  approvalTracker.last_approval_time = null;
  approvalTracker.approval_timestamps = [];
  approvalTracker.last_mandatory_pause_time = null;
  approvalTracker.consecutive_approvals_since_pause = 0;
}

/**
 * Configure fatigue limits (for testing)
 * @param {Object} config - Partial config override
 */
export function configureFatigueLimits(config) {
  Object.assign(CONFIG, config);
}
