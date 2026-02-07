import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAuditLogPath as getResolvedAuditLogPath, getRepoRoot } from "./path-resolver.js";
import { acquireLock, releaseLock } from "./file-lock.js";

// Delegate to path resolver for canonical audit log location
function getAuditLogPath() {
  return getResolvedAuditLogPath();
}

/**
 * Get the path for the audit log lock directory.
 * Stored in .atlas-gate/audit.lock relative to repo root.
 */
function getAuditLockPath() {
  return path.join(getRepoRoot(), ".atlas-gate", "audit.lock");
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getLastHash() {
  const auditPath = getAuditLogPath();
  if (!fs.existsSync(auditPath)) {
    return "GENESIS";
  }

  const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n");
  if (lines.length === 0) return "GENESIS";

  const last = JSON.parse(lines[lines.length - 1]);
  return last.hash;
}

/**
 * ATOMICITY: Append to audit log with hash chain integrity.
 * Uses atomic append with exclusive file access to prevent concurrent corruption.
 * NOW ASYNC with file locking.
 * 
 * INVARIANT: Each record includes hash of previous record, creating an unbreakable chain.
 * If two writes race, the second will see a different prevHash, detecting the race.
 */
export async function appendAuditLog(entry, sessionId) {
  const auditPath = getAuditLogPath();
  const lockPath = getAuditLockPath();

  // Ensure directory exists
  const dir = path.dirname(auditPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ACQUIRE LOCK
  try {
    await acquireLock(lockPath, { retryInterval: 50, maxRetries: 500 });
  } catch (err) {
    throw new Error(`AUDIT_LOG_LOCK_FAILED: ${err.message}`);
  }

  // CRITICAL SECTION
  try {
    // Open for append (creates if not exists)
    // This is atomic at the filesystem level on most systems
    const fd = fs.openSync(auditPath, 'a');

    try {
      // Read current file to get last hash
      const currentContent = fs.readFileSync(auditPath, "utf8");
      const lines = currentContent.trim().split("\n").filter(l => l.length > 0);

      let prevHash;
      if (lines.length === 0) {
        prevHash = "GENESIS";
      } else {
        const last = JSON.parse(lines[lines.length - 1]);
        prevHash = last.hash;
      }

      // Create new record
      const record = {
        timestamp: new Date().toISOString(),
        sessionId,
        ...entry,
        prevHash,
      };

      const hash = sha256(JSON.stringify(record));
      record.hash = hash;

      // Write atomically (single write is atomic on POSIX)
      fs.writeSync(fd, JSON.stringify(record) + "\n");
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    throw new Error(`AUDIT_LOG_APPEND_FAILED: ${err.message}`);
  } finally {
    // RELEASE LOCK
    await releaseLock(lockPath);
  }
}

/**
 * Log a structured hard failure to the audit log.
 * This is used for invariant violations and execution errors.
 */
export async function logHardFailure(error, context, sessionId) {
  const diagnostic = typeof error.toDiagnostic === 'function'
    ? error.toDiagnostic()
    : {
      error_code: "LEGACY_ERROR",
      human_message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

  await appendAuditLog({
    type: "HARD_FAILURE",
    ...context,
    diagnostic
  }, sessionId);
}
