import { lintPlan, computePlanHash } from "./core/plan-linter.js";
import fs from "fs";

const planPath = "/media/linnyux/development3/developing/KAIZA-MCP-server/docs/plans/6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d.md";
const planContent = fs.readFileSync(planPath, "utf8");

console.log("Testing linter against existing plan...\n");

const result = lintPlan(planContent, "6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d");

console.log(`Plan Hash: ${result.hash}`);
console.log(`Lint Result: ${result.passed ? "PASS" : "FAIL"}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}`);

if (result.errors.length > 0) {
  console.log("\nErrors:");
  result.errors.forEach(e => {
    console.log(`  - ${e.code}: ${e.message}`);
  });
}

if (result.warnings.length > 0) {
  console.log("\nWarnings:");
  result.warnings.forEach(w => {
    console.log(`  - ${w.code}: ${w.message}`);
  });
}

// The existing plan is minimal, so it will fail
// This is expected and shows the linter is working
