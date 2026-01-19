# MCP Canonical Error Contract Specification

**Version**: 1.0.0  
**Status**: ENFORCED  
**Authority**: KAIZA MCP Governance  
**Date**: 2026-01-19

## Executive Summary

This document defines the canonical error envelope that MUST be emitted by the KAIZA MCP server whenever a tool call fails. Every error that reaches the MCP protocol transport layer is guaranteed to be a `SystemError` instance with a deterministic, JSON-safe envelope structure.

This contract eliminates silent failures, non-deterministic error reporting, and raw Error objects reaching clients.

## 1. Canonical Error Envelope

Every tool failure produces a `SystemError` envelope with these NON-NEGOTIABLE fields:

### Required Fields (Always Present, Never Undefined)

```typescript
{
  error_code: string;              // Stable uppercase error code (see codes section)
  human_message: string;            // Plain English message for non-coders
  role: string | null;              // "ANTIGRAVITY" | "WINDSURF" | null
  session_id: string | null;        // Session UUID or null if pre-session
  workspace_root: string | null;    // Absolute path or null if pre-session
  tool_name: string;                // Name of the tool being executed
  invariant_id: string | null;      // Invariant ID if violation, null otherwise
  phase_id: string | null;          // Phase ID from caller or null
  plan_hash: string | null;         // SHA256 plan hash or null
  cause: string | object | null;    // Original error (normalized for JSON)
  timestamp: string;                // ISO 8601 timestamp (server-generated)
  stack_trace?: string;             // Optional: only if DEBUG_STACK=true
}
```

### Field Semantics

| Field | Meaning | Example | Null Allowed? |
|-------|---------|---------|---------------|
| `error_code` | Stable, unique error identifier | `INVALID_INPUT_TYPE` | No |
| `human_message` | Non-technical error description | `"path must be a string"` | No |
| `role` | Role of the current session | `"WINDSURF"` | Yes (pre-session) |
| `session_id` | UUID of active session | `"550e8400-e29b..."` | Yes (pre-session) |
| `workspace_root` | Canonical workspace directory | `"/home/user/project"` | Yes (pre-session) |
| `tool_name` | Tool being executed | `"write_file"` | No |
| `invariant_id` | Which invariant was violated (if applicable) | `"MANDATORY_DIAGNOSTICS"` | Yes (non-invariant errors) |
| `phase_id` | Execution phase from caller | `"PHASE_5A"` | Yes (if not provided) |
| `plan_hash` | SHA256 of approved plan | `"abc123def456..."` | Yes (if not applicable) |
| `cause` | Original thrown value | `{ message: "...", code: "..." }` | Yes (if none available) |
| `timestamp` | ISO 8601 server timestamp | `"2026-01-19T15:32:10.123Z"` | No |
| `stack_trace` | Full error stack (debug only) | Multi-line string | Yes (optional) |

## 2. Registered Error Codes

All error codes are uppercase snake_case. New codes MUST be registered in `core/system-error.js` under `SYSTEM_ERROR_CODES`.

### Session Errors
- `SESSION_NOT_INITIALIZED` - No session created via begin_session
- `SESSION_LOCKED` - Session locked due to prior failure
- `SESSION_INITIALIZATION_FAILED` - Failed to initialize session

### Input Validation Errors
- `INVALID_INPUT_TYPE` - Wrong data type (e.g., string instead of object)
- `INVALID_INPUT_FORMAT` - Malformed input (e.g., invalid JSON)
- `INVALID_INPUT_VALUE` - Invalid value (e.g., empty string where required)
- `MISSING_REQUIRED_FIELD` - Required field is absent

### Authorization Errors
- `UNAUTHORIZED_ACTION` - Action not allowed for current role
- `INSUFFICIENT_PERMISSIONS` - Caller lacks required permissions
- `ROLE_MISMATCH` - Role conflicts with expected role

### Path Errors
- `INVALID_PATH` - Path is malformed or invalid
- `PATH_NOT_FOUND` - Path does not exist
- `PATH_TRAVERSAL_BLOCKED` - Path traversal (..) attempt blocked
- `OUTSIDE_WORKSPACE` - Path is outside workspace root

