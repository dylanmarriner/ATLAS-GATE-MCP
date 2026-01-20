import fs from "fs";
import path from "path";
import { getAuditLogPath } from "../core/path-resolver.js";

export async function readAuditLogHandler() {
  const auditPath = getAuditLogPath();

  if (!fs.existsSync(auditPath)) {
    return {
      content: [
        {
          type: "text",
          text: "No audit log entries found"
        }
      ]
    };
  }

  const fileContent = fs.readFileSync(auditPath, "utf8").trim();
  if (!fileContent) {
    return {
      content: [
        {
          type: "text",
          text: "No audit log entries found"
        }
      ]
    };
  }

  const entries = fileContent.split("\n");
  const text = `Audit Log: ${entries.length} entries\n\n${fileContent}`;
  
  return {
    content: [
      {
        type: "text",
        text: text
      }
    ]
  };
}
