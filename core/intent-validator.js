/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Validate intent artifacts against canonical schema with fail-closed semantics
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP Intent Artifact Law (Schema + Validation)
 *
 * This module:
 * 1. Validates intent artifacts exist and conform to schema
 * 2. Enforces path consistency and authority binding
 * 3. Detects intent drift between phases
 * 4. Appends audit entries on validation
 * 5. Refuses writes if validation fails (fail-closed)
 */

import fs from "fs";
import path from "path";
import { SystemError, SYSTEM_ERROR_CODES } from "./system-error.js";
import { appendAuditEntry } from "./audit-system.js";
import {
  CANONICAL_INTENT_SCHEMA,
  checkForbiddenPatterns,
  parseSections,
  hashIntent
} from "./intent-schema.js";

/**
 * Validation result structure
 * @typedef {Object} IntentValidationResult
 * @property {boolean} valid - Validation passed
 * @property {string} [error] - Error message if validation failed
 * @property {string} [intentHash] - Hash of intent document
 * @property {Object} [sections] - Parsed sections
 * @property {string} [planHash] - Extracted plan hash
 * @property {string} [phaseId] - Extracted phase ID
 */

/**
 * Validate intent artifact at <targetPath>.intent.md
 * Performs:
 * 1. File existence check
 * 2. Structural validation (all sections present and ordered)
 * 3. Path consistency check (title matches target)
 * 4. Authority binding (plan hash + phase ID)
 * 5. Forbidden pattern scan
 * 6. Determinism check
 *
 * @param {string} targetPath - Absolute path to file being written
 * @param {string} workspaceRoot - Absolute workspace root
 * @param {boolean} isFailureReport - true if writing to docs/reports/ (exempt from intent)
 * @param {string} [executingPlanHash] - Current plan hash (for drift detection)
 * @param {string} [executingPhaseId] - Current phase ID (for drift detection)
 * @returns {Promise<IntentValidationResult>}
 * @throws {SystemError} on validation failure
 */
export async function validateIntentArtifact(
  targetPath,
  workspaceRoot,
  isFailureReport = false,
  executingPlanHash = null,
  executingPhaseId = null
) {
  // Failure reports don't require intent artifacts
  if (isFailureReport) {
    return {
      valid: true,
      exempt: true,
      error: null
    };
  }

  const intentPath = `${targetPath}.intent.md`;
  const relativeTarget = path.relative(workspaceRoot, targetPath);

  // === CHECK 1: FILE EXISTENCE ===
  if (!fs.existsSync(intentPath)) {
    const errorMsg = `INTENT_ARTIFACT_MISSING: File ${path.basename(targetPath)} requires ${path.basename(intentPath)} explaining the change.`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { targetPath: relativeTarget, intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD,
      invariant_id: "MANDATORY_INTENT_LAW",
      notes: "Intent artifact file does not exist"
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 2: READ INTENT CONTENT ===
  let intentContent;
  try {
    intentContent = fs.readFileSync(intentPath, "utf8");
  } catch (err) {
    const errorMsg = `Failed to read intent artifact: ${err.message}`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      invariant_id: "INTENT_ARTIFACT_READABLE",
      notes: `Read error: ${err.message}`
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
      human_message: errorMsg,
      tool_name: "write_file",
      cause: err
    });
  }

  if (!intentContent || intentContent.trim().length === 0) {
    const errorMsg = "Intent artifact is empty";

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      invariant_id: "INTENT_ARTIFACT_CONTENT",
      notes: "Intent artifact is empty or whitespace-only"
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 3: FORBIDDEN PATTERNS ===
  const forbiddenResult = checkForbiddenPatterns(intentContent);
  if (!forbiddenResult.valid) {
    const violationList = forbiddenResult.violations
      .map((v) => `  • ${v.pattern}: ${v.reason}`)
      .join("\n");
    const errorMsg = `INTENT_CONTAINS_FORBIDDEN_PATTERNS:\n\n${violationList}`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.POLICY_VIOLATION,
      invariant_id: "INTENT_SCHEMA_FORBIDDEN_CONTENT",
      notes: forbiddenResult.violations.map((v) => v.pattern).join(", ")
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.POLICY_VIOLATION, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 4: PARSE SECTIONS ===
  const sections = parseSections(intentContent);

  // === CHECK 5: VALIDATE ALL REQUIRED SECTIONS ===
  const sectionValidationErrors = [];
  const sectionIndex = {};

  for (const schemaSection of CANONICAL_INTENT_SCHEMA.sections) {
    if (!sections[schemaSection.id]) {
      sectionValidationErrors.push(`Missing section: ## ${schemaSection.id}`);
    } else {
      sectionIndex[schemaSection.id] = sections[schemaSection.id];
    }
  }

  if (sectionValidationErrors.length > 0) {
    const errorMsg = `INTENT_SCHEMA_INVALID:\n\n${sectionValidationErrors.join("\n")}`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      invariant_id: "INTENT_SCHEMA_STRUCTURE",
      notes: sectionValidationErrors.join("; ")
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 6: VALIDATE EACH SECTION ===
  const titleSection = sections.title || intentContent.split("\n")[0];
  const titleValidation = CANONICAL_INTENT_SCHEMA.sections[0].validator(
    titleSection,
    relativeTarget
  );

  if (!titleValidation.valid) {
    const errorMsg = `INTENT_TITLE_MISMATCH: ${titleValidation.error}`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath), targetPath: relativeTarget },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      invariant_id: "INTENT_PATH_CONSISTENCY",
      notes: titleValidation.error
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 7: VALIDATE AUTHORITY (with drift detection) ===
  const authorityValidation = CANONICAL_INTENT_SCHEMA.sections[2].validator(
    sections.authority,
    executingPlanHash,
    executingPhaseId
  );

  if (!authorityValidation.valid) {
    const errorMsg = `INTENT_AUTHORITY_DRIFT: ${authorityValidation.error}`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.POLICY_VIOLATION,
      invariant_id: "INTENT_PLAN_BINDING",
      notes: authorityValidation.error
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.POLICY_VIOLATION, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 8: VALIDATE OTHER SECTIONS ===
  const otherSectionErrors = [];

  for (let i = 1; i < CANONICAL_INTENT_SCHEMA.sections.length; i++) {
    const schemaSection = CANONICAL_INTENT_SCHEMA.sections[i];
    const sectionContent = sections[schemaSection.id] || "";

    if (schemaSection.validator && schemaSection.id !== "authority") {
      const validation = schemaSection.validator(sectionContent);
      if (!validation.valid) {
        otherSectionErrors.push(`${schemaSection.id}: ${validation.error}`);
      }
    }
  }

  if (otherSectionErrors.length > 0) {
    const errorMsg = `INTENT_SCHEMA_INVALID:\n\n${otherSectionErrors.join("\n")}`;

    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "write_file",
      plan_hash: executingPlanHash,
      phase_id: executingPhaseId,
      args: { intentPath: path.relative(workspaceRoot, intentPath) },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      invariant_id: "INTENT_SCHEMA_VALIDATION",
      notes: otherSectionErrors.join("; ")
    }, workspaceRoot);

    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: errorMsg,
      tool_name: "write_file"
    });
  }

  // === CHECK 9: COMPUTE DETERMINISTIC HASH ===
  const intentHash = hashIntent(intentContent);

  // === VALIDATION PASSED - AUDIT LOG SUCCESS ===
  await appendAuditEntry({
    session_id: null,
    role: "WINDSURF",
    workspace_root: workspaceRoot,
    tool: "write_file",
    plan_hash: executingPlanHash,
    phase_id: executingPhaseId,
    args: {
      intentPath: path.relative(workspaceRoot, intentPath),
      targetPath: relativeTarget,
      intentHash
    },
    result: "ok",
    error_code: null,
    invariant_id: null,
    notes: `Intent artifact VALID for ${relativeTarget}`
  }, workspaceRoot);

  return {
    valid: true,
    intentHash,
    sections,
    planHash: authorityValidation.planHash,
    phaseId: authorityValidation.phaseId
  };
}

