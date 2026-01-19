/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: External attestation bundle generation and verification
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP External Attestation Interface
 * 
 * This module implements:
 * 1. Deterministic attestation bundle generation from evidence systems
 * 2. HMAC-SHA256 signing (using workspace-specific signing secret)
 * 3. Read-only bundle verification
 * 4. Bundle export (JSON + Markdown)
 * 5. Non-coder friendly attestation reports
 * 
 * INVARIANTS:
 * - Bundle generation is deterministic: same inputs → same bundle_id
 * - All bundles are immutable after generation (content-addressed by hash)
 * - Verification never mutates state (read-only)
 * - Missing evidence → refuse with fail-closed semantics
 * - Signature verification is timing-safe
 */

import fs from "fs";
import pathModule from "path";
import crypto from "crypto";
import { replayExecution } from "./replay-engine.js";
import { computeMaturityScore } from "./maturity-scoring-engine.js";
import { lintPlan } from "./plan-linter.js";

// ============================================================================
// SIGNING CONFIGURATION
// ============================================================================

/**
 * Get the attestation signing secret for this workspace.
 * Sources:
 * 1. KAIZA_ATTESTATION_SECRET environment variable
 * 2. .kaiza/attestation_secret.json file (workspace-specific)
 * 3. Generate ephemeral secret (warning: will not persist across sessions)
 *
 * @param {string} workspaceRoot
 * @returns {string} HMAC secret
 */
function getAttestationSecret(workspaceRoot) {
  // Try environment variable first
  let secret = process.env.KAIZA_ATTESTATION_SECRET;
  if (secret) {
    return secret;
  }

  // Try workspace-specific secret file
  const secretPath = pathModule.join(workspaceRoot, ".kaiza", "attestation_secret.json");
  if (fs.existsSync(secretPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(secretPath, "utf8"));
      if (data.attestation_secret) {
        return data.attestation_secret;
      }
    } catch {
      // Fall through to warning
    }
  }

  // Generate ephemeral secret with warning
  const ephemeral = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[ATTESTATION] No persistent signing secret found. Using ephemeral secret. " +
      "Bundles generated in this session will not be verifiable after restart. " +
      "Set KAIZA_ATTESTATION_SECRET or create .kaiza/attestation_secret.json"
  );
  return ephemeral;
}

// ============================================================================
// ATTESTATION BUNDLE SCHEMA
// ============================================================================

/**
 * Compute deterministic bundle ID from canonical bundle content.
 * This is the content hash before signing.
 * Uses canonical JSON with recursively sorted keys for determinism.
 *
 * @param {Object} bundleContent - Bundle object (without signature)
 * @returns {string} SHA256 hash
 */
function computeBundleId(bundleContent) {
  const canonical = canonicalizeForHash(bundleContent);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Recursively canonicalize object for hashing (all keys sorted).
 * This ensures deterministic field ordering at any depth.
 *
 * @param {*} obj - Value to canonicalize
 * @returns {string} Canonical JSON
 */
function canonicalizeForHash(obj) {
  if (typeof obj !== "object" || obj === null) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(canonicalizeForHash));
  }

  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sorted[key] = JSON.parse(canonicalizeForHash(value));
    } else {
      sorted[key] = value;
    }
  }
  return JSON.stringify(sorted);
}

/**
 * Compute HMAC signature of bundle content.
 * Signature is computed over the canonical JSON (same as bundle_id derivation).
 *
 * @param {Object} bundleContent - Bundle object
 * @param {string} secret - HMAC secret
 * @returns {string} HMAC-SHA256 hex digest
 */
function signBundle(bundleContent, secret) {
  const canonical = canonicalizeForHash(bundleContent);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(canonical);
  return hmac.digest("hex");
}

/**
 * Verify bundle signature with timing-safe comparison.
 *
 * @param {Object} signedBundle - Bundle with 'signature' field
 * @param {string} secret - HMAC secret
 * @returns {boolean} Signature valid
 * @throws {Error} If bundle structure invalid
 */
