/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Deterministic JSON plan validation + cosign signing
 * AUTHORITY: ATLAS-GATE-v2 Governance
 *
 * Plans are now strict JSON (not Markdown). JSON.parse() is used for all
 * structural validation — no regex, no order-sensitive parsing, no ambiguity.
 *
 * Linting stages:
 *   1. JSON parse + schema validation
 *   2. Phase validation (8 required fields, UPPERCASE_WITH_UNDERSCORES IDs)
 *   3. Path allowlist validation (no absolute, no .. traversal)
 *   4. Enforceability validation (no stubs, no ambiguous language)
 *   5. Auditability validation (plain English objectives)
 *   6. Spectral linting (JSON-aware rules)
 *   7. Signature verification (if signature + public key provided)
 */

import { signWithCosign, verifyWithCosign, canonicalizeForSigning } from "../infrastructure/cosign-hash-provider.js";
import { invariantNotNull } from "../domain/invariant.js";
import { buildPlanRuleset } from "./spectral-ruleset.js";

const PLAN_LINT_SYSTEM_ERROR_CODES = {
  MISSING_SECTION: "PLAN_MISSING_SECTION",
  MISSING_FIELD: "PLAN_MISSING_FIELD",
  INVALID_STRUCTURE: "PLAN_INVALID_STRUCTURE",
  AMBIGUOUS_LANGUAGE: "PLAN_AMBIGUOUS_LANGUAGE",
  PATH_ESCAPE: "PLAN_PATH_ESCAPE",
  NON_ENFORCEABLE: "PLAN_NOT_ENFORCEABLE",
  NON_AUDITABLE: "PLAN_NOT_AUDITABLE",
  INVALID_PHASE_ID: "PLAN_INVALID_PHASE_ID",
  INVALID_PATH: "PLAN_INVALID_PATH",
  SIGNATURE_MISMATCH: "PLAN_SIGNATURE_MISMATCH",
  INVALID_JSON: "PLAN_INVALID_JSON",
};

// Required top-level keys in a valid plan JSON object
const REQUIRED_PLAN_KEYS = [
  "atlas_gate_plan_signature",
  "role",
  "status",
  "plan_metadata",
  "scope_and_constraints",
  "phase_definitions",
  "path_allowlist",
  "verification_gates",
  "forbidden_actions",
  "rollback_failure_policy",
];

// Required fields in plan_metadata
const REQUIRED_METADATA_KEYS = [
  "plan_id",
  "version",
  "author",
  "timestamp",
  "governance",
];

// Required fields in each phase definition
const REQUIRED_PHASE_FIELDS = [
  "phase_id",
  "objective",
  "allowed_operations",
  "forbidden_operations",
  "required_intent_artifacts",
  "verification_commands",
  "expected_outcomes",
  "failure_stop_conditions",
];

// Patterns for stub/incomplete content
const STUB_PATTERN = /\b(TODO|FIXME|XXX|HACK|stub|mock|placeholder|TBD|WIP)\b/i;

// Patterns for ambiguous language (non-deterministic plans)
const AMBIGUOUS_PATTERN = /\b(may|should|if possible|use best judgment|optional|try to|attempt to)\b/i;

