/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Centralized invariant assertion system
 * AUTHORITY: This module enforces non-negotiable correctness invariants
 */

import { KaizaError, ERROR_CODES } from "./error.js";

/**
 * Core invariant assertion function.
 * Throws an InvariantViolationError if condition is false.
 *
 * @param {boolean} condition - The invariant condition
 * @param {string} code - Invariant code (e.g., "INV_PATH_ABSOLUTE")
 * @param {string} message - Human-readable message explaining the violation
 * @throws {InvariantViolationError} Always throws if condition is false
 */
export function invariant(condition, code, message) {
  if (!condition) {
    const error = new InvariantViolationError(code, message);
    console.error(
      `[INVARIANT VIOLATION] ${code}: ${message}\n${error.stack}`
    );
    throw error;
  }
}

/**
 * Assert that a value is not null or undefined.
 *
 * @param {any} value - Value to check
 * @param {string} code - Invariant code
 * @param {string} message - Message
 * @throws {InvariantViolationError}
 */
export function invariantNotNull(value, code, message) {
  invariant(
    value !== null && value !== undefined,
    code,
    `${message} (received: ${value})`
  );
}

/**
 * Assert that a value is truthy.
 *
 * @param {any} value - Value to check
 * @param {string} code - Invariant code
 * @param {string} message - Message
 * @throws {InvariantViolationError}
 */
export function invariantTrue(value, code, message) {
  invariant(value, code, `${message} (received: ${value})`);
}

/**
 * Assert that two values are equal.
 *
 * @param {any} actual - Actual value
 * @param {any} expected - Expected value
 * @param {string} code - Invariant code
 * @param {string} message - Message
 * @throws {InvariantViolationError}
 */
export function invariantEqual(actual, expected, code, message) {
  invariant(
    actual === expected,
    code,
    `${message}: expected ${expected}, got ${actual}`
  );
}

/**
 * Assert that a value is of a specific type.
 *
 * @param {any} value - Value to check
 * @param {string} type - Expected type (e.g., "string", "object")
 * @param {string} code - Invariant code
 * @param {string} message - Message
 * @throws {InvariantViolationError}
 */
export function invariantType(value, type, code, message) {
  invariant(
    typeof value === type,
    code,
    `${message}: expected type ${type}, got ${typeof value}`
  );
}

/**
 * Assert that a condition is false (negation).
 *
 * @param {boolean} condition - Condition that must be false
 * @param {string} code - Invariant code
 * @param {string} message - Message
 * @throws {InvariantViolationError}
 */
export function invariantFalse(condition, code, message) {
  invariant(!condition, code, message);
}

/**
 * Custom error class for invariant violations.
 * Ensures all invariant failures are classified and traceable.
 */
class InvariantViolationError extends KaizaError {
  constructor(code, message) {
    super({
      error_code: ERROR_CODES.INVARIANT_VIOLATION,
      phase: "EXECUTION",
      component: "INVARIANT_SYSTEM",
      invariant: code,
      human_message: message,
    });
    this.name = "InvariantViolationError";
    this.code = code; // Keep legacy code property for backward compat

    // Make the error non-recoverable
    Object.setPrototypeOf(this, InvariantViolationError.prototype);
  }

  /**
   * Check if an error is an invariant violation.
   *
   * @param {Error} err - Error to check
   * @returns {boolean}
   */
  static isInvariantViolation(err) {
    return err instanceof InvariantViolationError;
  }

  /**
   * Get the invariant code from an error.
   *
   * @param {Error} err - Error to check
   * @returns {string|null}
   */
  static getCode(err) {
    return err instanceof InvariantViolationError ? err.code : null;
  }
}

export { InvariantViolationError };

/**
 * INVARIANT REGISTRY
 * A catalog of all invariants in the system, organized by category.
 * This is for documentation and traceability purposes.
 */

