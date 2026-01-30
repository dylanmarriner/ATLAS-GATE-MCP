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
import { KaizaError, ERROR_CODES } from "../core/error.js";
import { enforceRustPolicy, runRustVerificationGates } from "../core/rust-policy-engine.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";
import { executeWriteTimePolicy, detectLanguage } from "../core/write-time-policy-engine.js";

/**
 * Extract Rust allowed patterns from plan content
 * 
 * Parses plan content for a section like:
 * RUST_ALLOWED_PATTERNS:
 * - unwrap
 * - expect
 * - unsafe
 * 
 * @param {string} planContent - The plan content to parse
 * @returns {Set<string>} - Set of allowed pattern names
 */
function extractRustAllowedPatterns(planContent) {
  const allowedPatterns = new Set();
  const lines = planContent.split('\n');
  let inRustSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for section start
    if (trimmed.startsWith('RUST_ALLOWED_PATTERNS:') || 
        trimmed.startsWith('RUST-ALLOWED-PATTERNS:') ||
        trimmed.startsWith('rust_allowed_patterns:')) {
      inRustSection = true;
      continue;
    }
    
    // Check for section end (next section starts)
    if (inRustSection && trimmed.includes(':') && !trimmed.startsWith('-')) {
      inRustSection = false;
      continue;
    }
    
    // Extract pattern names if in section
    if (inRustSection && trimmed.startsWith('- ')) {
      const pattern = trimmed.replace('- ', '').trim();
      if (pattern) {
        allowedPatterns.add(pattern);
      }
    }
  }
  
  return allowedPatterns;
}

