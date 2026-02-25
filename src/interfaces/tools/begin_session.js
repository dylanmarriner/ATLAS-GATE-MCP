import { SESSION_STATE } from "../../../session.js";
import { lockWorkspaceRoot } from "../../infrastructure/path-resolver.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../../domain/system-error.js";
import { flushPreSessionBuffer, appendAuditEntry, loadOrGenerateKeyPair } from "../../application/audit-system.js";
import { SESSION_ID } from "../../../session.js";
import { ensureDependencies } from "../../infrastructure/dependency-manager.js";
import { initializeGovernanceState } from "../../domain/governance.js";

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
        // Ensure governance state is initialized (governance.json)
        initializeGovernanceState(workspace_root);

        // Ensure all required Sigstore and Spectral packages are installed
        // This runs NPM install synchronously if anything is missing
        let depStatus;
        try {
            depStatus = await ensureDependencies();
        } catch (depErr) {
            throw new Error(`DEPENDENCY_INIT_FAILED: ${depErr.message}`);
        }

        // Generate or load ECDSA P-256 keys for this session
        // If keys already exist, this is a no-op (idempotent)
        // If keys don't exist, they are generated and stored in .atlas-gate/.cosign-keys/
        try {
            await loadOrGenerateKeyPair(workspace_root);
        } catch (keyErr) {
            throw new Error(`COSIGN_KEY_INIT_FAILED: ${keyErr.message}`);
        }

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
                        message: "Authority locked. All subsequent operations must be relative to this root.",
                        cryptography: "ECDSA P-256 keys initialized",
                        dependencies: `Verified ${depStatus?.alreadyPresent?.length || 0} existing, installed ${depStatus?.installed?.length || 0} missing`
                    }, null, 2)
                }
            ]
        };
    } catch (error) {
        throw new SystemError({
            error_code: SYSTEM_ERROR_CODES.BOOTSTRAP_FAILURE,
            phase: "EXECUTION",
            component: "SESSION_INIT",
            invariant: "VALID_WORKSPACE_ROOT",
            human_message: `Failed to initialize session: ${error.message}`,
            cause: error
        });
    }
}
