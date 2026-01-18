import { SESSION_STATE } from "../session.js";
import { lockWorkspaceRoot } from "../core/path-resolver.js";
import { KaizaError, ERROR_CODES } from "../core/error.js";

/**
 * RF1: Explicit Workspace Root Declaration (Hard Gate)
 * 
 * This tool MUST be called first in any session.
 * It locks the server to a specific local directory.
 */
export async function beginSessionHandler({ workspace_root }) {
    try {
        // Lock the root in path-resolver (this validates abs, exists, dir)
        lockWorkspaceRoot(workspace_root);

        // Update local session state
        SESSION_STATE.workspaceRoot = workspace_root;

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