// Pattern to detect code symbols in objectives (disallowed per auditability rule)
const CODE_SYMBOL_PATTERN = /(\$\{|<[a-zA-Z]+>|`[^`]+`|\bfunction\b|\bconst \b|\blet \b|\bvar \b)/;

/**
 * Parse and validate top-level JSON structure
 */
function validateJsonStructure(planContent) {
  const violations = [];
  let plan;

  try {
    plan = JSON.parse(planContent);
  } catch (err) {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_JSON,
      message: `Plan is not valid JSON: ${err.message}`,
      severity: "ERROR",
      invariant: "PLAN_JSON_REQUIRED",
    });
    return { violations, plan: null };
  }

  // Check all required top-level keys
  for (const key of REQUIRED_PLAN_KEYS) {
    if (!(key in plan)) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_FIELD,
        message: `Missing required top-level key: "${key}"`,
        severity: "ERROR",
        invariant: "PLAN_SCOPE_LAW",
      });
    }
  }

  // Validate status === "APPROVED"
  if (plan.status && plan.status !== "APPROVED") {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
      message: `Plan status must be "APPROVED", got: "${plan.status}"`,
      severity: "ERROR",
      invariant: "PLAN_APPROVAL_GATE",
    });
  }

  // Validate role
  if (plan.role && plan.role !== "ANTIGRAVITY") {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
      message: `Plan role must be "ANTIGRAVITY", got: "${plan.role}"`,
      severity: "ERROR",
      invariant: "PLAN_ROLE_BINDING",
    });
  }

  // Validate plan_metadata keys
  if (plan.plan_metadata && typeof plan.plan_metadata === "object") {
    for (const key of REQUIRED_METADATA_KEYS) {
      if (!(key in plan.plan_metadata)) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_FIELD,
          message: `Missing required plan_metadata key: "${key}"`,
          severity: "ERROR",
          invariant: "PLAN_SCOPE_LAW",
        });
      }
    }
    // Validate governance version
    if (plan.plan_metadata.governance && plan.plan_metadata.governance !== "ATLAS-GATE-v2") {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
        message: `plan_metadata.governance must be "ATLAS-GATE-v2", got: "${plan.plan_metadata.governance}"`,
        severity: "WARNING",
        invariant: "GOVERNANCE_VERSION",
      });
    }
  }

  // Validate arrays are actually arrays
  if (plan.phase_definitions !== undefined && !Array.isArray(plan.phase_definitions)) {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
      message: `phase_definitions must be an array`,
      severity: "ERROR",
      invariant: "PLAN_SCOPE_LAW",
    });
  }

  if (plan.path_allowlist !== undefined && !Array.isArray(plan.path_allowlist)) {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
      message: `path_allowlist must be an array`,
      severity: "ERROR",
      invariant: "PLAN_SCOPE_LAW",
    });
  }

  return { violations, plan };
}

/**
 * Validate phase definitions array
 */
function validatePhases(plan) {
  const violations = [];
  const phases = plan.phase_definitions;

  if (!Array.isArray(phases) || phases.length === 0) {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_FIELD,
      message: "phase_definitions must be a non-empty array",
      severity: "ERROR",
      invariant: "PLAN_SCOPE_LAW",
    });
    return violations;
  }

  const phaseIds = new Set();

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    // Check all required fields
    for (const field of REQUIRED_PHASE_FIELDS) {
      if (!(field in phase)) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_FIELD,
          message: `phase_definitions[${i}] missing required field: "${field}"`,
          severity: "ERROR",
          invariant: "PLAN_SCOPE_LAW",
        });
      }
    }

    // Validate phase_id format: UPPERCASE_WITH_UNDERSCORES
    const phaseId = phase.phase_id;
    if (!phaseId) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PHASE_ID,
        message: `phase_definitions[${i}].phase_id is required`,
        severity: "ERROR",
        invariant: "PLAN_SCOPE_LAW",
      });
    } else {
      if (!/^[A-Z0-9_]+$/.test(phaseId)) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PHASE_ID,
          message: `Invalid phase_id format: "${phaseId}" — must be UPPERCASE_WITH_UNDERSCORES only`,
          severity: "ERROR",
          invariant: "PLAN_SCOPE_LAW",
        });
      }
      if (phaseIds.has(phaseId)) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PHASE_ID,
          message: `Duplicate phase_id: "${phaseId}"`,
          severity: "ERROR",
          invariant: "PLAN_SCOPE_LAW",
        });
      }
      phaseIds.add(phaseId);
    }

    // Validate that required array fields are actually arrays
    for (const arrField of ["allowed_operations", "forbidden_operations", "required_intent_artifacts",
                             "verification_commands", "expected_outcomes", "failure_stop_conditions"]) {
      if (field in phase && !Array.isArray(phase[arrField])) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
          message: `phase_definitions[${i}].${arrField} must be an array`,
          severity: "ERROR",
          invariant: "PLAN_SCOPE_LAW",
        });
      }
    }
  }

  return violations;
}

/**
 * Validate path_allowlist: no absolute paths, no .. traversal
 */
function validatePathAllowlist(plan) {
  const violations = [];
  const allowlist = plan.path_allowlist;

  if (!Array.isArray(allowlist)) return violations;

  for (const p of allowlist) {
    if (typeof p !== "string") {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PATH,
        message: `path_allowlist entries must be strings, got: ${typeof p}`,
        severity: "ERROR",
        invariant: "PLAN_SCOPE_LAW",
      });
      continue;
    }
    if (p.startsWith("/")) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.PATH_ESCAPE,
        message: `Absolute path not allowed in path_allowlist: "${p}"`,
        severity: "ERROR",
        invariant: "PATH_CONFINEMENT",
      });
    }
    if (p.includes("..")) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.PATH_ESCAPE,
        message: `Parent traversal (..) not allowed in path_allowlist: "${p}"`,
        severity: "ERROR",
        invariant: "PATH_CONFINEMENT",
      });
    }
    if (p.includes("${")) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.PATH_ESCAPE,
        message: `Unresolved variable in path_allowlist: "${p}"`,
        severity: "ERROR",
        invariant: "PATH_CONFINEMENT",
      });
    }
  }

  return violations;
}

/**
 * Validate enforceability: no stubs, no ambiguous language across all string values
 */
function validateEnforceability(planContent) {
  const violations = [];

  if (STUB_PATTERN.test(planContent)) {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.NON_ENFORCEABLE,
      message: "Stub/placeholder content detected (TODO, FIXME, mock, stub, TBD, etc.) — plans must be complete",
      severity: "ERROR",
      invariant: "NO_STUBS_IN_PLANS",
    });
  }

  if (AMBIGUOUS_PATTERN.test(planContent)) {
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.AMBIGUOUS_LANGUAGE,
      message: "Non-enforceable language detected (may/should/optional/etc.) — use MUST/MUST NOT",
      severity: "ERROR",
      invariant: "BINARY_LANGUAGE_REQUIRED",
    });
  }

  return violations;
}

/**
 * Validate auditability: objectives must be plain English, no code symbols
 */
function validateAuditability(plan) {
  const violations = [];

  // Check scope objective
  if (plan.scope_and_constraints?.objective) {
    if (CODE_SYMBOL_PATTERN.test(plan.scope_and_constraints.objective)) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.NON_AUDITABLE,
        message: `scope_and_constraints.objective contains code symbols (must be plain English)`,
        severity: "ERROR",
        invariant: "PUBLIC_LAW_READABLE",
      });
    }
  }

  // Check phase objectives
  if (Array.isArray(plan.phase_definitions)) {
    for (let i = 0; i < plan.phase_definitions.length; i++) {
      const obj = plan.phase_definitions[i].objective;
      if (obj && CODE_SYMBOL_PATTERN.test(obj)) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.NON_AUDITABLE,
          message: `phase_definitions[${i}].objective contains code symbols (must be plain English)`,
          severity: "ERROR",
          invariant: "PUBLIC_LAW_READABLE",
        });
      }
    }
  }

  return violations;
}

/**
 * Initialize Spectral with the JSON-aware ATLAS-GATE ruleset
 */
async function initializeSpectral() {
  try {
    const core = await import("@stoplight/spectral-core");
    const parsers = await import("@stoplight/spectral-parsers");
    const Spectral = core.Spectral || (core.default && core.default.Spectral);
    const Document = core.Document || (core.default && core.default.Document);
    const Parsers = parsers.default || parsers;

    const spectral = new Spectral();
    const ruleset = await buildPlanRuleset();
    spectral.setRuleset(ruleset);

    return { spectral, Document, Parsers };
  } catch (err) {
    throw new Error(`Failed to initialize Spectral linter: ${err.message}`);
  }
}

/**
 * Run Spectral linting on the raw JSON string (not wrapped — JSON plans parse natively)
 */
async function runSpectralLinting(planContent) {
  const violations = [];
  try {
    const { spectral, Document, Parsers } = await initializeSpectral();
    const doc = new Document(planContent, Parsers.Json, "plan.json");
    const results = await spectral.run(doc);

    for (const result of results) {
      violations.push({
        code: "SPECTRAL_LINT_ERROR",
        message: result.message,
        severity: result.severity === "error" ? "ERROR" : "WARNING",
        invariant: "SPECTRAL_LINT",
        path: result.path?.join("."),
      });
    }
  } catch (err) {
    console.error("[SPECTRAL_LINTING_ERROR]", err.message);
    violations.push({
      code: "SPECTRAL_ERROR",
      message: `Spectral linting failed: ${err.message}`,
      severity: "ERROR",
      invariant: "SPECTRAL_LINT",
    });
  }
  return violations;
}

/**
 * Canonicalize plan JSON for consistent signing.
 * Removes atlas_gate_plan_signature before signing (same as stripping HTML header in old format).
 */
export function canonicalizePlanContent(planContent) {
  let plan;
  try {
    plan = JSON.parse(planContent);
  } catch (err) {
    throw new Error(`Cannot canonicalize non-JSON plan: ${err.message}`);
  }

  // Remove the signature field before canonicalization (it can't sign itself)
  const { atlas_gate_plan_signature: _sig, ...planWithoutSig } = plan;
  return canonicalizeForSigning(JSON.stringify(planWithoutSig, Object.keys(planWithoutSig).sort()));
}

/**
 * Verify plan signature using cosign (ECDSA P-256)
 */
export async function verifyPlanSignature(planContent, signature, publicKey) {
  invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");
  invariantNotNull(signature, "SIGNATURE_REQUIRED", "Signature is required");
  invariantNotNull(publicKey, "PUBLIC_KEY_REQUIRED", "Public key is required");

  try {
    const canonicalized = canonicalizePlanContent(planContent);
    const verified = await verifyWithCosign(canonicalized, signature, publicKey);
    return verified;
  } catch (err) {
    throw new Error(`[PLAN_SIGNATURE_VERIFICATION_FAILED] ${err.message}`);
  }
}

/**
 * Main linting function — validates JSON plan structure and enforceability.
 * Returns { passed, errors, warnings, violations, plan }
 */
export async function lintPlan(planContent, expectedSignature = null, publicKey = null) {
  invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");

  const violations = [];

  // Stage 1: JSON parse + top-level schema
  const { violations: structViolations, plan } = validateJsonStructure(planContent);
  violations.push(...structViolations);

  // Cannot proceed with further checks if JSON is invalid
  if (!plan) {
    return {
      passed: false,
      errors: violations.filter(v => v.severity === "ERROR"),
      warnings: violations.filter(v => v.severity === "WARNING"),
      violations,
      plan: null,
    };
  }

  // Stage 2: Phase validation
  violations.push(...validatePhases(plan));

  // Stage 3: Path allowlist validation
  violations.push(...validatePathAllowlist(plan));

  // Stage 4: Enforceability (scan full JSON string for stubs/ambiguous language)
  violations.push(...validateEnforceability(planContent));

  // Stage 5: Auditability (plain English objectives)
  violations.push(...validateAuditability(plan));

  // Stage 6: Spectral linting (JSON-native rules)
  const spectralViolations = await runSpectralLinting(planContent);
  violations.push(...spectralViolations);

  // Stage 7: Signature verification
  if (expectedSignature && publicKey) {
    try {
      const isValid = await verifyPlanSignature(planContent, expectedSignature, publicKey);
      if (!isValid) {
        violations.push({
          code: PLAN_LINT_SYSTEM_ERROR_CODES.SIGNATURE_MISMATCH,
          message: "Signature verification failed: signature does not match content",
          severity: "ERROR",
          invariant: "PLAN_IMMUTABILITY",
        });
      }
    } catch (err) {
      throw new Error(`Signature verification failed: ${err.message}`);
    }
  }

  const errors = violations.filter(v => v.severity === "ERROR");
  const warnings = violations.filter(v => v.severity === "WARNING");

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    violations: errors.concat(warnings),
    plan, // Return parsed plan object for downstream use
  };
}

export { PLAN_LINT_SYSTEM_ERROR_CODES, REQUIRED_PLAN_KEYS, REQUIRED_PHASE_FIELDS };
