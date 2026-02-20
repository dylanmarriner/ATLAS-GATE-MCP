/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Append-only, hash-chained, tamper-evident audit logging system
 * AUTHORITY: PROMPT 03 - MCP-Enforced Execution Boundary Audit Logging
 * 
 * This module implements:
 * 1. Append-only JSON Lines audit log at /.atlas-gate/audit.log
 * 2. Hash-chaining for tamper-evidence detection
 * 3. Deterministic canonicalization + redaction
 * 4. Concurrency-safe sequence allocation with file locking
 * 5. Audit verification/integrity checking
 * 
 * NON-NEGOTIABLE CONSTRAINTS:
 * - All writes must be append-only (never truncate/rewrite)
 * - Hash chain must be unbroken (any modification breaks it)
 * - Sensitive data must be redacted before hashing/logging
 * - Sequence numbers must be deterministic (no UUIDs)
 * - Audit append failure must fail the entire tool call (fail-closed)
 * - Pre-session events must be buffered and flushed on begin_session
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRepoRoot } from "./path-resolver.js";
import { acquireLock, releaseLock } from "./file-lock.js";
import { signWithCosign, verifyWithCosign, canonicalizeForSigning } from "./cosign-hash-provider.js";

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const AUDIT_DIR_RELATIVE = ".atlas-gate";
const AUDIT_LOG_FILENAME = "audit.log";
const AUDIT_INDEX_FILENAME = "audit.index";
const AUDIT_LOCK_DIR = "audit.lock";
const COSIGN_KEYS_DIR = ".cosign-keys";
const GENESIS_SIGNATURE = null;

// Sensitive keys to redact from audit entries
const SENSITIVE_KEYS = new Set([
  "token", "apiKey", "password", "secret", "authorization",
  "cookie", "session", "jwt", "Bearer", "api_key", "refresh_token",
  "private_key", "access_token", "id_token", "client_secret",
  "api_secret", "signing_key", "webhook_secret", "passphrase"
]);

const SENSITIVE_FIELD_PATTERNS = [
  /.*secret.*/i,
  /.*token.*/i,
  /.*key.*/i,
  /.*password.*/i,
  /.*auth.*/i,
  /.*credential.*/i
];

// ============================================================================
// PRE-SESSION BUFFERING (for events before begin_session)
// ============================================================================

let PRE_SESSION_EVENT_BUFFER = [];

function bufferPreSessionEvent(event) {
  PRE_SESSION_EVENT_BUFFER.push({
    ts: new Date().toISOString(),
    buffered: true,
    ...event
  });
}

export function flushPreSessionBuffer(auditLogPath) {
  if (PRE_SESSION_EVENT_BUFFER.length === 0) {
    return [];
  }
  
  const flushed = [...PRE_SESSION_EVENT_BUFFER];
  PRE_SESSION_EVENT_BUFFER = [];
  return flushed;
}

// ============================================================================
// KEY PAIR MANAGEMENT
// ============================================================================

let cachedKeyPair = null;

async function loadOrGenerateKeyPair(workspaceRoot) {
   if (cachedKeyPair) {
     return cachedKeyPair;
   }

   const keyDir = path.join(workspaceRoot, AUDIT_DIR_RELATIVE, COSIGN_KEYS_DIR);
   const pubPath = path.join(keyDir, "public.pem");
   const privPath = path.join(keyDir, "private.pem");

   // Try to load existing keys
   if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
     cachedKeyPair = {
       publicKey: fs.readFileSync(pubPath, "utf8"),
       privateKey: fs.readFileSync(privPath, "utf8")
     };
     return cachedKeyPair;
   }

   // Auto-generate keys for testing/development
   try {
     fs.mkdirSync(keyDir, { recursive: true });
     const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
       namedCurve: 'prime256v1',
       publicKeyEncoding: { type: 'spki', format: 'pem' },
       privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
     });
     fs.writeFileSync(pubPath, publicKey, 'utf8');
     fs.writeFileSync(privPath, privateKey, 'utf8');
     cachedKeyPair = { publicKey, privateKey };
     return cachedKeyPair;
   } catch (err) {
     throw new Error(`COSIGN_KEYGEN_FAILED: ${err.message}`);
   }
}

// ============================================================================
// UTILITY: REDACTION (CRITICAL)
// ============================================================================

function isSensitiveKey(key) {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return true;
  }
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(key));
}

