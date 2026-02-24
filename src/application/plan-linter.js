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

import { buildPlanRuleset } from "./spectral-ruleset.js";

/**
 * Initialize spectral with our real plan ruleset.
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[SPECTRAL] Failed to initialize Spectral: ${errorMsg}`);
    throw new Error(`Failed to initialize Spectral linter: ${errorMsg}`);
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
        code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_SECTION,
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
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_STRUCTURE,
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
      code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_FIELD,
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
          code: PLAN_LINT_SYSTEM_ERROR_CODES.MISSING_FIELD,
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
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PHASE_ID,
        message: "Phase ID is required and cannot be empty",
        severity: "ERROR",
        invariant: "PLAN_SCOPE_LAW",
      });
    } else if (phaseIds.has(phaseId)) {
      violations.push({
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PHASE_ID,
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
        code: PLAN_LINT_SYSTEM_ERROR_CODES.INVALID_PHASE_ID,
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

  // Path format constraints (no absolute, no parent escape) are handled by Spectral.
  // We can add semantic workspace validation here if needed in the future.

  return violations;
}

/**
 * Enforceability (no stubs, explicit language) 
 * is now validated exclusively by the Spectral ruleset.
 */

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
        code: PLAN_LINT_SYSTEM_ERROR_CODES.NON_AUDITABLE,
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
    const { spectral, Document, Parsers } = await initializeSpectral();

    // Spectral expects a Document object and its parsers choke on raw Markdown.
    // Wrap the raw markdown in a JSON object property so the Json parser succeeds cleanly
    const payload = JSON.stringify({ content: planContent });
    const doc = new Document(payload, Parsers.Json, "plan.json");
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
    // Spectral errors are captured as plan violations
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[SPECTRAL_LINTING_ERROR]", errorMsg);
    violations.push({
      code: PLAN_LINT_SYSTEM_ERROR_CODES.SPECTRAL_ERROR,
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
 * Validates structure, phases, paths, and auditability.
 * Enforceability (stubs/language) is handled by Spectral.
 */
export async function lintPlan(planContent, expectedSignature = null, publicKey = null) {
  invariantNotNull(planContent, "PLAN_CONTENT_REQUIRED", "Plan content is required");

  // Stage 6: Spectral linting comes FIRST now, because it handles the core
  // structural checks (required sections) and enforceability checks.
  const violations = await runSpectralLinting(planContent);

  // Stage 1: Legacy Structure validation (supplements Spectral)
  violations.push(...validatePlanStructure(planContent));

  // Stage 2: Phase validation
  violations.push(...validatePhases(planContent));

  // Stage 3: Path validation
  violations.push(...validatePathAllowlist(planContent));

  // Stage 5: Auditability validation
  violations.push(...validateAuditability(planContent));

  // Stage 7: Signature verification (if signature and public key provided)
  if (expectedSignature && publicKey) {
    try {
      const { verifyPlanSignature } = await import("./cosign-hash-provider.js");
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

export { PLAN_LINT_SYSTEM_ERROR_CODES, REQUIRED_SECTIONS, REQUIRED_PHASE_FIELDS };