export const INVARIANTS = {
  // REPOSITORY & PATH INVARIANTS
  PATH_ABSOLUTE: {
    code: "INV_PATH_ABSOLUTE",
    category: "Repository & Path",
    rule: "All resolved paths must be absolute",
    impact: "Prevents ambiguous relative paths and context-dependent behavior",
  },
  PATH_NORMALIZED: {
    code: "INV_PATH_NORMALIZED",
    category: "Repository & Path",
    rule: "All resolved paths must be normalized",
    impact: "Prevents path redundancy and symlink confusion",
  },
  REPO_ROOT_SINGLE: {
    code: "INV_REPO_ROOT_SINGLE",
    category: "Repository & Path",
    rule: "Exactly one repository root per session",
    impact: "Prevents multi-root confusion and path escapes",
  },
  REPO_ROOT_INITIALIZED: {
    code: "INV_REPO_ROOT_INITIALIZED",
    category: "Repository & Path",
    rule: "Repository root must be initialized before any path operation",
    impact: "Prevents uninitialized path resolution",
  },
  PATH_WITHIN_REPO: {
    code: "INV_PATH_WITHIN_REPO",
    category: "Repository & Path",
    rule: "All write targets must descend from repository root",
    impact: "Prevents writes outside the governed repository",
  },
  PLANS_DIR_CANONICAL: {
    code: "INV_PLANS_DIR_CANONICAL",
    category: "Repository & Path",
    rule: "Plans directory is always resolved from the same source",
    impact: "Ensures plan discovery is deterministic",
  },

  // PLAN DIRECTORY INVARIANTS
  PLANS_DIR_EXISTS: {
    code: "INV_PLANS_DIR_EXISTS",
    category: "Plan Directory",
    rule: "Plans directory must exist or be creatable before plan operations",
    impact: "Prevents operations on missing directory",
  },
  PLAN_NOT_ESCAPED: {
    code: "INV_PLAN_NOT_ESCAPED",
    category: "Plan Directory",
    rule: "No plan is ever written outside the canonical plans directory",
    impact: "Prevents plan misplacement",
  },
  PLAN_DISCOVERY_CANONICAL: {
    code: "INV_PLAN_DISCOVERY_CANONICAL",
    category: "Plan Directory",
    rule: "Plan discovery only scans the canonical plans directory",
    impact: "Prevents duplicate plan locations and discovery ambiguity",
  },

  // PLAN LIFECYCLE INVARIANTS
  PLAN_EXISTS: {
    code: "INV_PLAN_EXISTS",
    category: "Plan Lifecycle",
    rule: "Referenced plan must exist on disk",
    impact: "Prevents phantom plan references",
  },
  PLAN_UNIQUE_ID: {
    code: "INV_PLAN_UNIQUE_ID",
    category: "Plan Lifecycle",
    rule: "Plan IDs must be unique within the repository",
    impact: "Prevents plan ID collisions",
  },
  PLAN_STABLE_ID: {
    code: "INV_PLAN_STABLE_ID",
    category: "Plan Lifecycle",
    rule: "Plan ID must remain stable across lookups",
    impact: "Prevents plan identity confusion",
  },
  PLAN_RESOLVABLE: {
    code: "INV_PLAN_RESOLVABLE",
    category: "Plan Lifecycle",
    rule: "Plan ID must resolve to exactly one file path",
    impact: "Prevents plan ambiguity",
  },
  PLAN_APPROVED: {
    code: "INV_PLAN_APPROVED",
    category: "Plan Lifecycle",
    rule: "Only APPROVED plans can be executed",
    impact: "Prevents unauthorized or unreviewed code execution",
  },
  PLAN_NOT_CORRUPTED: {
    code: "INV_PLAN_NOT_CORRUPTED",
    category: "Plan Lifecycle",
    rule: "Plan file must be readable and parse correctly",
    impact: "Prevents corrupted plan execution",
  },
  PLAN_HASH_MATCH: {
    code: "INV_PLAN_HASH_MATCH",
    category: "Plan Lifecycle",
    rule: "Plan file hash must match expected hash if provided",
    impact: "Prevents plan tampering",
  },

  // WRITE EXECUTION INVARIANTS
  WRITE_AUTHORIZED_PLAN: {
    code: "INV_WRITE_AUTHORIZED_PLAN",
    category: "Write Execution",
    rule: "Write must be authorized by a valid, approved, existing plan",
    impact: "Prevents unauthorized writes",
  },
  WRITE_TARGET_AUTHORIZED: {
    code: "INV_WRITE_TARGET_AUTHORIZED",
    category: "Write Execution",
    rule: "Write target must be within plan scope",
    impact: "Prevents writes outside plan authorization",
  },
  WRITE_IDEMPOTENT: {
    code: "INV_WRITE_IDEMPOTENT",
    category: "Write Execution",
    rule: "Same write input always produces same output (normalized)",
    impact: "Prevents non-deterministic writes",
  },
  WRITE_NO_STUBS: {
    code: "INV_WRITE_NO_STUBS",
    category: "Write Execution",
    rule: "Write content must not contain TODO, FIXME, stubs, mocks, or placeholders",
    impact: "Prevents low-quality code from reaching production",
  },
  WRITE_AUDIT_LOGGED: {
    code: "INV_WRITE_AUDIT_LOGGED",
    category: "Write Execution",
    rule: "Every successful write must be appended to audit log",
    impact: "Ensures complete write history",
  },

  // POLICY ENFORCEMENT INVARIANTS
  POLICY_RUN_BEFORE_WRITE: {
    code: "INV_POLICY_RUN_BEFORE_WRITE",
    category: "Policy Enforcement",
    rule: "All policy checks must run before write execution",
    impact: "Prevents policy bypass",
  },
  POLICY_REJECTION_FATAL: {
    code: "INV_POLICY_REJECTION_FATAL",
    category: "Policy Enforcement",
    rule: "Policy rejection is non-recoverable and must abort the write",
    impact: "Prevents policy violations from being worked around",
  },
  POLICY_NO_BYPASS: {
    code: "INV_POLICY_NO_BYPASS",
    category: "Policy Enforcement",
    rule: "Enforcement gates cannot be conditionally skipped",
    impact: "Prevents enforcement weakening",
  },

  // TOOL CONTRACT INVARIANTS
  TOOL_INPUT_NORMALIZED: {
    code: "INV_TOOL_INPUT_NORMALIZED",
    category: "Tool Contract",
    rule: "All tool inputs must be normalized before processing",
    impact: "Prevents format-related ambiguity",
  },
  TOOL_INPUT_VALIDATED: {
    code: "INV_TOOL_INPUT_VALIDATED",
    category: "Tool Contract",
    rule: "All tool inputs must be validated against schema",
    impact: "Prevents malformed inputs from reaching business logic",
  },
  TOOL_SESSION_INTACT: {
    code: "INV_TOOL_SESSION_INTACT",
    category: "Tool Contract",
    rule: "Session state must be consistent across tool calls",
    impact: "Prevents session corruption",
  },

  // ERROR CLASSIFICATION INVARIANTS
  ERROR_CLASSIFIED: {
    code: "INV_ERROR_CLASSIFIED",
    category: "Error Classification",
    rule: "Every error must be intentional and classified",
    impact: "Prevents silent failures and hidden bugs",
  },
  ERROR_DETERMINISTIC: {
    code: "INV_ERROR_DETERMINISTIC",
    category: "Error Classification",
    rule: "Same input should trigger same error",
    impact: "Prevents flaky or environment-dependent failures",
  },
  ERROR_NO_RECOVERY: {
    code: "INV_ERROR_NO_RECOVERY",
    category: "Error Classification",
    rule: "Invariant violations must never be caught and continued",
    impact: "Ensures system stops in invalid state rather than corrupting further",
  },
};

/**
 * Print invariant catalog for documentation.
 */
export function printInvariantCatalog() {
  console.log("\n═════════════════════════════════════════════════════════════");
  console.log("  KAIZA MCP SERVER INVARIANT CATALOG");
  console.log("═════════════════════════════════════════════════════════════\n");

  const categories = {};
  for (const [name, inv] of Object.entries(INVARIANTS)) {
    if (!categories[inv.category]) {
      categories[inv.category] = [];
    }
    categories[inv.category].push(inv);
  }

  for (const [category, invariants] of Object.entries(categories)) {
    console.log(`\n${category.toUpperCase()}`);
    console.log("─".repeat(60));
    for (const inv of invariants) {
      console.log(`  ${inv.code}`);
      console.log(`    Rule:   ${inv.rule}`);
      console.log(`    Impact: ${inv.impact}`);
    }
  }

  console.log("\n═════════════════════════════════════════════════════════════\n");
}
