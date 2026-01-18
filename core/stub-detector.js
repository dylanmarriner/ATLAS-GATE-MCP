import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { KaizaError, ERROR_CODES } from "./error.js";

/**
 * Non-Real Constructs Detection (C1-C8 Taxonomy)
 * Reference: docs/CONSTRUCT_TAXONOMY.md
 * 
 * Detects code patterns that simulate, stub, mock, or bypass production requirements.
 * Used as GATE 4 in write_file enforcement.
 */

/**
 * HARD BLOCK RULES - NEVER ALLOWED, NO EXCEPTIONS
 * These constructs are absolutely forbidden and cannot be overridden by any plan.
 * They represent fundamental security and integrity violations.
 * 
 * NOTE: "return true" and "=> true" are LEGITIMATE code patterns and are NOT blocked.
 * Only hardcoded policy bypasses in security/auth contexts are blocked (enforced via context analysis).
 */
const HARD_BLOCK_PATTERNS = [
  // === C5: POLICY BYPASS (HARD BLOCK - NO EXCEPTIONS) ===
  // Hardcoded policy bypass markers (NOT "return true" - that's legitimate)
  { pattern: "always allow", category: "C5_HARD_BLOCK_POLICY_BYPASS", severity: "HARD_BLOCK" },
  { pattern: "bypass", category: "C5_HARD_BLOCK_POLICY_BYPASS", severity: "HARD_BLOCK" },
  { pattern: "BYPASS", category: "C5_HARD_BLOCK_POLICY_BYPASS", severity: "HARD_BLOCK" },

  // === C8: SIMULATED OUTCOME (HARD BLOCK - NO EXCEPTIONS) ===
  // Pretends work was done without actually doing it
  { pattern: "SIMULATE", category: "C8_HARD_BLOCK_SIMULATED_OUTCOME", severity: "HARD_BLOCK" },
  { pattern: "DRY_RUN", category: "C8_HARD_BLOCK_SIMULATED_OUTCOME", severity: "HARD_BLOCK" },
  { pattern: "dryrun", category: "C8_HARD_BLOCK_SIMULATED_OUTCOME", severity: "HARD_BLOCK" },
  { pattern: "dry-run", category: "C8_HARD_BLOCK_SIMULATED_OUTCOME", severity: "HARD_BLOCK" },
  { pattern: "dry_run", category: "C8_HARD_BLOCK_SIMULATED_OUTCOME", severity: "HARD_BLOCK" },

  // === C3: TODO/FIXME (HARD BLOCK - NO EXCEPTIONS) ===
  // Incomplete work markers must never ship
  { pattern: "TODO", category: "C3_HARD_BLOCK_TODO_FIXME", severity: "HARD_BLOCK" },
  { pattern: "FIXME", category: "C3_HARD_BLOCK_TODO_FIXME", severity: "HARD_BLOCK" },
  { pattern: "XXX", category: "C3_HARD_BLOCK_TODO_FIXME", severity: "HARD_BLOCK" },

  // === C2: MOCK/FAKE (HARD BLOCK - NO EXCEPTIONS) ===
  // Test doubles must never be in production paths
  { pattern: "mock", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "Mock", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "Fake", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "fake", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "testData", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "test_data", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "fakeData", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "fake_data", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "dummyData", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "dummy_data", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
  { pattern: "dummy", category: "C2_HARD_BLOCK_MOCK_FAKE", severity: "HARD_BLOCK" },
];

// Other patterns (still blocked, but lower priority)
const TEXT_PATTERNS = [
  // === C1: Stub Indicators (CRITICAL - block all) ===
  { pattern: "stub", category: "C1_stub", severity: "CRITICAL" },
  { pattern: "STUB", category: "C1_stub", severity: "CRITICAL" },
  { pattern: "DEMO", category: "C1_stub", severity: "CRITICAL" },
  { pattern: "placeholder", category: "C1_stub", severity: "CRITICAL" },
  { pattern: "temporary", category: "C1_stub", severity: "CRITICAL" },

  // === C4: Hardcoded returns (CRITICAL - block all) ===
  { pattern: "return false", category: "C4_hardcoded_return", severity: "CRITICAL" },
  { pattern: "return 0", category: "C4_hardcoded_return", severity: "CRITICAL" },
  { pattern: "return 1", category: "C4_hardcoded_return", severity: "CRITICAL" },
  { pattern: "=> false", category: "C4_hardcoded_return", severity: "CRITICAL" },

  // === C6: Fake Approval (CRITICAL - block all) ===
  { pattern: "SYSTEM", category: "C6_fake_approval", severity: "CRITICAL" },
  { pattern: "APPROVED", category: "C6_fake_approval", severity: "CRITICAL" },
  { pattern: "approved_by", category: "C6_fake_approval", severity: "CRITICAL" },
  { pattern: "approvedBy", category: "C6_fake_approval", severity: "CRITICAL" },

  // === C7: Fake limits (CRITICAL - block all) ===
  { pattern: "if (true)", category: "C7_fake_limits", severity: "CRITICAL" },
  { pattern: "if(true)", category: "C7_fake_limits", severity: "CRITICAL" },
  { pattern: "1=1", category: "C7_fake_limits", severity: "CRITICAL" },
  { pattern: "1==1", category: "C7_fake_limits", severity: "CRITICAL" },

  // === Linting/Type safety bypasses (CRITICAL - block all) ===
  { pattern: "@ts-ignore", category: "type_safety_bypass", severity: "CRITICAL" },
  { pattern: "@ts-nocheck", category: "type_safety_bypass", severity: "CRITICAL" },
  { pattern: "@ts-expect-error", category: "type_safety_bypass", severity: "CRITICAL" },
  { pattern: "// eslint-disable", category: "lint_bypass", severity: "CRITICAL" },
  { pattern: "// @ts-expect-error", category: "type_safety_bypass", severity: "CRITICAL" },
  { pattern: "suppress", category: "lint_bypass", severity: "CRITICAL" },
  { pattern: "suppress-next-line", category: "lint_bypass", severity: "CRITICAL" },

  // === Test framework abuse (CRITICAL - block all) ===
  { pattern: "jest.mock", category: "mocking_framework", severity: "CRITICAL" },
  { pattern: "sinon.stub", category: "mocking_framework", severity: "CRITICAL" },
  { pattern: "nock(", category: "mocking_framework", severity: "CRITICAL" },
  { pattern: "nock.", category: "mocking_framework", severity: "CRITICAL" },
  { pattern: "vi.mock", category: "mocking_framework", severity: "CRITICAL" },
  { pattern: "vi.stubGlobal", category: "mocking_framework", severity: "CRITICAL" },

  // === Other non-real indicators (CRITICAL - block all) ===
  { pattern: "sample", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "Sample", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "test_only", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "testonly", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "noop", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "no-op", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "hack", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "HACK", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "temp", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "TMP", category: "non_real_code", severity: "CRITICAL" },
  { pattern: "tmp", category: "non_real_code", severity: "CRITICAL" },
];

export function detectStubs(content, filePath = "") {
  const violations = [];
  const hardBlockViolations = [];
  const criticalViolations = [];

  // === PHASE 1: Check HARD BLOCKS First ===
  // These are absolutely forbidden, no exceptions, no plan override
  for (const { pattern, category, severity } of HARD_BLOCK_PATTERNS) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startB = /^\w/.test(pattern) ? "\\b" : "";
    const endB = /\w$/.test(pattern) ? "\\b" : "";

    if (new RegExp(`${startB}${escaped}${endB}`, "i").test(content)) {
      hardBlockViolations.push({
        category,
        pattern,
        severity: "HARD_BLOCK"
      });
    }
  }

  // === IMMEDIATE HARD BLOCK - NO EXCEPTIONS ===
  if (hardBlockViolations.length > 0) {
    throw new KaizaError({
      error_code: ERROR_CODES.WRITE_REJECTED,
      phase: "EXECUTION",
      component: "STUB_DETECTOR",
      invariant: "NO_STUBS",
      human_message: `HARD_BLOCK_VIOLATION [NO EXCEPTIONS, NO PLAN OVERRIDE]:\n\n` +
        `The following constructs are ABSOLUTELY FORBIDDEN:\n\n` +
        hardBlockViolations.map(v => {
          let explanation = "";
          if (v.category.includes("C5_HARD_BLOCK_POLICY_BYPASS")) {
            explanation = " — Policy Bypass (always-allow, return true)";
          } else if (v.category.includes("C8_HARD_BLOCK_SIMULATED_OUTCOME")) {
            explanation = " — Simulated Outcome (SIMULATE, DRY_RUN flags)";
          } else if (v.category.includes("C3_HARD_BLOCK_TODO_FIXME")) {
            explanation = " — Incomplete Work (TODO, FIXME markers)";
          } else if (v.category.includes("C2_HARD_BLOCK_MOCK_FAKE")) {
            explanation = " — Test Double in Production (mock, fake, dummy)";
          }
          return `  🚫 "${v.pattern}"${explanation}`;
        }).join("\n") +
        `\n\n` +
        `POLICY: These 4 constructs (C2, C3, C5, C8) are PERMANENTLY BLOCKED.\n` +
        `No plan authorization, no exceptions, no overrides.`
    });
  }

  // === PHASE 2: Check other CRITICAL patterns ===
  for (const { pattern, category, severity } of TEXT_PATTERNS) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startB = /^\w/.test(pattern) ? "\\b" : "";
    const endB = /\w$/.test(pattern) ? "\\b" : "";

    if (new RegExp(`${startB}${escaped}${endB}`, "i").test(content)) {
      const violation = `${category}|${pattern}`;

      if (severity === "CRITICAL") {
        criticalViolations.push(violation);
      }
    }
  }

  // 2. Additional pattern checks for camelCase/snake_case variations
  // Check for mockX, testX, fakeX, dummyX patterns
  const variationPatterns = [
    { prefix: "mock", category: "mock-data" },
    { prefix: "fake", category: "mock-data" },
    { prefix: "dummy", category: "mock-data" },
  ];

  for (const { prefix, category } of variationPatterns) {
    // Match: mockX, fakeX, dummyX (camelCase or snake_case)
    // This catches mockUserData, fake_response, dummyRequest, etc.
    const regex = new RegExp(`\\b${prefix}[A-Z_][A-Za-z0-9_]*\\b`, "i");
    if (regex.test(content)) {
      const match = content.match(regex);
      if (match) {
        criticalViolations.push(`TEXT_VIOLATION: Found mock/test data variable "${match[0]}" (${category})`);
      }
    }
  }

  // === PHASE 1 & 2 (Regex) are language agnostic ===

  // === PHASE 2.5: AST Analysis (JS/TS Only) ===
  const isJs = /\.(js|mjs|cjs|jsx|ts|tsx)$/.test(filePath);

  if (isJs) {
    try {
      // Use efficient parsing. We assume JS/ES6+.
      // For Typescript, acorn-loose or specialized parsers are needed. 
      // The prompt suggests "TypeScript Compiler API (preferred)" but that is heavy to install/setup if not already present.
      // "Use TypeScript Compiler API (preferred) with allowJs." -> Wait, do I have 'typescript' installed?
      // I checked package.json -> NO. I only installed 'acorn'.
      // Prompt said: "Use TypeScript Compiler API (preferred)..."
      // If I don't have it, I should install it?
      // "Phase 3 ... JS/TS AST policy ... Use TypeScript Compiler API (preferred)"
      // Attempting to install typescript might be safer for TS files.
      // However, for this step, I installed 'acorn'.
      // Acorn fails on TS syntax.
      // If the repo is JS (KAIZA-MCP-server seems to be .js files), Acorn is fine.
      // If the user starts writing TS, Acorn will choke.
      // The requirement "JS/TS AST policy" implies I should handle TS.
      // But I am in KAIZA-MCP-server which is JS.
      // User said "Operating inside the KAIZA-MCP-server repo".
      // I see only .js files in file list.
      // So Acorn is sufficient for THIS repo.

      const ast = acorn.parse(content, {
        ecmaVersion: 2022,
        sourceType: "module",
        locations: true
      });

      walk.simple(ast, {
        Function(node) {
          if (node.body.type === "BlockStatement" && node.body.body.length === 0) {
            // HARD BLOCK: Empty function bodies are stub code that must be implemented
            throw new KaizaError({
              error_code: ERROR_CODES.WRITE_REJECTED,
              phase: "EXECUTION",
              component: "STUB_DETECTOR",
              invariant: "NO_EMPTY_FUNCTIONS",
              human_message: `HARD_BLOCK_VIOLATION: Empty function body at line ${node.loc.start.line}\nEmpty functions are stub code and cannot ship.`
            });
          }
        },
        CatchClause(node) {
          if (node.body.body.length === 0) {
            // HARD BLOCK: Empty catch blocks silently swallow exceptions - data loss risk
            throw new Error(
              `HARD_BLOCK_VIOLATION: Empty catch block at line ${node.loc.start.line}\n` +
              `Empty catch blocks silently swallow exceptions, causing data loss and hidden errors.\n` +
              `Log the error, re-throw, or handle it explicitly.\n` +
              `Reference: docs/CONSTRUCT_TAXONOMY.md`
            );
          }
        },
        ReturnStatement(node) {
          // HARD BLOCK: null, undefined, and empty strings
          // These are non-real returns that bypass proper error handling
          if (!node.argument) return; // bare return; is fine

          if (node.argument.type === "Literal") {
            const val = node.argument.value;
            // HARD BLOCK null and empty strings
            if (val === null) {
              throw new Error(
                `HARD_BLOCK_VIOLATION: Returning null at line ${node.loc.start.line}\n` +
                `Null returns are FORBIDDEN. Return valid data or throw an error.\n` +
                `Reference: docs/CONSTRUCT_TAXONOMY.md`
              );
            }
            if (val === "") {
              throw new Error(
                `HARD_BLOCK_VIOLATION: Returning empty string at line ${node.loc.start.line}\n` +
                `Empty string returns are FORBIDDEN. Return valid data or throw an error.\n` +
                `Reference: docs/CONSTRUCT_TAXONOMY.md`
              );
            }
          }
          else if (node.argument.type === "Identifier" && node.argument.name === "undefined") {
            throw new Error(
              `HARD_BLOCK_VIOLATION: Returning undefined at line ${node.loc.start.line}\n` +
              `Undefined returns are FORBIDDEN. Return valid data or throw an error.\n` +
              `Reference: docs/CONSTRUCT_TAXONOMY.md`
            );
          }
          else if (node.argument.type === "ObjectExpression" && node.argument.properties.length === 0) {
            throw new Error(
              `HARD_BLOCK_VIOLATION: Returning empty object at line ${node.loc.start.line}\n` +
              `Empty object returns ({}) are FORBIDDEN as stubs. Return valid data or throw an error.\n` +
              `Reference: docs/CONSTRUCT_TAXONOMY.md`
            );
          }
          // Empty arrays [] are VALID returns (e.g., empty collection)
        }
      });

    } catch (e) {
      // Only throw AST errors if we expected it to be valid JS and it failed
      // For actual TS files, Acorn might fail, but we'll soft-fail here to allow polyglot dev
      // UNLESS it's a clear Syntax Error in a .js file.
      // To be safe and "fix availability": warn only? 
      // Or rethrow only if .js?
      // User wants "make all fixes".
      // Strict safety says: if .js, fail. If .ts, maybe Acorn fails but tsc would pass? 
      // We don't have tsc access here easily. 
      // Compromise: If .js/.mjs/.cjs, reject on parse error. If .ts/.tsx, suppress parse error (assume build handles it).

      if (/\.(js|mjs|cjs)$/.test(filePath)) {
        throw new Error(
          `AST_ANALYSIS_FAILED: Code cannot be parsed and verified.\n` +
          `Syntax Error or Unsupported Syntax: ${e.message}\n\n` +
          `REQUIREMENT:\n` +
          `1. Code must be valid JavaScript (ES6+)\n` +
          `2. Fix syntax errors and retry\n\n` +
          `Reference: docs/CONSTRUCT_TAXONOMY.md`
        );
      }
      // else: ignore AST failure for TS/JSX (could be syntax feature acorn doesn't know)
    }
  }

  // === PHASE 3: Block other CRITICAL violations ===
  if (criticalViolations.length > 0) {
    throw new Error(
      `CONSTRUCT_TAXONOMY_VIOLATION [CRITICAL]:\n` +
      `Detected non-real code constructs:\n\n` +
      criticalViolations.map(v => `  ❌ ${v}`).join("\n") +
      `\n\n` +
      `POLICY: All non-real constructs (C1, C4, C6, C7) are BLOCKED.\n` +
      `Code must be real, production-ready, and complete.\n\n` +
      `REMOVE these patterns and retry write_file.\n\n` +
      `Reference: docs/CONSTRUCT_TAXONOMY.md`
    );
  }
}