### File Operation Errors
- `FILE_NOT_FOUND` - File does not exist
- `FILE_ALREADY_EXISTS` - File already exists (when not allowed)
- `FILE_READ_FAILED` - Failed to read file
- `FILE_WRITE_FAILED` - Failed to write file

### Patch Errors
- `PATCH_INVALID` - Patch is malformed
- `PATCH_APPLY_FAILED` - Patch could not be applied
- `HASH_MISMATCH` - File hash mismatch (concurrent modification)

### Plan Errors
- `PLAN_NOT_FOUND` - Plan file not found
- `PLAN_NOT_APPROVED` - Plan is not marked APPROVED
- `PLAN_ENFORCEMENT_FAILED` - Plan validation failed
- `PLAN_SCOPE_VIOLATION` - Operation outside plan scope

### Policy Enforcement Errors
- `POLICY_VIOLATION` - Code violates policy
- `RUST_POLICY_VIOLATION` - Rust-specific policy violation
- `PREFLIGHT_FAILED` - Preflight checks (tests/lint) failed

### Governance Errors
- `INVARIANT_VIOLATION` - System invariant was violated
- `BOOTSTRAP_FAILURE` - Bootstrap initialization failed
- `SELF_AUDIT_FAILURE` - Server self-audit failed at startup

### Audit/Logging Errors
- `AUDIT_LOG_FAILED` - Failed to write to audit log
- `AUDIT_LOCK_FAILED` - Failed to acquire audit log lock

### Generic Errors
- `INTERNAL_ERROR` - Unexpected server error
- `UNKNOWN_TOOL_FAILURE` - Fallback for unmapped errors

## 3. Determinism Guarantees

### Serialization Determinism
1. All `SystemError` envelopes are JSON-serializable with no circular references
2. All fields are either `string`, `number`, `boolean`, `null`, or plain objects
3. `cause` field is normalized: Error objects become `{ message, code, name }` objects
4. Timestamp is ISO 8601 format (always deterministic for given instant)

### Code Determinism
1. Same error condition → same `error_code` (always)
2. Same `error_code` → same semantics (always)
3. Invariant ID is stable and never generated randomly
4. Error codes never change during runtime

### Transport Determinism
1. Every thrown `SystemError` reaches MCP client unmodified
2. No error is swallowed or converted to warning
3. Audit log records exactly what was thrown (for forensics)

## 4. Construction and Usage

### Factory Methods

All `SystemError` instances MUST be created via one of these factories:

#### `SystemError.fromUnknown(err, context)`
Converts unknown errors to SystemError:
```javascript
const systemErr = SystemError.fromUnknown(rawErr, {
  error_code: SYSTEM_ERROR_CODES.FILE_READ_FAILED,
  tool_name: "read_file",
  session_id: SESSION_ID,
  workspace_root: SESSION_STATE.workspaceRoot,
});
```

#### `SystemError.invariantViolation(invariant_id, context)`
For invariant violations:
```javascript
const systemErr = SystemError.invariantViolation(
  "MANDATORY_DIAGNOSTICS",
  {
    human_message: "Session was not initialized",
    tool_name: "write_file",
  }
);
```

#### `SystemError.toolFailure(error_code, context)`
For tool-specific failures:
```javascript
const systemErr = SystemError.toolFailure(
  SYSTEM_ERROR_CODES.INVALID_PATH,
  {
    human_message: "Invalid file path: contains ../ traversal",
    tool_name: "write_file",
    cause: originalError,
  }
);
```

#### `SystemError.startupFailure(error_code, context)`
For startup/initialization failures:
```javascript
const systemErr = SystemError.startupFailure(
  SYSTEM_ERROR_CODES.BOOTSTRAP_FAILURE,
  {
    human_message: "Failed to bootstrap MCP server",
    cause: bootstrapError,
  }
);
```

