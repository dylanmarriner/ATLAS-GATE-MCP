import fs from "fs";
import path from "path";

const PLANS_DIR = path.resolve("docs/plans");

export function loadPlan(planId) {
  const planPath = path.join(PLANS_DIR, `${planId}.md`);

  if (!fs.existsSync(planPath)) {
    throw new Error(`PLAN_NOT_FOUND: ${planId}`);
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
