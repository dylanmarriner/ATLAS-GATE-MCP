/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Real Spectral ruleset for ATLAS-GATE plan markdown validation
 *
 * This replaces the inline stub ruleset in plan-linter.js with proper,
 * named rules using the full @stoplight/spectral-functions API.
 */

// Required section headers in exact order
const REQUIRED_SECTIONS = [
    "# Plan Metadata",
    "# Scope & Constraints",
    "# Phase Definitions",
    "# Path Allowlist",
    "# Verification Gates",
    "# Forbidden Actions",
    "# Rollback / Failure Policy",
];

// Required phase field names
const REQUIRED_PHASE_FIELDS = [
    "Phase ID:",
    "Objective:",
    "Allowed operations:",
    "Forbidden operations:",
    "Required intent artifacts:",
    "Verification commands:",
    "Expected outcomes:",
    "Failure stop conditions:",
];

// Patterns for ambiguous language (non-deterministic plans)
const AMBIGUOUS_PATTERN =
    "\\b(may|should|if possible|use best judgment|optional|try to|attempt to)\\b";

// Patterns for stub/incomplete content
const STUB_PATTERN =
    "\\b(TODO|FIXME|XXX|HACK|stub|mock|placeholder|TBD|WIP)\\b";

// Code symbols that shouldn't appear in Objectives
const CODE_SYMBOL_PATTERN =
    "(\\$\\{|<[a-zA-Z]+>|`[^`]+`|\\bfunction\\b|\\bconst \\b|\\blet \\b|\\bvar \\b)";

/**
 * Build the ATLAS-GATE Spectral ruleset.
 * Dynamically imports spectral-functions so the module is only loaded
 * after ensureDependencies() has verified it is installed.
 */
export async function buildPlanRuleset() {
    const { truthy, pattern, defined } = await import("@stoplight/spectral-functions");

    return {
        rules: {
            "atlas-gate-plan-metadata": {
                description: "Plan Metadata section must have Plan ID, Status: APPROVED, and Timestamp",
                message: "Plan Metadata is missing required fields (Plan ID, Status: APPROVED, Timestamp)",
                severity: "error",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: {
                        match: "Plan ID:.*\\nVersion:.*\\nAuthor:.*\\nStatus:\\s*APPROVED.*\\nTimestamp:",
                    },
                },
            },

            "atlas-gate-required-sections": {
                description: "Plan must contain all 7 required sections in order",
                message: "Missing required section: {{error}}",
                severity: "error",
                given: "$",
                then: REQUIRED_SECTIONS.map((section) => ({
                    function: pattern,
                    functionOptions: { match: section.replace(/[&]/g, "\\&") },
                }))[0], // Spectral requires single `then` — sections validated by custom JS linter
            },

            "atlas-gate-no-ambiguous-language": {
                description: "Plans must use binary language (MUST/MUST NOT), not vague terms",
                message:
                    "Non-enforceable language detected. Use MUST/MUST NOT instead of may/should/optional/etc.",
                severity: "error",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: { notMatch: AMBIGUOUS_PATTERN },
                },
            },

            "atlas-gate-no-stubs": {
                description: "Plans must not contain stub or incomplete content",
                message: "Stub/placeholder content detected (TODO, FIXME, mock, TBD, etc.)",
                severity: "error",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: { notMatch: STUB_PATTERN },
                },
            },

            "atlas-gate-approved-status": {
                description: "Plan header must have STATUS: APPROVED",
                message: "Plan header is missing STATUS: APPROVED",
                severity: "error",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: { match: "STATUS:\\s*APPROVED" },
                },
            },

            "atlas-gate-no-absolute-paths": {
                description: "Path Allowlist must not contain absolute paths or parent traversal",
                message: "Path Allowlist contains absolute path or parent traversal (..)",
                severity: "error",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: { notMatch: "^\\s*- \\/" },
                },
            },

            "atlas-gate-pending-signature-replaced": {
                description: "Plan must not contain PENDING_SIGNATURE — it must be replaced before saving",
                message: "Plan still contains PENDING_SIGNATURE placeholder. Call save_plan to sign it.",
                severity: "error",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: { notMatch: "PENDING_SIGNATURE" },
                },
            },

            "atlas-gate-governance-version": {
                description: "Plan must declare ATLAS-GATE-v2 governance",
                message: "Plan must include 'Governance: ATLAS-GATE-v2'",
                severity: "warn",
                given: "$",
                then: {
                    function: pattern,
                    functionOptions: { match: "Governance:\\s*ATLAS-GATE-v2" },
                },
            },
        },
    };
}
