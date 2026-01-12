import fs from "fs";
import path from "path";
import { getPlansDir, resolvePlanPath } from "./path-resolver.js";

export function loadPlan(planId) {
  // CANONICAL PATH RESOLUTION: Use path resolver for deterministic plan discovery
  // All plans are stored in the canonical plans directory
  let planPath;
  try {
    planPath = resolvePlanPath(planId);
  } catch (err) {
    throw new Error(`PLAN_NOT_FOUND: ${planId} - ${err.message}`);
  }

  const content = fs.readFileSync(planPath, "utf8");
  return parsePlan(content, planId);
}

function parsePlan(content, planId) {
  const lines = content.split("\n");

  let status = null;
  let scope = [];
  let inScope = false;

  for (const line of lines) {
    if (line.startsWith("STATUS:")) {
      status = line.replace("STATUS:", "").trim();
    }

    if (line.startsWith("SCOPE:")) {
      inScope = true;
      continue;
    }

    if (inScope) {
      if (line.trim().startsWith("- ")) {
        scope.push(line.trim().replace("- ", ""));
      } else if (line.trim() === "") {
        continue;
      } else {
        inScope = false;
      }
    }
  }

  if (status !== "APPROVED") {
    throw new Error(`PLAN_NOT_APPROVED: ${planId}`);
  }

  if (scope.length === 0) {
    throw new Error(`PLAN_INVALID: ${planId} has empty SCOPE`);
  }

  return { id: planId, status, scope };
}
