/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Canonical, unified path resolution for the entire ATLAS-GATE MCP Server
 * AUTHORITY: This module is the sole source of truth for all filesystem paths
 * 
 * MANDATORY REFACTOR (RF1-RF3):
 * - NO directory discovery.
 * - NO guessing project root.
 * - NO upward walking.
 * - ALL authority comes from an explicit begin_session call.
 */

import fs from "fs";
import path from "path";
import { invariantTrue, invariantNotNull, invariantFalse } from "./invariant.js";
import { SESSION_STATE } from "../session.js";

let SESSION_WORKSPACE_ROOT = null;

/**
 * RF1: Explicit Workspace Root Declaration (Hard Gate)
 * Sets and locks the workspace root for the entire session.
 * 
 * @param {string} absPath - MUST be absolute, MUST exist, MUST be a directory.
 * @throws {Error} if any condition is violated or if already locked.
 */
export function lockWorkspaceRoot(absPath) {
  if (SESSION_WORKSPACE_ROOT !== null) {
    throw new Error(`REFUSE: workspace_root changes mid-session are prohibited. Current: ${SESSION_WORKSPACE_ROOT}`);
  }

  invariantNotNull(absPath, "INV_WORKSPACE_ROOT_REQUIRED", "workspace_root is required");

  if (!path.isAbsolute(absPath)) {
    throw new Error(`REFUSE: workspace_root must be absolute. Received: ${absPath}`);
  }

  if (!fs.existsSync(absPath)) {
    throw new Error(`REFUSE: workspace_root does not exist: ${absPath}`);
  }

  if (!fs.statSync(absPath).isDirectory()) {
    throw new Error(`REFUSE: workspace_root is not a directory: ${absPath}`);
  }

  SESSION_WORKSPACE_ROOT = path.normalize(absPath);
  console.error(`[PATH_RESOLVER] Workspace root locked: ${SESSION_WORKSPACE_ROOT}`);

  // RF2: Ensure plans directory exists immediately
  getPlansDir();
}

/**
 * INTERNAL USE ONLY: Reset the workspace root for testing.
 */
export function resetWorkspaceRootForTesting() {
  SESSION_WORKSPACE_ROOT = null;
}

/**
 * RF1: Get the session's workspace root.
 * Returns locked path from either path-resolver or SESSION_STATE.
 * Throws if neither is set.
 */
export function getRepoRoot() {
  // Try locked workspace root first
  if (SESSION_WORKSPACE_ROOT !== null) {
    return SESSION_WORKSPACE_ROOT;
  }
  
  // Fall back to SESSION_STATE (set by begin_session or direct tool calls)
  if (SESSION_STATE && SESSION_STATE.workspaceRoot) {
    return SESSION_STATE.workspaceRoot;
  }
  
  throw new Error("REFUSE: No workspace_root. Call begin_session or provide workspace_root.");
}

/**
 * RF2: Canonical Plan Root Derivation (Non-Negotiable)
 * PLAN_ROOT = path.join(workspace_root, "docs", "plans")
 */
export function getPlansDir() {
  const root = getRepoRoot();
  const plansDir = path.join(root, "docs", "plans");

  if (!fs.existsSync(plansDir)) {
    console.error(`[PATH_RESOLVER] RF2: Creating missing plans directory: ${plansDir}`);
    fs.mkdirSync(plansDir, { recursive: true });
  }

  return plansDir;
}

/**
 * RF4: Plan Addressing = HASH OR NAMED PLAN
 * Resolves exact path using workspace_root + hash or plan name.
 * Supports both hash-based addressing and human-readable plan names.
 * 
 * @param {string} planSignature - The hash/signature or plan name.
 */
export function resolvePlanPath(planSignature) {
  invariantNotNull(planSignature, "INV_PLAN_HASH_REQUIRED", "Plan hash/name is required for addressing");

  const plansDir = getPlansDir();
  
  // Remove .md extension if present to normalize the input
  const normalized = planSignature.endsWith('.md') ? planSignature.slice(0, -3) : planSignature;
  
  // Build candidate path
  const planFile = path.join(plansDir, `${normalized}.md`);
  
  // Check if file exists
  if (fs.existsSync(planFile)) {
    return planFile;
  }
  
  // If not found, check for alternate case-insensitive match (some filesystems are case-sensitive)
  try {
    const files = fs.readdirSync(plansDir);
    const match = files.find(f => f.toLowerCase() === `${normalized}.md`.toLowerCase());
    if (match) {
      return path.join(plansDir, match);
    }
  } catch (err) {
    // Directory read failed, will throw below
  }
  
  throw new Error(`REFUSE: Plan not found by hash or name: ${planSignature}`);
}

/**
 * RF3: No Directory Discovery.
 * Resolves a write target path strictly relative to the locked workspace root.
 */
export function resolveWriteTarget(relativePath) {
  const repoRoot = getRepoRoot();

  // PATH TRAVERSAL PROTECTION: Reject .. in any form
  if (relativePath.includes("..")) {
    throw new Error(`INVALID_PATH: Path traversal (..) not permitted: ${relativePath}`);
  }

  let targetPath;
  if (path.isAbsolute(relativePath)) {
    targetPath = path.resolve(relativePath);
  } else {
    targetPath = path.resolve(repoRoot, relativePath);
  }

  const normalizedTarget = path.normalize(targetPath);

  // RF3: Ensure result is within repoRoot (NO walking upward)
  if (!normalizedTarget.startsWith(repoRoot + path.sep) && normalizedTarget !== repoRoot) {
    throw new Error(`REFUSE: Path is outside workspace root: ${normalizedTarget}`);
  }

  return normalizedTarget;
}

/**
 * Safe reading: strictly relative to workspace root.
 */
export function resolveReadTarget(relativePath) {
  return resolveWriteTarget(relativePath); // Same logic: must stay within root
}

export function getAuditLogPath() {
  return path.join(getRepoRoot(), "audit-log.jsonl");
}

export function getGovernancePath() {
  return path.join(getRepoRoot(), ".atlas-gate", "governance.json");
}

export function normalizePathForDisplay(absolutePath) {
  const root = getRepoRoot();
  const normalized = path.normalize(absolutePath).replace(/\\/g, "/");
  const repoNormalized = root.replace(/\\/g, "/");

  if (normalized.startsWith(repoNormalized + "/")) {
    return normalized.substring(repoNormalized.length + 1);
  }
  if (normalized === repoNormalized) return ".";
  return normalized;
}

export function ensureDirectoryExists(directoryPath) {
  const resolved = resolveWriteTarget(directoryPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}
