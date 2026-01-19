#!/usr/bin/env node

/**
 * Test Suite: Write-Time Policy Engine
 * 
 * Tests enforcing fail-closed policy validation before filesystem writes.
 * Each test verifies that policy violations are caught and writes are refused.
 */

import assert from "assert";
import {
  detectLanguage,
  executeWriteTimePolicy,
} from "./core/write-time-policy-engine.js";
import { SystemError, SYSTEM_ERROR_CODES } from "./core/system-error.js";
import crypto from "crypto";
import path from "path";
import os from "os";
import fs from "fs";

// ============================================================================
// TEST UTILITIES
// ============================================================================

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function createTempWorkspace() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kaiza-policy-test-"));
  // Create .kaiza directory for audit logging
  fs.mkdirSync(path.join(tmpDir, ".kaiza"), { recursive: true });
  return tmpDir;
}

function cleanupWorkspace(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createBasePolicyInput(overrides = {}) {
  const defaults = {
    workspace_root: "/tmp/workspace",
    role: "WINDSURF",
    session_id: "test-session",
    tool_name: "write_file",
    plan_hash: sha256("test-plan"),
    phase_id: null,
    operation: "CREATE",
    path: "src/test.js",
    content_bytes: "// valid code",
    detected_language: "javascript",
    content_hash: sha256("// valid code"),
    content_length: 14,
  };
  return { ...defaults, ...overrides };
}

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================================
// LANGUAGE DETECTION TESTS
// ============================================================================

await test("Language detection: Rust file", () => {
  assert.strictEqual(detectLanguage("src/main.rs"), "rust");
  assert.strictEqual(detectLanguage("src/lib.rs"), "rust");
  assert.strictEqual(detectLanguage("tests/integration_test.rs"), "rust");
});

await test("Language detection: TypeScript file", () => {
  assert.strictEqual(detectLanguage("src/app.ts"), "typescript");
  assert.strictEqual(detectLanguage("src/component.tsx"), "typescript");
});

await test("Language detection: JavaScript file", () => {
  assert.strictEqual(detectLanguage("src/index.js"), "javascript");
  assert.strictEqual(detectLanguage("src/utils.mjs"), "javascript");
  assert.strictEqual(detectLanguage("src/shim.cjs"), "javascript");
});

await test("Language detection: Python file", () => {
  assert.strictEqual(detectLanguage("src/main.py"), "python");
  assert.strictEqual(detectLanguage("src/types.pyi"), "python");
});

await test("Language detection: Markdown file", () => {
  assert.strictEqual(detectLanguage("README.md"), "markdown");
  assert.strictEqual(detectLanguage("docs/guide.markdown"), "markdown");
});

await test("Language detection: Unknown file", () => {
  assert.strictEqual(detectLanguage("src/unknown.xyz"), "unknown");
  assert.strictEqual(detectLanguage("src/noextension"), "unknown");
});

// ============================================================================
// UNIVERSAL DENYLIST TESTS
// ============================================================================

await test("Policy rejects TODO in code", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      content_bytes: "function test() {\n  // TODO: implement\n}",
      content_hash: sha256("function test() {\n  // TODO: implement\n}"),
      content_length: 42,
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on TODO");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

await test("Policy rejects FIXME in code", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      content_bytes: "// FIXME: broken logic here",
      content_hash: sha256("// FIXME: broken logic here"),
      content_length: 29,
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on FIXME");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

await test("Policy rejects empty catch block", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      content_bytes: "try { x(); } catch {}",
      content_hash: sha256("try { x(); } catch {}"),
      content_length: 21,
      detected_language: "javascript",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on empty catch");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

// ============================================================================
// RUST POLICY TESTS
// ============================================================================

await test("Policy rejects unwrap() in Rust", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/main.rs",
      content_bytes: "fn main() {\n  let x = some_result.unwrap();\n}",
      content_hash: sha256("fn main() {\n  let x = some_result.unwrap();\n}"),
      content_length: 44,
      detected_language: "rust",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on unwrap()");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.RUST_POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

await test("Policy rejects panic! in Rust", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/lib.rs",
      content_bytes: "fn test() {\n  panic!(\"error\");\n}",
      content_hash: sha256("fn test() {\n  panic!(\"error\");\n}"),
      content_length: 34,
      detected_language: "rust",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on panic!");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.RUST_POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

await test("Policy rejects unsafe {} in Rust", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/lib.rs",
      content_bytes: "fn test() {\n  unsafe { /*...*/ }\n}",
      content_hash: sha256("fn test() {\n  unsafe { /*...*/ }\n}"),
      content_length: 35,
      detected_language: "rust",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on unsafe");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.RUST_POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

// ============================================================================
// TYPESCRIPT/JAVASCRIPT POLICY TESTS
// ============================================================================

await test("Policy rejects any type in TypeScript", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/app.ts",
      content_bytes: "let x: any = {}; // Bad typing",
      content_hash: sha256("let x: any = {}; // Bad typing"),
      content_length: 31,
      detected_language: "typescript",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on any type");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

await test("Policy rejects @ts-ignore in TypeScript", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/app.ts",
      content_bytes: "// @ts-ignore\nconst x = dangerous();",
      content_hash: sha256("// @ts-ignore\nconst x = dangerous();"),
      content_length: 37,
      detected_language: "typescript",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on @ts-ignore");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

// ============================================================================
// PYTHON POLICY TESTS
// ============================================================================

await test("Policy rejects random.random() in Python", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/main.py",
      content_bytes: "import random\nx = random.random()",
      content_hash: sha256("import random\nx = random.random()"),
      content_length: 35,
      detected_language: "python",
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown on random import");
    } catch (err) {
      assert(err instanceof SystemError);
      assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.POLICY_VIOLATION);
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

// ============================================================================
// VALID CONTENT TESTS
// ============================================================================

await test("Policy passes clean JavaScript code", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const content = "function add(a, b) {\n  return a + b;\n}";
    const filePath = path.join(tmpDir, "src", "math.js");
    const intentPath = `${filePath}.intent.md`;
    
    // Create intent artifact
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(intentPath, "# Intent: Add math utility");
    
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/math.js",
      content_bytes: content,
      content_hash: sha256(content),
      content_length: content.length,
      detected_language: "javascript",
    });

    const result = await executeWriteTimePolicy(input);
    assert.strictEqual(result.verdict, "PASS");
    assert.strictEqual(result.language, "javascript");
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

await test("Policy passes clean Rust code", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const content = "fn main() {\n  println!(\"Hello\");\n}";
    const filePath = path.join(tmpDir, "src", "main.rs");
    const intentPath = `${filePath}.intent.md`;
    
    // Create intent artifact
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(intentPath, "# Intent: Rust main entry point");
    
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      path: "src/main.rs",
      content_bytes: content,
      content_hash: sha256(content),
      content_length: content.length,
      detected_language: "rust",
    });

    const result = await executeWriteTimePolicy(input);
    assert.strictEqual(result.verdict, "PASS");
    assert.strictEqual(result.language, "rust");
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

// ============================================================================
// MISSING REQUIRED INPUT TESTS
// ============================================================================

await test("Policy refuses on missing workspace_root", async () => {
  try {
    const input = createBasePolicyInput();
    delete input.workspace_root;
    await executeWriteTimePolicy(input);
    assert.fail("Should have thrown on missing workspace_root");
  } catch (err) {
    assert(err instanceof SystemError);
    assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD);
  }
});

await test("Policy refuses on missing content_bytes", async () => {
  try {
    const input = createBasePolicyInput();
    delete input.content_bytes;
    await executeWriteTimePolicy(input);
    assert.fail("Should have thrown on missing content_bytes");
  } catch (err) {
    assert(err instanceof SystemError);
    assert.strictEqual(err.error_code, SYSTEM_ERROR_CODES.MISSING_REQUIRED_FIELD);
  }
});

// ============================================================================
// AUDIT LOGGING ON FAILURE TEST
// ============================================================================

await test("Policy creates audit entry on violation", async () => {
  const tmpDir = createTempWorkspace();
  try {
    const input = createBasePolicyInput({
      workspace_root: tmpDir,
      content_bytes: "// TODO: fix this",
      content_hash: sha256("// TODO: fix this"),
      content_length: 17,
    });

    try {
      await executeWriteTimePolicy(input);
      assert.fail("Should have thrown");
    } catch (err) {
      assert(err instanceof SystemError);

      // Check that audit log was created
      const auditPath = `${tmpDir}/.kaiza/audit.log`;
      assert(fs.existsSync(auditPath), "Audit log should exist");

      const entries = fs
        .readFileSync(auditPath, "utf8")
        .split("\n")
        .filter((l) => l.length > 0)
        .map((l) => JSON.parse(l));

      assert(entries.length > 0, "Audit log should have entries");
      const lastEntry = entries[entries.length - 1];
      assert.strictEqual(lastEntry.result, "error");
      assert(lastEntry.invariant_id.includes("NO_PLACEHOLDERS"));
    }
  } finally {
    cleanupWorkspace(tmpDir);
  }
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log(`\n${"=".repeat(70)}`);
console.log(`Write-Time Policy Engine Test Results`);
console.log(`${"=".repeat(70)}`);
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total:   ${testsPassed + testsFailed}`);
console.log(`${"=".repeat(70)}\n`);

if (testsFailed > 0) {
  process.exit(1);
}
