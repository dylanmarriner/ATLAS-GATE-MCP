/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Handle GitHub Actions CI failure — engage kill-switch and create debt report
 * AUTHORITY: ATLAS-GATE-v2 Governance
 *
 * Receives a CI failure payload (via GitHub Actions webhook or local invocation),
 * writes a structured CI_FAILURE_*.json report to docs/reports/, and engages
 * the kill-switch. The report is automatically detected by Antigravity's
 * pre_plan_auditor.py as CI_GATE_DEBT, forcing a CI remediation plan.
 */

import fs from "fs";
import path from "path";
import { getRepoRoot } from "../infrastructure/path-resolver.js";
import { appendAuditEntry } from "./audit-system.js";
import { engageKillSwitch } from "./kill-switch.js";
import { SYSTEM_ERROR_CODES } from "../domain/system-error.js";

/**
 * Handle a CI pipeline failure.
 *
 * @param {Object} payload
 * @param {string} payload.stepName          - Name of the failing CI step
 * @param {string} payload.errorLog          - Truncated error output
 * @param {string} [payload.planSignature]   - Plan signature that introduced the failure (if known)
 * @param {string} [payload.workflowName]    - GitHub Actions workflow file name
 * @param {string} [payload.runId]           - GitHub Actions run ID
 * @param {string} [payload.workspaceRoot]   - Workspace root (optional)
 */
export async function handleCiFailure({ stepName, errorLog, planSignature, workflowName, runId, workspaceRoot }) {
  const root = workspaceRoot || getRepoRoot();
  const reportsDir = path.join(root, "docs", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportFileName = `CI_FAILURE_${timestamp}.json`;
  const reportPath = path.join(reportsDir, reportFileName);

  const report = {
    type: "CI_GATE_DEBT",
    severity: "CRITICAL",
    timestamp: new Date().toISOString(),
    step_name: stepName,
    workflow_name: workflowName || "unknown",
    run_id: runId || "unknown",
    plan_signature: planSignature || null,
    error_log: (errorLog || "").slice(0, 4096), // Truncate to prevent bloat
    remediation_required: true,
    remediation_note: [
      "Antigravity MUST produce a CI remediation plan before any other plan.",
      "The remediation plan MUST include a PHASE_CI_FIX phase.",
      "This report MUST be deleted as part of the remediation plan.",
    ].join(" "),
  };

  // Write the CI failure report
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.error(`[CI_FAILURE_HANDLER] CI failure report written: ${reportFileName}`);
  } catch (err) {
    console.error(`[CI_FAILURE_HANDLER] Failed to write failure report: ${err.message}`);
  }

  // Engage kill-switch
  try {
    engageKillSwitch({
      trigger: "CI_GATE_FAILURE",
      reason: `CI step "${stepName}" failed in workflow "${workflowName || "unknown"}". Run ID: ${runId || "unknown"}`,
      component: "ci_failure_handler",
      planSignature,
      workspaceRoot: root,
    });
  } catch (err) {
    console.error(`[CI_FAILURE_HANDLER] Kill-switch engagement failed: ${err.message}`);
  }

  // Append audit entry
  try {
    await appendAuditEntry({
      session_id: null,
      role: "SYSTEM",
      workspace_root: root,
      tool: "ci_failure_handler",
      plan_signature: planSignature || null,
      phase_id: null,
      args: { stepName, workflowName, runId },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INVARIANT_VIOLATION,
      invariant_id: "CI_GATE_MUST_PASS",
      notes: `CI failure: ${stepName}. Report: docs/reports/${reportFileName}`,
    }, root);
  } catch (err) {
    console.error(`[CI_FAILURE_HANDLER] Audit log write failed: ${err.message}`);
  }

  return { reportPath: `docs/reports/${reportFileName}`, report };
}
