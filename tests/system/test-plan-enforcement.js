import fs from "fs";
import path from "path";
import crypto from "crypto";
import { writeFileHandler } from "../../tools/write_file.js";
import { lockWorkspaceRoot, getPlansDir } from "../../core/path-resolver.js";

const REPO_ROOT = process.cwd();
try {
    lockWorkspaceRoot(REPO_ROOT);
} catch (e) { }

import { bootstrapPlanHandler } from "../../tools/bootstrap_tool.js";

const TEST_FILE = "test-plan-enforce.tmp.js";
const TEST_PATH = path.join(REPO_ROOT, TEST_FILE);

import { readPromptHandler } from "../../tools/read_prompt.js";

async function runTest() {
    console.log("Testing Plan Enforcement...");

    // Satisfy Prompt Gate
    await readPromptHandler({ name: "WINDSURF_CANONICAL" }, "WINDSURF");

    // 1. Bootstrap a fresh plan
    // We need to bypass governance check for bootstrap if a plan already exists?
    // Our bootstrap implementation disables itself after 1st plan.
    // We probably already have a plan from previous steps.
    // Use existing plan.
    const plansDir = getPlansDir();
    const plans = fs.readdirSync(plansDir).filter(f => f.endsWith(".md"));
    if (plans.length === 0) {
        console.error("No plans found. Run bootstrap test first.");
        process.exit(1);
    }
    const PLAN_HASH = plans[0].replace(".md", "");
    console.log(`Using plan hash: ${PLAN_HASH}`);

    // 2. Write with Correct Hash (Should Pass)
    console.log("Case 1: Correct Hash");
    await writeFileHandler({
        path: TEST_PATH,
        content: "export const x = 1;",
        plan: PLAN_HASH,
        role: "EXECUTABLE",
        connectedVia: "test",
        purpose: "test",
        registeredIn: "test",
        failureModes: "test",
        intent: "Verifying that a write with the correct plan hash is accepted by the server."
    });
    console.log("PASS: Correct Hash accepted.");
    fs.unlinkSync(TEST_PATH);

    // 3. Write with Wrong Hash (This should fail integrity check)
    console.log("Case 2: Wrong ID (now hash)");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "export const x = 1;",
            plan: "badhash",
            role: "EXECUTABLE",
            connectedVia: "test",
            purpose: "test",
            registeredIn: "test",
            failureModes: "test",
            intent: "Verifying that a write with a bad plan hash is rejected by the server."
        });
        console.error("FAIL: Wrong Hash was NOT blocked.");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("REFUSE") || e.message.includes("not found")) {
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
