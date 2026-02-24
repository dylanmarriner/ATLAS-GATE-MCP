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
  let status = null;
  let scope = [];

  // Try parsing ATLAS-GATE_PLAN_HASH format (HTML comment header)
  const headerMatch = content.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})\s+ROLE:\s*(\w+)\s+STATUS:\s*(\w+)\s*-->/);
  if (headerMatch) {
    status = headerMatch[3];
  }

  // Fall back to inline STATUS: format
  if (!status) {
    const statusMatch = content.match(/STATUS:\s*(\w+)/i);
    if (statusMatch) {
      status = statusMatch[1];
    }
  }

  // Parse SCOPE section if it exists
  const lines = content.split("\n");
  let inScope = false;

  for (const line of lines) {
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

  // SCOPE is optional for ATLAS-GATE_PLAN_HASH format plans
  if (scope.length === 0 && !headerMatch) {
    throw new Error(`PLAN_INVALID: ${planId} has empty SCOPE`);
  }

  return { id: planId, status, scope };
}