### Direct Construction (Not Recommended)
```javascript
new SystemError({
  error_code: SYSTEM_ERROR_CODES.INTERNAL_ERROR,
  human_message: "Something went wrong",
  tool_name: "my_tool",
  role: "WINDSURF",
  session_id: "...",
  workspace_root: "/path",
});
```

## 5. Tool Boundary Enforcement

The `wrapHandler` function in `server.js` enforces SystemError enveloping at the MCP tool boundary:

1. Every tool handler is wrapped in try-catch
2. Any thrown error (raw Error, string, object) is caught
3. Error is converted to SystemError via `SystemError.fromUnknown()`
4. SystemError is logged to audit trail
5. SystemError is thrown (MCP SDK serializes it)

**Result**: MCP client always receives canonical `SystemError.toEnvelope()` JSON, never raw Error.

## 6. Audit Trail Integration

Every tool failure is logged to `audit-log.jsonl` with:
- tool_name
- error_code
- invariant_id (if applicable)
- plan_hash/phase_id (if provided)
- timestamp
- cause (normalized)

Audit log entry is appended BEFORE SystemError is thrown to transport.

## 7. Client Reception and Interpretation

Clients MUST interpret MCP tool call failures as follows:

1. **Check for error response** in MCP protocol
2. **Extract `error_code`** from response body
3. **Use `error_code` to determine action**: 
   - `SESSION_NOT_INITIALIZED` → Call begin_session
   - `SESSION_LOCKED` → Write failure report to docs/reports/
   - `UNAUTHORIZED_ACTION` → Check role and permissions
   - `PLAN_NOT_APPROVED` → Verify plan is approved
   - Other codes → Refer to spec above
4. **Never parse `human_message`** for logic (only for display)
5. **Optional**: Use `cause` for debugging, `stack_trace` for forensics

## 8. Testing and Validation

All error paths MUST have tests covering:

1. ✓ Raw Error thrown → becomes SystemError
2. ✓ String thrown → becomes SystemError
3. ✓ Object thrown → becomes SystemError
4. ✓ Invariant violation → includes invariant_id
5. ✓ Pre-session error → has null session_id/workspace_root
6. ✓ Error with phase_id/plan_hash → preserved in envelope
7. ✓ Serialization → JSON-safe, no circular refs, no undefined
8. ✓ Audit log → entry written on failure

See `test-system-error.js` for comprehensive test suite.

## 9. Environment Variables

- `DEBUG_STACK=true` - Include full stack trace in SystemError envelope (for debugging)
- Default behavior: `stack_trace` field is omitted

## 10. Migration Path

### For Existing Raw Error Throws

**Before**:
```javascript
throw new Error(`INVALID_PATH: ${err.message}`);
```

**After**:
```javascript
throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_PATH, {
  human_message: `Invalid path: ${err.message}`,
  tool_name: "read_file",
  cause: err,
});
```

### For Existing KaizaError Uses

`KaizaError` in `core/error.js` is legacy. New code MUST use `SystemError`.  
Existing `KaizaError` instances are handled by `wrapHandler` which converts them via `SystemError.fromUnknown()`.

## 11. Non-Compliance Examples

These are FORBIDDEN:

❌ Throwing raw Error:
```javascript
throw new Error("Something failed");
```

❌ Returning error as object:
```javascript
return { ok: false, error: "Something failed" };
```

❌ console.error without throwing:
```javascript
console.error("Error occurred");
// Continue execution...
```

❌ Swallowing errors in catch:
```javascript
try { /* ... */ } catch (e) { /* silently ignore */ }
```

## 12. Summary

The MCP Canonical Error Contract ensures that:

1. **Every tool failure** produces a `SystemError` instance
2. **Every SystemError** serializes to a deterministic JSON envelope
3. **Every envelope** includes all required fields with correct semantics
4. **Every envelope** is logged to the audit trail
5. **Every client** receives a canonical error, never raw Error objects

This contract is **ENFORCED** by the `wrapHandler` function at the tool execution boundary and verified by comprehensive tests.
