import { lintPlan, computePlanHash } from "./core/plan-linter.js";
import fs from "fs";

const planPath = "/media/linnyux/development3/developing/KAIZA-MCP-server/docs/examples/EXAMPLE_VALID_PLAN.md";
let planContent = fs.readFileSync(planPath, "utf8");

// Compute hash first
const hash = computePlanHash(planContent);
console.log(`\nComputed plan hash: ${hash}`);

// Update PENDING_HASH with actual hash
planContent = planContent.replace("KAIZA_PLAN_HASH: PENDING_HASH", `KAIZA_PLAN_HASH: ${hash}`);

// Lint the plan
const result = lintPlan(planContent, hash);

console.log(`Lint Result: ${result.passed ? "✓ PASS" : "✗ FAIL"}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}`);

if (result.errors.length > 0) {
  console.log("\nErrors:");
  result.errors.forEach(e => {
    console.log(`  ✗ ${e.code}: ${e.message} [${e.invariant}]`);
  });
  process.exit(1);
} else {
  console.log("\n✓ Example plan passes all linting requirements!");
}

if (result.warnings.length > 0) {
  console.log("\nWarnings (non-blocking):");
  result.warnings.forEach(w => {
    console.log(`  ⚠ ${w.code}: ${w.message}`);
  });
}