function isSensitiveValue(value) {
  if (typeof value !== "string") {
    return false;
  }
  // Treat long base64-like strings as potentially sensitive
  if (value.length > 64 && /^[A-Za-z0-9+/=]{64,}$/.test(value)) {
    return true;
  }
  // JWT pattern (three base64 parts separated by dots)
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    return true;
  }
  return false;
}

export function redactArgs(args) {
  if (!args || typeof args !== "object") {
    return args;
  }

  const redacted = Array.isArray(args) ? [...args] : { ...args };

  function walk(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else if (obj !== null && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        if (isSensitiveKey(key) || isSensitiveValue(value)) {
          obj[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          walk(value);
        }
      }
    }
  }

  walk(redacted);
  return redacted;
}

/**
 * Redact file content before logging.
 * For write operations, we note the content but never log it raw.
 */
export function redactFileContent(contentPath, content) {
  // Never log raw file content - only metadata
  return {
    path: contentPath,
    contentLength: content.length
  };
}

// ============================================================================
// UTILITY: CANONICALIZATION
// ============================================================================

// Canonicalization imported from cosign-hash-provider

// ============================================================================
// AUDIT ENTRY BUILDING
// ============================================================================

/**
 * Build a complete audit entry with all required fields.
 * Note: Signature is added by appendAuditEntry after this function.
 * 
 * @param {Object} entry - Partial entry data
 * @param {number} seq - Sequence number
 * @param {string} prevSignature - Signature of previous entry
 * @returns {Object} Complete entry ready for signing
 */
function buildAuditEntry(entry, seq, prevSignature) {
  const timestamp = new Date().toISOString();
  
  // Redact args if present
  const redactedArgs = entry.args ? redactArgs(entry.args) : null;

  // Build canonical entry (without signature yet)
  const canonical = {
    ts: timestamp,
    seq,
    prev_signature: prevSignature,
    session_id: entry.session_id,
    role: entry.role,
    workspace_root: entry.workspace_root,
    tool: entry.tool,
    intent: entry.intent || null,
    plan_signature: entry.plan_signature || null,
    phase_id: entry.phase_id || null,
    args: redactedArgs,
    result: entry.result === undefined ? null : (typeof entry.result === "string" ? entry.result : "ok"),
    error_code: entry.error_code || null,
    invariant_id: entry.invariant_id || null,
    notes: entry.notes || null
  };

  return canonical;
}

// ============================================================================
// FILE I/O: GET PATHS & LOCK
// ============================================================================

function getAuditLogPath(workspaceRoot) {
  return path.join(workspaceRoot, AUDIT_DIR_RELATIVE, AUDIT_LOG_FILENAME);
}

function getAuditLockPath(workspaceRoot) {
  return path.join(workspaceRoot, AUDIT_DIR_RELATIVE, AUDIT_LOCK_DIR);
}

function getAuditDir(workspaceRoot) {
  return path.join(workspaceRoot, AUDIT_DIR_RELATIVE);
}

// ============================================================================
// CORE OPERATION: APPEND WITH LOCK & SEQUENCE
// ============================================================================

/**
 * Append entry to audit log with full safety guarantees.
 * 
 * CRITICAL: This function:
 * 1. Acquires exclusive lock
 * 2. Reads current sequence and last signature atomically
 * 3. Builds entry and signs with cosign
 * 4. Writes single JSON line atomically
 * 5. Releases lock
 * 
 * @param {Object} entry - Audit entry fields
 * @param {string} workspaceRoot - The locked workspace root
 * @throws {Error} if lock acquisition or append fails
 * @returns {Object} written entry with seq and signature
 */
