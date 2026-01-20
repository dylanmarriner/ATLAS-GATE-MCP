/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Append-only, hash-chained, tamper-evident audit logging system
 * AUTHORITY: PROMPT 03 - MCP-Enforced Execution Boundary Audit Logging
 * 
 * This module implements:
 * 1. Append-only JSON Lines audit log at /.kaiza/audit.log
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

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const AUDIT_DIR_RELATIVE = ".kaiza";
const AUDIT_LOG_FILENAME = "audit.log";
const AUDIT_INDEX_FILENAME = "audit.index";
const AUDIT_LOCK_DIR = "audit.lock";
const GENESIS_HASH = "GENESIS";

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
// UTILITY: SHA256 HASHING
// ============================================================================

function sha256(input) {
  const normalized = typeof input === "string" ? input : JSON.stringify(input);
  return crypto.createHash("sha256").update(normalized).digest("hex");
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
 * For write operations, we hash the content but never log it raw.
 */
export function redactFileContent(path, content) {
  // Never log raw file content
  return {
    path,
    contentHash: sha256(content),
    contentLength: content.length
  };
}

// ============================================================================
// UTILITY: CANONICALIZATION
// ============================================================================

function canonicalizeForHash(obj) {
  // Deterministic JSON serialization: sorted keys, no extra spaces
  return JSON.stringify(obj, Object.keys(obj).sort(), "");
}

// ============================================================================
// AUDIT ENTRY BUILDING
// ============================================================================

/**
 * Build a complete audit entry with all required fields.
 * 
 * @param {Object} entry - Partial entry data
 * @param {number} seq - Sequence number
 * @param {string} prevHash - Hash of previous entry
 * @returns {Object} Complete entry ready for writing
 */
function buildAuditEntry(entry, seq, prevHash) {
  const timestamp = new Date().toISOString();
  
  // Redact args if present
  const redactedArgs = entry.args ? redactArgs(entry.args) : null;
  const argsHash = redactedArgs ? sha256(canonicalizeForHash(redactedArgs)) : null;

  // Redact result if needed
  let resultHash = null;
  if (entry.result && typeof entry.result === "object") {
    if (entry.result.path && entry.result.content !== undefined) {
      // File content in result - hash it, don't log it
      const redacted = redactFileContent(entry.result.path, entry.result.content);
      resultHash = sha256(canonicalizeForHash(redacted));
    } else {
      resultHash = sha256(canonicalizeForHash(entry.result));
    }
  } else if (entry.result) {
    resultHash = sha256(String(entry.result));
  }

  // Build canonical entry (without entry_hash yet)
  const canonical = {
    ts: timestamp,
    seq,
    prev_hash: prevHash,
    session_id: entry.session_id,
    role: entry.role,
    workspace_root: entry.workspace_root,
    tool: entry.tool,
    intent: entry.intent || null,
    plan_hash: entry.plan_hash || null,
    phase_id: entry.phase_id || null,
    args_hash: argsHash,
    result: entry.result === undefined ? null : (typeof entry.result === "string" ? entry.result : "ok"),
    error_code: entry.error_code || null,
    invariant_id: entry.invariant_id || null,
    result_hash: resultHash,
    notes: entry.notes || null
  };

  // Compute hash of canonical entry
  const entryHash = sha256(canonicalizeForHash(canonical));
  
  // Add hash to entry
  return {
    ...canonical,
    entry_hash: entryHash
  };
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
 * 2. Reads current sequence and last hash atomically
 * 3. Builds entry with deterministic hash chain
 * 4. Writes single JSON line atomically
 * 5. Releases lock
 * 
 * @param {Object} entry - Audit entry fields
 * @param {string} workspaceRoot - The locked workspace root
 * @throws {Error} if lock acquisition or append fails
 * @returns {Object} written entry with seq and entry_hash
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
    let prevHash = GENESIS_HASH;

    if (fs.existsSync(auditPath)) {
      const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").filter(l => l.length > 0);
      
      if (lines.length > 0) {
        try {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          seq = (lastEntry.seq || lines.length) + 1;
          prevHash = lastEntry.entry_hash || lastEntry.hash || GENESIS_HASH;
        } catch (parseErr) {
          throw new Error(`AUDIT_CORRUPT: Cannot parse last entry: ${parseErr.message}`);
        }
      }
    }

    // BUILD ENTRY WITH HASH CHAIN
    const auditEntry = buildAuditEntry(entry, seq, prevHash);

    // WRITE ATOMICALLY (append mode, single write)
    const line = JSON.stringify(auditEntry) + "\n";
    
    try {
      fs.appendFileSync(auditPath, line);
    } catch (writeErr) {
      throw new Error(`AUDIT_WRITE_FAILED: ${writeErr.message}`);
    }

    return auditEntry;
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

export function verifyAuditLogIntegrity(workspaceRoot) {
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

  let expectedSeq = 1;
  let expectedPrevHash = GENESIS_HASH;

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
      // Continue processing remaining entries but mark the log as corrupted
      // This is a verification-mode operation, not a mutation, so continuing is acceptable
      throw new Error(`AUDIT_LOG_CORRUPTED: Invalid JSON at line ${lineNum}: ${err.message}`);
    }

    // Validate sequence
    if (entry.seq !== expectedSeq) {
      failures.push({
        seq: lineNum,
        error: `SEQ_MISMATCH: expected ${expectedSeq}, got ${entry.seq}`
      });
    }

    // Validate hash chain
    if (entry.prev_hash !== expectedPrevHash) {
      failures.push({
        seq: lineNum,
        error: `CHAIN_BROKEN: expected prev_hash ${expectedPrevHash}, got ${entry.prev_hash}`
      });
    }

    // Verify entry hash (recompute and compare)
    const storedHash = entry.entry_hash;
    const canonicalWithoutHash = { ...entry };
    delete canonicalWithoutHash.entry_hash;
    const computedHash = sha256(canonicalizeForHash(canonicalWithoutHash));

    if (computedHash !== storedHash) {
      failures.push({
        seq: lineNum,
        error: `HASH_MISMATCH: stored ${storedHash}, computed ${computedHash}`
      });
    }

    expectedSeq += 1;
    expectedPrevHash = entry.entry_hash;
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
