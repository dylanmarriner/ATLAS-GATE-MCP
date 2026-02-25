import fs from "fs";
import path from "path";
import crypto from "crypto";
import { signWithCosign } from "../infrastructure/cosign-hash-provider.js";
import { getAuditLogPath as getResolvedAuditLogPath, getRepoRoot } from "../infrastructure/path-resolver.js";
import { acquireLock, releaseLock } from "../infrastructure/file-lock.js";

const COSIGN_KEYS_DIR = ".cosign-keys";

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
 * Load or generate ECDSA P-256 key pair for audit entry signing
 * Keys are stored in .atlas-gate/.cosign-keys/
 */
async function loadOrGenerateKeyPair(repoRoot) {
  const keyDir = path.join(repoRoot, ".atlas-gate", COSIGN_KEYS_DIR);
  const pubPath = path.join(keyDir, "public.pem");
  const privPath = path.join(keyDir, "private.pem");

  // Try to load existing keys
  if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
    return {
      publicKey: fs.readFileSync(pubPath, "utf8"),
      privateKey: fs.readFileSync(privPath, "utf8")
    };
  }

  // Generate new keys if missing
  try {
    fs.mkdirSync(keyDir, { recursive: true });
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    fs.writeFileSync(pubPath, publicKey, 'utf8');
    fs.writeFileSync(privPath, privateKey, 'utf8');
    return { publicKey, privateKey };
  } catch (err) {
    throw new Error(`COSIGN_KEYGEN_FAILED: ${err.message}`);
  }
}

/**
 * Sign audit entry using cosign (ECDSA P-256)
 * Entry is serialized and signed, signature returned as URL-safe base64
 */
async function signAuditEntry(entry, keyPair) {
  try {
    const payload = Buffer.from(JSON.stringify(entry));
    const signature = await signWithCosign(payload, keyPair);
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
export async function appendAuditLog(entry, sessionId) {
  const auditPath = getAuditLogPath();
  const lockPath = getAuditLockPath();
  const repoRoot = getRepoRoot();

  // Ensure directory exists
  const dir = path.dirname(auditPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load or generate key pair for signing
  const keyPair = await loadOrGenerateKeyPair(repoRoot);

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

      // Sign with cosign (ECDSA P-256)
      const signature = await signAuditEntry(record, keyPair);
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
