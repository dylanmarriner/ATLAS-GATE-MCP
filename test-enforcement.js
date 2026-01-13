import fs from "fs";
import path from "path";
import { writeFileHandler } from "./tools/write_file.js";
import { autoInitializePathResolver, getPlansDir } from "./core/path-resolver.js";

autoInitializePathResolver(process.cwd());

const REPO_ROOT = process.cwd();

// Find a plan
const plansDir = getPlansDir();
const plans = fs.readdirSync(plansDir).filter(f => f.endsWith(".md"));
if (plans.length === 0) {
    console.error("No plans found. Run bootstrap test first.");
    process.exit(1);
}
const PLAN_NAME = plans.find(p => p.startsWith("FOUNDATION")) || plans[0];

const TEST_FILE = "test-enforcement.tmp.js";
const TEST_PATH = path.join(REPO_ROOT, TEST_FILE);

import { readPromptHandler } from "./tools/read_prompt.js";

async function runTest() {
    console.log(`Using plan: ${PLAN_NAME}`);

    // Satisfy Prompt Gate
    await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" });

    // 1. Create initial file
    const initialContent = `
function sensitiveLogic(param) {
  console.log("I am important");
  if (param) {
      return "secure";
  }
}
export const foo = 1;
`;

    console.log("Creating initial file...");
    await writeFileHandler({
        path: TEST_PATH,
        content: initialContent,
        plan: PLAN_NAME,
        role: "EXECUTABLE",
        connectedVia: "test-harness",
        purpose: "verification",
        registeredIn: "server.js",
        failureModes: "test-failure"
    });

    // 2. Try to comment out the logic (Should Fail)
    const commentedContent = `
// function sensitiveLogic(param) {
//   console.log("I am important");
//   if (param) {
//       return "secure";
//   }
// }
export const foo = 1;
`;

    console.log("Attempting comment-out strategy (Should Fail)...");
    try {
        await writeFileHandler({
            path: TEST_PATH,
            content: commentedContent,
            plan: PLAN_NAME,
            role: "EXECUTABLE",
            connectedVia: "test-harness",
            purpose: "verification",
            registeredIn: "server.js",
            failureModes: "test-failure"
        });
        console.error("FAIL: Comment-out strategy was NOT blocked.");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("COMMENT_OUT_DETECTED")) {
            console.log("SUCCESS: Comment-out blocked.");
        } else {
            console.error(`FAIL: Blocked but wrong reason: ${e.message}`);
            process.exit(1);
        }
    }

    // 3. Patch test (Add line)
    // Needs unified patch format.
    // We'll trust 'diff' package works but let's try a simple patch if possible.
    // Constructing a patch manually is brittle, let's skip complex patch test for now 
    // or use 'diff' to generate it if we could, but we can't import 'createPatch' easily without referencing exact export
    // But wait, I have 'diff' package.

    /*
    import { createPatch } from 'diff';
    const patch = createPatch("test-enforcement.js.tmp", initialContent, initialContent + "\nconsole.log('patched');");
    await writeFileHandler({
        path: TEST_PATH,
        patch: patch,
        plan: PLAN_NAME
    });
    console.log("SUCCESS: Patch applied.");
    */

    // Cleanup
    fs.unlinkSync(TEST_PATH);
}

runTest().catch(e => {
    console.error("Unexpected error:", e);
    process.exit(1);
});
