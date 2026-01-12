/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Canonical, unified path resolution for the entire KAIZA MCP Server
 * AUTHORITY: This module is the sole source of truth for all filesystem paths
 * 
 * DESIGN PRINCIPLE:
 * All path-related operations (resolution, normalization, canonicalization) must
 * flow through this single module. No direct calls to path.join, path.resolve,
 * or cwd-based logic are permitted outside this module.
 * 
 * INVARIANTS ENFORCED:
 * - INV_REPO_ROOT_SINGLE: Exactly one repo root per session
 * - INV_REPO_ROOT_INITIALIZED: Initialized before any operation
 * - INV_PATH_ABSOLUTE: All resolved paths are absolute
 * - INV_PATH_NORMALIZED: All paths are normalized
 * - INV_PLANS_DIR_CANONICAL: Plans directory is deterministically resolved
 * - INV_PATH_WITHIN_REPO: All writes descend from repo root
 * 
 * This design ensures that:
 * 1. Plan creation always writes to the canonical plans directory
 * 2. Plan discovery always reads from the same canonical directory
 * 3. Path traversal is impossible
 * 4. Symlinks are resolved consistently
 * 5. OS-specific path separators are normalized
 * 6. Cached repo root eliminates context-dependent behavior
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { invariant, invariantNotNull, invariantTrue, invariantEqual, invariantType, invariantFalse } from "./invariant.js";

/**
 * IMMUTABLE SESSION STATE
 * Set once at server startup, never modified thereafter.
 */
let SESSION_REPO_ROOT = null;
let SESSION_INITIALIZED = false;

/**
 * Deterministically resolve the repository root by walking upward from
 * a target path until explicit governance markers are found.
 *
 * PRIORITY ORDER:
 * 1. .kaiza/ROOT (explicit governance marker - highest priority)
 * 2. .git directory (universal VCS root)
 * 3. docs/plans directory (legacy governance structure)
 * 4. Current directory if none found (fallback for arbitrary repos)
 *
 * This ensures the system works in ANY repository without requiring setup.
 * A "random person off the street" can use this in any folder.
 *
 * @param {string} startPath - File or directory to start walking from
 * @returns {string} Absolute path to repository root
 * @throws {Error} Never throws - always returns a valid repo root
 */
function findRepositoryRoot(startPath) {
  let current = path.resolve(startPath);

  // If startPath is a file, begin from its directory
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }

  const originalCurrent = current;

  // Walk upward until we find governance markers or reach filesystem root
  let previousDir = null;
  while (current !== previousDir) {
    previousDir = current;

    // PRIORITY 1: .kaiza/ROOT marker (explicit governance)
    const kaizaRootMarker = path.join(current, ".kaiza", "ROOT");
    if (fs.existsSync(kaizaRootMarker)) {
      return current;
    }

    // PRIORITY 2: .git directory (universal repo root)
    const gitDir = path.join(current, ".git");
    if (fs.existsSync(gitDir)) {
      return current;
    }

    // PRIORITY 3: docs/plans directory (legacy governance)
    const plansDir = path.join(current, "docs", "plans");
    if (fs.existsSync(plansDir)) {
      return current;
    }

    // Move to parent directory
    current = path.dirname(current);
  }

  // PRIORITY 4: Fallback - use the original starting directory
  // This ensures the system works in ANY repo without requiring setup markers.
  // The MCP server will create necessary directories on first use.
  console.error(
    `[PATH_RESOLVER] No governance markers found. Using ${originalCurrent} as repo root.`
  );
  return originalCurrent;
}

/**
 * Initialize the path resolver with an explicit repository root.
 * Must be called exactly once at server startup.
 *
 * @param {string} repoRootPath - Absolute path to repository root
 * @throws {Error} if already initialized or if path does not exist
 */
