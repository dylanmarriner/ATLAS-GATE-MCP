import crypto from "crypto";
import { createHash } from "crypto";
import { invariant, invariantNotNull, invariantTrue } from "./invariant.js";

/**
 * PLAN LINTER: Deterministic validation of plan structure, enforceability, and auditability
 * 
 * Runs at three critical points:
 * 1. Plan creation (proposal)
 * 2. Plan approval
 * 3. Plan execution (hash re-validation)
 * 
 * MANDATORY: All plans must pass linting before approval/execution
 * 
 * NOTE: Uses SHA256 for hashing (BLAKE3 requires external dependency).
 * Hash computation strips:
 * - HTML comments (<!-- -->)
 * - [BLAKE3_HASH: ...] footers
 * This allows plans to embed their own hash without circular dependency.
 */

const PLAN_LINT_ERROR_CODES = {
    MISSING_SECTION: "PLAN_MISSING_SECTION",
    MISSING_FIELD: "PLAN_MISSING_FIELD",
    INVALID_STRUCTURE: "PLAN_INVALID_STRUCTURE",
    AMBIGUOUS_LANGUAGE: "PLAN_AMBIGUOUS_LANGUAGE",
    PATH_ESCAPE: "PLAN_PATH_ESCAPE",
    NON_ENFORCEABLE: "PLAN_NOT_ENFORCEABLE",
    NON_AUDITABLE: "PLAN_NOT_AUDITABLE",
    INVALID_PHASE_ID: "PLAN_INVALID_PHASE_ID",
    INVALID_PATH: "PLAN_INVALID_PATH",
    HASH_MISMATCH: "PLAN_HASH_MISMATCH",
};

const REQUIRED_SECTIONS = [
    "Plan Metadata",
    "Scope & Constraints",
    "Phase Definitions",
    "Path Allowlist",
    "Verification Gates",
    "Forbidden Actions",
    "Rollback / Failure Policy",
];

const REQUIRED_PHASE_FIELDS = [
    "Phase ID",
    "Objective",
    "Allowed operations",
    "Forbidden operations",
    "Required intent artifacts",
    "Verification commands",
    "Expected outcomes",
    "Failure stop conditions",
];

const AMBIGUOUS_PATTERNS = [
    /\bmay\b/i,
    /\bshould\b/i,
    /\bif possible\b/i,
    /\buse best judgment\b/i,
    /\boptional\b/i,
    /\btry to\b/i,
    /\battempt to\b/i,
];

const STUB_PATTERNS = [
    /TODO[:\s]/i,
    /FIXME[:\s]/i,
    /XXX[:\s]/i,
    /HACK[:\s]/i,
    /stub/i,
    /mock/i,
    /placeholder/i,
    /temp.*implementation/i,
    /to be (determined|implemented|defined)/i,
    /tbd/i,
    /wip\b/i,
];

const FORBIDDEN_PATH_PATTERNS = [
    /\.\./,           // Parent directory escape
    /^\/[a-z_]/i,     // Absolute path
    /\$\{/,           // Unresolved variable
];

/**
 * Compute plan hash from canonical plan text
 * Hash is deterministic: same content -> same hash
 * 
 * Strips both HTML comments and [SHA256_HASH: ...] footers before hashing.
 * This allows plans to embed their own hash without circular dependency.
 * 
 * Returns SHA256 hex digest (64 hexadecimal characters).
 */
export function computePlanHash(planContent) {
    invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");
    invariantTrue(
        typeof planContent === "string" && planContent.length > 0,
        "PLAN_CONTENT_INVALID",
        "Plan content must be non-empty string"
    );

    // Strip both HTML comments (<!--...-->) and [SHA256_HASH: ...] footers
    // This allows the hash value to be embedded without circular dependency
    let stripped = planContent
        // Remove HTML comment headers
        .replace(/<!--[\s\S]*?-->\s*/m, "")
        // Remove [SHA256_HASH: ...] footer (with optional whitespace before/after)
        .replace(/\s*\[SHA256_HASH:\s*[^\]]*\]\s*$/m, "");

    const canonicalized = stripped
        .trim()
        .split("\n")
        .map(line => line.trimRight())
        .join("\n");

    return crypto.createHash("sha256").update(canonicalized).digest("hex");
}

/**
 * Validate plan structure: required sections and ordering
 */
