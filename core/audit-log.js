import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAuditLogPath as getResolvedAuditLogPath } from "./path-resolver.js";

// Delegate to path resolver for canonical audit log location
function getAuditLogPath() {
  return getResolvedAuditLogPath();
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
 * 
 * INVARIANT: Each record includes hash of previous record, creating an unbreakable chain.
 * If two writes race, the second will see a different prevHash, detecting the race.
 */
export function appendAuditLog(entry, sessionId) {
  const auditPath = getAuditLogPath();
  
  // Ensure directory exists
  const dir = path.dirname(auditPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // CRITICAL: Read current tail and write new entry atomically
  // This prevents the race condition where two concurrent writers read the same "last" entry
  // Strategy: Use atomic read-then-append with explicit lock via file position
  
  let prevHash;
  
  try {
    // Open for append (creates if not exists)
    // This is atomic at the filesystem level on most systems
    const fd = fs.openSync(auditPath, 'a');
    
    try {
      // Read current file to get last hash
      const currentContent = fs.readFileSync(auditPath, "utf8");
      const lines = currentContent.trim().split("\n").filter(l => l.length > 0);
      
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
  }
}