export async function appendAuditEntry(entry, workspaceRoot) {
  if (!workspaceRoot) {
    // Pre-session: buffer the event
    bufferPreSessionEvent(entry);
    return { buffered: true };
  }

  const auditDir = getAuditDir(workspaceRoot);
  const auditPath = getAuditLogPath(workspaceRoot);
  const lockPath = getAuditLockPath(workspaceRoot);

  // Ensure directory exists
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  // Load cosign key pair
  const keyPair = await loadOrGenerateKeyPair(workspaceRoot);

  // ACQUIRE LOCK (fail-closed on timeout)
  let lockAcquired = false;
  try {
    await acquireLock(lockPath, { retryInterval: 50, maxRetries: 500 });
    lockAcquired = true;
  } catch (err) {
    throw new Error(`AUDIT_LOCK_FAILED: ${err.message}`);
  }

  try {
    // READ CURRENT STATE (atomically with lock held)
    let seq = 1;
    let prevSignature = GENESIS_SIGNATURE;

    if (fs.existsSync(auditPath)) {
      const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").filter(l => l.length > 0);
      
      if (lines.length > 0) {
        try {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          seq = (lastEntry.seq || lines.length) + 1;
          prevSignature = lastEntry.signature || GENESIS_SIGNATURE;
        } catch (parseErr) {
          throw new Error(`AUDIT_CORRUPT: Cannot parse last entry: ${parseErr.message}`);
        }
      }
    }

    // BUILD ENTRY
    const auditEntry = buildAuditEntry(entry, seq, prevSignature);

    // SIGN ENTRY WITH COSIGN
    const canonical = canonicalizeForSigning(auditEntry);
    const signature = await signWithCosign(canonical, keyPair);

    // ADD SIGNATURE TO ENTRY
    const signedEntry = {
      ...auditEntry,
      signature
    };

    // WRITE ATOMICALLY (append mode, single write)
    const line = JSON.stringify(signedEntry) + "\n";
    
    try {
      fs.appendFileSync(auditPath, line);
    } catch (writeErr) {
      throw new Error(`AUDIT_WRITE_FAILED: ${writeErr.message}`);
    }

    return signedEntry;
  } finally {
    // RELEASE LOCK (critical: must always run)
    if (lockAcquired) {
      try {
        await releaseLock(lockPath);
      } catch (unlockErr) {
        console.error(`[WARN] Failed to release audit lock: ${unlockErr.message}`);
        // Throw lock failure - infra errors must not be swallowed
        throw new Error(`AUDIT_LOCK_CLEANUP_FAILED: ${unlockErr.message}`);
      }
    }
  }
}

// ============================================================================
// CORE OPERATION: VERIFY AUDIT LOG INTEGRITY
// ============================================================================

export async function verifyAuditLogIntegrity(workspaceRoot) {
  const auditPath = getAuditLogPath(workspaceRoot);

  if (!fs.existsSync(auditPath)) {
    return {
      valid: true,
      status: "EMPTY_LOG",
      entries: 0,
      failures: []
    };
  }

  const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").filter(l => l.length > 0);
  const failures = [];
  
  const keyPair = await loadOrGenerateKeyPair(workspaceRoot);

  let expectedSeq = 1;
  let expectedPrevSignature = GENESIS_SIGNATURE;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch (err) {
      failures.push({
        seq: lineNum,
        error: `INVALID_JSON: ${err.message}`
      });
      throw new Error(`AUDIT_LOG_CORRUPTED: Invalid JSON at line ${lineNum}: ${err.message}`);
    }

    // Validate sequence
    if (entry.seq !== expectedSeq) {
      failures.push({
        seq: lineNum,
        error: `SEQ_MISMATCH: expected ${expectedSeq}, got ${entry.seq}`
      });
    }

    // Validate signature chain
    if (entry.prev_signature !== expectedPrevSignature) {
      failures.push({
        seq: lineNum,
        error: `CHAIN_BROKEN: expected prev_signature ${expectedPrevSignature}, got ${entry.prev_signature}`
      });
    }

    // Verify signature (recompute and compare)
    const storedSignature = entry.signature;
    const entryWithoutSignature = { ...entry };
    delete entryWithoutSignature.signature;
    const canonical = canonicalizeForSigning(entryWithoutSignature);
    
    const isValid = await verifyWithCosign(canonical, storedSignature, keyPair.publicKey);
    if (!isValid) {
      failures.push({
        seq: lineNum,
        error: `SIGNATURE_INVALID: Stored signature does not match entry content`
      });
    }

    expectedSeq += 1;
    expectedPrevSignature = entry.signature;
  }

  return {
    valid: failures.length === 0,
    status: failures.length === 0 ? "VALID" : "CORRUPTED",
    entries: lines.length,
    failures
  };
}

// ============================================================================
// CONVENIENCE: READ AUDIT LOG
// ============================================================================

export function readAuditLog(workspaceRoot) {
  const auditPath = getAuditLogPath(workspaceRoot);

  if (!fs.existsSync(auditPath)) {
    return {
      entries: [],
      count: 0
    };
  }

  const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").filter(l => l.length > 0);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch (err) {
      throw new Error(`AUDIT_LOG_PARSE_ERROR: Failed to parse audit entry: ${err.message}`);
    }
  }

  return {
    entries,
    count: entries.length
  };
}
