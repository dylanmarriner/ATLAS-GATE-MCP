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
  // We expect a signature header (format TBD based on storage mechanism)
  // For now, maintain backward compatibility with hash-based headers
  // but prefer signature-based validation.
  const signatureHeaderMatch = fileContent.match(/<!--\s*PLAN_SIGNATURE:\s*([A-Za-z0-9+/=]+)[\s\S]*?STATUS:\s*APPROVED\s*-->/);
  const hashHeaderMatch = fileContent.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})[\s\S]*?STATUS:\s*APPROVED\s*-->/);

  if (!signatureHeaderMatch && !hashHeaderMatch) {
    throw new Error(`REFUSE: Plan ${planSignatureOrName} is not APPROVED or has invalid header format.`);
  }

  const embeddedSignature = signatureHeaderMatch ? signatureHeaderMatch[1] : null;

  // Verify signature equality if present
  if (embeddedSignature && embeddedSignature !== planSignature) {
    throw new Error(`REFUSE: Signature mismatch. Filename ${planSignature} does not match embedded signature ${embeddedSignature}`);
  }

  // GATE: RE-LINT PLAN AT EXECUTION TIME (FAIL IF MODIFIED)
  const lintResult = await lintPlan(fileContent, planSignature);
  if (!lintResult.passed) {
    throw new Error(
      `REFUSE: Plan execution blocked. Linting failed with ${lintResult.errors.length} error(s). ` +
      `Plan may have been modified after approval. Errors: ${lintResult.errors.map(e => `${e.code}: ${e.message}`).join("; ")
      }`
    );
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
