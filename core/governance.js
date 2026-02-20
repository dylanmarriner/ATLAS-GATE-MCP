import fs from "fs";
import path from "path";
import { getRepoRoot, getGovernancePath as getResolvedGovernancePath, getPlansDir } from "./path-resolver.js";
import { lintPlan } from "./plan-linter.js";
import { hmacSha256, timingSafeEqual, signWithCosign } from "./cosign-hash-provider.js";

const GOVERNANCE_FILE = "governance.json";

// Delegate to path resolver for canonical governance path
function getGovernancePath(repoRoot = null) {
    // Path resolver already has the correct repoRoot cached
    return getResolvedGovernancePath();
}

function readGovernanceState(repoRoot) {
    const govPath = getGovernancePath(repoRoot);
    if (!fs.existsSync(govPath)) {
        // Default state if missing (implied fresh repo)
        // Auto-initialize to a sensible default that works in any repo
        return {
            bootstrap_enabled: true,  // Allow bootstrap in fresh repos
            approved_plans_count: 0,
            auto_register_plans: true,
        };
    }
    return JSON.parse(fs.readFileSync(govPath, "utf8"));
}

function writeGovernanceState(repoRoot, state) {
    const govPath = getGovernancePath(repoRoot);
    const dir = path.dirname(govPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(govPath, JSON.stringify(state, null, 2));
}

export function isBootstrapEnabled(repoRoot) {
    const state = readGovernanceState(repoRoot);
    return state.bootstrap_enabled && state.approved_plans_count === 0;
}

export function verifyBootstrapAuth(payload, signature) {
     let secret = process.env['ATLAS-GATE_BOOTSTRAP_SECRET'];
     
     if (!secret) {
         // Fallback: Try to read from the workspace's .atlas-gate/bootstrap_secret.json
         try {
             const repoRoot = getRepoRoot();
             const fallbackPath = path.join(repoRoot, ".atlas-gate", "bootstrap_secret.json");
             if (fs.existsSync(fallbackPath)) {
                 const data = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
                 secret = data.bootstrap_secret;
                 console.error("[BOOTSTRAP] Loaded secret from .atlas-gate/bootstrap_secret.json");
             }
         } catch (err) {
             // If workspace not initialized yet, continue to error check below
             console.error("[BOOTSTRAP] Could not load secret from file fallback:", err.message);
             // Re-throw to maintain error handling governance - every error must be fatal
             throw err;
         }
     }

     if (!secret) {
         throw new Error("BOOTSTRAP_SECRET_MISSING");
     }

     const expectedSignature = hmacSha256(JSON.stringify(payload), secret);

     if (!timingSafeEqual(signature, expectedSignature)) {
         throw new Error("INVALID_BOOTSTRAP_SIGNATURE");
     }

     // Check timestamp (optional, but good practice)
     if (payload.timestamp && Date.now() - payload.timestamp > 300000) { // 5 min window
         throw new Error("BOOTSTRAP_REQUEST_EXPIRED");
     }
 }

export async function bootstrapCreateFoundationPlan(repoRoot = null, planContent, payload, signature) {
     // 1. Verify Enabled
     if (!isBootstrapEnabled(getRepoRoot())) {
         throw new Error("BOOTSTRAP_DISABLED");
     }

     // 2. Verify Auth
     verifyBootstrapAuth(payload, signature);

     // 3. GATE: LINT THE PLAN AT APPROVAL (MANDATORY)
     const lintResult = await lintPlan(planContent);
     if (!lintResult.passed) {
         throw new Error(
             `APPROVAL_BLOCKED: Plan linting failed with ${lintResult.errors.length} error(s). ` +
             lintResult.errors.map(e => `${e.code}: ${e.message}`).join("; ")
         );
     }

     // 4. Write Plan using canonical path resolver
     // Generate cosign signature for the plan content
     const planSignature = await signWithCosign(planContent);

     // Embed signature in content according to protocol
     let finalContent = planContent;
     if (planContent.includes("PENDING_SIGNATURE")) {
         finalContent = planContent.replace("PENDING_SIGNATURE", planSignature);
     }

     // Filename == signature
     const planFileName = `${planSignature}.md`;
     const plansDir = getPlansDir();

     if (!fs.existsSync(plansDir)) {
         fs.mkdirSync(plansDir, { recursive: true });
     }

     const fullPlanPath = path.join(plansDir, planFileName);

     // Ensure content has APPROVED status (case-insensitive and supporting new format)
     const approvedMatch = finalContent.match(/STATUS:\s*APPROVED/i);
     if (!approvedMatch) {
         throw new Error("FOUNDATION_PLAN_MUST_BE_APPROVED");
     }

     fs.writeFileSync(fullPlanPath, finalContent, "utf8");

     // 5. Update Governance State -> Disable Bootstrap
     const state = readGovernanceState(getRepoRoot());
     state.bootstrap_enabled = false;
     state.approved_plans_count = 1;
     writeGovernanceState(getRepoRoot(), state);

     return {
         planId: planSignature,
         path: fullPlanPath
     };
}