export function initializePathResolver(repoRootPath) {
  // INV_REPO_ROOT_SINGLE: Prevent double initialization
  invariantFalse(
    SESSION_INITIALIZED,
    "INV_REPO_ROOT_SINGLE",
    `Path resolver already initialized with root: ${SESSION_REPO_ROOT}`
  );

  // INV_REPO_ROOT_INITIALIZED: Input validation
  invariantNotNull(repoRootPath, "INV_REPO_ROOT_INITIALIZED", "Repo root path is required");
  invariantType(repoRootPath, "string", "INV_REPO_ROOT_INITIALIZED", "Repo root must be a string");
  invariantTrue(
    repoRootPath.trim().length > 0,
    "INV_REPO_ROOT_INITIALIZED",
    "Repo root path must not be empty"
  );

  const absPath = path.resolve(repoRootPath);

  // INV_PATH_ABSOLUTE: Ensure absolute path
  invariantTrue(
    path.isAbsolute(absPath),
    "INV_PATH_ABSOLUTE",
    `Repo root must be absolute, got ${absPath}`
  );

  // Verify path exists and is a directory
  invariantTrue(
    fs.existsSync(absPath),
    "INV_REPO_ROOT_INITIALIZED",
    `Repo root path does not exist: ${absPath}`
  );

  invariantTrue(
    fs.statSync(absPath).isDirectory(),
    "INV_REPO_ROOT_INITIALIZED",
    `Repo root path is not a directory: ${absPath}`
  );

  // INV_PATH_NORMALIZED: Normalize the path
  SESSION_REPO_ROOT = path.normalize(absPath);
  SESSION_INITIALIZED = true;

  console.error(
    `[PATH_RESOLVER] Initialized with repo root: ${SESSION_REPO_ROOT}`
  );
}

/**
 * Ensure the path resolver is initialized.
 * If not already initialized, attempts to resolve root from the provided hint path.
 * If hint is missing, falls back to CWD.
 *
 * @param {string} hintPath - Optional path hint (e.g. from first tool call)
 */
export function ensurePathResolver(hintPath) {
  if (SESSION_INITIALIZED) {
    return;
  }

  const startPath = hintPath && typeof hintPath === 'string' && hintPath.trim().length > 0
    ? hintPath
    : process.cwd();

  try {
    const discovered = findRepositoryRoot(startPath);
    SESSION_REPO_ROOT = discovered;
    SESSION_INITIALIZED = true;

    console.error(
      `[PATH_RESOLVER] Lazy-initialized with repo root: ${SESSION_REPO_ROOT} (Hint: ${startPath})`
    );
  } catch (e) {
    // Should not happen as findRepositoryRoot has fallback
    console.error(`[PATH_RESOLVER] Initialization failed: ${e.message}`);
    // Fallback to CWD to ensure stability
    SESSION_REPO_ROOT = process.cwd();
    SESSION_INITIALIZED = true;
  }
}

/**
 * Auto-initialize the path resolver by discovering the repository root from
 * the current working directory. Called during server startup if explicit
 * initialization is not performed.
 *
 * @param {string} fallbackPath - Path to start walking from (default: process.cwd())
 * @throws {Error} if already initialized or if no repository root found
 */
export function autoInitializePathResolver(fallbackPath = process.cwd()) {
  ensurePathResolver(fallbackPath);
}

/**
 * Get the session's repository root. Must be initialized first.
 *
 * @returns {string} Absolute path to repository root
 * @throws {Error} if not initialized
 */
export function getRepoRoot() {
  // INV_REPO_ROOT_INITIALIZED: Path resolver must be initialized
  invariantTrue(
    SESSION_INITIALIZED,
    "INV_REPO_ROOT_INITIALIZED",
    "Path resolver not initialized. Call initializePathResolver() or autoInitializePathResolver() at server startup"
  );

  // INV_REPO_ROOT_SINGLE: Must have a single cached root
  invariantNotNull(
    SESSION_REPO_ROOT,
    "INV_REPO_ROOT_SINGLE",
    "Repository root is not cached despite initialization"
  );

  // INV_PATH_ABSOLUTE: Cached root must be absolute
  invariantTrue(
    path.isAbsolute(SESSION_REPO_ROOT),
    "INV_PATH_ABSOLUTE",
    `Cached repo root is not absolute: ${SESSION_REPO_ROOT}`
  );

  // INV_PATH_CANONICAL: Resolve symlinks to canonical form
  // This ensures that symlinked repos always resolve to the same path
  try {
    return fs.realpathSync(SESSION_REPO_ROOT);
  } catch (err) {
    // If realpath fails (e.g., permission issue), return cached path
    // but log a warning
    console.warn(
      `[PATH_RESOLVER] Warning: Could not resolve symlinks for ${SESSION_REPO_ROOT}: ${err.message}`
    );
    return SESSION_REPO_ROOT;
  }
}

