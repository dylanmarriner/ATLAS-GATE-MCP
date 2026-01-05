import crypto from "crypto";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Generate a unique session identifier per MCP server run
 */
export const SESSION_ID = crypto.randomUUID();

export const SESSION_STATE = {
    hasFetchedPrompt: false,
    activePlanId: null
};
