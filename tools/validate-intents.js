/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Read-only tool to validate all intent artifacts in workspace
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP Intent Artifact Law (Section 7)
 *
 * This tool:
 * 1. Scans workspace for *.intent.md files
 * 2. Validates against canonical schema
 * 3. Reports missing intents, invalid intents, drifted intents
 * 4. Produces deterministic summary suitable for logging
 * 5. Does NOT modify any files
 */

import { validateAllIntents } from "../core/intent-validator.js";
import { getRepoRoot } from "../core/path-resolver.js";

/**
 * Handler for validate-intents tool
 * Read-only: scans and reports, never modifies
 *
 * @returns {Object} Validation report
 */
export async function validateIntentsHandler() {
  const repoRoot = getRepoRoot();

  const report = validateAllIntents(repoRoot);

  return {
    tool: "validate_intents",
    status: report.valid ? "VALID" : "INVALID",
    summary: {
      total_scanned: report.totalScanned,
      valid_intents: report.validIntents,
      missing_count: report.missingIntents.length,
      invalid_count: report.invalidIntents.length,
      drift_count: report.driftedIntents.length
    },
    missing_intents: report.missingIntents,
    invalid_intents: report.invalidIntents,
    drifted_intents: report.driftedIntents,
    scan_error: report.scanError || null,
    deterministic: true
  };
}