/**
 * Resolve the canonical plans directory.
 * Returns the first existing directory in this priority order:
 * 1. .kaiza/approved_plans
 * 2. .kaiza/plans
 * 3. .kaiza/approvedplans
 * 4. docs/plans (default)
 *
 * If no plans directory exists, returns the default (docs/plans) and auto-creates
 * it when needed. This ensures the system works in ANY repo without setup.
 *
 * All plan operations (create, read, discover, validate) use this directory.
 *
 * @returns {string} Absolute path to canonical plans directory
 * @throws {Error} if not initialized
 */
export function getPlansDir() {
  // INV_REPO_ROOT_INITIALIZED: Ensure repo root is available
  const repoRoot = getRepoRoot();

  // INV_PLANS_DIR_CANONICAL: Resolve plans directory from same source
  const candidates = [
    path.join(repoRoot, ".kaiza", "approved_plans"),
    path.join(repoRoot, ".kaiza", "plans"),
    path.join(repoRoot, ".kaiza", "approvedplans"),
    path.join(repoRoot, "docs", "plans"),
  ];

  // Verify all candidates are absolute and normalized
  for (const candidate of candidates) {
    invariantTrue(
      path.isAbsolute(candidate),
      "INV_PATH_ABSOLUTE",
      `Plans directory candidate is not absolute: ${candidate}`
    );
  }

  // Find existing plans directory
  let foundDir = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      foundDir = path.normalize(candidate);
      break;
    }
  }

  // Return canonical default if none found (will be auto-created on first use)
  const plansDir = foundDir || path.normalize(path.join(repoRoot, "docs", "plans"));

  // INV_PLANS_DIR_CANONICAL: Verify plans directory is within repo
  invariantTrue(
    plansDir.startsWith(repoRoot),
    "INV_PATH_WITHIN_REPO",
    `Plans directory ${plansDir} is outside repo root ${repoRoot}`
  );

  // INV_PATH_ABSOLUTE: Plans directory must be absolute
  invariantTrue(
    path.isAbsolute(plansDir),
    "INV_PATH_ABSOLUTE",
    `Plans directory is not absolute: ${plansDir}`
  );

  return plansDir;
}

/**
 * Resolve a plan file path given a plan ID.
 * Searches the canonical plans directory for a matching file.
 *
 * @param {string} planId - Plan identifier (e.g., "MyPlan" or "FOUNDATION-uuid")
 * @returns {string} Absolute path to the plan file
 * @throws {Error} if plan not found
 */
export function resolvePlanPath(planId) {
  // INV_TOOL_INPUT_NORMALIZED: Validate plan ID
  invariantNotNull(planId, "INV_TOOL_INPUT_NORMALIZED", "Plan ID is required");
  invariantType(planId, "string", "INV_TOOL_INPUT_NORMALIZED", "Plan ID must be a string");
  invariantTrue(
    planId.trim().length > 0,
    "INV_TOOL_INPUT_NORMALIZED",
    "Plan ID must not be empty"
  );

  // INV_PLANS_DIR_CANONICAL: Get canonical plans directory
  const plansDir = getPlansDir();

  // INV_PLAN_STABLE_ID: Normalize plan ID
  const normalized = path.basename(planId).replace(/\.md$/, "");
  const planFile = path.join(plansDir, `${normalized}.md`);

  // INV_PATH_ABSOLUTE: Result must be absolute
  invariantTrue(
    path.isAbsolute(planFile),
    "INV_PATH_ABSOLUTE",
    `Resolved plan path is not absolute: ${planFile}`
  );

  // INV_PLAN_EXISTS: Plan file must exist
  invariantTrue(
    fs.existsSync(planFile),
    "INV_PLAN_EXISTS",
    `Plan not found: ${planId} expected at ${planFile}`
  );

  // INV_PLAN_NOT_ESCAPED: Verify plan stays within plans directory
  const normalizedPlan = path.normalize(planFile);
  const normalizedPlansDir = path.normalize(plansDir);
  invariantTrue(
    normalizedPlan.startsWith(normalizedPlansDir),
    "INV_PLAN_NOT_ESCAPED",
    `Plan path ${normalizedPlan} is outside plans directory ${normalizedPlansDir}`
  );

  return normalizedPlan;
}