/**
 * Write File Handler - WINDSURF Role Only
 * 
 * Enforces comprehensive governance gates before writing any file:
 * GATE 0: Prompt gate - canonical prompt must be fetched
 * GATE 1: Intent and authority enforcement
 * GATE 1.1: Input validation and normalization
 * GATE 2: Plan enforcement - verify plan authorizes the write
 * GATE 2.5: Write-time policy engine - universal denylist enforcement
 * GATE 3: Role validation and metadata
 * GATE 3.5: Rust static enforcement (for .rs files)
 * GATE 4: Enterprise code enforcement - no stubs/TODOs/mocks
 * GATE 4.5: Preflight check - verify code passes tests/lint
 * GATE 5: Audit logging - record all writes
 * 
 * Returns success with plan, role, path, and preflight status
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
  intent,
}) {

  // GATE 0: PROMPT GATE
  // Must fetch canonical prompt before writing.
  if (SESSION_STATE && !SESSION_STATE.hasFetchedPrompt) {
    throw new KaizaError({
      error_code: ERROR_CODES.UNAUTHORIZED_ACTION,
      phase: "EXECUTION",
      component: "WRITE_FILE",
      invariant: "PROMPT_GATE_LOCKED",
      human_message: "PROMPT_GATE_LOCKED: You must call read_prompt('WINDSURF_CANONICAL') before any write operations."
    });
  }

  if (SESSION_STATE && SESSION_STATE.fetchedPromptName !== "WINDSURF_CANONICAL") {
    throw new KaizaError({
      error_code: ERROR_CODES.UNAUTHORIZED_ACTION,
      phase: "EXECUTION",
      component: "WRITE_FILE",
      invariant: "PROMPT_GATE_LOCKED",
      human_message: "Windsurf write operations require WINDSURF_CANONICAL prompt context."
    });
  }

  // GATE 1: INTENT & AUTHORITY ENFORCEMENT (Requirement 4)
  const isFailureReport = filePath.includes("docs/reports/");

  if (!isFailureReport) {
    const hasIntent = intent && intent.trim().length > 20;
    const hasMetadata = purpose && authority && failureModes;

    if (!hasIntent && !hasMetadata) {
      throw new KaizaError({
        error_code: ERROR_CODES.WRITE_REJECTED,
        phase: "EXECUTION",
        component: "WRITE_FILE",
        invariant: "MANDATORY_COMMENTARY",
        human_message: "REFUSE WRITE: Mandatory intent commentary missing. You must provide 'intent' (min 20 chars) or complete metadata (purpose, authority, failureModes). Governance requires every change to have recorded intent."
      });
    }
  }

  // GATE 1.1: INPUT VALIDATION & NORMALIZATION
  if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new KaizaError({
      error_code: ERROR_CODES.WRITE_REJECTED,
      phase: "EXECUTION",
      component: "WRITE_FILE",
      invariant: "VALID_INPUT",
      human_message: "path is required and must be a non-empty string"
    });
  }

  // CANONICAL PATH RESOLUTION: Use path resolver for all path operations
  // This ensures all writes stay within the repository and are fully normalized
  let abs;
  try {
    abs = resolveWriteTarget(filePath);
  } catch (err) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_PATH, {
      human_message: `Invalid file path: ${err.message}`,
      tool_name: "write_file",
      cause: err,
    });
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
      throw SystemError.toolFailure(SYSTEM_ERROR_CODES.HASH_MISMATCH, {
        human_message: `File hash mismatch. Concurrent modification detected.`,
        tool_name: "write_file",
        cause: new Error(`expected ${previousHash}, got ${currentHash}`),
      });
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
      throw SystemError.toolFailure(SYSTEM_ERROR_CODES.PATCH_APPLY_FAILED, {
        human_message: `Failed to apply patch: ${e.message}`,
        tool_name: "write_file",
        cause: e,
      });
    }
  } else if (content !== undefined) {
    finalContent = content;
  } else {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
      human_message: "Either 'content' or 'patch' must be provided",
      tool_name: "write_file",
    });
  }

  // DIFF POLICY ENFORCEMENT
  const compliance = analyzeDiffCompliance(oldContent, finalContent);
  if (!compliance.allowed) {
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.POLICY_VIOLATION, {
      human_message: `Policy violation: ${compliance.violations.join("; ")}`,
      tool_name: "write_file",
    });
  }

  // GATE 2: PLAN ENFORCEMENT
  // Verify the plan exists in the governed repo AND that it authorizes this file path
  // RF4: plan is now the hash
  const { repoRoot } = enforcePlan(plan, abs);

  // GATE 2.5: WRITE-TIME POLICY ENGINE (FAIL-CLOSED)
  // This policy engine runs BEFORE any filesystem write and enforces:
  // - Universal denylist (TODOs, empty catches, debug bypasses)
  // - Language-specific rules (Rust unwrap, TS any, Python randomness)
  // - Intent artifact co-requirement
  // If policy fails, write is refused and audit entry is created.
  const operation = fileExists ? "MODIFY" : "CREATE";
  const contentHash = crypto.createHash("sha256").update(finalContent).digest("hex");
  const detectedLang = detectLanguage(normalizedPath, finalContent);

  try {
    await executeWriteTimePolicy({
      workspace_root: SESSION_STATE.workspaceRoot,
      role: "WINDSURF",
      session_id: SESSION_ID,
      tool_name: "write_file",
      plan_hash: plan,
      phase_id: null, // Phase ID not yet integrated
      operation,
      path: normalizedPath,
      content_bytes: finalContent,
      detected_language: detectedLang,
      content_hash: contentHash,
      content_length: finalContent.length,
    });
  } catch (err) {
    // Policy failure is fatal - refuse write
    if (err instanceof SystemError) {
      throw err;
    }
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.POLICY_VIOLATION, {
      human_message: `Write-time policy check failed: ${err.message}`,
      tool_name: "write_file",
      cause: err,
    });
  }

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

  // GATE 3.5: RUST STATIC ENFORCEMENT GATE (MANDATORY)
  // Pre-write Rust policy validation for forbidden patterns and error handling
  if (normalizedPath.endsWith('.rs')) {
    // Extract allowed patterns from plan if present
    const planAllowances = {};
    if (plan) {
      // Parse plan to extract rust-allowed-patterns section
      planAllowances.allowedPatterns = extractRustAllowedPatterns(plan);
    }
    enforceRustPolicy(normalizedPath, contentToWrite, repoRoot, planAllowances);
  }

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
    throw SystemError.toolFailure(SYSTEM_ERROR_CODES.PREFLIGHT_FAILED, {
      human_message: `Code rejected because it breaks the build: ${err.message}`,
      tool_name: "write_file",
      cause: err,
    });
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