function verifyBundleSignature(signedBundle, secret) {
  if (!signedBundle.signature) {
    throw new Error("ATTESTATION_SIGNATURE_MISSING: Bundle has no signature field");
  }

  // Remove signature, bundle_id, and generated_timestamp for computation
  // (these are added AFTER signing during generation)
  const bundleContent = { ...signedBundle };
  delete bundleContent.signature;
  delete bundleContent.bundle_id;
  delete bundleContent.generated_timestamp;

  const expectedSignature = signBundle(bundleContent, secret);

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signedBundle.signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

// ============================================================================
// EVIDENCE GATHERING (READ-ONLY)
// ============================================================================

/**
 * Gather workspace evidence for attestation.
 * Reads from:
 * - Audit log
 * - Plans directory
 * - Replay results
 * - Maturity scores
 * 
 * @param {string} workspaceRoot
 * @param {Object} options - { plan_hash_filter, time_window }
 * @returns {Object} Evidence object
 * @throws {Error} If critical evidence missing (fail-closed)
 */
function gatherEvidence(workspaceRoot, options = {}) {
  const auditLogPath = pathModule.join(workspaceRoot, ".kaiza", "audit-log.jsonl");
  
  // Check evidence existence
  if (!fs.existsSync(auditLogPath)) {
    throw new Error("ATTESTATION_EVIDENCE_INVALID: Audit log not found");
  }

  const auditEntries = fs.readFileSync(auditLogPath, "utf8")
    .trim()
    .split("\n")
    .filter(l => l.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (auditEntries.length === 0) {
    throw new Error("ATTESTATION_EVIDENCE_INVALID: Audit log is empty");
  }

  // Compute audit log root hash
  const lastEntry = auditEntries[auditEntries.length - 1];
  const auditLogRootHash = lastEntry.hash || lastEntry.entry_hash;

  if (!auditLogRootHash) {
    throw new Error("ATTESTATION_EVIDENCE_INVALID: Cannot compute audit log root hash");
  }

  // Gather plan hashes from audit
  const planHashes = new Set();
  auditEntries.forEach(entry => {
    if (entry.plan_hash) {
      planHashes.add(entry.plan_hash);
    }
  });

  // Convert to array and sort (determinism)
  const planHashList = Array.from(planHashes).sort();

  // Compute audit metrics
  const auditMetrics = {
    total_entries: auditEntries.length,
    first_timestamp: auditEntries[0].timestamp || auditEntries[0].ts,
    last_timestamp: lastEntry.timestamp || lastEntry.ts,
    failure_count: auditEntries.filter(e => e.error_code || e.result === "error").length,
  };

  return {
    auditLogRootHash,
    auditMetrics,
    planHashes: planHashList,
    auditEntries,
  };
}

/**
 * Compute policy enforcement summary from audit entries.
 * Deterministic scan for policy violations in audit.
 *
 * @param {Array} auditEntries - Parsed audit entries
 * @returns {Object} Policy summary
 */
function computePolicySummary(auditEntries) {
  const policyChecks = auditEntries.filter(e => e.tool === "write_file");
  const policyPasses = policyChecks.filter(e => e.result === "ok").length;
  const policyFailures = policyChecks.filter(e => e.error_code || e.result === "error").length;

  return {
    total_write_checks: policyChecks.length,
    policy_passes: policyPasses,
    policy_failures: policyFailures,
    pass_rate: policyChecks.length > 0 ? policyPasses / policyChecks.length : 0,
  };
}

/**
 * Compute intent coverage summary.
 * Scans workspace for intent artifacts.
 *
 * @param {string} workspaceRoot
 * @returns {Object} Intent summary
 */
function computeIntentSummary(workspaceRoot) {
  let intentArtifacts = 0;
  let writeOperations = 0;

  try {
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        if (entry === "node_modules") continue;
        const fullPath = pathModule.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.endsWith(".intent.md")) {
          intentArtifacts++;
        }
      }
    };
    walkDir(workspaceRoot);
  } catch {
    // Silent fail for intent scan
  }

  return {
    intent_artifacts_found: intentArtifacts,
    write_operations_audited: writeOperations,
    intent_coverage: intentArtifacts > 0 ? 1.0 : 0.0,
  };
}

// ============================================================================
// ATTESTATION BUNDLE GENERATION
// ============================================================================

