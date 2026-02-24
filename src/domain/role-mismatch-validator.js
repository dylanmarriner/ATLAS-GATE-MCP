import { ROLE_HEURISTICS } from "./role-heuristics.js";

export function validateRoleMismatch(role, content) {
  const rules = ROLE_HEURISTICS[role];
  if (!rules) return;

  const violations = [];

  for (const imp of rules.forbiddenImports || []) {
    if (content.includes(`from "${imp}"`) || content.includes(`require("${imp}")`)) {
      violations.push(`forbidden import: ${imp}`);
    }
  }

  for (const keyword of rules.forbiddenKeywords || []) {
    if (content.includes(keyword)) {
      violations.push(`forbidden pattern: ${keyword}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `ROLE_MISMATCH: ${role} violates constraints:\n- ${violations.join("\n- ")}`
    );
  }
}
