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
 * Plans are addressed strictly by hash. 
 */
export function enforcePlan(planHash, targetPath) {
  invariantNotNull(planHash, "INV_PLAN_HASH_REQUIRED", "Plan hash is required for authorization");

  // RF4: Plan Addressing = HASH ONLY
  const planFile = resolvePlanPath(planHash);

  // RF5: Read for string equality check only (NO RE-HASHING)
  const fileContent = fs.readFileSync(planFile, "utf8");

  // Extract the embedded hash from the canonical header.
  // We expect:
  // <!--
  // ATLAS-GATE_PLAN_HASH: <hash>
  // ROLE: <role>
  // STATUS: APPROVED
  // -->
  const headerMatch = fileContent.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})[\s\S]*?STATUS:\s*APPROVED\s*-->/);

  if (!headerMatch) {
    throw new Error(`REFUSE: Plan ${planHash} is not APPROVED or has invalid header format.`);
  }

  const embeddedHash = headerMatch[1];

  // RF5: Windsurf only verifies string equality
  if (embeddedHash !== planHash) {
    throw new Error(`REFUSE: Hash mismatch. Filename ${planHash} does not match embedded hash ${embeddedHash}`);
  }

  // GATE: RE-LINT PLAN AT EXECUTION TIME (FAIL IF MODIFIED)
  const lintResult = lintPlan(fileContent, planHash);
  if (!lintResult.passed) {
    throw new Error(
      `REFUSE: Plan execution blocked. Linting failed with ${lintResult.errors.length} error(s). ` +
      `Plan may have been modified after approval. Errors: ${
        lintResult.errors.map(e => `${e.code}: ${e.message}`).join("; ")
      }`
    );
  }

  // SCOPE CHECK: Still mandatory (RF2 says plans stay with local dir)
  // We parse the remainder of the file for scope if needed, 
  // but according to the new protocol, the hash is the primary authority.
  // We'll maintain backward compatibility for scope checks if they exist in markdown body.
  const scopeMatch = fileContent.match(/scope:\s*(.+)/i);
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
    plan: planHash,
    data: {} // No longer using frontmatter, keeping data for backward compatibility
  };
}
