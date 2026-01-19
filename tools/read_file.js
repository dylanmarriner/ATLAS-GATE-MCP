import fs from "fs";
import path from "path";
import { resolveReadTarget } from "../core/path-resolver.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

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
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_TYPE, {
      human_message: "path must be a string",
      tool_name: "read_file",
    });
  }

  if (!filePath || filePath.trim().length === 0) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: "path cannot be empty",
      tool_name: "read_file",
    });
  }

  // PATH TRAVERSAL PROTECTION: Prevent directory traversal attacks
  if (filePath.includes("..")) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.PATH_TRAVERSAL_BLOCKED, {
      human_message: "Path traversal (..) is not permitted",
      tool_name: "read_file",
    });
  }

  const normalizedPath = filePath.replace(/\\/g, "/");

  // CANONICAL PATH RESOLUTION: Use path resolver for all path operations
  let absPath;
  try {
    absPath = resolveReadTarget(filePath);
  } catch (err) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_PATH, {
      human_message: `Invalid path: ${err.message}`,
      tool_name: "read_file",
      cause: err,
    });
  }

  // Verify the file exists
  if (!fs.existsSync(absPath)) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.FILE_NOT_FOUND, {
      human_message: `File not found: ${filePath}`,
      tool_name: "read_file",
    });
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
