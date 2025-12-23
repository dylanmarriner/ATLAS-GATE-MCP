import fs from "fs";
import path from "path";

export async function readAuditLogHandler() {
  const auditPath = path.resolve("audit-log.jsonl");
  if (!fs.existsSync(auditPath)) return [];
  return fs.readFileSync(auditPath, "utf8").trim().split("\n");
}
