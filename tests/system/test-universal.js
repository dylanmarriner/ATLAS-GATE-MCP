
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileHandler } from './tools/write_file.js';
import { resolveRepoRoot } from './core/repo-resolver.js';
import { lockWorkspaceRoot, resetWorkspaceRootForTesting } from './core/path-resolver.js';
import { SESSION_STATE } from './session.js';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_ROOT = path.join(os.tmpdir(), 'atlas-gate-mcp-test-universal');

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
    SESSION_STATE.hasFetchedPrompt = true;
    SESSION_STATE.fetchedPromptName = "WINDSURF_CANONICAL";

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
        lockWorkspaceRoot(root);
        console.log(`DEBUG: Workspace locked to: ${root}`);
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
            authority: 'TestPlan',
            intent: 'Scenario 2: Testing write rejection when plan file is missing from docs/plans.'
        });
        console.error("FAIL: Should have failed due to missing plan file");
        process.exit(1);
    } catch (e) {
        if (e.message.includes('PLAN_NOT_APPROVED') || e.message.includes('Plan not found')) {
            console.log("PASS: Correctly rejected write (Plan not found)");
        } else {
            console.error(`FAIL: Unexpected error: ${e.message}`);
            process.exit(1);
        }
    }

    resetWorkspaceRootForTesting();

    // SCENARIO 3: Git Repo + Plans (Has .git, Has docs/plans/TestPlan.md)
    // Should SUCCESS
    console.log("\n[SCENARIO 3] Git Repo + Valid Plan");
    const plansDir = path.join(TEST_ROOT, 'docs', 'plans');
    fs.mkdirSync(plansDir, { recursive: true });
    // Audit log needs .atlas-gate for locking
    fs.mkdirSync(path.join(TEST_ROOT, '.atlas-gate'), { recursive: true });
    const PLAN_HASH = "6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d";
    fs.writeFileSync(path.join(plansDir, `${PLAN_HASH}.md`), `<!--
ATLAS-GATE_PLAN_HASH: ${PLAN_HASH}
ROLE: EXECUTABLE
STATUS: APPROVED
-->
# Test Plan`);

    try {
        lockWorkspaceRoot(TEST_ROOT);
        await writeFileHandler({
            path: path.join(TEST_ROOT, 'test.txt'),
            content: 'hello',
            plan: PLAN_HASH,
            role: 'EXECUTABLE',
            purpose: 'Testing',
            connectedVia: 'TestScript',
            registeredIn: 'TestRegistry',
            executedVia: 'TestExecution',
            failureModes: 'None',
            authority: PLAN_HASH,
            intent: 'Scenario 3: Testing successful write with a valid plan in a git repository.'
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