/**
 * Resolve a write target path relative to the repository root.
 * Applies path traversal protection and OS-specific normalization.
 *
 * @param {string} relativePath - Relative path from repo root or absolute path
 * @returns {string} Normalized absolute path
 * @throws {Error} if path traversal detected or other validation fails
 */
export function resolveWriteTarget(relativePath) {
  // INV_TOOL_INPUT_NORMALIZED: Validate input format
  invariantNotNull(relativePath, "INV_TOOL_INPUT_NORMALIZED", "Write path is required");
  invariantType(relativePath, "string", "INV_TOOL_INPUT_NORMALIZED", "Write path must be a string");
  invariantTrue(
    relativePath.trim().length > 0,
    "INV_TOOL_INPUT_NORMALIZED",
    "Write path must not be empty"
  );

  const repoRoot = getRepoRoot();

  // INV_PATH_WITHIN_REPO: Reject path traversal early
  invariantFalse(
    relativePath.includes(".."),
    "INV_PATH_WITHIN_REPO",
    `Path traversal (..) not permitted in ${relativePath}`
  );

  let targetPath;

  if (path.isAbsolute(relativePath)) {
    // Absolute path: use as-is but verify it resolves cleanly
    targetPath = path.resolve(relativePath);
  } else {
    // Relative path: resolve from repo root
    targetPath = path.resolve(repoRoot, relativePath);
  }

  // INV_PATH_ABSOLUTE: Result must be absolute
  invariantTrue(
    path.isAbsolute(targetPath),
    "INV_PATH_ABSOLUTE",
    `Resolved write target is not absolute: ${targetPath}`
  );

  // INV_PATH_NORMALIZED: Normalize the path
  const normalizedTarget = path.normalize(targetPath);
  const normalizedRepo = path.normalize(repoRoot);

  // INV_PATH_CANONICAL: Resolve symlinks to canonical form
  // We must do this BEFORE the "within repo" check because the user might provide
  // a symlinked path (e.g. /media/...) while the repo root is resolved to real path (e.g. /home/...)
  let canonicalTarget = normalizedTarget;

  if (fs.existsSync(normalizedTarget)) {
    try {
      canonicalTarget = fs.realpathSync(normalizedTarget);
    } catch (err) {
      console.warn(
        `[PATH_RESOLVER] Warning: Could not resolve symlinks for ${normalizedTarget}: ${err.message}`
      );
    }
  } else {
    // File doesn't exist yet (e.g. new file creation).
    // We must resolve the real path of the parent directory to ensure it matches repo root.
    let current = path.dirname(normalizedTarget);
    let relativeTail = path.basename(normalizedTarget);

    // Walk up until we find an existing directory
    while (current !== path.dirname(current) && !fs.existsSync(current)) {
      relativeTail = path.join(path.basename(current), relativeTail);
      current = path.dirname(current);
    }

    if (fs.existsSync(current)) {
      try {
        const realCurrent = fs.realpathSync(current);
        canonicalTarget = path.join(realCurrent, relativeTail);
      } catch (err) {
        // Ignore, stick with normalized path
      }
    }
  }

  // INV_PATH_WITHIN_REPO: Ensure the CANONICAL resolved path is within the repo root
  // We check against the canonical (real) repo root.
  const canonicalRepo = path.normalize(repoRoot); // repoRoot is already realpath'd by getRepoRoot path resolver logic

  invariantTrue(
    canonicalTarget.startsWith(canonicalRepo + path.sep) ||
    canonicalTarget === canonicalRepo,
    "INV_PATH_WITHIN_REPO",
    `Write target ${canonicalTarget} is outside repository root ${canonicalRepo} (received: ${normalizedTarget})`
  );

  return canonicalTarget;
}

