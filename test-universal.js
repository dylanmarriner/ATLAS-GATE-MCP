
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileHandler } from './tools/write_file.js';
import { resolveRepoRoot } from './core/repo-resolver.js';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_ROOT = path.join(os.tmpdir(), 'kaiza-mcp-test-universal');

// Helpers
function cleanup() {
    if (fs.existsSync(TEST_ROOT)) {
        fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
}

function setup() {
    cleanup();
    fs.mkdirSync(TEST_ROOT, { recursive: true });
}

async function testUniversalAccess() {
    console.log("Starting Universal Access Test...");
    setup();

    // SCENARIO 1: Bare directory (No .git, No docs/plans)
    // Should fail with NO_GOVERNED_REPO_FOUND
    console.log("\n[SCENARIO 1] Bare directory (No .git, No docs/plans)");
    try {
        resolveRepoRoot(path.join(TEST_ROOT, 'somefile.txt'));
        console.error("FAIL: Should have thrown NO_GOVERNED_REPO_FOUND");
        process.exit(1);
    } catch (e) {
        if (e.message.includes('NO_GOVERNED_REPO_FOUND')) {
            console.log("PASS: Correctly rejected bare directory");
        } else {
            console.error(`FAIL: Unexpected error: ${e.message}`);
            process.exit(1);
        }
    }

    // SCENARIO 2: Git Repo ONLY (Has .git, No docs/plans)
    // Should resolve root, but writeFile should fail "PLAN_NOT_APPROVED"
    console.log("\n[SCENARIO 2] Git Repo ONLY (Has .git, No docs/plans)");
    fs.mkdirSync(path.join(TEST_ROOT, '.git'));

    try {
        const root = resolveRepoRoot(path.join(TEST_ROOT, 'somefile.txt'));
        console.log(`PASS: Resolved root to ${root}`);
    } catch (e) {
        console.error(`FAIL: Should have resolved via .git: ${e.message}`);
        process.exit(1);
    }

    try {
        await writeFileHandler({
            path: path.join(TEST_ROOT, 'test.txt'),
            content: 'hello',
            plan: 'TestPlan',
            role: 'EXECUTABLE',
            purpose: 'Testing',
            connectedVia: 'TestScript',
            registeredIn: 'TestRegistry',
            executedVia: 'TestExecution',
            failureModes: 'None',
            authority: 'TestPlan'
        });
        console.error("FAIL: Should have failed due to missing plan file");
        process.exit(1);
    } catch (e) {
        if (e.message.includes('PLAN_NOT_APPROVED')) {
            console.log("PASS: Correctly rejected write (Plan not found)");
        } else {
            console.error(`FAIL: Unexpected error: ${e.message}`);
            process.exit(1);
        }
    }

    // SCENARIO 3: Git Repo + Plans (Has .git, Has docs/plans/TestPlan.md)
    // Should SUCCESS
    console.log("\n[SCENARIO 3] Git Repo + Valid Plan");
    const plansDir = path.join(TEST_ROOT, 'docs', 'plans');
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(path.join(plansDir, 'TestPlan.md'), '# Test Plan');

    try {
        await writeFileHandler({
            path: path.join(TEST_ROOT, 'test.txt'),
            content: 'hello',
            plan: 'TestPlan',
            role: 'EXECUTABLE',
            purpose: 'Testing',
            connectedVia: 'TestScript',
            registeredIn: 'TestRegistry',
            executedVia: 'TestExecution',
            failureModes: 'None',
            authority: 'TestPlan'
        });
        console.log("PASS: Write successful with valid plan");
    } catch (e) {
        console.error(`FAIL: Should have succeeded: ${e.message}`);
        process.exit(1);
    }

    // Cleanup
    cleanup();
    console.log("\nALL TESTS PASSED");
}

testUniversalAccess().catch(e => {
    console.error(e);
    cleanup();
});
