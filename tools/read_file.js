import fs from "fs";
import path from "path";
import { resolveRepoRoot } from "../core/repo-resolver.js";

/**
 * PLAN DISCOVERY: Automatically grant read access to /docs/** paths
 * in any governed repo, without requiring explicit plan specification.
 */
const PLAN_DISCOVERY_PATHS = [
  "/docs/**",
  "/docs/plans/**",
  "/docs/planning/**",
  "/docs/antigravity/**",
];

function isAllowedDiscoveryPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return PLAN_DISCOVERY_PATHS.some(pattern => {
    const patternRegex = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    return new RegExp(`^${patternRegex}$`).test(normalized);
  });
}

export async function readFileHandler({ path: filePath }) {
  // INPUT NORMALIZATION: Accept both string and structured input
  // (server.js monkey-patch handles string parsing, but be defensive)
  if (typeof filePath !== "string") {
    throw new Error("INVALID_INPUT_TYPE: path must be a string");
  }

  if (!filePath || filePath.trim().length === 0) {
    throw new Error("EMPTY_PATH_NOT_ALLOWED");
  }

  // PATH TRAVERSAL PROTECTION: Prevent directory traversal attacks
  if (filePath.includes("..")) {
    throw new Error("INVALID_PATH: path traversal not permitted");
  }

  const normalizedPath = filePath.replace(/\\/g, "/");

  // OBJECTIVE 1 — PLAN DISCOVERY: Auto-allow /docs/** reads in any governed repo
  if (isAllowedDiscoveryPath(normalizedPath)) {
    try {
      const repoRoot = resolveRepoRoot(normalizedPath);
      const abs = path.resolve(repoRoot, normalizedPath.replace(/^\//, ""));
      if (!fs.existsSync(abs)) {
        throw new Error(`FILE_NOT_FOUND: ${normalizedPath}`);
      }
      return fs.readFileSync(abs, "utf8");
    } catch (error) {
      // Fall through to standard resolution if repo discovery fails
      if (!error.message.includes("NO_GOVERNED_REPO_FOUND")) {
        throw error;
      }
    }
  }

  // STANDARD: Resolve path relative to cwd
  const abs = path.resolve(normalizedPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`FILE_NOT_FOUND: ${normalizedPath}`);
  }

  return fs.readFileSync(abs, "utf8");
}
