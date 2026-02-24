import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import crypto from "crypto";
import { getRepoRoot, resolvePlanPath, getGovernancePath, normalizePathForDisplay } from "./path-resolver.js";
import { invariant, invariantNotNull, invariantTrue, invariantEqual } from "./invariant.js";
import { lintPlan } from "./plan-linter.js";

function readGovernanceState(repoRoot) {
  const govPath = getGovernancePath();
  if (!fs.existsSync(govPath)) {
    return { bootstrap_enabled: false, approved_plans_count: 0, auto_register_plans: false };
  }
  return JSON.parse(fs.readFileSync(govPath, "utf8"));
}

/**
 * RF4 & RF5: High-assurance Plan Enforcement
 * Plans are now addressed by cosign signature instead of hash. 
 * Also supports named plan lookup (e.g., PLAN_PANTRYPILOT_PHASE_5_V1).
 */
export async function enforcePlan(planSignatureOrName, targetPath) {
  invariantNotNull(planSignatureOrName, "INV_PLAN_SIGNATURE_REQUIRED", "Plan signature or name is required for authorization");

  // RF4: Plan Addressing = SIGNATURE (Base64) or NAMED PLAN
  let planFile;
  try {
    planFile = resolvePlanPath(planSignatureOrName);
  } catch (err) {
    // If resolution fails, throw a clear error
    throw new Error(`REFUSE: Plan not found: ${planSignatureOrName}. Error: ${err.message}`);
  }

  // RF5: Read for verification check only
  const fileContent = fs.readFileSync(planFile, "utf8");

  // Extract the embedded signature from the canonical header.
  // Header format written by save_plan/governance:
  //   <!-- ATLAS-GATE_PLAN_SIGNATURE: <url-safe-base64> ROLE: ANTIGRAVITY STATUS: APPROVED -->
  // Signature uses URL-safe base64 (- and _ instead of + and /), no padding.
  const signatureHeaderMatch = fileContent.match(/<!--[\s\S]*?ATLAS-GATE_PLAN_SIGNATURE:\s*([A-Za-z0-9+/=_-]+)[\s\S]*?STATUS:\s*APPROVED\s*-->/);
  const hashHeaderMatch = fileContent.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})[\s\S]*?STATUS:\s*APPROVED\s*-->/);

  if (!signatureHeaderMatch && !hashHeaderMatch) {
    throw new Error(`REFUSE: Plan ${planSignatureOrName} is not APPROVED or has invalid header format. Expected <!-- ATLAS-GATE_PLAN_SIGNATURE: <sig> ... STATUS: APPROVED -->`);
  }

  const embeddedSignature = signatureHeaderMatch ? signatureHeaderMatch[1] : null;

  // Load public key for signature verification
  let publicKey = null;
  try {
    const pubPath = path.join(getRepoRoot(), ".atlas-gate", ".cosign-keys", "public.pem");
    if (fs.existsSync(pubPath)) {
      publicKey = fs.readFileSync(pubPath, "utf8");
    }
  } catch (err) {
    throw new Error(`REFUSE: Failed to load public key for plan verification: ${err.message}`);
  }

  // GATE: VERIFY CRYPTOGRAPHIC INTEGRITY
  // Instead of full structural linting, Windsurf only verifies the cryptographic signature/hash.
  if (publicKey && embeddedSignature) {
    const { verifyPlanSignature } = await import("./plan-linter.js");
    try {
      const isValid = await verifyPlanSignature(fileContent, embeddedSignature, publicKey);
      if (!isValid) {
        throw new Error("Signature mathematically failed verification.");
      }
    } catch (err) {
      throw new Error(`REFUSE: Plan signature verification failed. ${err.message}`);
    }
  } else if (hashHeaderMatch) {
    const expectedHash = hashHeaderMatch[1];
    const { canonicalizeForSigning } = await import("./cosign-hash-provider.js");
    const lines = fileContent.split('\n');
    const headerEnd = lines.findIndex(l => l.includes('-->'));
    const bodyLines = headerEnd === -1 ? lines : lines.slice(headerEnd + 1);
    const striped = bodyLines.join('\n').replace(/<!--[\s\S]*?-->\s*/gm, "").replace(/\s*\[COSIGN_SIGNATURE:\s*[^\]]*\]\s*$/gm, "");
    const canonicalized = canonicalizeForSigning(striped);
    const actualHash = crypto.createHash('sha256').update(canonicalized).digest('hex');
    if (actualHash !== expectedHash) {
      throw new Error(`REFUSE: Plan hash mismatch. Expected ${expectedHash}, got ${actualHash}`);
    }
  } else if (embeddedSignature && !publicKey) {
    throw new Error(`REFUSE: Cannot verify COSIGN_SIGNATURE because public.pem is missing from .atlas-gate/.cosign-keys/`);
  }

  // SCOPE CHECK: Still mandatory (RF2 says plans stay with local dir)
  const scopeMatch = fileContent.match(/^scope:\s*(.+)/im);
  if (scopeMatch) {
    const scope = scopeMatch[1].trim();
    const repoRoot = getRepoRoot();
    const scopeBase = scope.replace(/(\/\*\*|\/\*)$/, "");
    const allowedPath = path.resolve(repoRoot, scopeBase);
    const rel = path.relative(allowedPath, targetPath);
    const isWithinScope = !rel.startsWith('..') && !path.isAbsolute(rel);

    if (!isWithinScope) {
      throw new Error(`REFUSE: File path is not within plan scope: ${scope}`);
    }
  }

  return {
    repoRoot: getRepoRoot(),
    plan: planSignatureOrName,
    data: {} // No longer using frontmatter, keeping data for backward compatibility
  };
}
