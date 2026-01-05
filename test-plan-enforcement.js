import fs from "fs";
import path from "path";
import crypto from "crypto";
import { writeFileHandler } from "./tools/write_file.js";
import { bootstrapPlanHandler } from "./tools/bootstrap_tool.js";

const REPO_ROOT = process.cwd();
const TEST_FILE = "test-plan-enforce.js.tmp";
const TEST_PATH = path.join(REPO_ROOT, TEST_FILE);

import { readPromptHandler } from "./tools/read_prompt.js";

async function runTest() {
    console.log("Testing Plan Enforcement...");

    // Satisfy Prompt Gate
    await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" });

    // 1. Bootstrap a fresh plan
    // We need to bypass governance check for bootstrap if a plan already exists?
    // Our bootstrap implementation disables itself after 1st plan.
    // We probably already have a plan from previous steps.
    // Use existing plan.
    const plansDir = path.join(REPO_ROOT, "docs", "plans");
    const plans = fs.readdirSync(plansDir).filter(f => f.endsWith(".md"));
    if (plans.length === 0) {
        console.error("No plans found. Run bootstrap test first.");
        process.exit(1);
    }
    const planName = plans[0];
    const planPath = path.join(plansDir, planName);
    const planContent = fs.readFileSync(planPath, "utf8");

    // Extract ID
    const idMatch = planContent.match(/plan_id:\s*(.+)/);
    if (!idMatch) {
        console.error("No plan_id in plan file.");
        process.exit(1);
    }
    const realPlanId = idMatch[1].trim();

    // Calculate Hash
    const realHash = crypto.createHash("sha256").update(planContent).digest("hex");

    // 2. Write with Correct ID (Should Pass)
    console.log("Case 1: Correct ID");
    await writeFileHandler({
        path: TEST_PATH,
        content: "export const x = 1;",
        plan: planName,
        planId: realPlanId,
        role: "EXECUTABLE",
        connectedVia: "test",
        purpose: "test",
        registeredIn: "test",
        failureModes: "test"
    });
    console.log("PASS: Correct ID accepted.");
    fs.unlinkSync(TEST_PATH);

    // 3. Write with Wrong ID (Should Fail)
    console.log("Case 2: Wrong ID");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "export const x = 1;",
            plan: planName,
            planId: "wrong-id",
            role: "EXECUTABLE",
            connectedVia: "test",
            purpose: "test",
            registeredIn: "test",
            failureModes: "test"
        });
        console.error("FAIL: Wrong ID was NOT blocked.");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("PLAN_ID_MISMATCH")) {
            console.log("PASS: Wrong ID blocked.");
        } else {
            console.error(`FAIL: Wrong error: ${e.message}`);
            process.exit(1);
        }
    }

    // 4. Write with Correct Hash (Should Pass)
    console.log("Case 3: Correct Hash");
    await writeFileHandler({
        path: TEST_PATH,
        content: "export const x = 1;",
        plan: planName,
        planId: realPlanId,
        planHash: realHash,
        role: "EXECUTABLE",
        connectedVia: "test",
        purpose: "test",
        registeredIn: "test",
        failureModes: "test"
    });
    console.log("PASS: Correct Hash accepted.");
    fs.unlinkSync(TEST_PATH);

    // 5. Write with Wrong Hash (Should Fail)
    console.log("Case 4: Wrong Hash");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "export const x = 1;",
            plan: planName,
            planId: realPlanId,
            planHash: "badhash",
            role: "EXECUTABLE",
            connectedVia: "test",
            purpose: "test",
            registeredIn: "test",
            failureModes: "test"
        });
        console.error("FAIL: Wrong Hash was NOT blocked.");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("PLAN_INTEGRITY_VIOLATION")) {
            console.log("PASS: Wrong Hash blocked.");
        } else {
            console.error(`FAIL: Wrong error: ${e.message}`);
            process.exit(1);
        }
    }

}

runTest().catch(e => {
    console.error("Unexpected error:", e);
    process.exit(1);
});
