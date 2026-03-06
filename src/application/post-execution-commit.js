/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Post-execution GitHub commit after a plan phase completes
 * AUTHORITY: ATLAS-GATE-v2 Governance
 *
 * Called by Windsurf after all write_file calls for a plan phase succeed.
 * - Stages only files within the plan's path_allowlist (no unplanned files)
 * - Creates a structured, traceable commit message referencing the plan signature
 * - Signs the commit with GPG if available
 * - Pushes to remote
 * - On any failure: engages kill-switch, appends audit entry
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRepoRoot, getAuditLogPath } from "../infrastructure/path-resolver.js";
import { appendAuditEntry } from "./audit-system.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../domain/system-error.js";
import { engageKillSwitch } from "./kill-switch.js";

/**
 * Commit all changes scoped to the plan's path_allowlist after phase completion.
 *
 * @param {Object} opts
 * @param {string} opts.planId          - plan_metadata.plan_id from the plan JSON
 * @param {string} opts.phaseId         - phase_id of the completed phase
 * @param {string} opts.planSignature   - cosign signature identifying the plan
 * @param {string[]} opts.pathAllowlist - path_allowlist from the executed plan
 * @param {string} opts.workspaceRoot   - absolute path to workspace root
 * @returns {{ commitHash: string, pushed: boolean }}
 */
export async function commitPhase({ planId, phaseId, planSignature, pathAllowlist, workspaceRoot }) {
  const root = workspaceRoot || getRepoRoot();

  const execOpts = { cwd: root, stdio: ["pipe", "pipe", "pipe"] };

  // ── AUDIT HASH: sha256 of recent audit log entries for this phase ──────────
  let auditHash = "NO_AUDIT";
  try {
    const logPath = getAuditLogPath();
    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, "utf8");
      // Take last 50 lines as the "phase window"
      const lines = raw.trim().split("\n").slice(-50).join("\n");
      auditHash = crypto.createHash("sha256").update(lines).digest("hex").slice(0, 16);
    }
  } catch {} // Non-fatal: audit hash is informational

  // ── GIT ADD: only files within path_allowlist ────────────────────────────────
  for (const entry of pathAllowlist) {
    // Strip trailing wildcards before staging (git add handles recursion with paths)
    const cleanEntry = entry.replace(/\/\*\*?$/, "").replace(/\/$/, "");
    const absEntry = path.resolve(root, cleanEntry);
    if (fs.existsSync(absEntry)) {
      try {
        execSync(`git add -- "${cleanEntry}"`, execOpts);
      } catch (err) {
        // Non-fatal per-entry, log and continue
        console.error(`[COMMIT_PHASE] git add failed for ${cleanEntry}: ${err.stderr || err.message}`);
      }
    }
  }

  // ── CHECK IF THERE IS ANYTHING TO COMMIT ────────────────────────────────────
  let hasChanges = false;
  try {
    const status = execSync("git diff --cached --name-only", execOpts).toString().trim();
    hasChanges = status.length > 0;
  } catch (err) {
    // If git status fails, treat as error
    await handleCommitFailure({ err, planId, phaseId, planSignature, workspaceRoot: root });
    throw err;
  }

  if (!hasChanges) {
    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: root,
      tool: "commit_phase",
      plan_signature: planSignature,
      phase_id: phaseId,
      args: { planId, pathAllowlist },
      result: "ok",
      notes: "No staged changes — nothing to commit",
    }, root);
    return { commitHash: null, pushed: false };
  }

  // ── COMMIT MESSAGE ───────────────────────────────────────────────────────────
  const commitMsg = [
    `[ATLAS-GATE] ${planId} — ${phaseId} complete`,
    "",
    `Plan-Signature: ${planSignature}`,
    `Governance: ATLAS-GATE-v2`,
    `Verified-By: WINDSURF`,
    `Audit-Hash: ${auditHash}`,
  ].join("\n");

  // ── GIT COMMIT (with GPG sign if possible) ───────────────────────────────────
  let commitHash;
  try {
    // Use --gpg-sign if GPG is configured; fallback to unsigned commit
    try {
      execSync(`git commit --gpg-sign -m "${commitMsg.replace(/"/g, '\\"')}"`, execOpts);
    } catch {
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, execOpts);
    }
    commitHash = execSync("git rev-parse HEAD", execOpts).toString().trim();
  } catch (err) {
    await handleCommitFailure({ err, planId, phaseId, planSignature, workspaceRoot: root });
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
      human_message: `git commit failed: ${err.stderr || err.message}`,
      tool_name: "commit_phase",
      cause: err,
    });
  }

  // ── GIT PUSH ─────────────────────────────────────────────────────────────────
  let pushed = false;
  try {
    execSync("git push", execOpts);
    pushed = true;
  } catch (err) {
    // Push failure is serious but non-fatal for the commit itself; kill-switch engaged
    await handleCommitFailure({ err, planId, phaseId, planSignature, workspaceRoot: root, severity: "PUSH_FAILURE" });
  }

  // ── AUDIT LOG SUCCESS ─────────────────────────────────────────────────────────
  await appendAuditEntry({
    session_id: null,
    role: "WINDSURF",
    workspace_root: root,
    tool: "commit_phase",
    plan_signature: planSignature,
    phase_id: phaseId,
    args: { planId, phaseId, commitHash, pushed },
    result: "ok",
    notes: `Phase committed: ${commitHash}, pushed: ${pushed}`,
  }, root);

  return { commitHash, pushed };
}

/**
 * Handle commit/push failure: audit log + kill-switch
 */
async function handleCommitFailure({ err, planId, phaseId, planSignature, workspaceRoot, severity = "COMMIT_FAILURE" }) {
  const errMsg = err.stderr ? err.stderr.toString().slice(0, 512) : err.message;

  try {
    await appendAuditEntry({
      session_id: null,
      role: "WINDSURF",
      workspace_root: workspaceRoot,
      tool: "commit_phase",
      plan_signature: planSignature,
      phase_id: phaseId,
      args: { planId, severity },
      result: "error",
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      invariant_id: "COMMIT_REQUIRED_AFTER_PHASE",
      notes: `${severity}: ${errMsg}`,
    }, workspaceRoot);
  } catch {}

  try {
    engageKillSwitch({
      trigger: severity,
      reason: `Git operation failed after phase ${phaseId} of plan ${planId}: ${errMsg}`,
      component: "commit_phase",
      planSignature,
      workspaceRoot,
    });
  } catch {}
}
