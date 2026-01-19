import fs from "fs";
import path from "path";
import { lintPlan } from "../core/plan-linter.js";
import { getPlansDir } from "../core/path-resolver.js";

/**
 * Lint Plan Tool Handler
 * 
 * Read-only tool that validates a plan without approval or mutation.
 * Allows ANTIGRAVITY to validate plans before submission.
 */
export async function lintPlanHandler({ path: filePath, hash, content }) {
  let planContent;
  let planHash = hash;
  
  // Get plan content from one of three sources
  if (content) {
    // Direct content provided
    planContent = content;
  } else if (filePath) {
    // Load from file path (relative to plans directory)
    const fullPath = path.join(getPlansDir(), filePath);
    planContent = fs.readFileSync(fullPath, "utf8");
  } else if (hash) {
    // Load from hash-named file
    const fullPath = path.join(getPlansDir(), `${hash}.md`);
    planContent = fs.readFileSync(fullPath, "utf8");
  } else {
    throw new Error("INVALID_INPUT: Must provide path, hash, or content");
  }

  // Run linting
  const lintResult = lintPlan(planContent, planHash);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          passed: lintResult.passed,
          hash: lintResult.hash,
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
