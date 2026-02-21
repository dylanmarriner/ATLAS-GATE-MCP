import { signWithCosign, verifyWithCosign, canonicalizeForSigning } from "./cosign-hash-provider.js";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { mkdir } from "fs/promises";
import { invariant, invariantNotNull, invariantTrue } from "./invariant.js";

/**
 * PLAN LINTER: Deterministic validation with cosign + spectral
 *
 * Runs at three critical points:
 * 1. Plan creation (proposal)
 * 2. Plan approval
 * 3. Plan execution (signature re-validation)
 *
 * MANDATORY: All plans must pass linting before approval/execution
 *
 * Uses cosign for cryptographic signing (ECDSA P-256) and spectral for linting
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
  SIGNATURE_MISMATCH: "PLAN_SIGNATURE_MISMATCH",
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
 * Initialize spectral with plan-specific rules
 * Lazily loads spectral to handle optional dependency
 */
async function initializeSpectral() {
  try {
    const core = await import("@stoplight/spectral-core");
    const Spectral = core.Spectral || (core.default && core.default.Spectral);

    const { truthy, pattern } = await import("@stoplight/spectral-functions");

    const spectral = new Spectral();

    // Define custom rules for plan validation
    spectral.setRuleset({
      rules: {
        "plan-required-sections": {
          description: "Plan must contain all required sections",
          severity: "error",
          given: "$",
          then: {
            function: truthy,
          },
        },
        "plan-no-stubs": {
          description: "Plan must not contain stub/incomplete code",
          severity: "error",
          given: "$",
          then: {
            function: pattern,
            functionOptions: {
              notMatch: STUB_PATTERNS.map(p => p.source).join("|"),
            },
          },
        },
        "plan-phase-format": {
          description: "Phase IDs must be uppercase alphanumeric + underscore",
          severity: "error",
          given: "$",
          then: {
            function: pattern,
            functionOptions: {
              match: "^[A-Z0-9_]+$",
            },
          },
        }
      }
    });

    return spectral;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[SPECTRAL] Failed to initialize Spectral: ${errorMsg}`);
    throw new Error(`Failed to initialize Spectral linter: ${errorMsg}`);
  }
}

/**
 * Sign plan content using cosign (ECDSA P-256)
 * Returns signature in base64
 */
export async function signPlan(planContent, keyPair) {
  invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");
  invariantNotNull(keyPair, "KEY_PAIR_REQUIRED", "Key pair is required");
  invariantTrue(
    typeof planContent === "string" && planContent.length > 0,
    "PLAN_CONTENT_INVALID",
    "Plan content must be non-empty string"
  );

  try {
    const stripedContent = stripComments(planContent);
    const canonicalized = canonicalizeForSigning(stripedContent);

    // Sign using cosign
    const signature = await signWithCosign(canonicalized, keyPair);

    return signature;
  } catch (err) {
    throw new Error(`[PLAN_SIGNING_FAILED] ${err.message}`);
  }
}

/**
 * Verify plan signature using cosign (ECDSA P-256)
 * Returns true if valid, false otherwise
 */
export async function verifyPlanSignature(planContent, signature, publicKey) {
  invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");
  invariantNotNull(signature, "SIGNATURE_REQUIRED", "Signature is required");
  invariantNotNull(publicKey, "PUBLIC_KEY_REQUIRED", "Public key is required");

  try {
    const stripedContent = stripComments(planContent);
    const canonicalized = canonicalizeForSigning(stripedContent);

    // Verify using cosign
    const verified = await verifyWithCosign(canonicalized, signature, publicKey);

    return verified;
  } catch (err) {
    throw new Error(`[PLAN_SIGNATURE_VERIFICATION_FAILED] ${err.message}`);
  }
}

/**
 * Strip HTML comments and signature footers before hashing
 */
function stripComments(content) {
  const lines = content.split('\n');
  let headerEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('-->')) {
      headerEnd = i;
      break;
    }
  }

  // If a header end was found, the body starts after it
  const bodyLines = headerEnd === -1 ? lines : lines.slice(headerEnd + 1);

  // Replace any subsequent single-line or block signature markers just in case
  return bodyLines.join('\n')
    .replace(/<!--[\s\S]*?-->\s*/gm, "")
    .replace(/\s*\[COSIGN_SIGNATURE:\s*[^\]]*\]\s*$/gm, "");
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

  // Check section order
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
          message: `Phase "${phase["Phase ID"] || "unknown"}" missing required field: "${field}"`,
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

    // Validate Phase ID format
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
 * Validate path allowlist
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

    // Paths must be workspace-relative
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
 * Validate enforceability
 */
function validateEnforceability(planContent) {
  const violations = [];

  // Check for stubs
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

  // Check for ambiguous language
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

  // Check for human judgment clauses
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
 * Validate auditability
 */
function validateAuditability(planContent) {
  const violations = [];

  // Extract objectives and verify they're plain English
  const objectiveMatches = planContent.match(/objective[:\s]+([^\n]+)/gi) || [];
  for (const match of objectiveMatches) {
    const objective = match.replace(/^objective[:\s]+/i, "").trim();

    // Check for code symbols
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
 * Run spectral linting on plan content
 */
async function runSpectralLinting(planContent) {
  const violations = [];
  try {
    const spectral = await initializeSpectral();

    // Spectral is optional - skip if not available
    if (!spectral) {
      return violations;
    }

    const results = await spectral.run(planContent);

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
    // Spectral errors are captured as plan violations
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[SPECTRAL_LINTING_ERROR]", errorMsg);
    violations.push({
      code: PLAN_LINT_ERROR_CODES.SPECTRAL_ERROR,
      message: `Spectral linting failed: ${errorMsg}`,
      severity: "ERROR",
      invariant: "SPECTRAL_LINT",
    });
    throw new Error(`Spectral linting failed: ${errorMsg}`);
  }

  return violations;
}

/**
 * Generate cosign key pair (ECDSA P-256)
 * Note: generateCosignKeyPair is now in cosign-hash-provider.js
 * This function is deprecated - use the centralized provider
 */
export async function generateCosignKeys(keyDir = "./.cosign-keys") {
  throw new Error("[DEPRECATED] Use cosign-hash-provider.js::generateCosignKeyPair() instead");
}

/**
 * Canonicalize plan content for consistent signing
 */
export function canonicalizePlanContent(planContent) {
  const stripedContent = stripComments(planContent);
  return canonicalizeForSigning(stripedContent);
}

/**
 * Main linting function - validates plan structure and content
 * Validates structure, phases, paths, enforceability, and auditability.
 * Signing is now done separately with cosign-hash-provider.
 */
export async function lintPlan(planContent, expectedSignature = null, publicKey = null) {
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

  // Stage 6: Spectral linting
  violations.push(...await runSpectralLinting(planContent));

  // Stage 7: Signature verification (if signature and public key provided)
  if (expectedSignature && publicKey) {
    try {
      const isValid = await verifyPlanSignature(planContent, expectedSignature, publicKey);
      if (!isValid) {
        violations.push({
          code: PLAN_LINT_ERROR_CODES.SIGNATURE_MISMATCH,
          message: "Signature verification failed: signature does not match content",
          severity: "ERROR",
          invariant: "PLAN_IMMUTABILITY",
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Signature verification failed: ${errorMsg}`);
    }
  }

  // Separate errors and warnings
  const errors = violations.filter(v => v.severity === "ERROR");
  const warnings = violations.filter(v => v.severity === "WARNING");

  // PASS only if no errors
  const passed = errors.length === 0;

  return {
    passed,
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

  // Split by phase markers
  const phaseRegex = /(?:##|###)\s+Phase[:\s]+(.+?)(?=(?:##|###)\s+Phase|# (?!#)|$)/gs;

  let match;
  while ((match = phaseRegex.exec(content)) !== null) {
    const phaseText = match[1];
    const phase = {};

    // Extract field values
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
