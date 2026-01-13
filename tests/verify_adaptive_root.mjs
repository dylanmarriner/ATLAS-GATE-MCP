import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    initializePathResolver,
    ensurePathResolver,
    getRepoRoot,
    getPathResolverState
} from '../core/path-resolver.js';

// Mock invariant to avoid process exit/throw during test if possible,
// but the real module throws. We'll verify throws.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_A = path.join(__dirname, 'mock_repos', 'repo_a');
const MOCK_B = path.join(__dirname, 'mock_repos', 'repo_b');

// Setup Mocks
if (fs.existsSync(MOCK_A)) fs.rmSync(MOCK_A, { recursive: true });
if (fs.existsSync(MOCK_B)) fs.rmSync(MOCK_B, { recursive: true });

fs.mkdirSync(MOCK_A, { recursive: true });
fs.mkdirSync(path.join(MOCK_A, '.git')); // Strong marker
fs.mkdirSync(MOCK_B, { recursive: true });
fs.mkdirSync(path.join(MOCK_B, '.git')); // Strong marker

console.log("--- TEST START ---");

// 1. Uninitialized
console.log("1. Init State:", getPathResolverState());

// 2. Weak Init (Fallback) using CWD
// Note: We need to ensure we aren't in a real repo for this test to be effectively weak?
// findRepositoryRoot logic: checks CWD for .kaiza/ROOT, .git, docs/plans.
// If I run this inside KAIZA-MCP-server, it WILL find .git or .kaiza!
// So it will be Strong immediately.
// I need to trick it. But findRepositoryRoot is imported.
// I can only test "Weak to Strong" if I start in a neutral dir.

// Let's assume the server starts in a random dir (e.g. /tmp)
// I can't change process.cwd() easily inside the test once imports are done?
// Actually I can chdir.

const originalCwd = process.cwd();
const neutralDir = path.join(__dirname, 'mock_neutral');
if (!fs.existsSync(neutralDir)) fs.mkdirSync(neutralDir);

process.chdir(neutralDir);
console.log(`Changed CWD to Neutral: ${neutralDir}`);

// Reset module state? 
// ES Modules are cached. I cannot easily reset the state variables inside `path-resolver.js` 
// without modifying the module to export a reset function or using a fresh process.
// `initializePathResolver` checks `SESSION_INITIALIZED`.

// Since I cannot reset the state of the singleton in this script if it was already used 
// (it wasn't used yet in this process, but `server.js` imports it... wait, I'm NOT running server.js here).
// I am importing path-resolver directly. So state is fresh.

// Test 1: Lazy Init with Neutral Path -> Fallback
try {
    ensurePathResolver(neutralDir);
    const state = getPathResolverState();
    console.log("2. After Neutral Ensure:", state);

    // Check if isFallback? The internal variable isn't exported in getPathResolverState
    // I should update getPathResolverState to return isFallback for better testing.
    // I'll trust the console output "Fallback: true/false".

    if (state.repoRoot !== neutralDir) {
        console.error("FAIL: Should have defaulted to neutral dir as fallback");
    } else {
        console.log("PASS: Defaulted to neutral fallback");
    }
} catch (e) {
    console.error("ERROR in Step 2:", e);
}

// Test 2: Upgrade to Repo A
try {
    ensurePathResolver(MOCK_A); // Should detect .git and upgrade
    const state = getPathResolverState();
    console.log("3. After Strong Ensure (Repo A):", state);

    if (state.repoRoot === MOCK_A) {
        console.log("PASS: Upgraded to Repo A");
    } else {
        console.error(`FAIL: Did not upgrade to Repo A. Root is ${state.repoRoot}`);
    }
} catch (e) {
    console.error("ERROR in Step 3:", e);
}

// Test 3: Attempt Switch to Repo B (Should be ignored/rejected)
try {
    ensurePathResolver(MOCK_B);
    const state = getPathResolverState();
    console.log("4. After Strong Ensure (Repo B):", state);

    if (state.repoRoot === MOCK_A) {
        console.log("PASS: Stayed locked to Repo A (Security Invariant)");
    } else {
        console.error("FAIL: Switched to Repo B (Security Violation)");
    }
} catch (e) {
    console.error("ERROR in Step 4:", e);
}

// Cleanup
process.chdir(originalCwd);
// fs.rmSync(MOCK_A, { recursive: true });
// fs.rmSync(MOCK_B, { recursive: true });
// fs.rmSync(neutralDir, { recursive: true });
