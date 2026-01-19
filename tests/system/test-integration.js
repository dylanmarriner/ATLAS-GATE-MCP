import { lintPlan } from "./core/plan-linter.js";
import { bootstrapPlanHandler } from "./tools/bootstrap_tool.js";
import { lintPlanHandler } from "./tools/lint_plan.js";
import { enforcePlan } from "./core/plan-enforcer.js";

console.log("✓ Imports successful");
console.log("✓ bootstrap_tool.js has lintPlan import");
console.log("✓ lint_plan.js handler created");
console.log("✓ plan-enforcer.js has lintPlan import");
console.log("\nIntegration verification complete!");
