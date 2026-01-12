import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRepoRoot, getGovernancePath as getResolvedGovernancePath, getPlansDir } from "./path-resolver.js";

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
            auto_register_plans: false,
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
    const secret = process.env.KAIZA_BOOTSTRAP_SECRET;
    if (!secret) {
        throw new Error("BOOTSTRAP_SECRET_MISSING");
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error("INVALID_BOOTSTRAP_SIGNATURE");
    }

    // Check timestamp (optional, but good practice)
    if (payload.timestamp && Date.now() - payload.timestamp > 300000) { // 5 min window
        throw new Error("BOOTSTRAP_REQUEST_EXPIRED");
    }
}

export function bootstrapCreateFoundationPlan(repoRoot = null, planContent, payload, signature) {
    // Use canonical path resolver to get the cached repo root
    const resolvedRepoRoot = getRepoRoot();
    
    // 1. Verify Enabled
    if (!isBootstrapEnabled(resolvedRepoRoot)) {
        throw new Error("BOOTSTRAP_DISABLED");
    }

    // 2. Verify Auth
    verifyBootstrapAuth(payload, signature);

    // 3. Write Plan using canonical path resolver
    const planId = crypto.randomUUID();
    const planFileName = `FOUNDATION-${planId}.md`;
    const plansDir = getPlansDir();

    if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
    }

    const fullPlanPath = path.join(plansDir, planFileName);

    // Ensure content has APPROVED status
    if (!planContent.includes("status: APPROVED")) {
        throw new Error("FOUNDATION_PLAN_MUST_BE_APPROVED");
    }

    fs.writeFileSync(fullPlanPath, planContent, "utf8");

    // 4. Update Governance State -> Disable Bootstrap
    const state = readGovernanceState(resolvedRepoRoot);
    state.bootstrap_enabled = false;
    state.approved_plans_count = 1;
    writeGovernanceState(resolvedRepoRoot, state);

    return {
        planId,
        path: fullPlanPath
    };
}
