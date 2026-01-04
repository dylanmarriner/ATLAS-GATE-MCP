/**
 * OBJECTIVE 3 — ENTERPRISE CODE ENFORCEMENT
 * 
 * This detector blocks generation of code containing any of the following:
 * - TODO, FIXME comments
 * - stub, mock, fake, placeholder implementations
 * - temporary, simplified, or hardcoded test data
 * - dummy or no-op return values (unless explicitly allowed by plan)
 * 
 * This enforcement is MANDATORY and applies to ALL write operations.
 */

const FORBIDDEN_TEXT_PATTERNS = [
  { pattern: "TODO", category: "comment" },
  { pattern: "FIXME", category: "comment" },
  { pattern: "stub", category: "implementation" },
  { pattern: "mock", category: "implementation" },
  { pattern: "fake", category: "implementation" },
  { pattern: "placeholder", category: "implementation" },
  { pattern: "temporary", category: "implementation" },
  { pattern: "simplified", category: "implementation" },
  { pattern: "not implemented", category: "implementation" },
  { pattern: "NotImplemented", category: "implementation" },
  { pattern: "hardcoded", category: "data" },
  { pattern: "test data", category: "data" },
  { pattern: "dummy", category: "implementation" },
];

/**
 * Regex patterns for detecting no-op and placeholder return values
 * These indicate incomplete or stubbed implementations.
 */
const FORBIDDEN_PATTERNS_REGEX = [
  { regex: /^\s*return\s+null\s*;/m, description: "null return (no-op)" },
  { regex: /^\s*return\s+undefined\s*;/m, description: "undefined return (no-op)" },
  { regex: /^\s*return\s+\{\s*\}\s*;/m, description: "empty object return (no-op)" },
  { regex: /^\s*return\s+\[\s*\]\s*;/m, description: "empty array return (no-op)" },
  { regex: /^\s*return\s+false\s*;/m, description: "false return (likely hardcoded)" },
  { regex: /^\s*return\s+true\s*;/m, description: "true return (likely hardcoded)" },
  { regex: /^\s*return\s+["']{2}\s*;/m, description: "empty string return (no-op)" },
  { regex: /^\s*return\s+0\s*;/m, description: "zero return (hardcoded dummy)" },
  { regex: /throw\s+new\s+Error\(\s*["']not\s+implemented["']\s*\)/im, description: "not implemented error" },
  { regex: /async\s+function\s+\w+\s*\([^)]*\)\s*\{\s*\}/m, description: "empty async function" },
  { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/m, description: "empty function" },
];

/**
 * Detects forbidden patterns in code and throws with explicit blocking report.
 * 
 * @param {string} content - Code content to validate
 * @throws {Error} ENTERPRISE_CODE_VIOLATION if any forbidden patterns detected
 */
export function detectStubs(content) {
  const violations = [];

  // TEXT PATTERN DETECTION
  for (const { pattern, category } of FORBIDDEN_TEXT_PATTERNS) {
    // Case-insensitive search for comment markers to be more comprehensive
    const regex = new RegExp(`\\b${pattern}\\b`, "gi");
    if (regex.test(content)) {
      violations.push({
        type: "text_pattern",
        pattern,
        category,
        severity: "HARD_BLOCK",
      });
    }
  }

  // REGEX PATTERN DETECTION (no-op returns, empty implementations)
  for (const { regex, description } of FORBIDDEN_PATTERNS_REGEX) {
    if (regex.test(content)) {
      violations.push({
        type: "stub_implementation",
        description,
        severity: "HARD_BLOCK",
      });
    }
  }

  // BUILD EXPLICIT BLOCKING REPORT
  if (violations.length > 0) {
    const reportLines = [
      "ENTERPRISE_CODE_VIOLATION: Code generation blocked",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `Violations detected: ${violations.length}`,
      "",
    ];

    violations.forEach((violation, idx) => {
      reportLines.push(`[${idx + 1}] ${violation.severity}`);
      if (violation.type === "text_pattern") {
        reportLines.push(`    Pattern: "${violation.pattern}" (${violation.category})`);
      } else {
        reportLines.push(`    Stub: ${violation.description}`);
      }
    });

    reportLines.push("");
    reportLines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    reportLines.push("This write operation is BLOCKED.");
    reportLines.push("Code must be production-grade and enterprise-ready.");
    reportLines.push("All TODOs, stubs, mocks, placeholders, and hardcoded values must be removed.");

    throw new Error(reportLines.join("\n"));
  }
}
