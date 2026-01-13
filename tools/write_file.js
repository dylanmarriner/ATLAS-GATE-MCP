import fs from "fs";
import path from "path";

import { analyzeDiffCompliance, applyUnifiedPatch } from "../core/policy-engine.js";
import crypto from "crypto";

import { enforcePlan } from "../core/plan-enforcer.js";
import { extractRoleHeader } from "../core/role-parser.js";
import { parseRoleMetadata } from "../core/role-metadata.js";
import { validateRoleMetadata } from "../core/role-validator.js";
import { validateRoleMismatch } from "../core/role-mismatch-validator.js";
import { detectStubs } from "../core/stub-detector.js";
import { appendAuditLog } from "../core/audit-log.js";
import { SESSION_ID, SESSION_STATE } from "../session.js";
import { runPreflight } from "../core/preflight.js";
import { resolveWriteTarget, ensureDirectoryExists } from "../core/path-resolver.js";

/**
 * ...
 */


export async function writeFileHandler({
  path: filePath,
  content,
  patch,
  previousHash,
  plan,
  planId,
  planHash,
  role,
  purpose,
  usedBy,
  connectedVia,
  registeredIn,
  executedVia,
  failureModes,
  authority,
}) {

  // GATE 0: PROMPT GATE
  // Must fetch canonical prompt before writing.
  if (SESSION_STATE && !SESSION_STATE.hasFetchedPrompt) {
    // Check if we are in testing mode (environment var) or strictly enforce
    // For this implementation: strictly enforce.
    throw new Error("PROMPT_GATE_LOCKED: You must call read_prompt('ANTIGRAVITY_CANONICAL') before any write operations.");
  }

  // GATE 1: INPUT VALIDATION & NORMALIZATION
  if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error("INVALID_WRITE_REQUEST: path is required and must be a non-empty string");
  }

  // CANONICAL PATH RESOLUTION: Use path resolver for all path operations
  // This ensures all writes stay within the repository and are fully normalized
  let abs;
  try {
    abs = resolveWriteTarget(filePath);
  } catch (err) {
    throw new Error(`INVALID_PATH: ${err.message}`);
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  let oldContent = "";
  let fileExists = false;

  if (fs.existsSync(abs)) {
    oldContent = fs.readFileSync(abs, "utf8");
    fileExists = true;
  }

  // CONCURRENCY CHECK
  if (previousHash && fileExists) {
    // crypto was imported? need to ensure import
    const currentHash = crypto.createHash('sha256').update(oldContent).digest('hex');
    if (currentHash !== previousHash) {
      throw new Error(`PREVIOUS_HASH_MISMATCH: expected ${previousHash}, got ${currentHash}`);
    }
  }

  let finalContent;

  if (patch) {
    if (!fileExists) {
      // Applying patch to new file? Allowed if patch creates it, but standard patches expect orig.
      // Usually patch contains header.
      // For simplicity, if patch provided for new file, we treat empty string as original.
    }
    try {
      finalContent = applyUnifiedPatch(oldContent, patch);
    } catch (e) {
      throw new Error(`PATCH_FAILED: ${e.message}`);
    }
  } else if (content !== undefined) {
    finalContent = content;
  } else {
    throw new Error("INVALID_WRITE_REQUEST: either content or patch must be provided");
  }

  // DIFF POLICY ENFORCEMENT
  const compliance = analyzeDiffCompliance(oldContent, finalContent);
  if (!compliance.allowed) {
    throw new Error(`POLICY_VIOLATION: ${compliance.violations.join("; ")}`);
  }

  // GATE 2: PLAN ENFORCEMENT
  // Verify the plan exists in the governed repo AND that it authorizes this file path
  const { repoRoot } = enforcePlan(plan, abs, planId, planHash);

  let contentToWrite = finalContent;

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

    contentToWrite = h.join("\n") + "\n\n" + finalContent;
  }

  // GATE 3: ROLE VALIDATION
  const header = extractRoleHeader(contentToWrite);
  const metadata = parseRoleMetadata(header);

  validateRoleMetadata(metadata);
  validateRoleMismatch(metadata.ROLE, contentToWrite);

  // GATE 4: ENTERPRISE CODE ENFORCEMENT (OBJECTIVE 3)
  // HARD BLOCK: No stubs, mocks, placeholders, TODOs, or non-enterprise code
  detectStubs(contentToWrite, normalizedPath);

  // GATE 5: WRITE & AUDIT
  // All enforcement gates passed; write to filesystem and log
  // GATE 4.5: PREFLIGHT CHECK
  // Run tests/lints if configured. FAIL if they fail.
  // We run this BEFORE writing to the final location?
  // Actually, we usually want to write the file THEN run preflight to see if it broke anything?
  // But if it breaks, we want to revert?
  // The prompt says: "Implement a preflight system invoked by write_file... Capture stdout/stderr and return in rejection."
  // If we reject, we shouldn't have mutated the state permanently?
  // But we can't test the new code unless we write it.
  // OPTION A: Write to temp, run preflight, then move?
  // OPTION B: Write, run, if fail -> revert?
  // "Reject patch if it doesn't apply... Reject content write if..."
  // "Preflight... invoked by write_file".
  // Let's go with: Write to target (or temp), run.
  // The standard way is usually: applies change, runs tests. If tests fail, YOU BROKE THE BUILD.
  // Prompt says "return in rejection".
  // I'll stick to: Write to disk. Run preflight. If fail, Revert (restore oldContent) and Throw.

  if (fileExists) {
    // Backup for revert
    // actually we have 'oldContent' in memory.
  }

  // CANONICAL PATH RESOLUTION: Ensure directory exists via path resolver
  ensureDirectoryExists(path.dirname(abs));
  fs.writeFileSync(abs, contentToWrite, "utf8");

  // GATE 4.5: PREFLIGHT CHECK - ALWAYS RUN (NO BYPASSES)
  // Preflight verifies that written code doesn't break the build
  // This is a hard requirement: no code escapes without passing tests/lint
  try {
    runPreflight(repoRoot);
  } catch (err) {
    // REVERT: Changes failed preflight, so we reject them completely
    if (fileExists) {
      fs.writeFileSync(abs, oldContent, "utf8");
    } else {
      fs.unlinkSync(abs);
    }
    throw new Error(`PREFLIGHT_FAILED: Code rejected because it breaks the build.\n${err.message}`);
  }

  // GATE 5: AUDIT LOGGING
  await appendAuditLog(
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
    preflight: "PASSED"
  };
}