function validatePlanStructure(planContent) {
    const violations = [];
    const sections = extractSections(planContent);

    // Check all required sections present
    for (const required of REQUIRED_SECTIONS) {
        if (!sections.has(required)) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.MISSING_SECTION,
                message: `Required section missing: "${required}"`,
                severity: "ERROR",
                invariant: "PLAN_SCOPE_LAW",
            });
        }
    }

    // Check section order (required sections must appear in order)
    const sectionOrder = Array.from(sections.keys());
    let lastIdx = -1;
    for (const required of REQUIRED_SECTIONS) {
        const idx = sectionOrder.indexOf(required);
        if (idx !== -1 && idx < lastIdx) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.INVALID_STRUCTURE,
                message: `Section "${required}" appears out of order`,
                severity: "ERROR",
                invariant: "PLAN_SCOPE_LAW",
            });
        }
        if (idx !== -1) lastIdx = idx;
    }

    return violations;
}

/**
 * Validate phase definitions
 */
function validatePhases(planContent) {
    const violations = [];
    const phases = extractPhases(planContent);

    if (phases.length === 0) {
        violations.push({
            code: PLAN_LINT_ERROR_CODES.MISSING_FIELD,
            message: "No phases defined in Phase Definitions section",
            severity: "ERROR",
            invariant: "PLAN_SCOPE_LAW",
        });
        return violations;
    }

    const phaseIds = new Set();
    for (const phase of phases) {
        // Check required fields
        for (const field of REQUIRED_PHASE_FIELDS) {
            if (!phase.hasOwnProperty(field)) {
                violations.push({
                    code: PLAN_LINT_ERROR_CODES.MISSING_FIELD,
                    message: `Phase "${phase['Phase ID'] || 'unknown'}" missing required field: "${field}"`,
                    severity: "ERROR",
                    invariant: "PLAN_SCOPE_LAW",
                });
            }
        }

        // Check Phase ID uniqueness and validity
        const phaseId = phase["Phase ID"];
        if (!phaseId) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.INVALID_PHASE_ID,
                message: "Phase ID is required and cannot be empty",
                severity: "ERROR",
                invariant: "PLAN_SCOPE_LAW",
            });
        } else if (phaseIds.has(phaseId)) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.INVALID_PHASE_ID,
                message: `Duplicate Phase ID: "${phaseId}"`,
                severity: "ERROR",
                invariant: "PLAN_SCOPE_LAW",
            });
        } else {
            phaseIds.add(phaseId);
        }

        // Validate Phase ID format (alphanumeric + underscore, no spaces)
        if (phaseId && !/^[A-Z0-9_]+$/.test(phaseId)) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.INVALID_PHASE_ID,
                message: `Invalid Phase ID format: "${phaseId}" (must be uppercase alphanumeric + underscore)`,
                severity: "ERROR",
                invariant: "PLAN_SCOPE_LAW",
            });
        }
    }

    return violations;
}

/**
 * Validate path allowlist: no escapes, no globs unless explicit
 */
function validatePathAllowlist(planContent) {
    const violations = [];
    const allowlist = extractPathAllowlist(planContent);

    for (const path of allowlist) {
        // Check for escape patterns
        for (const pattern of FORBIDDEN_PATH_PATTERNS) {
            if (pattern.test(path)) {
                violations.push({
                    code: PLAN_LINT_ERROR_CODES.PATH_ESCAPE,
                    message: `Path escape detected: "${path}"`,
                    severity: "ERROR",
                    invariant: "PLAN_SCOPE_LAW",
                });
            }
        }

        // Paths must be workspace-relative (not absolute)
        if (path.startsWith("/") && !path.includes("**")) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.INVALID_PATH,
                message: `Absolute path not allowed: "${path}" (use workspace-relative paths)`,
                severity: "ERROR",
                invariant: "PLAN_SCOPE_LAW",
            });
        }
    }

    return violations;
}

/**
 * Validate enforceability: all rules must be machine-enforceable
 */
function validateEnforceability(planContent) {
    const violations = [];

    // Check for stubs and mock data (MANDATORY REJECTION)
    for (const pattern of STUB_PATTERNS) {
        const matches = planContent.match(new RegExp(pattern, "g")) || [];
        for (const _ of matches) {
            const lines = planContent.split("\n");
            const lineNum = lines.findIndex(l => pattern.test(l));
            violations.push({
                code: PLAN_LINT_ERROR_CODES.NON_ENFORCEABLE,
                message: `Stub/incomplete code detected (line ~${lineNum + 1}). Plans must contain complete, production-ready implementations.`,
                severity: "ERROR",
                invariant: "PRODUCTION_READY",
            });
        }
    }

    // Check for vague language that indicates human judgment
    for (const pattern of AMBIGUOUS_PATTERNS) {
        const matches = planContent.match(new RegExp(pattern, "g")) || [];
        for (const _ of matches) {
            const line = planContent
                .split("\n")
                .findIndex(l => pattern.test(l));
            violations.push({
                code: PLAN_LINT_ERROR_CODES.NON_ENFORCEABLE,
                message: `Non-enforceable language detected (line ~${line + 1}). Plans must use binary language (MUST, MUST NOT, etc.)`,
                severity: "ERROR",
                invariant: "MECHANICAL_LAW_ONLY",
            });
        }
    }

    // Check for "human judgment" clauses
    if (/use best judgment|use judgment|exercise judgment/i.test(planContent)) {
        violations.push({
            code: PLAN_LINT_ERROR_CODES.NON_ENFORCEABLE,
            message: "Plans cannot include human judgment clauses. All rules must be deterministic.",
            severity: "ERROR",
            invariant: "MECHANICAL_LAW_ONLY",
        });
    }

    return violations;
}

