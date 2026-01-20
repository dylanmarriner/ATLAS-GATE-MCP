import crypto from "crypto";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Generate a unique session identifier per MCP server run
 */
export const SESSION_ID = crypto.randomUUID();

export const SESSION_STATE = {
    workspaceRoot: null,
    hasFetchedPrompt: false,
    fetchedPromptName: null,
    activePlanId: null,
    isLocked: false,
    lockError: null
};
