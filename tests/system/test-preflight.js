import fs from "fs";
import path from "path";
import { runPreflight } from "../../core/preflight.js";

const REPO_ROOT = process.cwd();

// Mock console
const log = console.log;
const error = console.error;

async function testPreflight() {
    log("Testing preflight...");

    // 1. No package.json scripts (should vary based on environment)
    // Assuming this repo has NO package.json scripts for test/lint?
    // Actually, I saw package.json earlier, it had "test": "echo Error..." (failed)
    // So if I run preflight on THIS repo, it might fail because 'npm run test' exits 1?

    const pkgPath = path.join(REPO_ROOT, "package.json");
    const pkgBackupPath = path.join(REPO_ROOT, "package.json.bak");

    if (fs.existsSync(pkgPath)) {
        fs.copyFileSync(pkgPath, pkgBackupPath);
    }

    try {
        // CASE 1: package.json with passing script
        fs.writeFileSync(pkgPath, JSON.stringify({
            scripts: {
                test: "echo PASS"
            }
        }, null, 2));

        log("Running preflight (Expect PASS)...");
        runPreflight(REPO_ROOT);
        log("SUCCESS: Preflight passed.");

        // CASE 2: package.json with FAILING script
        fs.writeFileSync(pkgPath, JSON.stringify({
            scripts: {
                test: "exit 1"
            }
        }, null, 2));

        log("Running preflight (Expect FAIL)...");
        try {
            runPreflight(REPO_ROOT);
            error("FAIL: Preflight should have thrown!");
            process.exit(1);
        } catch (e) {
            if (e.message.includes("PREFLIGHT_FAILURE")) {
                log("SUCCESS: Preflight failed as expected.");
            } else {
                error(`FAIL: Wrong error: ${e.message}`);
                process.exit(1);
            }
        }

    } finally {
        // Restore
        if (fs.existsSync(pkgBackupPath)) {
            fs.copyFileSync(pkgBackupPath, pkgPath);
            fs.unlinkSync(pkgBackupPath);
        }
    }
}

testPreflight();
