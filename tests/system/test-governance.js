import fs from "fs";
import path from "path";
import { KaizaError, ERROR_CODES } from "./core/error.js";
import { analyzeFileGovernance } from "./core/static-analyzer.js";
import { writeFileHandler } from "./tools/write_file.js";
import { readPromptHandler } from "./tools/read_prompt.js";
import { lockWorkspaceRoot } from "./core/path-resolver.js";
import { SESSION_STATE } from "./session.js";

const REPO_ROOT = process.cwd();
try {
    lockWorkspaceRoot(REPO_ROOT);
    SESSION_STATE.workspaceRoot = REPO_ROOT;
} catch (e) { }

/**
 * Mirroring the wrapHandler logic from server.js for verification
 */
function wrapHandler(handler, toolName) {
    return async (args) => {
        try {
            return await handler(args);
        } catch (err) {
            const kerr = ensureKaizaError(err, {
                error_code: err.code || ERROR_CODES.INTERNAL_ERROR,
                phase: "EXECUTION",
                component: "TOOL_HANDLER",
                invariant: "MANDATORY_DIAGNOSTICS"
            });

            // LOCK SESSION
            if (kerr.error_code !== ERROR_CODES.SESSION_LOCKED) {
                SESSION_STATE.isLocked = true;
                SESSION_STATE.lockError = kerr.toDiagnostic();
            }

            throw kerr;
        }
    };
}

import { ensureKaizaError } from "./core/error.js";

async function runTest() {
    console.log("🧪 STARTING GOVERNANCE VERIFICATION TEST");

    // 1. Verify Static Analyzer detects bad error handling
    console.log("\n[1] Testing Static Analyzer...");
    const badCode = `
try {
    doSomething();
} catch (e) {
    // Empty catch - violation
}
`;
    const tempBadFile = path.join(REPO_ROOT, "temp-bad.js");
    fs.writeFileSync(tempBadFile, badCode);
    const violations = analyzeFileGovernance(tempBadFile);
    fs.unlinkSync(tempBadFile);

    if (violations.length > 0 && violations.some(v => v.type === "EMPTY_CATCH")) {
        console.log("✅ PASS: Static analyzer detected empty catch.");
    } else {
        console.error("❌ FAIL: Static analyzer missed empty catch.");
        process.exit(1);
    }

    // 2. Verify Session Lock on Failure
    console.log("\n[2] Testing Session Lock on Failure...");
    // Reset state
    SESSION_STATE.isLocked = false;
    SESSION_STATE.hasFetchedPrompt = true;
    SESSION_STATE.fetchedPromptName = "WINDSURF_CANONICAL";

    const wrappedWrite = wrapHandler(writeFileHandler, "write_file");

    // Trigger a failure in writeFile (missing path)
    try {
        await wrappedWrite({});
    } catch (e) {
        if (SESSION_STATE.isLocked) {
            console.log("✅ PASS: Session locked after tool failure.");
        } else {
            console.error("❌ FAIL: Session NOT locked after failure.");
            process.exit(1);
        }
    }

    // 3. Verify further calls are blocked while locked
    console.log("\n[3] Testing blocked calls while locked...");

    // Logic from server.js validateToolInput
    function validateLocked(toolName, args = {}) {
        if (SESSION_STATE.isLocked) {
            const isFailureReport = toolName === 'write_file' &&
                args.path &&
                (args.path.includes("docs/reports/") || args.path.includes("docs/reports\\"));

            const isAuditRo = toolName === 'read_audit_log' || toolName === 'read_file';

            if (!isFailureReport && !isAuditRo) {
                throw new Error(`SESSION_LOCKED: Hard failure in previous call.`);
            }
        }
    }

    try {
        validateLocked("read_prompt", { name: "WINDSURF_CANONICAL" });
        console.error("❌ FAIL: validateLocked allowed call while session is locked.");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("SESSION_LOCKED")) {
            console.log("✅ PASS: validateLocked blocked call while locked.");
        } else {
            console.error(`❌ FAIL: validateLocked failed for wrong reason: ${e.message}`);
            process.exit(1);
        }
    }

    try {
        validateLocked("write_file", { path: "docs/reports/fail.md" });
        console.log("✅ PASS: validateLocked allowed Failure Report while locked.");
    } catch (e) {
        console.error("❌ FAIL: validateLocked blocked Failure Report while locked.");
        process.exit(1);
    }

    // 4. Verify Write-Time Commentary Enforcement
    console.log("\n[4] Testing Mandatory Commentary...");
    SESSION_STATE.isLocked = false; // unlock for test
    try {
        await writeFileHandler({
            path: "test.js",
            content: "console.log('test')",
            plan: "some-plan"
            // missing intent/metadata
        });
        console.error("❌ FAIL: Write allowed without intent or metadata.");
        process.exit(1);
    } catch (e) {
        if (e.error_code === ERROR_CODES.WRITE_REJECTED && e.invariant === "MANDATORY_COMMENTARY") {
            console.log("✅ PASS: Write rejected due to missing commentary.");
        } else {
            console.error(`❌ FAIL: Write rejected but wrong reason: ${e.message}`);
            process.exit(1);
        }
    }

    // 5. Verify successful write with intent
    console.log("\n[5] Testing Write with Intent...");
    const plansDir = path.join(REPO_ROOT, "docs", "plans");
    const plans = fs.readdirSync(plansDir).filter(f => f.endsWith(".md"));
    const PLAN_HASH = plans[0].replace(".md", "");

    await writeFileHandler({
        path: "test-governance.tmp.js",
        content: `/**
 * ROLE: EXECUTABLE
 * PURPOSE: Verification of governed write
 * CONNECTED VIA: test-harness
 * REGISTERED IN: server.js
 * EXECUTED VIA: node
 * FAILURE MODES: test-failure
 */
console.log('governed write')`,
        plan: PLAN_HASH,
        intent: "This is a governed write for verification purposes including more than twenty characters of intent."
    });
    console.log("✅ PASS: Write allowed with sufficient intent.");
    fs.unlinkSync(path.join(REPO_ROOT, "test-governance.tmp.js"));

    console.log("\n🛡️ ALL GOVERNANCE CHECKS PASSED.");
}

runTest().catch(e => {
    console.error("Unexpected error during test:", e);
    process.exit(1);
});
