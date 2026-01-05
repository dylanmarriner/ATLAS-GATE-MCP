import fs from "fs";
import path from "path";

export async function readAuditLogHandler() {
  const auditPath = path.resolve("audit-log.jsonl");

  if (!fs.existsSync(auditPath)) {
    return {
      count: 0,
      entries: [],
    };
  }

  const lines = fs.readFileSync(auditPath, "utf8").trim();
  if (!lines) {
    return {
      count: 0,
      entries: [],
    };
  }

  const entries = lines.split("\n");
  return {
    count: entries.length,
    entries,
  };
}
