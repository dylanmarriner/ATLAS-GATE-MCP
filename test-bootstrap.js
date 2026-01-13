import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { autoInitializePathResolver } from "./core/path-resolver.js";
import { bootstrapPlanHandler } from "./tools/bootstrap_tool.js";

autoInitializePathResolver(process.cwd());

const __filename = fileURLToPath(import.meta.url);

// Mock environment
const SECRET = "test-secret-123";
process.env.KAIZA_BOOTSTRAP_SECRET = SECRET;

const REPO_ROOT = process.cwd();
const PLAN_CONTENT = `---
plan_id: FOUNDATION-1
status: APPROVED
---
# Foundation Plan
All good.
`;

// Payload
const payload = {
    repoIdentifier: path.basename(REPO_ROOT),
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    action: "BOOTSTRAP_CREATE_FOUNDATION_PLAN"
};

// Sign
const hmac = crypto.createHmac("sha256", SECRET);
hmac.update(JSON.stringify(payload));
const signature = hmac.digest("hex");

async function testBootstrap() {
    console.log("Running Bootstrap Test...");
    try {
        const result = await bootstrapPlanHandler({
            path: REPO_ROOT,
            planContent: PLAN_CONTENT,
            payload,
            signature
        });
        console.log("SUCCESS:", result);

        // Verify file exists
        const resultObj = JSON.parse(result.content[0].text);
        if (fs.existsSync(resultObj.planPath)) {
            console.log("Plan file verified on disk.");
        } else {
            console.error("Plan file MISSING from disk.");
            process.exit(1);
        }

        // Verify governance state
        const govState = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ".kaiza", "governance.json"), "utf8"));
        if (govState.bootstrap_enabled === false && govState.approved_plans_count === 1) {
            console.log("Governance state updated correctly.");
        } else {
            console.error("Governance state NOT updated:", govState);
            process.exit(1);
        }

    } catch (err) {
        console.error("FAILURE:", err);
        process.exit(1);
    }
}

// Reset state for test
const govPath = path.join(REPO_ROOT, ".kaiza", "governance.json");
fs.writeFileSync(govPath, JSON.stringify({
    bootstrap_enabled: true,
    approved_plans_count: 0
}, null, 2));

testBootstrap();
