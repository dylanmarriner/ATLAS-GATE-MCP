import path from "path";
import fs from "fs";
import { writeFileHandler } from "../tools/write_file.js";
import { SESSION_STATE } from "../session.js";
import { lockWorkspaceRoot } from "../core/path-resolver.js";

// Mock SESSION_STATE to unlock prompt gate for testing if needed
// or we can test the prompt gate itself.

const REPO_ROOT = process.cwd();
const TEST_DIR = path.join(REPO_ROOT, "tests", "adversarial_output");
if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Color helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';

function logResult(name, passed, error) {
    if (passed) {
        console.log(`${GREEN}[PASS] ${name}${RESET}`);
    } else {
        console.log(`${RED}[FAIL] ${name}${RESET}`);
        if (error) console.log(`       ${error}`);
    }
}

async function runAttack(name, {
    description,
    input, // { path, content, plan, ... }
    expectedOutcome, // "REJECT" or "ACCEPT"
    expectedError, // Regex or string to match error
}) {
    console.log(`\n${YELLOW}Running Attack: ${name}${RESET}`);
    console.log(`Description: ${description}`);

    // Setup input defaults
    let finalPath = input.path;
    if (!input.rawPath) {
        finalPath = path.join(TEST_DIR, input.path);
    }

    const args = {
        path: finalPath,
        content: input.content,
        plan: input.plan || "Governance Audit",
        planId: input.planId,
        planHash: input.planHash,
        role: input.role || "ATTACKER",
        // ... defaults
        ...input,
        path: finalPath
    };

    let result;
    try {
        result = await writeFileHandler(args);
    } catch (e) {
        result = { error: e };
    }
    let passed = false;
    let details = "";

    if (expectedOutcome === "REJECT") {
        if (result.error) {
            if (expectedError) {
                const match = result.error.message.includes(expectedError) || (expectedError instanceof RegExp && expectedError.test(result.error.message));
                if (match) {
                    passed = true;
                } else {
                    details = `Got error, but didn't match expected. Got: "${result.error.message}" Expected: "${expectedError}"`;
                }
            } else {
                passed = true;
            }
        } else {
            details = "Expected REJECT, but write SUCCEEDED.";
        }
    } else {
        // ACCEPT
        if (!result.error) {
            passed = true;
        } else {
            details = `Expected ACCEPT, but FAILED with: ${result.error.message}`;
        }
    }

    logResult(name, passed, details);
    return passed;
}




