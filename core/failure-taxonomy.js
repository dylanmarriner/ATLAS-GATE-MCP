/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Canonical failure taxonomy with stable IDs for catastrophic failure handling
 * AUTHORITY: MCP CATASTROPHIC FAILURE SPEC
 * 
 * Defines all failure types with:
 * - Stable failure ID (F-*)
 * - Associated invariant ID
 * - Default severity
 * - Default response (HALT | DEGRADED | REFUSE)
 * - Human-readable description
 */

export const FAILURE_TAXONOMY = {
  // F-STARTUP: Boot integrity failure
  STARTUP_GATE_FAILURE: {
    id: "F-STARTUP",
    invariant_id: "INV_STARTUP_GATE_ENFORCED",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Server failed startup self-audit or gate checks",
    category: "Startup Integrity"
  },

  // F-POLICY: Write-time policy breach
  POLICY_VIOLATION: {
    id: "F-POLICY",
    invariant_id: "INV_POLICY_ENFORCEMENT",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Write-time policy engine detected breach (Rust, plan, etc)",
    category: "Policy Enforcement"
  },

  // F-AUDIT: Audit append/verify failure
  AUDIT_TAMPER_DETECTED: {
    id: "F-AUDIT",
    invariant_id: "INV_AUDIT_INTEGRITY",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Audit log corruption, chain break, or tamper detected"
  },

  AUDIT_APPEND_FAILED: {
    id: "F-AUDIT-WRITE",
    invariant_id: "INV_AUDIT_WRITE",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Failed to append entry to audit log (fail-closed)"
  },

  // F-DETERMINISM: Replay divergence
  REPLAY_DIVERGENCE: {
    id: "F-DETERMINISM",
    invariant_id: "INV_REPLAY_DETERMINISM",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Execution replay produced different result than original"
  },

  // F-AUTHORITY: Role/approval breach
  ROLE_VIOLATION: {
    id: "F-AUTHORITY-ROLE",
    invariant_id: "INV_ROLE_ENFORCEMENT",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Tool invoked with incorrect role or permissions"
  },

  PLAN_UNAPPROVED: {
    id: "F-AUTHORITY-PLAN",
    invariant_id: "INV_PLAN_APPROVAL",
    severity: "CRITICAL",
    default_response: "REFUSE",
    description: "Write attempted with unapproved or invalid plan hash"
  },

  // F-INTENT: Intent schema/drift failure
  INTENT_SCHEMA_VIOLATION: {
    id: "F-INTENT",
    invariant_id: "INV_INTENT_SCHEMA",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Intent artifact violates schema or intent drift detected"
  },

  // F-PLAN: Plan lint/hash failure
  PLAN_HASH_MISMATCH: {
    id: "F-PLAN-HASH",
    invariant_id: "INV_PLAN_HASH_INTEGRITY",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Plan file hash does not match expected hash"
  },

  PLAN_LINT_FAILURE: {
    id: "F-PLAN-LINT",
    invariant_id: "INV_PLAN_LINT",
    severity: "CRITICAL",
    default_response: "REFUSE",
    description: "Plan fails linting or structure validation"
  },

  // F-SECURITY: Tamper detected
  SECURITY_TAMPER: {
    id: "F-SECURITY",
    invariant_id: "INV_SECURITY_TAMPER",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Tamper detection triggered (hash mismatch, file manipulation)"
  },

  // F-HUMAN: Operator trust boundary violation
  OPERATOR_FATIGUE_BREACH: {
    id: "F-HUMAN-FATIGUE",
    invariant_id: "INV_OPERATOR_FATIGUE",
    severity: "HIGH",
    default_response: "HALT",
    description: "Operator fatigue guard triggered (too many errors/retries)"
  },

  OPERATOR_ABUSE_BREACH: {
    id: "F-HUMAN-ABUSE",
    invariant_id: "INV_OPERATOR_ABUSE",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Operator abuse guard triggered (bypass attempts, suspicious patterns)"
  },

  // F-ENV: Filesystem/permission/resource failure
  FILESYSTEM_DENIED: {
    id: "F-ENV-FS",
    invariant_id: "INV_FILESYSTEM_ACCESS",
    severity: "HIGH",
    default_response: "DEGRADED",
    description: "Filesystem permission denied or path not accessible"
  },

  FILESYSTEM_CORRUPTION: {
    id: "F-ENV-CORRUPT",
    invariant_id: "INV_FILESYSTEM_INTEGRITY",
    severity: "CRITICAL",
    default_response: "HALT",
    description: "Filesystem corruption detected or critical file missing"
  },

  RESOURCE_EXHAUSTION: {
    id: "F-ENV-RESOURCE",
    invariant_id: "INV_RESOURCE_AVAILABLE",
    severity: "HIGH",
    default_response: "DEGRADED",
    description: "Resource exhaustion (disk, memory, file descriptors)"
  }
};

/**
 * Get failure definition by ID or key
 */
export function getFailureDefinition(idOrKey) {
  // Try direct lookup by key first
  if (FAILURE_TAXONOMY[idOrKey]) {
    return FAILURE_TAXONOMY[idOrKey];
  }

  // Try lookup by failure ID
  for (const [, def] of Object.entries(FAILURE_TAXONOMY)) {
    if (def.id === idOrKey) {
      return def;
    }
  }

  return null;
}

/**
 * Check if failure is critical severity
 */
export function isCriticalFailure(failureId) {
  const def = getFailureDefinition(failureId);
  return def && def.severity === "CRITICAL";
}

/**
 * Get default kill-switch response for failure
 */
export function getDefaultResponse(failureId) {
  const def = getFailureDefinition(failureId);
  return def ? def.default_response : "HALT";
}

/**
 * List all failures by severity
 */
export function listFailuresBySeverity(severity) {
  return Object.entries(FAILURE_TAXONOMY)
    .filter(([, def]) => def.severity === severity)
    .map(([key, def]) => ({ key, ...def }));
}
