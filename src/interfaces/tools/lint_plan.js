import fs from "fs";
import { lintPlan } from "../../application/plan-linter.js";
import { resolvePlanPath } from "../../infrastructure/path-resolver.js";

/**
 * Lint Plan Tool Handler
 * 
 * Read-only tool that validates a plan without approval or mutation.
 * Allows ANTIGRAVITY to validate plans before submission.
 * 
 * Signing is now done separately via signWithCosign from cosign-hash-provider.
 */
export async function lintPlanHandler({ path: filePath, signature, content }) {
   let planContent;
   
   // Get plan content from one of three sources
   if (content) {
     // Direct content provided
     planContent = content;
   } else if (filePath) {
     const fullPath = resolvePlanPath(filePath);
     planContent = fs.readFileSync(fullPath, "utf8");
   } else if (signature) {
     const fullPath = resolvePlanPath(signature);
     planContent = fs.readFileSync(fullPath, "utf8");
   } else {
     throw new Error("INVALID_INPUT: Must provide path, signature, or content");
   }

  // Run linting (validation only, no signing)
  const lintResult = await lintPlan(planContent, signature);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          passed: lintResult.passed,
          errors: lintResult.errors,
          warnings: lintResult.warnings,
          summary: {
            error_count: lintResult.errors.length,
            warning_count: lintResult.warnings.length,
            invariants_checked: [
              "PLAN_SCOPE_LAW",
              "MECHANICAL_LAW_ONLY",
              "PUBLIC_LAW_READABLE",
              "PLAN_IMMUTABILITY"
            ]
          }
        }, null, 2)
      }
    ]
  };
}
