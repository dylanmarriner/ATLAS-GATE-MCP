import fs from "fs";
import path from "path";
import { resolveReadTarget } from "../core/path-resolver.js";

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
  // INPUT VALIDATION
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

  // CANONICAL PATH RESOLUTION: Use path resolver for all path operations
  let absPath;
  try {
    absPath = resolveReadTarget(filePath);
  } catch (err) {
    throw new Error(`INVALID_PATH: ${err.message}`);
  }

  // Verify the file exists
  if (!fs.existsSync(absPath)) {
    throw new Error(`FILE_NOT_FOUND: ${filePath} (resolved to ${absPath})`);
  }

  // Read and return
  return {
    content: [
      {
        type: "text",
        text: fs.readFileSync(absPath, "utf8"),
      }
    ]
  };
}
