import crypto from "crypto";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Operator identity binding and validation
 * FAILURE MODES: Identity tampering, anonymous actions, session hijacking
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 2:
 * Operator Identity Binding (HARD)
 * 
 * - Every human action must include operator_id, operator_role, authentication_context
 * - Operator identity bound at session start, immutable for session
 * - Prevents anonymous approvals and identity switching
 */

/**
 * Operator identity state - bound at session initialization
 * Immutable for session duration
 */
let boundOperatorIdentity = null;

/**
 * Bind operator identity at session start
 * Called once per session, cannot be changed
 * 
 * @param {string} operator_id - Unique operator identifier (immutable)
 * @param {string} operator_role - Role: OWNER | REVIEWER | AUDITOR
 * @param {string} authentication_context - Source (e.g., 'github-oauth', 'api-key')
 * @returns {Object} Bound identity record
 * @throws {Error} If identity already bound or invalid inputs
 */
export function bindOperatorIdentity(operator_id, operator_role, authentication_context) {
  // Validate: cannot rebind
  if (boundOperatorIdentity !== null) {
    throw new Error("OPERATOR_IDENTITY_ALREADY_BOUND: Identity cannot be changed mid-session");
  }

  // Validate inputs
  if (!operator_id || typeof operator_id !== "string" || operator_id.trim().length === 0) {
    throw new Error("INVALID_OPERATOR_ID: Must be non-empty string");
  }

  const VALID_ROLES = ["OWNER", "REVIEWER", "AUDITOR"];
  if (!VALID_ROLES.includes(operator_role)) {
    throw new Error(`INVALID_OPERATOR_ROLE: Must be one of ${VALID_ROLES.join(", ")}`);
  }

  if (!authentication_context || typeof authentication_context !== "string" || authentication_context.trim().length === 0) {
    throw new Error("INVALID_AUTH_CONTEXT: Must be non-empty string");
  }

  boundOperatorIdentity = {
    operator_id: operator_id.trim(),
    operator_role,
    authentication_context: authentication_context.trim(),
    bound_at: new Date().toISOString(),
    identity_hash: crypto.createHash("sha256")
      .update(`${operator_id}:${operator_role}:${authentication_context}`)
      .digest("hex")
  };

  return {
    status: "OPERATOR_IDENTITY_BOUND",
    operator_id: boundOperatorIdentity.operator_id,
    operator_role: boundOperatorIdentity.operator_role,
    bound_at: boundOperatorIdentity.bound_at
  };
}

/**
 * Get currently bound operator identity
 * @returns {Object|null} Bound identity or null if not yet bound
 */
export function getBoundOperatorIdentity() {
  return boundOperatorIdentity;
}

/**
 * Verify operator is bound and return identity
 * @throws {Error} If no operator bound
 * @returns {Object} Bound operator identity
 */
export function verifyOperatorBound() {
  if (boundOperatorIdentity === null) {
    throw new Error("OPERATOR_IDENTITY_MISSING: No operator bound for this session");
  }
  return boundOperatorIdentity;
}

/**
 * Reset operator identity (for testing only)
 * Not exposed in production MCP tools
 */
export function resetOperatorIdentity() {
  boundOperatorIdentity = null;
}