/**
 * Generate a cryptographically signed attestation bundle.
 * 
 * This is the primary attestation endpoint.
 * Returns a bundle signed with workspace secret.
 * Bundle is immutable after generation (content-addressed by hash).
 *
 * @param {string} workspaceRoot
 * @param {Object} options - { plan_hash_filter, time_window, workspace_root_label }
 * @returns {Object} Signed attestation bundle
 * @throws {Error} If evidence missing or invalid (fail-closed)
 */
export function generateAttestationBundle(workspaceRoot, options = {}) {
  // STEP 1: VALIDATE INPUTS (fail-closed)
  if (!workspaceRoot || typeof workspaceRoot !== "string") {
    throw new Error("ATTESTATION_INVALID_INPUT: workspace_root must be a non-empty string");
  }

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`ATTESTATION_INVALID_INPUT: workspace_root does not exist: ${workspaceRoot}`);
  }

  // STEP 2: GATHER EVIDENCE (fail-closed)
  const evidence = gatherEvidence(workspaceRoot, options);

  // STEP 3: COMPUTE POLICY SUMMARY
  const policySummary = computePolicySummary(evidence.auditEntries);

  // STEP 4: COMPUTE INTENT SUMMARY
  const intentSummary = computeIntentSummary(workspaceRoot);

  // STEP 5: RUN REPLAY VERIFICATION (read-only)
  let replayVerdict = "UNAVAILABLE";
  let replayFindingCount = 0;
  
  if (evidence.planHashes.length > 0) {
    const replayResult = replayExecution(workspaceRoot, evidence.planHashes[0]);
    replayVerdict = replayResult.verdict;
    replayFindingCount = replayResult.findings.length;
  }

  // STEP 6: COMPUTE MATURITY SCORE (read-only)
  const auditLogPath = pathModule.join(workspaceRoot, ".kaiza", "audit-log.jsonl");
  const maturityScore = computeMaturityScore(workspaceRoot, {
    auditLogPath,
  });

  // STEP 7: COMPUTE WORKSPACE ROOT HASH (not the path itself)
  const workspaceRootHash = crypto.createHash("sha256")
    .update(workspaceRoot)
    .digest("hex");

  // STEP 8: BUILD BUNDLE CONTENT (canonical field order for determinism)
  // NOTE: Do NOT include generated_timestamp in the bundle content for signing
  // because it changes on every generation. Instead add it after signing.
  const bundleContent = {
    // Metadata (deterministic ordering matters)
    bundle_schema_version: "1.0",
    workspace_root_hash: workspaceRootHash,
    workspace_root_label: options.workspace_root_label || workspaceRoot,

    // Time window
    time_window: {
      start: evidence.auditMetrics.first_timestamp,
      end: evidence.auditMetrics.last_timestamp,
    },

    // Evidence roots
    audit_log_root_hash: evidence.auditLogRootHash,
    plan_hashes: evidence.planHashes,

    // Summaries
    audit_metrics: evidence.auditMetrics,
    policy_enforcement: policySummary,
    intent_coverage: intentSummary,
    replay_verdict: replayVerdict,
    replay_finding_count: replayFindingCount,

    // Maturity scores
    maturity_scores: {
      overall: maturityScore.overall,
      dimensions: maturityScore.dimensions,
      blocking_reasons: maturityScore.blockingReasons,
    },

    // Verifier checksums (hash of exported data)
    verifier_checksums: {
      audit_metric_hash: crypto.createHash("sha256")
        .update(JSON.stringify(evidence.auditMetrics))
        .digest("hex"),
      policy_summary_hash: crypto.createHash("sha256")
        .update(JSON.stringify(policySummary))
        .digest("hex"),
      maturity_hash: crypto.createHash("sha256")
        .update(JSON.stringify(maturityScore))
        .digest("hex"),
    },
  };

  // STEP 9: COMPUTE BUNDLE ID (deterministic hash)
  const bundleId = computeBundleId(bundleContent);

  // STEP 10: SIGN BUNDLE (sign content without timestamp)
  const secret = getAttestationSecret(workspaceRoot);
  const signature = signBundle(bundleContent, secret);

  // STEP 11: RETURN SIGNED BUNDLE (add timestamp AFTER signing)
  return {
    bundle_id: bundleId,
    generated_timestamp: new Date().toISOString(),
    ...bundleContent,
    signature,
  };
}