/**
 * Validate auditability: non-coders must be able to understand
 */
function validateAuditability(planContent) {
    const violations = [];

    // Extract objectives and verify they're plain English
    const objectiveMatches = planContent.match(/objective[:\s]+([^\n]+)/gi) || [];
    for (const match of objectiveMatches) {
        const objective = match.replace(/^objective[:\s]+/i, "").trim();

        // Check for code symbols (variables, functions, paths)
        if (/\$\{|<[a-z]+>|`[^`]+`|function|const |let |var /i.test(objective)) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.NON_AUDITABLE,
                message: `Objective contains code symbols (must be plain English)`,
                severity: "ERROR",
                invariant: "PUBLIC_LAW_READABLE",
            });
        }
    }

    return violations;
}

/**
 * Main linting function
 * Returns structured violation list or PASS
 */
export function lintPlan(planContent, expectedHash = null) {
    invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");

    const violations = [];

    // Stage 1: Structure validation
    violations.push(...validatePlanStructure(planContent));

    // Stage 2: Phase validation
    violations.push(...validatePhases(planContent));

    // Stage 3: Path validation
    violations.push(...validatePathAllowlist(planContent));

    // Stage 4: Enforceability validation
    violations.push(...validateEnforceability(planContent));

    // Stage 5: Auditability validation
    violations.push(...validateAuditability(planContent));

    // Stage 6: Hash validation (if provided)
    if (expectedHash) {
        const actualHash = computePlanHash(planContent);
        if (actualHash !== expectedHash) {
            violations.push({
                code: PLAN_LINT_ERROR_CODES.HASH_MISMATCH,
                message: `Hash mismatch: expected ${expectedHash}, got ${actualHash}`,
                severity: "ERROR",
                invariant: "PLAN_IMMUTABILITY",
            });
        }
    }

    // Separate errors and warnings
    const errors = violations.filter(v => v.severity === "ERROR");
    const warnings = violations.filter(v => v.severity === "WARNING");

    // PASS only if no errors (warnings are allowed)
    const passed = errors.length === 0;

    return {
        passed,
        hash: computePlanHash(planContent),
        errors,
        warnings,
        violations: errors.concat(warnings),
    };
}

/**
 * Helper: Extract sections from plan markdown
 */
function extractSections(content) {
    const sections = new Map();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        for (const section of REQUIRED_SECTIONS) {
            if (lines[i].includes(`# ${section}`) || lines[i].includes(`## ${section}`)) {
                sections.set(section, i);
                break;
            }
        }
    }

    return sections;
}

/**
 * Helper: Extract phase definitions
 */
function extractPhases(content) {
    const phases = [];

    // Split by phase markers (## Phase: or ### Phase:)
    const phaseRegex = /(?:##|###)\s+Phase[:\s]+(.+?)(?=(?:##|###)\s+Phase|# (?!#)|$)/gs;

    let match;
    while ((match = phaseRegex.exec(content)) !== null) {
        const phaseText = match[1];
        const phase = {};

        // Extract field values from phase text
        for (const field of REQUIRED_PHASE_FIELDS) {
            const fieldRegex = new RegExp(`${field}[:\\s]+([^\n]+)`, "i");
            const fieldMatch = phaseText.match(fieldRegex);
            if (fieldMatch) {
                phase[field] = fieldMatch[1].trim();
            }
        }

        phases.push(phase);
    }

    return phases;
}

/**
 * Helper: Extract path allowlist
 */
function extractPathAllowlist(content) {
    const paths = [];
    const allowlistRegex = /# Path Allowlist[\s\S]*?(?=# (?!#)|$)/i;
    const match = content.match(allowlistRegex);

    if (match) {
        const lines = match[0].split("\n");
        for (const line of lines) {
            const path = line.replace(/^[-\s*]+/, "").trim();
            if (path && !path.startsWith("#") && path.length > 0 && path !== "Path Allowlist") {
                paths.push(path);
            }
        }
    }

    return paths;
}

export { PLAN_LINT_ERROR_CODES, REQUIRED_SECTIONS, REQUIRED_PHASE_FIELDS };
