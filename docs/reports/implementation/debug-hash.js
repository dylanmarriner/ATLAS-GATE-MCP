import fs from "fs";
import { computePlanHash } from "./core/plan-linter.js";

const planPath = "/media/linnyux/development3/developing/KAIZA-MCP-server/docs/examples/EXAMPLE_VALID_PLAN.md";
let planContent = fs.readFileSync(planPath, "utf8");

console.log("First hash (with PENDING_HASH):");
const hash1 = computePlanHash(planContent);
console.log(hash1);

// Replace PENDING_HASH
planContent = planContent.replace("KAIZA_PLAN_HASH: PENDING_HASH", `KAIZA_PLAN_HASH: ${hash1}`);

console.log("\nSecond hash (with actual hash embedded):");
const hash2 = computePlanHash(planContent);
console.log(hash2);

console.log("\nAre they equal?", hash1 === hash2);

// The issue: the replacement changes the content, which changes the hash!
// We need to compute hash on the content without the header first

// Let's strip the HTML comment header and compute hash
const headerless = planContent.replace(/<!--[\s\S]*?-->\s*/m, "");
console.log("\nHash of content without header:");
const hash3 = computePlanHash(headerless);
console.log(hash3);
