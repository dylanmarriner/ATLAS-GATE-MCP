import fs from "fs";
import path from "path";
import crypto from "crypto";

const AUDIT_LOG_PATH = path.resolve("audit-log.jsonl");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getLastHash() {
  if (!fs.existsSync(AUDIT_LOG_PATH)) {
    return "GENESIS";
  }

  const lines = fs.readFileSync(AUDIT_LOG_PATH, "utf8").trim().split("\n");
  if (lines.length === 0) return "GENESIS";

  const last = JSON.parse(lines[lines.length - 1]);
  return last.hash;
}

export function appendAuditLog(entry, sessionId) {
  const prevHash = getLastHash();

  const record = {
    timestamp: new Date().toISOString(),
    sessionId,
    ...entry,
    prevHash,
  };

  const hash = sha256(JSON.stringify(record));
  record.hash = hash;

  fs.appendFileSync(
    AUDIT_LOG_PATH,
    JSON.stringify(record) + "\n",
    "utf8"
  );
}
