/**
 * MCP TOOL: approve_proposal
 * ROLE: WINDSURF (human-gate, propose-only)
 * PURPOSE: Human approval gate - mark proposal as APPROVED or REJECTED
 * AUTHORITY: ATLAS-GATE MCP REMEDIATION APPROVAL GATE
 *
 * CONSTRAINT: This is a HUMAN gate. Tool verifies approver identity but does NOT apply changes.
 * CONSTRAINT: Approval ONLY transitions status. Execution of changes requires separate plan/tool.
 * CONSTRAINT: All approvals recorded in audit log with timestamp and approver identity.
 *
 * Inputs:
 * - proposal_id: string
 * - decision: "APPROVED" | "REJECTED"
 * - approver_identity: string (person/service that approved)
 * - reason: string (optional, for REJECTED decisions)
 *
 * Returns:
 * - Updated proposal JSON (status now APPROVED/REJECTED, with timestamp)
 * - Audit entry appended
 *
 * Does NOT:
 * - Apply any code changes
 * - Execute remediation
 * - Mutate files
 * - Modify plan
 */

import { readProposal, updateProposalStatus } from "../core/proposal-store.js";
import { appendAuditEntry } from "../core/audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

export async function approveProposal(params) {
  const {
    workspace_root,
    proposal_id,
    decision,
    approver_identity,
    reason = "",
  } = params;

  // Validate inputs
  if (!workspace_root || typeof workspace_root !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "workspace_root must be a non-empty string",
        tool_name: "approve_proposal",
        workspace_root,
      }
    );
  }

  if (!proposal_id || typeof proposal_id !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "proposal_id must be a non-empty string",
        tool_name: "approve_proposal",
        workspace_root,
      }
    );
  }

  if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: 'decision must be "APPROVED" or "REJECTED"',
        tool_name: "approve_proposal",
        workspace_root,
      }
    );
  }

  if (!approver_identity || typeof approver_identity !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "approver_identity must be a non-empty string",
        tool_name: "approve_proposal",
        workspace_root,
      }
    );
  }

  try {
    // Read current proposal (verify exists and get current state)
    const current_proposal = readProposal(workspace_root, proposal_id);

    // Check proposal is not already decided
    if (current_proposal.status !== "PENDING") {
      throw new Error(
        `Proposal ${proposal_id} is already ${current_proposal.status}. Cannot re-decide.`
      );
    }

    // Update status on disk
    const updated_proposal = updateProposalStatus(
      workspace_root,
      proposal_id,
      decision,
      approver_identity,
      reason
    );

    // Append audit entry
    await appendAuditEntry(
      {
        tool: "approve_proposal",
        intent: `Human gate: Mark proposal ${proposal_id} as ${decision}`,
        plan_hash: updated_proposal.plan_hash,
        role: "BOUNDARY", // Approval is a boundary operation
        result: "ok",
        error_code: null,
        invariant_id: null,
        notes: `Approved by ${approver_identity}. Reason: ${reason || "none"}`,
      },
      workspace_root
    );

    return {
      success: true,
      proposal_id,
      decision,
      approved_by: approver_identity,
      timestamp: updated_proposal.approved_at,
      proposal: updated_proposal,
      message:
        decision === "APPROVED"
          ? `Proposal ${proposal_id} approved. Ready for remediation execution (separate plan required).`
          : `Proposal ${proposal_id} rejected.`,
    };
  } catch (err) {
    if (err instanceof SystemError) {
      throw err;
    }

    // Check if proposal not found
    if (err.message.includes("PROPOSAL_NOT_FOUND")) {
      throw SystemError.toolFailure(
        SYSTEM_ERROR_CODES.PLAN_NOT_FOUND,
        {
          human_message: `Proposal ${proposal_id} not found`,
          tool_name: "approve_proposal",
          workspace_root,
        }
      );
    }

    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      {
        human_message: `Failed to approve proposal: ${err.message}`,
        tool_name: "approve_proposal",
        workspace_root,
        cause: err,
      }
    );
  }
}
