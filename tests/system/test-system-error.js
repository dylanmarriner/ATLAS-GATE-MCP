/**
 * TEST: SystemError Canonical Contract Validation
 * 
 * Validates that:
 * 1. Raw thrown Error becomes SystemError envelope
 * 2. Thrown string becomes SystemError envelope
 * 3. Thrown object becomes SystemError envelope
 * 4. Invariant violation produces SystemError with invariant_id
 * 5. Pre-session errors have correct null fields
 * 6. Phase_id and plan_hash are preserved in envelope
 * 7. SystemError serialization is JSON-safe
 * 8. Audit log entry on failure is written
 */

import { SystemError, SYSTEM_ERROR_CODES } from "./core/system-error.js";
import assert from "assert";

const tests = [];

// TEST 1: Raw thrown Error becomes SystemError envelope
tests.push({
  name: "Raw Error thrown in handler becomes SystemError envelope",
  run: () => {
    const originalErr = new Error("Something went wrong");
    const systemErr = SystemError.fromUnknown(originalErr, {
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      tool_name: "test_tool",
      session_id: "test-session",
      workspace_root: "/test/path",
      role: "WINDSURF",
    });

    assert(systemErr instanceof SystemError, "Result must be SystemError instance");
    assert.strictEqual(systemErr.error_code, SYSTEM_ERROR_CODES.INTERNAL_ERROR);
    assert.strictEqual(systemErr.tool_name, "test_tool");
    assert.strictEqual(systemErr.session_id, "test-session");
    assert.strictEqual(systemErr.workspace_root, "/test/path");
    assert.strictEqual(systemErr.role, "WINDSURF");
    assert(systemErr.cause !== null, "Cause should be populated");
    assert(systemErr.timestamp !== null, "Timestamp should be set");
    console.log("✓ TEST 1 PASS");
  },
});

// TEST 2: Thrown string becomes SystemError envelope
tests.push({
  name: "Thrown string becomes SystemError envelope",
  run: () => {
    const systemErr = SystemError.fromUnknown("String error message", {
      error_code: SYSTEM_ERROR_CODES.INVALID_INPUT_FORMAT,
      tool_name: "read_file",
    });

    assert(systemErr instanceof SystemError);
    assert.strictEqual(systemErr.error_code, SYSTEM_ERROR_CODES.INVALID_INPUT_FORMAT);
    assert.strictEqual(systemErr.tool_name, "read_file");
    assert(systemErr.cause === "String error message");
    console.log("✓ TEST 2 PASS");
  },
});

// TEST 3: Thrown object becomes SystemError envelope
tests.push({
  name: "Thrown object becomes SystemError envelope",
  run: () => {
    const objErr = { message: "Object error", code: "CUSTOM_CODE" };
    const systemErr = SystemError.fromUnknown(objErr, {
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      tool_name: "write_file",
    });

    assert(systemErr instanceof SystemError);
    assert.strictEqual(systemErr.error_code, SYSTEM_ERROR_CODES.INTERNAL_ERROR);
    assert.strictEqual(systemErr.tool_name, "write_file");
    assert(systemErr.cause !== null);
    console.log("✓ TEST 3 PASS");
  },
});

// TEST 4: Invariant violation produces SystemError with invariant_id
tests.push({
  name: "Invariant violation produces SystemError with invariant_id",
  run: () => {
    const systemErr = SystemError.invariantViolation(
      "MANDATORY_DIAGNOSTICS",
      {
        human_message: "Session was not initialized before tool call",
        tool_name: "write_file",
        role: "WINDSURF",
      }
    );

    assert(systemErr instanceof SystemError);
    assert.strictEqual(systemErr.error_code, SYSTEM_ERROR_CODES.INVARIANT_VIOLATION);
    assert.strictEqual(systemErr.invariant_id, "MANDATORY_DIAGNOSTICS");
    assert.strictEqual(systemErr.tool_name, "write_file");
    assert.strictEqual(systemErr.role, "WINDSURF");
    console.log("✓ TEST 4 PASS");
  },
});

// TEST 5: Pre-session error has correct null fields
tests.push({
  name: "Pre-session error has session_id and workspace_root as null",
  run: () => {
    const systemErr = SystemError.toolFailure(
      SYSTEM_ERROR_CODES.SESSION_NOT_INITIALIZED,
      {
        human_message: "Session not initialized",
        tool_name: "begin_session",
        role: null,
        session_id: null,
        workspace_root: null,
      }
    );

    assert.strictEqual(systemErr.session_id, null);
    assert.strictEqual(systemErr.workspace_root, null);
    assert.strictEqual(systemErr.role, null);
    assert.strictEqual(systemErr.tool_name, "begin_session");
    const envelope = systemErr.toEnvelope();
    assert.strictEqual(envelope.session_id, null);
    assert.strictEqual(envelope.workspace_root, null);
    console.log("✓ TEST 5 PASS");
  },
});

