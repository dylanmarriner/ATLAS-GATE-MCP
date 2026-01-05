import fs from "fs";
import path from "path";
import crypto from "crypto";
import { resolveRepoRoot } from "./repo-resolver.js";

const GOVERNANCE_FILE = "governance.json";

function getGovernancePath(repoRoot) {
    return path.join(repoRoot, ".kaiza", GOVERNANCE_FILE);
}

function readGovernanceState(repoRoot) {
    const govPath = getGovernancePath(repoRoot);
    if (!fs.existsSync(govPath)) {
        // Default state if missing (implied fresh repo)
        return {
            bootstrap_enabled: false, // Default secure, must be explicitly enabled
            approved_plans_count: 0,
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

export function bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature) {
    // 1. Verify Enabled
    if (!isBootstrapEnabled(repoRoot)) {
        throw new Error("BOOTSTRAP_DISABLED");
    }

    // 2. Verify Auth
    verifyBootstrapAuth(payload, signature);

    // 3. Write Plan
    const planId = crypto.randomUUID();
    const planFileName = `FOUNDATION-${planId}.md`;
    const plansDir = path.join(repoRoot, "docs", "plans");

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
    const state = readGovernanceState(repoRoot);
    state.bootstrap_enabled = false;
    state.approved_plans_count = 1;
    writeGovernanceState(repoRoot, state);

    return {
        planId,
        path: fullPlanPath
    };
}