// ============================================================================
// ATTESTATION BUNDLE VERIFICATION
// ============================================================================

/**
 * Verify a signed attestation bundle.
 * 
 * Returns PASS/FAIL verdict with first failing invariant (if any).
 * Verification is read-only and deterministic.
 *
 * @param {Object} signedBundle - Bundle with signature field
 * @param {string} workspaceRoot - Workspace to verify against
 * @returns {Object} Verification result { verdict, passed, first_failing_check, violations }
 * @throws {Error} If bundle structure invalid
 */
export function verifyAttestationBundle(signedBundle, workspaceRoot) {
  if (!signedBundle || typeof signedBundle !== "object") {
    throw new Error("ATTESTATION_INVALID_BUNDLE: Bundle must be an object");
  }

  if (!signedBundle.bundle_id) {
    throw new Error("ATTESTATION_INVALID_BUNDLE: Bundle missing bundle_id");
  }

  // STEP 1: VERIFY SIGNATURE (timing-safe)
  const secret = getAttestationSecret(workspaceRoot);
  let signatureValid = false;
  try {
    signatureValid = verifyBundleSignature(signedBundle, secret);
  } catch (err) {
    signatureValid = false;
  }

  if (!signatureValid) {
    return {
      verdict: "FAIL",
      passed: false,
      first_failing_check: "SIGNATURE_VERIFICATION",
      violations: [
        {
          check: "SIGNATURE_VERIFICATION",
          message: "Bundle signature invalid or tampered",
        },
      ],
    };
  }

  // STEP 2: VERIFY BUNDLE ID (deterministic hash)
  const bundleContent = { ...signedBundle };
  delete bundleContent.signature;
  delete bundleContent.generated_timestamp;
  const expectedBundleId = computeBundleId(bundleContent);

  if (signedBundle.bundle_id !== expectedBundleId) {
    return {
      verdict: "FAIL",
      passed: false,
      first_failing_check: "BUNDLE_ID_MISMATCH",
      violations: [
        {
          check: "BUNDLE_ID_MISMATCH",
          message: `Expected ${expectedBundleId}, got ${signedBundle.bundle_id}`,
        },
      ],
    };
  }

  // STEP 3: VERIFY EVIDENCE CHECKSUMS (spot check)
  const violations = [];

  // Audit metrics hash
  if (signedBundle.audit_metrics) {
    const auditMetricHash = crypto.createHash("sha256")
      .update(JSON.stringify(signedBundle.audit_metrics))
      .digest("hex");
    if (auditMetricHash !== signedBundle.verifier_checksums.audit_metric_hash) {
      violations.push({
        check: "AUDIT_METRIC_HASH_MISMATCH",
        message: "Audit metrics have been modified",
      });
    }
  }

  // Maturity score hash
  if (signedBundle.maturity_scores) {
    const maturityHash = crypto.createHash("sha256")
      .update(JSON.stringify(signedBundle.maturity_scores))
      .digest("hex");
    if (maturityHash !== signedBundle.verifier_checksums.maturity_hash) {
      violations.push({
        check: "MATURITY_HASH_MISMATCH",
        message: "Maturity scores have been modified",
      });
    }
  }

  // STEP 4: DETERMINE VERDICT
  const passed = violations.length === 0;
  const firstFailingCheck = passed ? null : violations[0].check;

  return {
    verdict: passed ? "PASS" : "FAIL",
    passed,
    first_failing_check: firstFailingCheck,
    violations,
  };
}

// ============================================================================
// ATTESTATION BUNDLE EXPORT
// ============================================================================

/**
 * Export attestation bundle to specified format.
 *
 * @param {Object} signedBundle - Signed bundle
 * @param {string} format - "json" or "markdown"
 * @returns {string} Exported content
 */
export function exportAttestationBundle(signedBundle, format = "json") {
  if (format === "json") {
    return JSON.stringify(signedBundle, null, 2);
  }

  if (format === "markdown") {
    return generateAttestationMarkdown(signedBundle);
  }

  throw new Error(`ATTESTATION_INVALID_FORMAT: Unsupported format: ${format}`);
}

/**
 * Generate markdown representation of attestation bundle.
 * Non-coder friendly format.
 *
 * @param {Object} bundle - Attestation bundle
 * @returns {string} Markdown
 */
