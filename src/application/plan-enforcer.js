import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRepoRoot, resolvePlanPath, getGovernancePath, normalizePathForDisplay } from "../infrastructure/path-resolver.js";
import { invariant, invariantNotNull, invariantTrue, invariantEqual } from "../domain/invariant.js";
import { lintPlan } from "./plan-linter.js";

function readGovernanceState(repoRoot) {
  const govPath = getGovernancePath();
  if (!fs.existsSync(govPath)) {
    return { bootstrap_enabled: false, approved_plans_count: 0, auto_register_plans: false };
  }
  return JSON.parse(fs.readFileSync(govPath, "utf8"));
}

/**
 * RF4 & RF5: High-assurance Plan Enforcement (V5 JSON format)
 *
 * Plans are JSON files. Signature is stored in the plan's atlas_gate_plan_signature key.
 * validatePathInPlan is now FULLY IMPLEMENTED using plan.path_allowlist.
 *
 * Also supports legacy .md plans (with Markdown header signature) for migration.
 */
export async function enforcePlan(planSignatureOrName, targetPath) {
  invariantNotNull(planSignatureOrName, "INV_PLAN_SIGNATURE_REQUIRED", "Plan signature or name is required for authorization");

  let planFile;
  try {
    planFile = resolvePlanPath(planSignatureOrName);
  } catch (err) {
    throw new Error(`REFUSE: Plan not found: ${planSignatureOrName}. Error: ${err.message}`);
  }

  const fileContent = fs.readFileSync(planFile, "utf8");
  const isJsonPlan = planFile.endsWith(".json");

  // ── EXTRACT SIGNATURE & PLAN DATA ──────────────────────────────────────────

  let embeddedSignature = null;
  let plan = null;

  if (isJsonPlan) {
    // V5 JSON plan: signature is in the JSON key
    try {
      plan = JSON.parse(fileContent);
    } catch (err) {
      throw new Error(`REFUSE: Plan file is not valid JSON: ${err.message}`);
    }

    embeddedSignature = plan.atlas_gate_plan_signature;
    if (!embeddedSignature) {
      throw new Error("REFUSE: JSON plan is missing atlas_gate_plan_signature. Plan must be signed via save_plan.");
    }

    if (plan.status !== "APPROVED") {
      throw new Error(`REFUSE: Plan status is "${plan.status}" — must be APPROVED.`);
    }

  } else {
    // Legacy .md plan: signature is in HTML comment header
    const signatureHeaderMatch = fileContent.match(/<!--[\s\S]*?ATLAS-GATE_PLAN_SIGNATURE:\s*([A-Za-z0-9+/=_-]+)[\s\S]*?STATUS:\s*APPROVED\s*-->/);
    const hashHeaderMatch = fileContent.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})[\s\S]*?STATUS:\s*APPROVED\s*-->/);

    if (!signatureHeaderMatch && !hashHeaderMatch) {
      throw new Error(`REFUSE: Plan ${planSignatureOrName} is not APPROVED or has invalid header format.`);
    }
    embeddedSignature = signatureHeaderMatch ? signatureHeaderMatch[1] : null;
  }

  // ── CRYPTOGRAPHIC VERIFICATION ──────────────────────────────────────────────

  let publicKey = null;
  try {
    const pubPath = path.join(getRepoRoot(), ".atlas-gate", ".cosign-keys", "public.pem");
    if (fs.existsSync(pubPath)) {
      publicKey = fs.readFileSync(pubPath, "utf8");
    }
  } catch (err) {
    throw new Error(`REFUSE: Failed to load public key: ${err.message}`);
  }

  const { canonicalizeForSigning } = await import("./cosign-hash-provider.js");

  if (isJsonPlan) {
    // Canonicalize JSON plan the same way save_plan does (strip signature key)
    const { canonicalizePlanContent } = await import("./plan-linter.js");
    const canonicalized = canonicalizePlanContent(fileContent);

    if (publicKey && embeddedSignature) {
      const bundlePath = planFile.replace(/\.json$/, ".bundle.json");
      let bundleJSON = null;
      if (fs.existsSync(bundlePath)) {
        try {
          bundleJSON = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
        } catch (err) {
          throw new Error(`REFUSE: Failed to parse Sigstore bundle: ${err.message}`);
        }
      }

      const { verifyWithCosign } = await import("./cosign-hash-provider.js");
      try {
        if (bundleJSON) {
          await verifyWithCosign(canonicalized, bundleJSON, publicKey);
        } else {
          const sigBuffer = Buffer.from(embeddedSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const verifier = crypto.createVerify("sha256");
          verifier.update(Buffer.from(canonicalized, "utf8"));
          if (!verifier.verify(publicKey, sigBuffer)) {
            throw new Error("Signature mathematically failed verification.");
          }
        }
      } catch (err) {
        throw new Error(`REFUSE: Plan signature verification failed. ${err.message}`);
      }
    } else if (embeddedSignature && !publicKey) {
      throw new Error("REFUSE: Cannot verify signature — public.pem is missing from .atlas-gate/.cosign-keys/");
    }

  } else {
    // Legacy .md plan verification (unchanged from V4)
    const lines = fileContent.split('\n');
    const headerEnd = lines.findIndex(l => l.includes('-->'));
    const bodyLines = headerEnd === -1 ? lines : lines.slice(headerEnd + 1);
    const stripped = bodyLines.join('\n')
      .replace(/<!--[\s\S]*?-->\s*/gm, "")
      .replace(/\s*\[COSIGN_SIGNATURE:\s*[^\]]*\]\s*$/gm, "");
    const canonicalized = canonicalizeForSigning(stripped);

    if (publicKey && embeddedSignature) {
      const bundlePath = planFile.replace(/\.md$/, ".bundle.json");
      let bundleJSON = null;
      if (fs.existsSync(bundlePath)) {
        try { bundleJSON = JSON.parse(fs.readFileSync(bundlePath, "utf8")); } catch {}
      }
      const { verifyWithCosign } = await import("./cosign-hash-provider.js");
      try {
        if (bundleJSON) {
          await verifyWithCosign(canonicalized, bundleJSON, publicKey);
        } else {
          const sigBuffer = Buffer.from(embeddedSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const verifier = crypto.createVerify("sha256");
          verifier.update(Buffer.from(canonicalized, "utf8"));
          if (!verifier.verify(publicKey, sigBuffer)) {
            throw new Error("Signature failed (raw ECDSA fallback).");
          }
        }
      } catch (err) {
        throw new Error(`REFUSE: Plan signature verification failed. ${err.message}`);
      }
    }
  }

  // ── PATH ALLOWLIST ENFORCEMENT (V5: FULLY IMPLEMENTED) ─────────────────────

  if (targetPath) {
    if (isJsonPlan && plan && Array.isArray(plan.path_allowlist)) {
      validatePathInPlan(targetPath, plan.path_allowlist);
    } else if (!isJsonPlan) {
      // Legacy .md: use scope: field regex (same as before)
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
    }
  }

  return {
    repoRoot: getRepoRoot(),
    plan: planSignatureOrName,
    parsedPlan: plan,   // Return parsed plan for downstream use (phase definitions, etc.)
    pathAllowlist: plan?.path_allowlist || [],
  };
}