// MAIN RUNNER
async function main() {
    // We need to bypass the PROMPT GATE for some tests, enforce it for others.
    SESSION_STATE.hasFetchedPrompt = true;

    // Create Mock Plan
    const PLAN_HASH = "6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d";
    const PLAN_PATH = path.join(REPO_ROOT, "docs", "plans", `${PLAN_HASH}.md`);

    // Write the plan with the canonical header
    if (!fs.existsSync(path.dirname(PLAN_PATH))) {
        fs.mkdirSync(path.dirname(PLAN_PATH), { recursive: true });
    }
    fs.writeFileSync(PLAN_PATH, `<!--
ATLAS-GATE_PLAN_HASH: ${PLAN_HASH}
ROLE: INFRASTRUCTURE
STATUS: APPROVED
-->
# Adversarial Test Plan
Scope: /**
Red Team Usage.
`);

    const COMMON_ARGS = {
        plan: PLAN_HASH,
        planHash: PLAN_HASH,
        role: "INFRASTRUCTURE",
        purpose: "Testing Governance Enforcement",
        authority: PLAN_HASH,
        registeredIn: "tests/adversarial-runner.js",
        failureModes: "Intentional Failure",
        overwrite: true,
        intent: "Adversarial testing of governance layers to ensure no-fallback and hard-error enforcement."
    };

    console.log("=== STARTING ADVERSARIAL RED TEAM AUDIT ===");
    SESSION_STATE.hasFetchedPrompt = true;
    SESSION_STATE.fetchedPromptName = "WINDSURF_CANONICAL";
    lockWorkspaceRoot(process.cwd());

    const results = [];
    let passes = 0;
    let fails = 0;

    // --- ATTACK SUITE START ---

    const attacks = [
        // 2.1 Placeholder & Stub Evasion
        {
            name: "Stub: Empty Arrow Function",
            description: "Try to write a file with an empty arrow function `() => {}`",
            input: {
                ...COMMON_ARGS,
                path: "stub_arrow.js",
                content: `export const noop = () => {};`
            },
            expectedOutcome: "REJECT",
            expectedError: "HARD_BLOCK_VIOLATION: Empty function body"
        },
        {
            name: "Stub: Return Undefined",
            description: "Try to write a function explicitly returning undefined",
            input: {
                ...COMMON_ARGS,
                path: "stub_undefined.js",
                content: `export function foo() { return undefined; }`
            },
            expectedOutcome: "REJECT",
            expectedError: "HARD_BLOCK_VIOLATION: Returning undefined"
        },
        {
            name: "Stub: Return Empty Obj",
            description: "Try to write a function explicitly returning {}",
            input: {
                ...COMMON_ARGS,
                path: "stub_empty_obj.js",
                content: `export function foo() { return {}; }`
            },
            expectedOutcome: "REJECT",
            expectedError: "HARD_BLOCK_VIOLATION: Returning empty object"
        },

        // 2.2 Comment-Out Strategy
        // Needs a previous file state. We will write a file first, then try to overwrite it with commented out code.
        // We handle this via a custom step or just assume the runner handles concurrency? 
        // We'll just define it here, but we need to prep the file first.
    ];

    // Pre-seed files for Diff checks
    const seedFile = path.join(TEST_DIR, "critical_logic.js");
    fs.writeFileSync(seedFile, `
export function validateUser() {
    const x = 1;
    return x;
}
    `);

    attacks.push({
        name: "Diff: Comment-Out Attack",
        description: "Comment out logic instead of removing it properly",
        input: {
            ...COMMON_ARGS,
            path: "critical_logic.js",
            // We read the seed file content as 'oldContent' implicitly by the handler if it exists on disk? 
            // Yes, handler reads fs.
            content: `
// export function validateUser() {
//    const x = 1;
//    return x;
// }
            `
        },
        expectedOutcome: "REJECT",
        expectedError: "POLICY_VIOLATION: COMMENT_OUT_DETECTED"
    });

    // 2.3 Type Laundering
    attacks.push({
        name: "Type: @ts-ignore",
        description: "Inject @ts-ignore",
        input: {
            ...COMMON_ARGS,
            path: "type_exploit.ts",
            content: `
            // @ts-ignore
            const x = 1;
            `
        },
        expectedOutcome: "REJECT", // Does our stub detector catch this? Threat model said yes.
        expectedError: "CONSTRUCT_TAXONOMY_VIOLATION"
    });

    // 2.4 Exception Swallowing
    attacks.push({
        name: "Exception: Swallow",
        description: "Empty catch block",
        input: {
            ...COMMON_ARGS,
            path: "swallow.js",
            content: `
            try {
                something();
            } catch (e) {
                
            }
            `
        },
        expectedOutcome: "REJECT",
        expectedError: "HARD_BLOCK_VIOLATION: Empty catch block"
    });

    // 2.6 Scope & Path Escapes
    attacks.push({
        name: "Scope: Path Traversal",
        description: "Try to write with ../",
        input: {
            ...COMMON_ARGS,
            path: "../escaped.js",
            content: "payload",
            rawPath: true
        },
        expectedOutcome: "REJECT",
        expectedError: "INVALID_PATH: Path traversal (..) not permitted"
    });

    attacks.push({
        name: "Scope: Write Outside Repo",
        description: "Try to write to /tmp",
        input: {
            ...COMMON_ARGS,
            path: "/tmp/evil.js",
            content: "payload",
            rawPath: true
        },
        expectedOutcome: "REJECT",
        expectedError: "REFUSE: Path is outside workspace root"
        // Or "outside of repository" if we enforce that.
        // Let's see what it returns.
    });

    // 2.7 Governance Attacks
    // No Prompt
    attacks.push({
        name: "Governance: No Prompt",
        description: "Write without fetching prompt (Requires hacking session state in loop)",
        // Custom logic needed? We can toggle state before calling runAttack if we modify runAttack to accept a 'setup' fn.
        // Or just one-off here.
        // We'll skip for this automated array and do it manually below or rely on pre-check.
        // Actually let's assume valid prompt for now. 
    });

    // MISSING: check NO Prompt.
    // We can do it by clearing the flag before this specific test.
    // But `runAttack` runs in sequence.

    // Let's add manually at the end of loop.

    // Execution Loop
    for (const attack of attacks) {
        if (!attack.input) continue;
        const p = await runAttack(attack.name, attack);
        if (p) passes++; else fails++;
    }

    // Manual Special Tests

    // No Prompt Test
    SESSION_STATE.hasFetchedPrompt = false;
    const noPromptPass = await runAttack("Governance: No Prompt Gate", {
        description: "Should fail if prompt not fetched",
        input: { ...COMMON_ARGS, path: "no_prompt.js", content: "ok" },
        expectedOutcome: "REJECT",
        expectedError: "PROMPT_GATE_LOCKED"
    });
    if (noPromptPass) passes++; else fails++;
    SESSION_STATE.hasFetchedPrompt = true; // Restore

    // Invalid Plan Hash (Missing File)
    const badIdPass = await runAttack("Governance: Bad Plan ID", {
        description: "Mismatch plan ID (hash not found)",
        input: { ...COMMON_ARGS, plan: "0000000000000000000000000000000000000000000000000000000000000000", path: "bad_plan.js", content: "ok" },
        expectedOutcome: "REJECT",
        expectedError: "REFUSE: Plan not found by hash"
    });
    if (badIdPass) passes++; else fails++;

    // Integrity Violation (Hash Mismatch in header)
    // We need a file that exists but has a different internal hash
    const mismatchHash = "1111111111111111111111111111111111111111111111111111111111111111";
    fs.writeFileSync(path.join(REPO_ROOT, "docs", "plans", `${mismatchHash}.md`), `<!--
ATLAS-GATE_PLAN_HASH: 2222222222222222222222222222222222222222222222222222222222222222
ROLE: INFRASTRUCTURE
STATUS: APPROVED
-->`);
    const badHashPass = await runAttack("Governance: Bad Plan Hash", {
        description: "Mismatch plan Hash (Internal/External mismatch)",
        input: { ...COMMON_ARGS, plan: mismatchHash, path: "bad_hash.js", content: "ok" },
        expectedOutcome: "REJECT",
        expectedError: "REFUSE: Hash mismatch"
    });
    if (badHashPass) passes++; else fails++;


    // --- SUITE END Phase 2 ---

    // Phase 4: Positive Control
    const posResult = await runAttack("Positive Control: Valid Write", {
        description: "Write valid code that should be accepted.",
        input: {
            ...COMMON_ARGS,
            path: "valid_util.js",
            content: `export function isValid() { return true; }`
        },
        expectedOutcome: "ACCEPT"
    });
    if (posResult) passes++; else fails++;

    // Phase 3: Preflight Attacks
    console.log("\nRunning Attack: Preflight: Break Verification (Revert Test)");

    const targetPath = "core/error.js";
    const absTarget = path.join(REPO_ROOT, targetPath);
    const original = fs.readFileSync(absTarget, "utf8");

    // Mutation: Throw error to fail preflight (lint/build)
    let mutated = original + "\n\nthrow new Error('FORCED_PREFLIGHT_FAILURE');\n";

    const input = {
        ...COMMON_ARGS,
        path: targetPath,
        content: mutated,
        overwrite: true
    };

    let result;
    try {
        result = await writeFileHandler(input);
    } catch (e) {
        result = { error: e };
    }

    // Assertions
    const errorMatch = result.error && result.error.message.includes("PREFLIGHT");

    const current = fs.readFileSync(absTarget, "utf8");
    const reverted = current === original;

    if (errorMatch && reverted) {
        logResult("Preflight: Break Logic & Revert", true);
        passes++;
    } else {
        let msg = "";
        if (!errorMatch) msg += `Expected PREFLIGHT failure, got ${result.error ? result.error.message : "SUCCESS"}. `;
        if (!reverted) {
            msg += "File was NOT reverted! CRITICAL FAILURE. Restoring manually.";
            fs.writeFileSync(absTarget, original);
        }
        logResult("Preflight: Break Logic & Revert", false, msg);
        fails++;
    }

    console.log(`\n\n=== SUMMARY ===`);
    console.log(`PASS: ${passes}`);
    console.log(`FAIL: ${fails}`);

    // Cleanup
    ["6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d", "1111111111111111111111111111111111111111111111111111111111111111"].forEach(hash => {
        const p = path.join(REPO_ROOT, "docs", "plans", `${hash}.md`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    if (fails > 0) process.exit(1);
    process.exit(0);
}

main().catch(console.error);
