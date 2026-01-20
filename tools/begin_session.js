import { SESSION_STATE } from "../session.js";
import { lockWorkspaceRoot } from "../core/path-resolver.js";
import { KaizaError, ERROR_CODES } from "../core/error.js";
import { flushPreSessionBuffer, appendAuditEntry } from "../core/audit-system.js";
import { SESSION_ID } from "../session.js";

/**
 * RF1: Explicit Workspace Root Declaration (Hard Gate)
 * 
 * This tool MUST be called first in any session.
 * It locks the server to a specific local directory.
 * 
 * PROMPT 03: On session ignition, flush any pre-session audit events
 * that were buffered before begin_session was called.
 */
export async function beginSessionHandler({ workspace_root }) {
    try {
        // Lock the root in path-resolver (this validates abs, exists, dir)
        lockWorkspaceRoot(workspace_root);

        // Update local session state
        SESSION_STATE.workspaceRoot = workspace_root;

        // PROMPT 03: Flush pre-session buffered events
        // (These are tool calls that arrived before begin_session)
        const buffered = flushPreSessionBuffer(workspace_root);
        for (const bufEvent of buffered) {
            try {
                await appendAuditEntry({
                    ...bufEvent,
                    session_id: SESSION_ID,
                    role: process.argv.join(" ").includes("windsurf") ? "WINDSURF" : "ANTIGRAVITY",
                    workspace_root: workspace_root,
                }, workspace_root);
            } catch (flushErr) {
                console.error(`[WARN] Failed to flush pre-session audit event: ${flushErr.message}`);
                // Re-throw for governance compliance - audit failures must propagate
                throw new Error(`PRE_SESSION_AUDIT_FLUSH_FAILED: ${flushErr.message}`);
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        status: "SESSION_INITIALIZED",
                        workspace_root: workspace_root,
                        message: "Authority locked. All subsequent operations must be relative to this root."
                    }, null, 2)
                }
            ]
        };
    } catch (error) {
        throw new KaizaError({
            error_code: ERROR_CODES.BOOTSTRAP_FAILURE,
            phase: "EXECUTION",
            component: "SESSION_INIT",
            invariant: "VALID_WORKSPACE_ROOT",
            human_message: `Failed to initialize session: ${error.message}`,
            cause: error
        });
    }
}
