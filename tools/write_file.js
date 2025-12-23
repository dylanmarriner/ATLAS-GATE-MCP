import fs from "fs";
import path from "path";

import { enforcePlan } from "../core/plan-enforcer.js";
import { extractRoleHeader } from "../core/role-parser.js";
import { parseRoleMetadata } from "../core/role-metadata.js";
import { validateRoleMetadata } from "../core/role-validator.js";
import { validateRoleMismatch } from "../core/role-mismatch-validator.js";
import { detectStubs } from "../core/stub-detector.js";
import { appendAuditLog } from "../core/audit-log.js";
import { SESSION_ID } from "../session.js";

export async function writeFileHandler({ path: filePath, content, plan }) {
  if (!filePath || !content || !plan) {
    throw new Error("INVALID_WRITE_REQUEST");
  }

  if (filePath.includes("..")) {
    throw new Error("INVALID_PATH");
  }

  const normalizedPath = filePath.replace(/\\/g, "/");

  enforcePlan(plan, normalizedPath);

  const header = extractRoleHeader(content);
  const metadata = parseRoleMetadata(header);

  validateRoleMetadata(metadata);
  validateRoleMismatch(metadata.ROLE, content);
  detectStubs(content);

  const abs = path.resolve(normalizedPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");

  appendAuditLog(
    { plan, role: metadata.ROLE, path: normalizedPath },
    SESSION_ID
  );

  return { status: "OK", plan, role: metadata.ROLE, path: normalizedPath };
}
