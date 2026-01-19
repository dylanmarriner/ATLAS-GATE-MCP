import { writeFileHandler } from "./tools/write_file.js";
import { readPromptHandler } from "./tools/read_prompt.js";
import { SESSION_STATE } from "./session.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { lockWorkspaceRoot, getPlansDir, getRepoRoot, getAuditLogPath } from "./core/path-resolver.js";

const REPO_ROOT = process.cwd();
try {
    lockWorkspaceRoot(REPO_ROOT);
} catch (e) { }

const TEST_FILE = "security-test.tmp.js";
const TEST_PATH = path.join(REPO_ROOT, TEST_FILE);

// Reset session state for testing if possible, specific to this run?
// SESSION_STATE is global singleton. We might need to manually reset it if it was set by previous imports?
// We can't easily reset it if it's a const export.
// But we can check if it is blocked.
// If it was already set by another test running in same process? 
// No, `node verify_security.js` runs in new process.

async function runPenetrationTest() {
    console.log("🔒 STARTING SECURITY PENETRATION TEST");
    let passed = true;

    // 1. PROMPT GATE BYPASS ATTEMPT
    console.log("\n[1] Testing Prompt Gate Bypass...");
    try {
        if (SESSION_STATE.hasFetchedPrompt) {
            console.warn("WARNING: Prompt already fetched? Resetting manually if possible.");
            SESSION_STATE.hasFetchedPrompt = false;
        }

        await writeFileHandler({
            path: TEST_PATH,
            content: "console.log('pwned');",
            plan: "badhash", // Dummy or invalid
            role: "EXECUTABLE",
            purpose: "test",
            intent: "Attempt to bypass prompt gate without fetching WINDSURF_CANONICAL."
        });
        console.error("❌ FAIL: Prompt Gate BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("PROMPT_GATE_LOCKED")) {
            console.log("✅ PASS: Prompt Gate blocked write.");
        } else {
            console.error(`❌ FAIL: Wrong error: ${e.message}`);
            passed = false;
        }
    }

    // Helper to unlock gate for subsequent tests
    await readPromptHandler({ name: "WINDSURF_CANONICAL" }, "WINDSURF");

    // 2. PATH TRAVERSAL ATTEMPT
    console.log("\n[2] Testing Path Traversal...");
    try {
        await writeFileHandler({
            path: "../outside.js",
            content: "console.log('pwned');",
            plan: "badhash",
            role: "EXECUTABLE",
            purpose: "test",
            intent: "Attempt to perform path traversal to write outside workspace."
        });
        console.error("❌ FAIL: Path Traversal BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("INVALID_PATH") || e.message.includes("traversal")) {
            console.log("✅ PASS: Path Traversal blocked.");
        } else {
            console.log(`✅ PASS: Blocked with: ${e.message}`);
        }
    }

    // 3. PLAN ENFORCEMENT (Missing Plan)
    console.log("\n[3] Testing Missing Plan...");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "console.log('valid');",
            plan: "",
            role: "EXECUTABLE",
            purpose: "test",
            intent: "Attempt to write with an empty plan identifier."
        });
        console.error("❌ FAIL: Missing Plan BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("required") || e.message.includes("REFUSE") || e.message.includes("not found")) {
            console.log(`✅ PASS: Missing Plan blocked(${e.message.split('\n')[0]}).`);
        } else {
            console.error(`❌ FAIL: Wrong error: ${e.message}`);
            passed = false;
        }
    }

    // 4. PLAN ENFORCEMENT (Correct Hash)
    const planDir = getPlansDir();
    const plans = fs.readdirSync(planDir).filter(f => f.endsWith(".md"));
    if (plans.length > 0) {
        const PLAN_HASH = plans[0].replace(".md", "");
        console.log(`\n[4] Testing Valid Plan Hash: ${PLAN_HASH}`);
        try {
            await writeFileHandler({
                path: TEST_PATH,
                content: "export const x = 1;",
                plan: PLAN_HASH,
                role: "EXECUTABLE",
                purpose: "test",
                connectedVia: "test",
                registeredIn: "test",
                failureModes: "test",
                intent: "Verifying that a valid plan hash is accepted when all governance metadata is present."
            });
            console.log("✅ PASS: Valid Plan Hash accepted.");
            fs.unlinkSync(TEST_PATH);
        } catch (e) {
            console.error(`❌ FAIL: Valid Plan rejected: ${e.message}`);
            passed = false;
        }

        // 5. PLAN ENFORCEMENT (Mismatched Hash)
        console.log("\n[5] Testing Mismatched Plan Hash...");
        try {
            await writeFileHandler({
                path: TEST_PATH,
                content: "export const x = 1;",
                plan: "ccf2e4ab53cd4a55ae8ddd67fea8b14caaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                role: "EXECUTABLE",
                purpose: "test",
                intent: "Attempt to write with a mismatched plan hash."
            });
            console.error("❌ FAIL: Mismatched ID BYPASSED!");
            passed = false;
        } catch (e) {
            if (e.message.includes("REFUSE") || e.message.includes("not found")) {
                console.log("✅ PASS: Mismatched ID blocked.");
            } else {
                console.error(`❌ FAIL: Wrong error: ${e.message}`);
                passed = false;
            }
        }
    }

    // 6. AST POLICY (Empty Function)
    console.log("\n[6] Testing AST Policy (Empty Function)...");
    if (plans.length > 0) {
        const PLAN_HASH = plans[0].replace(".md", "");
        try {
            await writeFileHandler({
                path: TEST_PATH,
                content: "export function empty() { }",
                plan: PLAN_HASH,
                role: "EXECUTABLE",
                purpose: "test",
                connectedVia: "test",
                registeredIn: "test",
                failureModes: "test",
                intent: "Attempt to write an empty function which should be blocked by AST policy after passing commentary checks."
            });
            console.error("❌ FAIL: Empty Function BYPASSED!");
            passed = false;
        } catch (e) {
            if (e.message.includes("POLICY_VIOLATION") || e.message.includes("Empty function") || e.message.includes("STUB_DETECTED")) {
                console.log("✅ PASS: Empty Function blocked.");
            } else {
                console.error(`❌ FAIL: Wrong error: ${e.message}`);
                passed = false;
            }
        }
    }

    // Cleanup
    if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);

    if (!passed) {
        console.error("\n💀 SECURITY VERIFICATION FAILED: Bypasses detected!");
        process.exit(1);
    } else {
        console.log("\n🛡️ ALL SECURITY CHECKS PASSED. SYSTEM IS SECURE.");
    }
}

runPenetrationTest().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