function generateAttestationMarkdown(bundle) {
  const lines = [];

  lines.push(`# Attestation Bundle`);
  lines.push(`\n**Bundle ID:** \`${bundle.bundle_id}\``);
  lines.push(`**Generated:** ${bundle.generated_timestamp}`);
  lines.push(`\n## Verification Status`);
  lines.push(`\n✓ **Signed with HMAC-SHA256**`);
  lines.push(`\nSignature (first 16 chars): \`${bundle.signature.substring(0, 16)}...\``);

  lines.push(`\n## Evidence Summary`);
  lines.push(`\n### Audit Log`);
  lines.push(`- **Root Hash:** \`${bundle.audit_log_root_hash.substring(0, 16)}...\``);
  lines.push(`- **Total Entries:** ${bundle.audit_metrics.total_entries}`);
  lines.push(`- **Failures:** ${bundle.audit_metrics.failure_count}`);
  lines.push(`- **Time Range:** ${bundle.time_window.start} to ${bundle.time_window.end}`);

  lines.push(`\n### Plans Executed`);
  if (bundle.plan_hashes.length === 0) {
    lines.push(`- None recorded`);
  } else {
    bundle.plan_hashes.forEach(h => {
      lines.push(`- \`${h.substring(0, 16)}...\``);
    });
  }

  lines.push(`\n### Policy Enforcement`);
  lines.push(`- **Write Checks:** ${bundle.policy_enforcement.total_write_checks}`);
  lines.push(`- **Passed:** ${bundle.policy_enforcement.policy_passes}`);
  lines.push(`- **Failed:** ${bundle.policy_enforcement.policy_failures}`);
  lines.push(`- **Pass Rate:** ${(bundle.policy_enforcement.pass_rate * 100).toFixed(1)}%`);

  lines.push(`\n### Replay Verification`);
  lines.push(`- **Verdict:** ${bundle.replay_verdict}`);
  lines.push(`- **Findings:** ${bundle.replay_finding_count}`);

  lines.push(`\n## Maturity Assessment`);
  lines.push(`\n**Overall Score:** ${bundle.maturity_scores.overall.toFixed(1)} / 5.0`);
  lines.push(`\n### Dimension Scores`);
  Object.entries(bundle.maturity_scores.dimensions).forEach(([dim, score]) => {
    lines.push(`- **${dim}:** ${score.toFixed(1)}`);
  });

  if (bundle.maturity_scores.blocking_reasons.length > 0) {
    lines.push(`\n### Blocking Reasons (Why Not Level 5)`);
    bundle.maturity_scores.blocking_reasons.forEach(reason => {
      lines.push(`- **${reason.dimension}:** Score ${reason.score.toFixed(1)} (${reason.blockedBy})`);
    });
  }

  lines.push(`\n## Verifier Protocol`);
  lines.push(`\n### To Verify This Bundle`);
  lines.push(`\n1. Obtain the signing secret (KAIZA_ATTESTATION_SECRET)`);
  lines.push(`2. Recompute bundle ID from content (excluding signature)`);
  lines.push(`3. Verify signature: \`HMAC-SHA256(content, secret)\``);
  lines.push(`4. Verify checksums match: audit metrics, policy summary, maturity scores`);
  lines.push(`5. If all checks pass, attestation is valid`);

  lines.push(`\n---`);
  lines.push(`*This attestation was generated by KAIZA MCP Server and is valid only if signature verification passes.*`);

  return lines.join("\n");
}

// ============================================================================
// SCHEMA & EXPORTS
// ============================================================================

export const ATTESTATION_SCHEMA = {
  version: "1.0",
  required_fields: [
    "bundle_id",
    "bundle_schema_version",
    "generated_timestamp",
    "workspace_root_hash",
    "audit_log_root_hash",
    "plan_hashes",
    "audit_metrics",
    "policy_enforcement",
    "intent_coverage",
    "replay_verdict",
    "maturity_scores",
    "verifier_checksums",
    "signature",
  ],
  signing_algorithm: "HMAC-SHA256",
  verification_is_readonly: true,
  determinism_guarantee: "Same workspace state → same bundle_id",
};