/**
 * Validate that targetPath falls within the plan's path_allowlist.
 *
 * This function is now FULLY IMPLEMENTED (was a stub in V4).
 * Each allowlist entry is a workspace-relative prefix. Any write to a path NOT
 * covered by at least one entry results in a hard REFUSE.
 *
 * @param {string} targetPath - Absolute path of the file being written
 * @param {string[]} pathAllowlist - workspace-relative paths from the plan's path_allowlist
 */
function validatePathInPlan(targetPath, pathAllowlist) {
  const repoRoot = getRepoRoot();

  // Normalize targetPath to be workspace-relative
  const relTarget = path.relative(repoRoot, path.normalize(targetPath));

  // Each allowlist entry can be:
  //   - An exact file: "src/feature.js"
  //   - A directory prefix: "src/" or "src" → covers all files under src/
  const allowed = pathAllowlist.some((entry) => {
    // Strip trailing slash for comparison
    const normalizedEntry = entry.replace(/\/$/, "");
    // Exact match OR target starts with the entry prefix (directory)
    return (
      relTarget === normalizedEntry ||
      relTarget.startsWith(normalizedEntry + path.sep) ||
      relTarget.startsWith(normalizedEntry + "/")
    );
  });

  if (!allowed) {
    throw new Error(
      `REFUSE: Write to "${relTarget}" is not authorized by the active plan's path_allowlist.\n` +
      `Allowed paths: ${pathAllowlist.join(", ")}\n` +
      `Modify the plan's path_allowlist to include this path, then re-sign and re-approve.`
    );
  }
}
