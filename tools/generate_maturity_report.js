/**
 * MCP TOOL: generate_maturity_report
 * ROLE: ANTIGRAVITY (read-only)
 * PURPOSE: Generate a formal maturity score report based on workspace evidence
 * AUTHORITY: ATLAS-GATE MCP Maturity Scoring Specification v1.0
 */

import path from "path";
import { computeMaturityScore } from "../core/maturity-scoring-engine.js";
import { writeMaturityReport } from "../core/maturity-report-generator.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";
import { appendAuditEntry } from "../core/audit-system.js";

export async function generateMaturityReportHandler(params) {
    const { workspace_root } = params;

    if (!workspace_root || typeof workspace_root !== "string") {
        throw SystemError.toolFailure(
            SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
            {
                human_message: "workspace_root must be a non-empty string",
                tool_name: "generate_maturity_report",
                workspace_root,
            }
        );
    }

    try {
        // Audit log is the source of truth for maturity scoring
        const auditLogPath = path.join(workspace_root, 'audit-log.jsonl');

        // Compute the score natively
        const scoreResult = computeMaturityScore(workspace_root, { auditLogPath });

        // Format to markdown
        const { generateMaturityReport, writeMaturityReport } = await import("../core/maturity-report-generator.js");
        const reportMarkdown = generateMaturityReport(scoreResult);

        // Write out the file
        const reportPath = writeMaturityReport(workspace_root, reportMarkdown);

        // Audit the action
        await appendAuditEntry(
            {
                tool: "generate_maturity_report",
                intent: "System maturity evaluation",
                role: "ANTIGRAVITY",
                result: "ok",
                notes: `Generated maturity report at ${path.relative(workspace_root, reportPath)} with overall score ${scoreResult.overall}`
            },
            workspace_root
        );

        return {
            success: true,
            report_path: reportPath,
            overall_maturity_score: scoreResult.overall,
            dimensions: scoreResult.dimensions,
        };
    } catch (err) {
        if (err instanceof SystemError) {
            throw err;
        }

        throw SystemError.toolFailure(
            SYSTEM_ERROR_CODES.INTERNAL_ERROR,
            {
                human_message: `Failed to generate maturity report: ${err.message}`,
                tool_name: "generate_maturity_report",
                workspace_root,
                cause: err,
            }
        );
    }
}