/**
 * Resolve a read target path.
 * Applies path traversal protection but allows reading from any valid path.
 *
 * @param {string} relativePath - Relative path or absolute path
 * @returns {string} Normalized absolute path
 * @throws {Error} if path traversal detected or other validation fails
 */
export function resolveReadTarget(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error(
      `INVALID_READ_PATH: Must be a non-empty string, got ${typeof relativePath}`
    );
  }

  const repoRoot = getRepoRoot();

  // PATH TRAVERSAL PROTECTION: Reject .. in any form
  if (relativePath.includes("..")) {
    throw new Error(
      `INVALID_PATH: Path traversal (..) not permitted in ${relativePath}`
    );
  }

  let targetPath;

  if (path.isAbsolute(relativePath)) {
    targetPath = path.resolve(relativePath);
  } else {
    targetPath = path.resolve(repoRoot, relativePath);
  }

  const normalizedTarget = path.normalize(targetPath);

  // INV_PATH_CANONICAL: Resolve symlinks for paths that exist
  if (fs.existsSync(normalizedTarget)) {
    try {
      return fs.realpathSync(normalizedTarget);
    } catch (err) {
      // If realpath fails, warn but continue with normalized path
      console.warn(
        `[PATH_RESOLVER] Warning: Could not resolve symlinks for ${normalizedTarget}: ${err.message}`
      );
      return normalizedTarget;
    }
  }

  return normalizedTarget;
}

/**
 * Resolve the audit log path.
 * Always stored at the repository root.
 *
 * @returns {string} Absolute path to audit log file
 */
export function getAuditLogPath() {
  const repoRoot = getRepoRoot();
  return path.join(repoRoot, "audit-log.jsonl");
}

/**
 * Resolve the governance state file path.
 * Stored in .kaiza/governance.json relative to repo root.
 *
 * @returns {string} Absolute path to governance state file
 */
export function getGovernancePath() {
  const repoRoot = getRepoRoot();
  return path.join(repoRoot, ".kaiza", "governance.json");
}

/**
 * Normalize a path for display or logging purposes.
 * Removes OS-specific separators, resolves symlinks, and presents
 * paths relative to repo root when possible.
 *
 * @param {string} absolutePath - Absolute path to normalize
 * @returns {string} Normalized representation
 */
export function normalizePathForDisplay(absolutePath) {
  if (!absolutePath || typeof absolutePath !== "string") {
    return "<invalid>";
  }

  const repoRoot = getRepoRoot();
  const normalized = path.normalize(absolutePath).replace(/\\/g, "/");
  const repoNormalized = path.normalize(repoRoot).replace(/\\/g, "/");

  // Return relative to repo root if inside it
  if (normalized.startsWith(repoNormalized + "/")) {
    return normalized.substring(repoNormalized.length + 1);
  }

  if (normalized === repoNormalized) {
    return ".";
  }

  return normalized;
}

/**
 * Ensure a directory exists, creating it if necessary.
 * Uses the path resolver to guarantee operations stay within the repo.
 *
 * @param {string} directoryPath - Path to ensure exists
 * @throws {Error} if creation fails or path is out of bounds
 */
export function ensureDirectoryExists(directoryPath) {
  const resolved = resolveWriteTarget(directoryPath);

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

/**
 * Validate that a path is within the repository root.
 *
 * @param {string} targetPath - Path to validate
 * @returns {boolean} True if path is within repo, false otherwise
 */
export function isPathWithinRepo(targetPath) {
  if (!targetPath || typeof targetPath !== "string") {
    return false;
  }

  try {
    const resolved = path.normalize(path.resolve(targetPath));
    const repoRoot = path.normalize(getRepoRoot());
    return (
      resolved.startsWith(repoRoot + path.sep) ||
      resolved === repoRoot
    );
  } catch {
    return false;
  }
}

/**
 * Get session initialization state.
 * For debugging and testing only.
 *
 * @returns {object} Current initialization state
 */
export function getPathResolverState() {
  return {
    initialized: SESSION_INITIALIZED,
    repoRoot: SESSION_REPO_ROOT || "NOT_INITIALIZED",
  };
}
