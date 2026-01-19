/**
 * MCP TOOL: list_proposals
 * ROLE: WINDSURF (read-only)
 * PURPOSE: List all proposals with status
 * AUTHORITY: KAIZA MCP REMEDIATION PROPOSAL LISTING
 *
 * Returns list of proposals + metadata
 * No I/O side effects beyond reads
 */

import { listProposals } from "../core/proposal-store.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

export async function listRemediationProposals(params) {
  const {
    workspace_root,
    filter = {},
  } = params;

  if (!workspace_root || typeof workspace_root !== "string") {
    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE,
      {
        human_message: "workspace_root must be a non-empty string",
        tool_name: "list_proposals",
        workspace_root,
      }
    );
  }

  try {
    const proposals = listProposals(workspace_root, filter);

    return {
      success: true,
      count: proposals.length,
      proposals,
    };
  } catch (err) {
    if (err instanceof SystemError) {
      throw err;
    }

    throw SystemError.toolFailure(
      SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      {
        human_message: `Failed to list proposals: ${err.message}`,
        tool_name: "list_proposals",
        workspace_root,
        cause: err,
      }
    );
  }
}
