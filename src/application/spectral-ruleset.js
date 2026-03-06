/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: JSON-native Spectral ruleset for ATLAS-GATE plan validation
 *
 * Plans are now strict JSON. Rules operate on JSON path expressions ($.field)
 * not Markdown string content. This eliminates all regex-based Markdown parsing
 * from Spectral and makes every rule deterministic.
 */

// Stub/incomplete content pattern (scanned over full JSON string by plan-linter)
const STUB_PATTERN = "\\b(TODO|FIXME|XXX|HACK|stub|mock|placeholder|TBD|WIP)\\b";

// Ambiguous language pattern
const AMBIGUOUS_PATTERN =
  "\\b(may|should|if possible|use best judgment|optional|try to|attempt to)\\b";

/**
 * Build the ATLAS-GATE JSON-native Spectral ruleset.
 */
export async function buildPlanRuleset() {
  const { truthy, pattern, defined, schema } = await import("@stoplight/spectral-functions");

  return {
    rules: {
      // Plan must have STATUS: APPROVED
      "atlas-gate-approved-status": {
        description: "Plan status must be APPROVED",
        message: "Plan is missing status: APPROVED",
        severity: "error",
        given: "$.status",
        then: {
          function: pattern,
          functionOptions: { match: "^APPROVED$" },
        },
      },

      // Plan must have plan_id
      "atlas-gate-plan-id-defined": {
        description: "plan_metadata.plan_id must be defined",
        message: "plan_metadata.plan_id is missing or empty",
        severity: "error",
        given: "$.plan_metadata.plan_id",
        then: { function: truthy },
      },

      // Plan must have timestamp
      "atlas-gate-timestamp-defined": {
        description: "plan_metadata.timestamp must be defined",
        message: "plan_metadata.timestamp is missing or empty",
        severity: "error",
        given: "$.plan_metadata.timestamp",
        then: { function: truthy },
      },

      // Plan must declare ATLAS-GATE-v2 governance
      "atlas-gate-governance-version": {
        description: "Plan must declare ATLAS-GATE-v2 governance",
        message: "plan_metadata.governance must be 'ATLAS-GATE-v2'",
        severity: "warn",
        given: "$.plan_metadata.governance",
        then: {
          function: pattern,
          functionOptions: { match: "^ATLAS-GATE-v2$" },
        },
      },

      // phase_definitions must be a non-empty array
      "atlas-gate-phases-defined": {
        description: "phase_definitions must be present and non-empty",
        message: "phase_definitions is missing or empty",
        severity: "error",
        given: "$.phase_definitions",
        then: { function: truthy },
      },

      // Each phase must have a phase_id
      "atlas-gate-phase-id-required": {
        description: "Every phase must have a phase_id",
        message: "A phase is missing phase_id",
        severity: "error",
        given: "$.phase_definitions[*].phase_id",
        then: { function: truthy },
      },

      // Each phase_id must be UPPERCASE_WITH_UNDERSCORES
      "atlas-gate-phase-id-format": {
        description: "phase_id must be UPPERCASE_WITH_UNDERSCORES",
        message: "phase_id must be uppercase alphanumeric with underscores only (e.g. PHASE_IMPLEMENTATION)",
        severity: "error",
        given: "$.phase_definitions[*].phase_id",
        then: {
          function: pattern,
          functionOptions: { match: "^[A-Z0-9_]+$" },
        },
      },

      // path_allowlist must be present
      "atlas-gate-path-allowlist-defined": {
        description: "path_allowlist must be defined",
        message: "path_allowlist is missing",
        severity: "error",
        given: "$.path_allowlist",
        then: { function: defined },
      },

      // No absolute paths in path_allowlist
      "atlas-gate-no-absolute-paths": {
        description: "path_allowlist must not contain absolute paths",
        message: "path_allowlist entry is an absolute path (must be workspace-relative)",
        severity: "error",
        given: "$.path_allowlist[*]",
        then: {
          function: pattern,
          functionOptions: { notMatch: "^/" },
        },
      },

      // verification_gates must be defined
      "atlas-gate-verification-gates-defined": {
        description: "verification_gates must be defined",
        message: "verification_gates is missing",
        severity: "error",
        given: "$.verification_gates",
        then: { function: defined },
      },

      // forbidden_actions must be defined
      "atlas-gate-forbidden-actions-defined": {
        description: "forbidden_actions must be defined",
        message: "forbidden_actions is missing",
        severity: "error",
        given: "$.forbidden_actions",
        then: { function: defined },
      },

      // rollback_failure_policy must be defined
      "atlas-gate-rollback-policy-defined": {
        description: "rollback_failure_policy must be defined",
        message: "rollback_failure_policy is missing",
        severity: "error",
        given: "$.rollback_failure_policy",
        then: { function: defined },
      },

      // scope_and_constraints.objective must be defined
      "atlas-gate-objective-defined": {
        description: "scope_and_constraints.objective must be defined",
        message: "scope_and_constraints.objective is missing",
        severity: "error",
        given: "$.scope_and_constraints.objective",
        then: { function: truthy },
      },
    },
  };
}
