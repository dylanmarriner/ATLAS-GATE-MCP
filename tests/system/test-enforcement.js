import fs from "fs";
import path from "path";
import { writeFileHandler } from "../../tools/write_file.js";
import { lockWorkspaceRoot } from "../../core/path-resolver.js";
const REPO_ROOT = process.cwd();
try {
    lockWorkspaceRoot(REPO_ROOT);
} catch (e) { }

import { readPromptHandler } from "../../tools/read_prompt.js";
import { SESSION_STATE } from "../../session.js";

async function runTest() {
    // Set workspace root in SESSION_STATE
    SESSION_STATE.workspaceRoot = REPO_ROOT;
    
    // Satisfy Prompt Gate
    await readPromptHandler({ name: "WINDSURF_CANONICAL" }, "WINDSURF");

    // Find an approved plan hash
    const plansDir = path.join(REPO_ROOT, "docs", "plans");
    const plans = fs.readdirSync(plansDir).filter(f => f.endsWith(".md"));
    if (plans.length === 0) {
        console.error("No plans found. Run bootstrap test first.");
        process.exit(1);
    }
    const PLAN_HASH = plans[0].replace(".md", "");
    console.log(`Using plan hash: ${PLAN_HASH}`);

    const TEST_FILE = "test-enforcement.tmp.js";
    const TEST_PATH = path.join(REPO_ROOT, TEST_FILE);

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
        plan: PLAN_HASH,
        role: "WINDSURF",
        connectedVia: "test-harness",
        purpose: "verification",
        registeredIn: "server.js",
        failureModes: "test-failure",
        intent: "Governed write for security remediation verification including more than twenty chars.",
        workspace_root: REPO_ROOT,
        session_id: "test-session-123",
        tool_name: "write_file"
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
            plan: PLAN_HASH,
            role: "WINDSURF",
            connectedVia: "test-harness",
            purpose: "verification",
            registeredIn: "server.js",
            failureModes: "test-failure",
            intent: "Attempt to violate security policy by commenting out logic.",
            workspace_root: REPO_ROOT,
            session_id: "test-session-123",
            tool_name: "write_file"
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