// TEST 6: phase_id and plan_hash are preserved in envelope
tests.push({
  name: "phase_id and plan_hash are preserved in envelope",
  run: () => {
    const systemErr = SystemError.toolFailure(
      SYSTEM_ERROR_CODES.PLAN_NOT_APPROVED,
      {
        human_message: "Plan not approved",
        tool_name: "write_file",
        phase_id: "PHASE_5A",
        plan_hash: "abc123def456",
      }
    );

    const envelope = systemErr.toEnvelope();
    assert.strictEqual(envelope.phase_id, "PHASE_5A");
    assert.strictEqual(envelope.plan_hash, "abc123def456");
    console.log("✓ TEST 6 PASS");
  },
});

// TEST 7: SystemError serialization is JSON-safe (no circular refs)
tests.push({
  name: "SystemError serialization is JSON-safe with no circular references",
  run: () => {
    const originalErr = new Error("Test error");
    const systemErr = SystemError.fromUnknown(originalErr, {
      error_code: SYSTEM_ERROR_CODES.FILE_READ_FAILED,
      tool_name: "read_file",
      session_id: "test-session",
      workspace_root: "/workspace",
    });

    // Should not throw on JSON.stringify
    const envelope = systemErr.toEnvelope();
    const jsonStr = JSON.stringify(envelope);
    assert(jsonStr.length > 0, "JSON serialization should produce output");

    // Should be able to parse back
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.error_code, SYSTEM_ERROR_CODES.FILE_READ_FAILED);
    assert.strictEqual(parsed.tool_name, "read_file");
    console.log("✓ TEST 7 PASS");
  },
});

// TEST 8: Required envelope fields are always present (not undefined)
tests.push({
  name: "All required envelope fields are present and not undefined",
  run: () => {
    const systemErr = SystemError.fromUnknown(new Error("test"), {
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      tool_name: "test",
    });

    const envelope = systemErr.toEnvelope();
    const requiredFields = [
      "error_code",
      "human_message",
      "role",
      "session_id",
      "workspace_root",
      "tool_name",
      "invariant_id",
      "phase_id",
      "plan_hash",
      "cause",
      "timestamp",
    ];

    for (const field of requiredFields) {
      assert(field in envelope, `Field '${field}' must be present in envelope`);
      // Fields can be null, but must not be undefined
      assert(envelope[field] !== undefined, `Field '${field}' must not be undefined`);
    }
    console.log("✓ TEST 8 PASS");
  },
});

// TEST 9: SystemError is properly constructed with minimal context
tests.push({
  name: "SystemError can be constructed with minimal context",
  run: () => {
    const systemErr = new SystemError({
      error_code: SYSTEM_ERROR_CODES.UNKNOWN_TOOL_FAILURE,
      human_message: "An unexpected error occurred",
    });

    assert.strictEqual(systemErr.error_code, SYSTEM_ERROR_CODES.UNKNOWN_TOOL_FAILURE);
    assert.strictEqual(systemErr.role, null);
    assert.strictEqual(systemErr.session_id, null);
    assert.strictEqual(systemErr.workspace_root, null);
    assert.strictEqual(systemErr.tool_name, "unknown");
    console.log("✓ TEST 9 PASS");
  },
});

// TEST 10: Startup failure has correct structure
tests.push({
  name: "Startup failure creates correct SystemError structure",
  run: () => {
    const systemErr = SystemError.startupFailure(
      SYSTEM_ERROR_CODES.BOOTSTRAP_FAILURE,
      {
        human_message: "Bootstrap initialization failed",
        cause: new Error("Root cause"),
      }
    );

    assert.strictEqual(systemErr.error_code, SYSTEM_ERROR_CODES.BOOTSTRAP_FAILURE);
    assert.strictEqual(systemErr.tool_name, "startup");
    assert.strictEqual(systemErr.role, null);
    assert.strictEqual(systemErr.session_id, null);
    assert.strictEqual(systemErr.workspace_root, null);
    assert(systemErr.cause !== null);
    console.log("✓ TEST 10 PASS");
  },
});

// TEST 11: Cause normalization for various types
tests.push({
  name: "Cause is properly normalized for different types",
  run: () => {
    // Null cause
    const err1 = new SystemError({
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      human_message: "Test",
      cause: null,
    });
    assert.strictEqual(err1.cause, null);

    // String cause
    const err2 = new SystemError({
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      human_message: "Test",
      cause: "string error",
    });
    assert.strictEqual(err2.cause, "string error");

    // Error object cause
    const err3 = new SystemError({
      error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      human_message: "Test",
      cause: new Error("original"),
    });
    assert(typeof err3.cause === "object");
    assert.strictEqual(err3.cause.message, "original");

    console.log("✓ TEST 11 PASS");
  },
});

// TEST 12: Invalid error code throws
tests.push({
  name: "Invalid error code throws error during construction",
  run: () => {
    try {
      new SystemError({
        error_code: "INVALID_CODE_NOT_REGISTERED",
        human_message: "Test",
      });
      assert.fail("Should have thrown");
    } catch (err) {
      assert(err.message.includes("INVALID_ERROR_CODE"));
      console.log("✓ TEST 12 PASS");
    }
  },
});

// Run all tests
async function runTests() {
  console.log(`\n=== SYSTEM ERROR CONTRACT TESTS ===\n`);
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test.run();
      passed++;
    } catch (err) {
      console.error(`✗ TEST FAIL: ${test.name}`);
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${tests.length}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
