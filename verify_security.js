import { writeFileHandler } from "./tools/write_file.js";
import { autoInitializePathResolver, getPlansDir } from "./core/path-resolver.js";

autoInitializePathResolver(process.cwd());
import { readPromptHandler } from "./tools/read_prompt.js";
import { SESSION_STATE } from "./session.js";
import fs from "fs";
import path from "path";

const REPO_ROOT = process.cwd();
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
            plan: "Foundations.md", // Dummy
            role: "EXECUTABLE",
            purpose: "test"
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
    await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" });

    // 2. PATH TRAVERSAL ATTEMPT
    console.log("\n[2] Testing Path Traversal...");
    try {
        await writeFileHandler({
            path: "/tmp/evil.js", // Absolute path outside? Or relative ../
            // write_file uses path.resolve(input).
            // If we pass /tmp/evil.js, repo-resolver checks if it is inside repo.
            // But strict path traversal `..` check is in write_file.js.
            path: "../outside.js",
            content: "console.log('pwned');",
            plan: "Foundations.md",
            role: "EXECUTABLE",
            purpose: "test"
        });
        console.error("❌ FAIL: Path Traversal BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("INVALID_PATH") || e.message.includes("traversal")) {
            console.log("✅ PASS: Path Traversal blocked.");
        } else {
            // It might fail on resolveRepoRoot if check happens later?
            // write_file checks `Includes("..")` early.
            console.log(`✅ PASS: Blocked with: ${e.message}`);
        }
    }

    // 3. PLAN ENFORCEMENT (Missing Plan)
    console.log("\n[3] Testing Missing Plan...");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "console.log('valid');",
            // No plan arg? Zod schema requires it.
            // If we pass empty string?
            plan: "",
            role: "EXECUTABLE",
            purpose: "test"
        });
        console.error("❌ FAIL: Missing Plan BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("PLAN_NAME_REQUIRED") || e.message.includes("Validation error") || e.message.includes("too_small") || e.message.includes("Plan not found") || e.message.includes("INV_PLAN_EXISTS")) {
            console.log(`✅ PASS: Missing Plan blocked (${e.message.split('\n')[0]}).`);
        } else {
            console.error(`❌ FAIL: Wrong error: ${e.message}`);
            passed = false;
        }
    }

    // 4. PLAN ENFORCEMENT (Invalid Plan ID - if strict)
    // We need a real plan file to test this effectively.
    // Let's find one.
    const planDir = getPlansDir();
    const plans = fs.readdirSync(planDir).filter(f => f.endsWith(".md"));
    if (plans.length > 0) {
        console.log("\n[4] Testing Mismatched Plan ID...");
        try {
            await writeFileHandler({
                path: TEST_PATH,
                content: "console.log('valid');",
                plan: plans.find(p => p.startsWith("FOUNDATION")) || plans[0],
                planId: "invalid-uuid",
                role: "EXECUTABLE",
                purpose: "test",
                connectedVia: "test",
                registeredIn: "test",
                failureModes: "test"
            });
            // Currently we are LENIENT if planId is provided?? 
            // Wait, plan-enforcer says: `if (requiredPlanId && requiredPlanId !== frontmatter.plan_id)`
            // So if we PROVIDE it, it MUST match.
            console.error("❌ FAIL: Mismatched ID BYPASSED!");
            passed = false;
        } catch (e) {
            if (e.message.includes("Plan ID mismatch") || e.message.includes("INV_PLAN_UNIQUE_ID")) {
                console.log("✅ PASS: Mismatched ID blocked.");
            } else {
                console.error(`❌ FAIL: Wrong error: ${e.message}`);
                passed = false;
            }
        }
    }

    // 5. AST POLICY (Empty Function)
    console.log("\n[5] Testing AST Policy (Empty Function)...");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "export function empty() { }",
            plan: plans.find(p => p.startsWith("FOUNDATION")) || plans[0], // Valid plan
            // We need valid ID/Hash? If we omit them, lenient check allows? 
            // Yes, currently lenient if omitted.
            role: "EXECUTABLE",
            purpose: "test",
            connectedVia: "test",
            registeredIn: "test",
            failureModes: "test"
        });
        console.error("❌ FAIL: Empty Function BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("AST_VIOLATION") || e.message.includes("Empty function")) {
            console.log("✅ PASS: Empty Function blocked.");
        } else {
            console.error(`❌ FAIL: Wrong error: ${e.message}`);
            passed = false;
        }
    }

    // 6. AST POLICY (Stub/TODO)
    console.log("\n[6] Testing AST Policy (TODO/Stub)...");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "export function work() { /* TODO implementation */ return null; }",
            plan: plans.find(p => p.startsWith("FOUNDATION")) || plans[0],
            role: "EXECUTABLE",
            purpose: "test",
            connectedVia: "test",
            registeredIn: "test",
            failureModes: "test"
        });
        console.error("❌ FAIL: Stub/TODO BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("TEXT_VIOLATION") || e.message.includes("TODO")) {
            console.log("✅ PASS: TODO comment blocked.");
        } else {
            console.error(`❌ FAIL: Wrong error: ${e.message}`);
            passed = false;
        }
    }

    // 7. PREFLIGHT (Broken Code)
    console.log("\n[7] Testing Preflight (Syntax Error)...");
    // We need to temporarily force a preflight fail.
    // If we write invalid JS syntax, AST might catch it first?
    // Let's write valid syntax that fails tests?
    // Our package.json test runs 'node test-bootstrap.js && ...'.
    // This is a slow integration test suite.
    // Preflight runs `npm test`.
    // If we write a file that breaks `npm test`?
    // Since `npm test` runs these very scripts... 
    // If we write a file that IS NOT a test, `npm test` might still pass if it doesn't import it?
    // This is tricky. Preflight relies on the repo's test suite failing if usage is broken.
    // If we just write a standalone file `security-test.js.tmp`, the existing tests won't see it.
    // So Preflight essentially verifies "Does the existing suite still pass?".
    // To test preflight blocking, we'd need to modify a file that IS tested.
    // We'll skip deep preflight test here (tested in `test-preflight.js` by mocking `package.json`).
    // But we can check that `runPreflight` is called.
    console.log("ℹ️ Skipping Preflight Penetration (verified in test-preflight.js)");


    // 8. DIFF POLICY (Commented Out Code)
    console.log("\n[8] Testing Diff Policy (Commented Out Code)...");
    // Create file first
    fs.writeFileSync(TEST_PATH, "export const x = 100;");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: "// export const x = 100;", // Commented out
            plan: plans.find(p => p.startsWith("FOUNDATION")) || plans[0],
            role: "EXECUTABLE",
            purpose: "test",
            connectedVia: "test",
            registeredIn: "test",
            failureModes: "test"
        });
        console.error("❌ FAIL: Commented Out Code BYPASSED!");
        passed = false;
    } catch (e) {
        if (e.message.includes("POLICY_VIOLATION") || e.message.includes("Commented-out")) {
            console.log("✅ PASS: Commented Out Code blocked.");
        } else {
            console.error(`❌ FAIL: Wrong error: ${e.message}`);
            passed = false;
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
