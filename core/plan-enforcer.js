import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import crypto from "crypto";
import { getRepoRoot, getPlansDir, getGovernancePath, normalizePathForDisplay } from "./path-resolver.js";
import { invariant, invariantNotNull, invariantTrue, invariantEqual } from "./invariant.js";

function readGovernanceState(repoRoot) {
  const govPath = getGovernancePath();
  if (!fs.existsSync(govPath)) {
    return { bootstrap_enabled: false, approved_plans_count: 0, auto_register_plans: false };
  }
  return JSON.parse(fs.readFileSync(govPath, "utf8"));
}

/**
 * Enforce that a plan exists in the repo governing the target path.
 * Verifies plan status and ID/Hash if provided.
 * Uses canonical path resolver for all path operations.
 */
export function enforcePlan(planName, targetPath, requiredPlanId, requiredPlanHash) {
  // INV_WRITE_AUTHORIZED_PLAN: Plan name must be provided
  invariantNotNull(planName, "INV_WRITE_AUTHORIZED_PLAN", "Plan name is required for write authorization");

  const repoRoot = getRepoRoot();
  const plansDir = getPlansDir();
  const govState = readGovernanceState(repoRoot);

  // INV_PLANS_DIR_EXISTS: Plans directory must exist or be creatable
  invariantTrue(
    fs.existsSync(plansDir),
    "INV_PLANS_DIR_EXISTS",
    `Plans directory not found: ${plansDir}`
  );

  // INV_PLAN_STABLE_ID: Normalize plan name consistently
  const baseName = path.basename(planName);
  const normalizedPlanName = baseName.endsWith(".md")
    ? baseName.slice(0, -3)
    : baseName;

  const planFile = path.join(plansDir, `${normalizedPlanName}.md`);

  // INV_PLAN_EXISTS: Referenced plan must exist
  invariantTrue(
    fs.existsSync(planFile),
    "INV_PLAN_EXISTS",
    `Plan not found: ${planName} expected at ${planFile}`
  );

  // INV_PLAN_NOT_CORRUPTED: Read plan file as binary buffer for strict integrity
  const fileBuffer = fs.readFileSync(planFile);
  const fileContent = fileBuffer.toString("utf8");

  // INV_PLAN_NOT_CORRUPTED: Plan must have valid frontmatter
  const match = fileContent.match(/^---\n([\s\S]+?)\n---/);
  invariantTrue(
    match !== null,
    "INV_PLAN_NOT_CORRUPTED",
    `Invalid plan format: No frontmatter found in ${normalizedPlanName}.md`
  );

  let frontmatter;
  try {
    frontmatter = yaml.load(match[1]);
  } catch (e) {
    throw new Error(`INVALID_PLAN_YAML: ${e.message}`);
  }

  // INV_PLAN_NOT_CORRUPTED: Frontmatter must be valid YAML object
  invariantNotNull(
    frontmatter,
    "INV_PLAN_NOT_CORRUPTED",
    `Plan frontmatter did not parse to a valid object: ${normalizedPlanName}.md`
  );

  // INV_PLAN_APPROVED: Check plan approval status
  const status = frontmatter.status;

  // AUTO-REGISTER: If auto_register_plans is enabled, accept any plan in docs/plans
  if (govState.auto_register_plans && status !== "APPROVED" && status !== "approved") {
    // Auto-approve: update frontmatter and rewrite file
    console.error(`[PLAN-ENFORCER] Auto-registering plan: ${normalizedPlanName}`);
    frontmatter.status = "APPROVED";
    frontmatter.auto_registered = true;
    frontmatter.auto_registered_at = new Date().toISOString();

    // Reconstruct file with updated frontmatter
    const updatedContent = `---\n${yaml.dump(frontmatter)}---\n${fileContent.split('---').slice(2).join('---')}`;
    fs.writeFileSync(planFile, updatedContent, "utf8");
  } else {
    // INV_PLAN_APPROVED: Only APPROVED plans can be executed
    invariantTrue(
      status === "APPROVED" || status === "approved",
      "INV_PLAN_APPROVED",
      `Plan is not approved: status is '${status}', expected 'APPROVED'`
    );
  }

  // INV_PLAN_STABLE_ID: Check and verify plan ID
  // NOTE: plan_id in frontmatter is optional (legacy plans may not have it)
  // But if client provides requiredPlanId, we should validate it matches
  if (requiredPlanId && frontmatter.plan_id) {
    // Client provided ID AND plan has ID: they must match
    invariantEqual(
      requiredPlanId,
      frontmatter.plan_id,
      "INV_PLAN_UNIQUE_ID",
      `Plan ID mismatch: expected ${requiredPlanId}, got ${frontmatter.plan_id}`
    );
  }

  // INV_PLAN_HASH_MATCH: Verify plan integrity if hash provided
  if (requiredPlanHash) {
    // Use binary buffer for hashing to ensure bit-perfect match with sha256sum
    const currentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    invariantEqual(
      currentHash,
      requiredPlanHash,
      "INV_PLAN_HASH_MATCH",
      `Plan file integrity check failed. Expected hash ${requiredPlanHash}, got ${currentHash}. Plan may have been tampered with.`
    );
  }

  // INV_PLAN_SCOPE_ENFORCED: Check if target path is allowed by plan scope
  if (frontmatter.scope) {
    const scopePattern = frontmatter.scope;
    // Remove glob suffixes to get base directory
    const scopeBase = scopePattern.replace(/(\/\*\*|\/\*)$/, "");
    const allowedPath = path.resolve(repoRoot, scopeBase);

    // targetPath is already absolute (passed from writeFileHandler)
    const rel = path.relative(allowedPath, targetPath);

    // Check if target is inside allowed path
    // valid if rel does not start with '..' and is not absolute
    const isWithinScope = !rel.startsWith('..') && !path.isAbsolute(rel);

    invariantTrue(
      isWithinScope,
      "INV_PATH_WITHIN_SCOPE",
      `File path ${normalizePathForDisplay(targetPath)} is not within plan scope: ${scopePattern}`
    );
  } else if (frontmatter.files && Array.isArray(frontmatter.files)) {
    // Logic for explicit file list if needed, though audit used scope
    // Implementing for completeness if simple
    const isAllowed = frontmatter.files.some(f => {
      const allowedAbs = path.resolve(repoRoot, f);
      return allowedAbs === targetPath;
    });
    invariantTrue(
      isAllowed,
      "INV_PATH_WITHIN_SCOPE",
      `File path ${normalizePathForDisplay(targetPath)} is not in allowed files list.`
    );
  }

  return {
    repoRoot,
    plan: normalizedPlanName,
    data: frontmatter
  };
}
