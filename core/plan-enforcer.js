import { loadPlan } from "./plan-registry.js";

function pathMatchesScope(filePath, scopePattern) {
  if (scopePattern.endsWith("/**")) {
    const base = scopePattern.replace("/**", "");
    return filePath.startsWith(base);
  }

  return filePath === scopePattern;
}

export function enforcePlan(planId, filePath) {
  const plan = loadPlan(planId);

  for (const scope of plan.scope) {
    if (pathMatchesScope(filePath, scope)) {
      return;
    }
  }

  throw new Error(
    `PLAN_SCOPE_VIOLATION: ${filePath} not permitted by plan ${planId}`
  );
}
