import fs from "fs";
import path from "path";
import { lintPlan } from "../../application/plan-linter.js";
import { getPlansDir } from "../../infrastructure/path-resolver.js";

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
     // Load from file path - extract just filename and normalize
     let fileName = filePath;
     
     // Remove any existing path components
     if (filePath.includes('/')) {
       fileName = filePath.split('/').pop();
     }
     
     // Remove .md if present
     if (fileName.endsWith('.md')) {
       fileName = fileName.slice(0, -3);
     }
     
     // Add .md back and construct path
     const fullPath = path.join(getPlansDir(), `${fileName}.md`);
     planContent = fs.readFileSync(fullPath, "utf8");
   } else if (signature) {
     // Load from signature-named file
     const fullPath = path.join(getPlansDir(), `${signature}.md`);
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
