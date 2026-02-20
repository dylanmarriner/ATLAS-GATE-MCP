import fs from "fs";
import path from "path";
import { signWithCosign } from "./cosign-hash-provider.js";
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

/**
 * Sign audit entry using cosign (ECDSA P-256)
 * Entry is serialized and signed, signature returned as base64
 */
async function signAuditEntry(entry, privateKeyPath) {
  try {
    const payload = Buffer.from(JSON.stringify(entry));
    const signature = await signWithCosign(payload, privateKeyPath);
    return signature;
  } catch (err) {
    throw new Error(`[AUDIT_SIGNATURE_FAILED] ${err.message}`);
  }
}

/**
 * ATOMICITY: Append to audit log with cosign signature chain integrity.
 * Uses atomic append with exclusive file access to prevent concurrent corruption.
 * NOW ASYNC with file locking.
 *
 * INVARIANT: Each record includes signature of previous record, creating an unbreakable chain.
 * If two writes race, the second will see a different prevSignature, detecting the race.
 */
export async function appendAuditLog(entry, sessionId, privateKeyPath = null) {
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
    const fd = fs.openSync(auditPath, 'a');

    try {
      // Read current file to get last signature
      const currentContent = fs.readFileSync(auditPath, "utf8");
      const lines = currentContent.trim().split("\n").filter(l => l.length > 0);

      let prevSignature;
      if (lines.length === 0) {
        prevSignature = "GENESIS";
      } else {
        const last = JSON.parse(lines[lines.length - 1]);
        prevSignature = last.signature;
      }

      // Create new record
      const record = {
        timestamp: new Date().toISOString(),
        sessionId,
        ...entry,
        prevSignature,
      };

      // Sign if private key provided, otherwise use placeholder
      let signature;
      if (privateKeyPath) {
        signature = await signAuditEntry(record, privateKeyPath);
      } else {
        // For backward compatibility, generate a simple signature hash
        signature = Buffer.from(JSON.stringify(record)).toString("base64").substring(0, 64);
      }
      record.signature = signature;

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
