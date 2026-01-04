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

/**
 * Write file with enforcement of plan, role, and enterprise code standards.
 * 
 * ENFORCEMENT GATES:
 * 1. INPUT NORMALIZATION: All parameters validated and normalized
 * 2. PLAN ENFORCEMENT: Plan must exist in target repo
 * 3. ROLE VALIDATION: Role metadata must be complete and consistent
 * 4. STUB DETECTION: All forbidden patterns blocked (OBJECTIVE 3)
 * 5. AUDIT LOGGING: All writes tracked in append-only log
 */
export async function writeFileHandler({
  path: filePath,
  content,
  plan,
  role,
  purpose,
  usedBy,
  connectedVia,
  registeredIn,
  executedVia,
  failureModes,
  authority,
}) {

  // GATE 1: INPUT VALIDATION & NORMALIZATION
  if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error("INVALID_WRITE_REQUEST: path is required and must be a non-empty string");
  }

  if (!content || typeof content !== 'string') {
    throw new Error("INVALID_WRITE_REQUEST: content is required and must be a string");
  }

  if (!plan || typeof plan !== 'string' || plan.trim().length === 0) {
    throw new Error("INVALID_WRITE_REQUEST: plan is required and must be a non-empty string");
  }

  // PATH TRAVERSAL PROTECTION
  if (filePath.includes("..")) {
    throw new Error("INVALID_PATH: path traversal not permitted");
  }

  const normalizedPath = filePath.replace(/\\/g, "/");

  // GATE 2: PLAN ENFORCEMENT
  // Verify the plan exists in the governed repo
  const { repoRoot } = enforcePlan(plan, normalizedPath);

  let finalContent = content;

  // BUILD ROLE METADATA HEADER (if provided)
  if (role) {
    const h = [];
    h.push(`/**`);
    h.push(` * ROLE: ${role}`);
    if (registeredIn) h.push(` * REGISTERED IN: ${registeredIn}`);
    if (connectedVia) h.push(` * CONNECTED VIA: ${connectedVia}`);
    if (executedVia) h.push(` * EXECUTED VIA: ${executedVia}`);
    if (usedBy) h.push(` * USED BY: ${usedBy}`);
    if (purpose) h.push(` * PURPOSE: ${purpose}`);
    if (failureModes) h.push(` * FAILURE MODES: ${failureModes}`);

    h.push(` *`);
    if (authority) {
      h.push(` * Authority: ${authority}`);
    } else {
      h.push(` * Authority: ${plan}.md`);
    }
    h.push(` */`);

    finalContent = h.join("\n") + "\n\n" + content;
  }

  // GATE 3: ROLE VALIDATION
  const header = extractRoleHeader(finalContent);
  const metadata = parseRoleMetadata(header);

  validateRoleMetadata(metadata);
  validateRoleMismatch(metadata.ROLE, finalContent);

  // GATE 4: ENTERPRISE CODE ENFORCEMENT (OBJECTIVE 3)
  // HARD BLOCK: No stubs, mocks, placeholders, TODOs, or non-enterprise code
  detectStubs(finalContent);

  // GATE 5: WRITE & AUDIT
  // All enforcement gates passed; write to filesystem and log
  const abs = path.resolve(normalizedPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, finalContent, "utf8");

  // AUDIT LOGGING: Track all writes in append-only log
  appendAuditLog(
    {
      plan,
      role: metadata.ROLE,
      path: normalizedPath,
      repoRoot,
    },
    SESSION_ID
  );

  return {
    status: "OK",
    plan,
    role: metadata.ROLE,
    path: normalizedPath,
    repoRoot,
  };
}
