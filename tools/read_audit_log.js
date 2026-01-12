import fs from "fs";
import path from "path";
import { getAuditLogPath } from "../core/path-resolver.js";

export async function readAuditLogHandler() {
  const auditPath = getAuditLogPath();

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
