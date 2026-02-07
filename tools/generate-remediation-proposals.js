/**
 * MCP TOOL: generate_remediation_proposals
 * ROLE: WINDSURF (read-only, propose-only)
 * PURPOSE: Generate proposals from forensic/audit/error evidence
 * AUTHORITY: ATLAS-GATE MCP REMEDIATION PROPOSAL GENERATOR
 *
 * Inputs:
 * - plan_hash: SHA256 plan hash
 * - evidence_selectors: object { forensic_findings?, system_errors?, audit_filter? }
 *
 * Output:
 * - list of proposal IDs + summaries (structured JSON)
 * - Writes proposals to docs/proposals/ + audit entry
 *
 * CONSTRAINT: Read-only. Does NOT mutate code, does NOT apply fixes.
 * CONSTRAINT: All proposals start PENDING. Require human approval to advance.
 */

import { RemediationEngine, PROPOSAL_TYPES } from "../core/remediation-engine.js";
import { writeProposal, listProposals } from "../core/proposal-store.js";
import { appendAuditEntry } from "../core/audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

/**
 * Generate remediation proposals from evidence bundle
 */
export async function generateRemediationProposals(params) {
  const {
    workspace_root,
    plan_hash,
    evidence_selectors = {},
  } = params;

  // Validate inputs
  if (!workspace_root || typeof workspace_root !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "workspace_root must be a non-empty string",
        tool_name: "generate_remediation_proposals",
        workspace_root,
      }
    );
  }

  if (!plan_hash || typeof plan_hash !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "plan_hash must be a non-empty string",
        tool_name: "generate_remediation_proposals",
        workspace_root,
      }
    );
  }

  try {
    // Initialize remediation engine
    const engine = new RemediationEngine(workspace_root, plan_hash);

    // Process forensic findings
    const forensic_findings = evidence_selectors.forensic_findings || [];
    for (const finding of forensic_findings) {
      try {
        engine.proposalFromForensicFinding(finding);
      } catch (err) {
        // Log error but continue with other findings
        console.warn(`Failed to process finding: ${err.message}`);
        // Re-throw for governance compliance
        throw new Error(`FORENSIC_FINDING_PROCESSING_FAILED: ${err.message}`);
      }
    }

    // Process system errors
    const system_errors = evidence_selectors.system_errors || [];
    for (const error of system_errors) {
      try {
        engine.proposalFromSystemError(error);
      } catch (err) {
        console.warn(`Failed to process error: ${err.message}`);
        // Re-throw for governance compliance
        throw new Error(`SYSTEM_ERROR_PROCESSING_FAILED: ${err.message}`);
      }
    }

    // Validate all proposals are evidence-bound
    const evidence_map = new Map();
    for (const finding of forensic_findings) {
      const hash = require("crypto")
        .createHash("sha256")
        .update(JSON.stringify(finding))
        .digest("hex");
      evidence_map.set(hash, finding);
    }
    for (const error of system_errors) {
      const hash = require("crypto")
        .createHash("sha256")
        .update(JSON.stringify(error))
        .digest("hex");
      evidence_map.set(hash, error);
    }

    engine.validateEvidenceBound(evidence_map);

    // Write proposals to disk
    const proposals = engine.getProposals();
    const written_proposals = [];

    for (const proposal in proposals) {
      try {
        const { file_path } = writeProposal(workspace_root, proposal);
        written_proposals.push({
          proposal_id: proposal.proposal_id,
          file_path,
          status: "PENDING",
        });
      } catch (err) {
        console.warn(
          `Failed to write proposal ${proposal.proposal_id}: ${err.message}`
        );
        // Re-throw for governance compliance
        throw new Error(`PROPOSAL_WRITE_FAILED: Failed to write proposal ${proposal.proposal_id}: ${err.message}`);
      }
    }

    // Append audit entry
    await appendAuditEntry(
      {
        tool: "generate_remediation_proposals",
        intent: "Generate remediation proposals from evidence",
        plan_hash,
        role: "EXECUTABLE",
        result: "ok",
        error_code: null,
        invariant_id: null,
        notes: `Generated ${written_proposals.length} proposals`,
      },
      workspace_root
    );

    return {
      success: true,
      proposals_generated: written_proposals.length,
      proposal_ids: written_proposals.map((p) => p.proposal_id),
      proposals: written_proposals,
    };
  } catch (err) {
    if (err instanceof SystemError) {
      throw err;
    }

    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      {
        human_message: `Failed to generate proposals: ${err.message}`,
        tool_name: "generate_remediation_proposals",
        workspace_root,
        plan_hash,
        cause: err,
      }
    );
  }
}
