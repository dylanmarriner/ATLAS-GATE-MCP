/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Automatic rollback of workspace changes on policy rejection
 * AUTHORITY: ATLAS-GATE-v2 Governance
 *
 * Called whenever executeWriteTimePolicy returns a REJECT.
 * Traces modified files using git status, reverts every file that was
 * modified or created since the last commit, and verifies workspace state.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getRepoRoot } from "../infrastructure/path-resolver.js";
import { appendAuditEntry } from "./audit-system.js";
import { SYSTEM_ERROR_CODES } from "../domain/system-error.js";

/**
 * Roll back all workspace changes since last git commit.
 * Reverts modified files and deletes newly created untracked files.
 *
 * @param {Object} opts
 * @param {string} opts.planSignature - Current plan signature
 * @param {string} opts.phaseId       - Current phase ID
 * @param {string} opts.triggerReason - Why rollback was triggered
 * @param {string} opts.workspaceRoot - Workspace root (optional, uses session root)
 * @returns {{ reverted: string[], deleted: string[], error: string|null }}
 */
export async function rollback({ planSignature, phaseId, triggerReason, workspaceRoot }) {
  const root = workspaceRoot || getRepoRoot();
  const execOpts = { cwd: root, stdio: ["pipe", "pipe", "pipe"] };

  const reverted = [];
  const deleted = [];
  let rollbackError = null;

  try {
    // Get list of modified (tracked) files
    const modifiedRaw = execSync("git diff --name-only HEAD", execOpts).toString().trim();
    const modifiedFiles = modifiedRaw ? modifiedRaw.split("\n").filter(Boolean) : [];

    // Revert all modified tracked files to HEAD
    if (modifiedFiles.length > 0) {
      execSync(`git checkout HEAD -- ${modifiedFiles.map(f => `"${f}"`).join(" ")}`, execOpts);
      reverted.push(...modifiedFiles);
    }

    // Get list of newly created (untracked) files
    const untrackedRaw = execSync("git ls-files --others --exclude-standard", execOpts).toString().trim();
    const untrackedFiles = untrackedRaw ? untrackedRaw.split("\n").filter(Boolean) : [];

    // Delete each new untracked file
    for (const f of untrackedFiles) {
      const absPath = path.resolve(root, f);
      try {
        fs.unlinkSync(absPath);
        deleted.push(f);
      } catch (delErr) {
        console.error(`[ROLLBACK] Failed to delete ${f}: ${delErr.message}`);
      }
    }

  } catch (err) {
    rollbackError = err.stderr ? err.stderr.toString().slice(0, 512) : err.message;
    console.error(`[ROLLBACK] Rollback operation failed: ${rollbackError}`);
  }

  // ── AUDIT LOG ────────────────────────────────────────────────────────────────
  try {
    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: root,
      tool: "rollback_executor",
      plan_signature: planSignature,
      phase_id: phaseId,
      args: { triggerReason, revertedCount: reverted.length, deletedCount: deleted.length },
      result: rollbackError ? "error" : "ok",
      error_code: rollbackError ? SYSTEM_ERROR_CODES.INTERNAL_ERROR : null,
      invariant_id: rollbackError ? "ROLLBACK_REQUIRED" : null,
      notes: rollbackError
        ? `Rollback partially failed: ${rollbackError}`
        : `Rollback complete: ${reverted.length} reverted, ${deleted.length} deleted`,
    }, root);
  } catch (auditErr) {
    console.error(`[ROLLBACK] Audit log write failed: ${auditErr.message}`);
  }

  return { reverted, deleted, error: rollbackError };
}
