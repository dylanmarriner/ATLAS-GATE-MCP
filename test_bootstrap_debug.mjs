import crypto from "crypto";
import path from "path";
import fs from "fs";

console.log("Starting test...");

const SECRET = "test-secret-123";
process.env.KAIZA_BOOTSTRAP_SECRET = SECRET;

const REPO_ROOT = process.cwd();
console.log("REPO_ROOT:", REPO_ROOT);

const PLAN_CONTENT = `---
plan_id: FOUNDATION-1
status: APPROVED
---
# Foundation Plan
All good.
`;

const payload = {
    repoIdentifier: path.basename(REPO_ROOT),
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    action: "BOOTSTRAP_CREATE_FOUNDATION_PLAN"
};

const hmac = crypto.createHmac("sha256", SECRET);
hmac.update(JSON.stringify(payload));
const signature = hmac.digest("hex");

console.log("Loading bootstrap handler...");

try {
    const module = await import("./tools/bootstrap_tool.js");
    console.log("Imported successfully. Keys:", Object.keys(module));
    
    const { bootstrapPlanHandler } = module;
    console.log("Handler type:", typeof bootstrapPlanHandler);
    
    const result = await bootstrapPlanHandler({
        path: REPO_ROOT,
        planContent: PLAN_CONTENT,
        payload,
        signature
    });
    console.log("Result:", result);
} catch (err) {
    console.error("ERROR:", err.message);
    console.error("Stack:", err.stack);
    process.exit(1);
}
