import { SESSION_STATE } from "../session.js";

const CANONICAL_PROMPT = `
# KAIZA MCP CANONICAL PROMPT
This is the authoritative prompt.
You must respect the plan.
`; // In real implementation this might be read from a locked file

export async function readPromptHandler({ name }) {
    if (name !== "ANTIGRAVITY_CANONICAL" && name !== "WINDSURF_CANONICAL") {
        throw new Error(`UNKNOWN_PROMPT: ${name}`);
    }

    // Update session state
    SESSION_STATE.hasFetchedPrompt = true;

    return {
        content: [
            {
                type: "text",
                text: CANONICAL_PROMPT
            }
        ]
    };
}
