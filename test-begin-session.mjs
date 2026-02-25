import { beginSessionHandler } from "./src/interfaces/tools/begin_session.js";

async function run() {
  console.log("Starting begin_session test...");
  try {
    const result = await beginSessionHandler({ workspace_root: process.cwd() });
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