/**
 * Scan workspace for intent artifacts and validate all
 * Returns detailed report suitable for logging
 *
 * @param {string} workspaceRoot - Absolute workspace root
 * @returns {Object} Validation report
 */
export function validateAllIntents(workspaceRoot) {
  const results = {
    valid: true,
    totalScanned: 0,
    validIntents: 0,
    missingIntents: [],
    invalidIntents: [],
    driftedIntents: []
  };

  try {
    // Recursively scan for .intent.md files
    scanDirectory(workspaceRoot, workspaceRoot, results);
  } catch (err) {
    results.scanError = err.message;
    results.valid = false;
    // Re-throw for governance compliance - intent scanning errors are critical
    throw new Error(`INTENT_SCAN_FAILED: ${err.message}`);
  }

  return results;
}

/**
 * Recursively scan directory for intent artifacts
 * @private
 */
function scanDirectory(dir, workspaceRoot, results) {
  try {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      // Skip node_modules, .git, etc.
      if (entry.startsWith(".") || entry === "node_modules") {
        continue;
      }

      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath, workspaceRoot, results);
      } else if (entry.endsWith(".intent.md")) {
        // Found an intent artifact
        const targetPath = fullPath.slice(0, -".intent.md".length);
        results.totalScanned++;

        // Check if target file exists
        if (!fs.existsSync(targetPath)) {
          results.missingIntents.push({
            intentPath: path.relative(workspaceRoot, fullPath),
            targetPath: path.relative(workspaceRoot, targetPath),
            error: "Target file does not exist"
          });
          results.valid = false;
        } else {
          // Validate the intent
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            const forbiddenResult = checkForbiddenPatterns(content);

            if (!forbiddenResult.valid) {
              results.invalidIntents.push({
                intentPath: path.relative(workspaceRoot, fullPath),
                targetPath: path.relative(workspaceRoot, targetPath),
                error: forbiddenResult.violations.map((v) => v.pattern).join(", ")
              });
              results.valid = false;
            } else {
              results.validIntents++;
            }
          } catch (err) {
            results.invalidIntents.push({
              intentPath: path.relative(workspaceRoot, fullPath),
              targetPath: path.relative(workspaceRoot, targetPath),
              error: err.message
            });
            results.valid = false;
            // Re-throw for governance compliance - intent validation errors must propagate
            throw new Error(`INTENT_VALIDATION_ERROR: ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    throw new Error(`Failed to scan directory ${dir}: ${err.message}`);
  }
}
