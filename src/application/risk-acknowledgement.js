import crypto from "crypto";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Risk acknowledgement tracking and validation
 * FAILURE MODES: Unacknowledged high-risk actions, silent approvals
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 3:
 * Explicit Risk Acknowledgement (CRITICAL)
 * 
 * - Requires structured risk acknowledgement, NOT free text
 * - Machine-generated consequences, not human-written
 * - Tracks blast radius, reversibility, confirmation
 */

/**
 * Risk levels with severity ordering
 */
export const RISK_LEVELS = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  IRREVERSIBLE: 3
};

const RISK_LEVEL_NAMES = {
  0: "LOW",
  1: "MEDIUM",
  2: "HIGH",
  3: "IRREVERSIBLE"
};

/**
 * Generate deterministic consequences for an action
 * These are machine-generated, not human-written
 * 
 * @param {string} action_id - Unique action identifier
 * @param {string} risk_level - Risk level enum
 * @param {Array} affected_files - List of affected file paths
 * @param {Object} context - Action context (purpose, type, etc)
 * @returns {Array} Array of consequence strings
 */
export function generateConsequences(action_id, risk_level, affected_files, context = {}) {
  const consequences = [];

  if (risk_level >= RISK_LEVELS.LOW) {
    consequences.push(`File modification: ${affected_files.length} file(s) will be changed`);
  }

  if (risk_level >= RISK_LEVELS.MEDIUM) {
    consequences.push("Audit log entry will be created");
    consequences.push("Change is recorded in governance history");
  }

  if (risk_level >= RISK_LEVELS.HIGH) {
    consequences.push("This action affects core infrastructure");
    consequences.push("Rollback may require manual intervention");
    affected_files.forEach(f => {
      consequences.push(`  - ${f}`);
    });
  }

  if (risk_level >= RISK_LEVELS.IRREVERSIBLE) {
    consequences.push("WARNING: This action cannot be easily reverted");
    consequences.push("Previous state will not be automatically restored");
    consequences.push("Manual recovery may be required");
  }

  return consequences;
}

/**
 * Validate risk acknowledgement structure
 * Ensures operator has provided structured, not free-text approval
 * 
 * @param {Object} acknowledgement - Risk acknowledgement object
 * @returns {Object} Validation result {valid, errors}
 */
export function validateRiskAcknowledgement(acknowledgement) {
  const errors = [];

  // Required fields
  if (!acknowledgement.action_id || typeof acknowledgement.action_id !== "string") {
    errors.push("action_id is required and must be string");
  }

  if (!acknowledgement.risk_level || !Object.values(RISK_LEVELS).includes(acknowledgement.risk_level)) {
    errors.push(`risk_level must be one of: ${Object.keys(RISK_LEVELS).join(", ")}`);
  }

  if (!Array.isArray(acknowledgement.explicit_consequences) || acknowledgement.explicit_consequences.length === 0) {
    errors.push("explicit_consequences must be non-empty array");
  }

  if (!Array.isArray(acknowledgement.blast_radius) || acknowledgement.blast_radius.length === 0) {
    errors.push("blast_radius must be non-empty array (list of affected files/plans/phases)");
  }

  if (!["YES", "NO"].includes(acknowledgement.reversibility)) {
    errors.push("reversibility must be YES or NO");
  }

  if (acknowledgement.operator_confirmation !== true) {
    errors.push("operator_confirmation must be boolean true");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create risk acknowledgement record
 * Machine-generated with operator confirmation
 * 
 * @param {string} action_id - Action identifier
 * @param {string} risk_level - Risk level name (LOW|MEDIUM|HIGH|IRREVERSIBLE)
 * @param {Array} affected_files - Affected files
 * @param {string} reversibility - YES or NO
 * @param {Object} context - Additional context
 * @returns {Object} Risk acknowledgement template (missing operator_confirmation)
 */
export function createRiskAcknowledgement(action_id, risk_level, affected_files, reversibility, context = {}) {
  const riskLevelNum = RISK_LEVELS[risk_level];
  if (riskLevelNum === undefined) {
    throw new Error(`Invalid risk_level: ${risk_level}`);
  }

  const consequences = generateConsequences(action_id, riskLevelNum, affected_files, context);

  return {
    action_id,
    risk_level: riskLevelNum,
    risk_level_name: risk_level,
    explicit_consequences: consequences,
    blast_radius: affected_files,
    reversibility,
    operator_confirmation: false, // Operator must set to true
    created_at: new Date().toISOString(),
    acknowledgement_hash: crypto.randomBytes(16).toString("hex")
  };
}

/**
 * Enforce risk acknowledgement for high-risk actions
 * Throws if not properly acknowledged
 * 
 * @param {Object} acknowledgement - Risk acknowledgement object
 * @param {number} risk_threshold - Minimum risk level requiring acknowledgement
 * @throws {Error} If acknowledgement invalid or insufficiently confirmed
 */
export function enforceRiskAcknowledgement(acknowledgement, risk_threshold = RISK_LEVELS.MEDIUM) {
  const validation = validateRiskAcknowledgement(acknowledgement);
  if (!validation.valid) {
    throw new Error(`RISK_ACK_INCOMPLETE: ${validation.errors.join("; ")}`);
  }

  if (acknowledgement.risk_level >= risk_threshold) {
    if (acknowledgement.operator_confirmation !== true) {
      throw new Error("RISK_ACK_INCOMPLETE: operator_confirmation must be true for high-risk actions");
    }
  }
}

/**
 * Get risk level name from numeric value
 * @param {number} level - Risk level number
 * @returns {string} Risk level name
 */
export function getRiskLevelName(level) {
  return RISK_LEVEL_NAMES[level] || "UNKNOWN";
}
