import crypto from "crypto";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Two-step confirmation for critical actions
 * FAILURE MODES: Accidental approvals, rushed decisions, copy-paste attacks
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 4:
 * Two-Step Confirmation for Critical Actions
 * 
 * - Intent declaration ("I intend to approve X")
 * - Delayed confirmation (>= 30s minimum)
 * - Re-present consequences verbatim, no copy-paste allowed
 * - Mismatch → refuse
 */

/**
 * Pending confirmation state
 * Maps confirmation_token -> confirmation data
 */
const pendingConfirmations = new Map();

/**
 * Configuration
 */
const CONFIG = {
  MINIMUM_DELAY_MS: 30000, // 30 seconds
  CONFIRMATION_TIMEOUT_MS: 300000 // 5 minutes to confirm
};

/**
 * Initiate two-step confirmation for critical action
 * Step 1: Operator declares intent
 * 
 * @param {string} action_id - Unique action identifier
 * @param {string} action_summary - Human-readable action summary
 * @param {Array} consequences - Array of consequence strings (from risk-ack)
 * @param {Object} context - Additional context
 * @returns {Object} Confirmation initiation {confirmation_token, minimum_wait_ms, action_summary}
 */
export function initiateConfirmation(action_id, action_summary, consequences, context = {}) {
  const confirmation_token = crypto.randomBytes(16).toString("hex");
  
  const pendingRecord = {
    action_id,
    action_summary,
    consequences: [...consequences], // Copy array
    context,
    initiated_at: new Date().toISOString(),
    initiated_timestamp: Date.now(),
    confirmation_token,
    step: 1, // Intent declaration
    operator_confirmation_provided: false
  };

  pendingConfirmations.set(confirmation_token, pendingRecord);

  // Schedule cleanup (timeout)
  setTimeout(() => {
    pendingConfirmations.delete(confirmation_token);
  }, CONFIG.CONFIRMATION_TIMEOUT_MS);

  return {
    status: "CONFIRMATION_INITIATED",
    confirmation_token,
    action_id,
    action_summary,
    step: 1,
    minimum_wait_ms: CONFIG.MINIMUM_DELAY_MS,
    message: `Please wait ${CONFIG.MINIMUM_DELAY_MS / 1000}s, then re-confirm to proceed`
  };
}

/**
 * Verify operator can proceed to step 2
 * Checks that minimum delay has elapsed
 * 
 * @param {string} confirmation_token - Token from initiation
 * @returns {Object} {can_proceed, elapsed_ms, remaining_ms, consequences}
 * @throws {Error} If token invalid or expired
 */
export function checkConfirmationDelay(confirmation_token) {
  const pending = pendingConfirmations.get(confirmation_token);
  if (!pending) {
    throw new Error("CONFIRMATION_TOKEN_INVALID: Token not found or expired");
  }

  const now = Date.now();
  const elapsed = now - pending.initiated_timestamp;
  const remaining = Math.max(0, CONFIG.MINIMUM_DELAY_MS - elapsed);
  const can_proceed = remaining === 0;

  return {
    can_proceed,
    elapsed_ms: elapsed,
    remaining_ms: remaining,
    action_id: pending.action_id,
    action_summary: pending.action_summary,
    consequences: pending.consequences // Return for operator re-verification
  };
}

/**
 * Complete two-step confirmation
 * Step 2: Operator re-confirms with consequences verbatim
 * 
 * @param {string} confirmation_token - Token from initiation
 * @param {Array} operator_consequences - Operator's re-statement of consequences
 * @returns {Object} {confirmed, action_id, consequences_verified}
 * @throws {Error} If consequences don't match or delay not met
 */
export function completeConfirmation(confirmation_token, operator_consequences) {
  const pending = pendingConfirmations.get(confirmation_token);
  if (!pending) {
    throw new Error("CONFIRMATION_TOKEN_INVALID: Token not found or expired");
  }

  // Verify delay
  const now = Date.now();
  const elapsed = now - pending.initiated_timestamp;
  if (elapsed < CONFIG.MINIMUM_DELAY_MS) {
    throw new Error(`CONFIRMATION_SEQUENCE_VIOLATION: Minimum delay of ${CONFIG.MINIMUM_DELAY_MS}ms not met (only ${elapsed}ms elapsed)`);
  }

  // Verify consequences match verbatim
  if (!operator_consequences || !Array.isArray(operator_consequences)) {
    throw new Error("CONFIRMATION_SEQUENCE_VIOLATION: operator_consequences must be array");
  }

  if (operator_consequences.length !== pending.consequences.length) {
    throw new Error("CONFIRMATION_SEQUENCE_VIOLATION: Consequence count mismatch");
  }

  // Exact string matching, no copy-paste allowed
  for (let i = 0; i < operator_consequences.length; i++) {
    if (operator_consequences[i] !== pending.consequences[i]) {
      throw new Error(`CONFIRMATION_SEQUENCE_VIOLATION: Consequence ${i} mismatch (copy-paste not allowed)`);
    }
  }

  // Confirmation successful
  const result = {
    confirmed: true,
    action_id: pending.action_id,
    consequences_verified: true,
    confirmed_at: new Date().toISOString(),
    elapsed_ms: elapsed,
    confirmation_hash: crypto.createHash("sha256")
      .update(`${pending.action_id}:${JSON.stringify(pending.consequences)}:${pending.initiated_at}`)
      .digest("hex")
  };

  // Clean up pending record
  pendingConfirmations.delete(confirmation_token);

  return result;
}

/**
 * Cancel pending confirmation
 * @param {string} confirmation_token - Token to cancel
 */
export function cancelConfirmation(confirmation_token) {
  pendingConfirmations.delete(confirmation_token);
  return {
    status: "CONFIRMATION_CANCELLED",
    confirmation_token
  };
}

/**
 * Get pending confirmation status (for debugging)
 * @param {string} confirmation_token - Token to check
 * @returns {Object} Pending confirmation data or null
 */
export function getPendingConfirmation(confirmation_token) {
  return pendingConfirmations.get(confirmation_token) || null;
}

/**
 * Reset all pending confirmations (testing only)
 */
export function resetPendingConfirmations() {
  pendingConfirmations.clear();
}
