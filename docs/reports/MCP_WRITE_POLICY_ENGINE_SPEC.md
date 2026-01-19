# MCP Write-Time Policy Engine Specification

**Version**: 1.0.0  
**Date**: 2024-01-19  
**Role**: WINDSURF EXECUTION PROMPT — MCP-Enforced Write-Time Policy Engine  
**Status**: IMPLEMENTED & TESTED  

---

## Executive Summary

This document specifies the fail-closed write-time policy engine that is invoked on **every write attempt** in the KAIZA MCP Server. The policy engine enforces four layers of validation:

1. **Plan-Scoped Path Enforcement** — writes must be within workspace bounds and authorized paths
2. **Universal Denylist** — language-agnostic patterns (TODOs, empty catches, debug bypasses)
3. **Language-Aware Profiles** — language-specific rules (Rust unwrap, TypeScript any, Python randomness)
4. **Intent Artifact Co-Requirement** — every write must have an accompanying intent explanation

If **any** policy check fails, the write is **refused** and an audit entry is created. No write occurs.

---

## Policy Engine Lifecycle

```
write_file called
    ↓
[GATE 2: Plan Enforcement]
    ↓
[GATE 2.5: Write-Time Policy Engine] ← THIS ENGINE
    ├─ Validate inputs (fail on missing required fields)
    ├─ Path bounds validation (no escapes, no symlinks)
    ├─ Universal denylist scan (all languages)
    ├─ Language detection
    ├─ Language-specific profile scan
    ├─ Intent artifact co-requirement check
    ├─ Create audit entry (PASS or FAIL)
    └─ Return verdict or throw SystemError
    ↓
[If FAIL: Write refused, error propagated, session locked]
[If PASS: Continue to GATE 3.5+ and filesystem write]
```

---

## Policy Engine Inputs (Required)

The policy engine receives the following inputs. If any are missing, the write is refused:

| Field | Type | Description |
|-------|------|-------------|
| `workspace_root` | string | Absolute path to locked workspace (from begin_session) |
| `role` | string | WINDSURF or ANTIGRAVITY (currently WINDSURF only for writes) |
| `session_id` | string | Session UUID for audit tracing |
| `tool_name` | string | Name of calling tool (e.g., "write_file") |
| `plan_hash` | string | SHA256 hash of authorized plan (from plan_enforcer) |
| `phase_id` | string \| null | Phase ID within plan (optional, for future use) |
| `operation` | string | "CREATE" (new file) or "MODIFY" (existing file) |
| `path` | string | Workspace-relative file path (e.g., "src/main.rs") |
| `content_bytes` | string | Full file content being written |
| `detected_language` | string | Language code: "rust" \| "typescript" \| "javascript" \| "python" \| "markdown" \| "unknown" |
| `content_hash` | string | SHA256 hash of content_bytes |
| `content_length` | number | Byte length of content |

---

## Language Detection

The policy engine detects language from file extension and optional content heuristics:

### Primary: File Extension Mapping

| Extension | Language |
|-----------|----------|
| `.rs` | rust |
| `.ts`, `.tsx` | typescript |
| `.js`, `.mjs`, `.cjs`, `.jsx` | javascript |
| `.py`, `.pyi` | python |
| `.md`, `.markdown` | markdown |
| (others) | unknown |

### Fallback: Content Heuristics

- **Rust**: `fn `, `impl `, `pub fn`
- **TypeScript**: `import ... from` pattern
- **Python**: `def `, `import`
- **Unknown**: Applied if no extension match and heuristics inconclusive

---

## Universal Denylist (Language-Agnostic)

All languages are scanned for the following patterns by default:

### Placeholder / Unfinished Logic

| Pattern | Reason |
|---------|--------|
| `TODO` | Incomplete work markers must never ship |
| `FIXME` | Incomplete work markers must never ship |
| `XXX` | Incomplete work markers must never ship |
| `pass` | Empty pass statement is placeholder code |

### Silent Failure / Fallback

| Pattern | Reason |
|---------|--------|
| `catch {}` | Empty catch blocks silently swallow exceptions |
| `catch (e) { /* log */ }` | Catch with log-only (no rethrow) |
| `.catch(() => {})` | Promise catch silently ignores errors |
| `try { } catch { return }` | Catch that silently returns instead of handling |
| `unwrap_or(` | Fallback that bypasses error handling |
| `unwrap_or_default` | Fallback that bypasses error handling |
| `orElse`, `getOrElse` | Fallback that bypasses error handling |

### Debug Bypass / Masking

| Pattern | Reason |
|---------|--------|
| `console.log()` | Debug logging in production code |
| `assert(false)` | Disabled assert masking real errors |

---

## Language-Specific Profiles

### Rust Profile (Strict)

Rust code is subject to additional error-handling constraints:

| Pattern | Reason | Error Code |
|---------|--------|-----------|
| `unwrap()` | Unwrap panics instead of handling Result | RUST_POLICY_VIOLATION |
| `expect()` | Expect panics instead of handling Result | RUST_POLICY_VIOLATION |
| `panic!` | Panic is uncontrolled abort, not error handling | RUST_POLICY_VIOLATION |
| `todo!` | todo! macro is unimplemented code | RUST_POLICY_VIOLATION |
| `unimplemented!` | unimplemented! is unfinished code | RUST_POLICY_VIOLATION |
| `unsafe {}` | Unsafe blocks bypass memory safety guarantees | RUST_POLICY_VIOLATION |
| `static mut` | Mutable statics are inherently unsafe | RUST_POLICY_VIOLATION |
| `Box::leak()` | Box::leak intentionally leaks memory | RUST_POLICY_VIOLATION |
| `#[allow(...)]` | Allow attributes suppress compiler warnings | RUST_POLICY_VIOLATION |

**Error Code**: `RUST_POLICY_VIOLATION`  
**Invariant ID**: `RUST_REALITY_LOCK`

### TypeScript / JavaScript Profile

TypeScript/JavaScript code must maintain determinism and type safety:

| Pattern | Reason | Error Code |
|---------|--------|-----------|
| `: any` | Type 'any' defeats type safety | POLICY_VIOLATION |
| `@ts-ignore` | TypeScript ignore suppresses type checking | POLICY_VIOLATION |
| `// @ts-ignore` | TypeScript ignore suppresses type checking | POLICY_VIOLATION |
| `Math.random()` | Non-deterministic in determinism-required code | POLICY_VIOLATION |
| `Date.now()` | Non-deterministic timing | POLICY_VIOLATION |

**Error Code**: `POLICY_VIOLATION`  
**Invariant ID**: `DETERMINISM_REQUIRED`

### Python Profile

Python code enforces determinism constraints:

| Pattern | Reason | Error Code |
|---------|--------|-----------|
| `import random` | Non-deterministic randomness | POLICY_VIOLATION |
| `from random import` | Non-deterministic randomness | POLICY_VIOLATION |
| `import time` | Non-deterministic timing | POLICY_VIOLATION |
| `time.time()` | Non-deterministic timing | POLICY_VIOLATION |
| `except:` (bare) | Bare except catches all exceptions | POLICY_VIOLATION |

**Error Code**: `POLICY_VIOLATION`  
**Invariant ID**: `DETERMINISM_REQUIRED`

### Unknown Language

Files with unknown extensions apply **universal denylist only**. No language-specific rules are enforced.

---

## Plan-Scoped Path Enforcement

### Path Bounds Validation

The policy engine verifies that the target path:

1. **Is within workspace root** — No `..` escapes, no absolute paths outside workspace
2. **Is normalized** — Resolved to canonical absolute path
3. **Is authorized by plan** — (Future: Extract CREATE/MODIFY allowlists from plan)

**Error on violation**: `PATH_TRAVERSAL_BLOCKED`

### Example

```
workspace_root = /home/user/myproject
target path    = src/main.rs
→ /home/user/myproject/src/main.rs ✓ (within bounds)

target path    = ../../../etc/passwd
→ BLOCKED (escapes workspace) ✗
```

---

## Intent Artifact Co-Requirement

Every write (except failure reports) must have an accompanying intent artifact:

**File**: `<target_path>.intent.md`  
**Requirement**: Must exist before or during the write  
**Exception**: Files written to `docs/reports/` do not require intent artifacts

### Example

```
Writing to:     src/utils.js
Requires:       src/utils.js.intent.md

Content:        # Intent: Refactored utility functions for performance
                Breakdown:
                - Combined 3 functions into 1 for efficiency
                - Added caching layer
```

**Error on missing intent**: `MISSING_REQUIRED_FIELD`  
**Invariant ID**: `MANDATORY_INTENT`

---

## Fail-Closed Semantics

### Core Principle

If the policy engine **throws**, **cannot parse**, **cannot detect language**, or **cannot load plan data**, the write **MUST be refused**. No "best effort" pass.

### Error Handling

```javascript
try {
  const verdict = await executeWriteTimePolicy(inputs);
  // verdict.verdict === "PASS" → proceed to filesystem write
} catch (err) {
  // Any error → refuse write, create audit entry, throw SystemError
  // Write MUST NOT occur
}
```

### Audit Entry on Failure

On **every** policy failure, an audit entry is created with:

- `session_id`: Session UUID
- `role`: WINDSURF or ANTIGRAVITY
- `workspace_root`: Locked workspace path
- `tool`: "write_file"
- `plan_hash`: Plan authorization hash
- `phase_id`: Phase within plan (if available)
- `result`: "error"
- `error_code`: Classified error code (e.g., "POLICY_VIOLATION")
- `invariant_id`: Violated invariant (e.g., "NO_PLACEHOLDERS_NO_FALLBACKS")
- `notes`: Human-readable summary of violations

If audit append fails, the write failure takes precedence.

---

## Error Codes & Invariants

| Error Code | Invariant ID | Description |
|-----------|--------------|-------------|
| `MISSING_REQUIRED_FIELD` | - | Policy engine received incomplete inputs |
| `INVALID_PATH` | - | File path cannot be resolved |
| `PATH_TRAVERSAL_BLOCKED` | - | Path escapes workspace bounds |
| `POLICY_VIOLATION` | `NO_PLACEHOLDERS_NO_FALLBACKS` | Universal denylist violation |
| `RUST_POLICY_VIOLATION` | `RUST_REALITY_LOCK` | Rust-specific policy violation |
| `POLICY_VIOLATION` | `DETERMINISM_REQUIRED` | TS/JS/Python determinism violation |
| `MISSING_REQUIRED_FIELD` | `MANDATORY_INTENT` | Intent artifact missing |

---

## Examples of PASS / FAIL

### Example 1: Valid Rust Code (PASS)

```rust
// src/lib.rs
pub fn divide(a: i32, b: i32) -> Result<i32, String> {
  if b == 0 {
    Err("Division by zero".to_string())
  } else {
    Ok(a / b)
  }
}
```

**Policy Verdict**: `PASS` ✓

- No `unwrap()`, `panic!`, `unsafe`, `todo!`, etc.
- Proper error handling via `Result<T, E>`
- Intent artifact: `src/lib.rs.intent.md` exists

### Example 2: Invalid Rust Code (FAIL — unwrap)

```rust
// src/lib.rs
pub fn divide(a: i32, b: i32) -> i32 {
  (a / b).unwrap()  // ← FORBIDDEN
}
```

**Policy Verdict**: `FAIL` ✗

**Error**: `RUST_POLICY_VIOLATION`  
**Invariant**: `RUST_REALITY_LOCK`  
**Reason**: `unwrap()` panics instead of proper error handling

**Action**: Write refused, audit entry created, error message returned to client

### Example 3: Invalid TypeScript (FAIL — any type)

```typescript
// src/app.ts
function process(data: any): void {  // ← FORBIDDEN
  console.log(data);
}
```

**Policy Verdict**: `FAIL` ✗

**Error**: `POLICY_VIOLATION`  
**Invariant**: `DETERMINISM_REQUIRED`  
**Reason**: Type `any` defeats type safety

**Action**: Write refused, audit entry created

### Example 4: Universal Violation (FAIL — TODO)

```javascript
// src/handler.js
function handleRequest(req, res) {
  // TODO: implement validation  // ← FORBIDDEN
  return res.json({ status: "ok" });
}
```

**Policy Verdict**: `FAIL` ✗

**Error**: `POLICY_VIOLATION`  
**Invariant**: `NO_PLACEHOLDERS_NO_FALLBACKS`  
**Reason**: Incomplete work markers must never ship

**Action**: Write refused, audit entry created

### Example 5: Missing Intent (FAIL)

```typescript
// src/utils.ts
export function sum(a: number, b: number): number {
  return a + b;
}
```

**Note**: `src/utils.ts.intent.md` does **not** exist

**Policy Verdict**: `FAIL` ✗

**Error**: `MISSING_REQUIRED_FIELD`  
**Invariant**: `MANDATORY_INTENT`  
**Reason**: Intent artifact required to explain the change

**Action**: Write refused, audit entry created

---

## Non-Coder Explanation: Why Your Write Was Refused

If you receive a policy violation, here's what it means in plain English:

### "POLICY_VIOLATION: NO_PLACEHOLDERS_NO_FALLBACKS"

Your code contains a marker like `TODO`, `FIXME`, or `XXX` that indicates incomplete work. You cannot ship incomplete code. **Action**: Remove the marker and complete the implementation, or delete the code.

### "RUST_POLICY_VIOLATION: RUST_REALITY_LOCK"

Your Rust code uses `.unwrap()`, `.expect()`, `panic!`, or `unsafe {}`. These bypass proper error handling. **Action**: Handle errors explicitly using `Result<T, E>` or `Option<T>`.

### "POLICY_VIOLATION: DETERMINISM_REQUIRED"

Your code uses non-deterministic functions like `Math.random()`, `Date.now()`, or `random.random()`. These cannot be used in determinism-required code. **Action**: Use deterministic alternatives (seeds, fixed values, time-free logic).

### "MISSING_REQUIRED_FIELD: MANDATORY_INTENT"

You didn't include an intent artifact explaining your change. Every write must have a `.intent.md` file describing what you did and why. **Action**: Create `<filename>.intent.md` with a brief explanation.

---

## Audit Logging

Every write attempt (success or failure) produces an audit entry in `/.kaiza/audit.log`:

```json
{
  "ts": "2024-01-19T12:34:56.789Z",
  "seq": 42,
  "prev_hash": "abc123...",
  "session_id": "sess-uuid",
  "role": "WINDSURF",
  "workspace_root": "/home/user/myproject",
  "tool": "write_file",
  "plan_hash": "def456...",
  "phase_id": null,
  "args_hash": "ghi789...",
  "result": "error",
  "error_code": "RUST_POLICY_VIOLATION",
  "invariant_id": "RUST_REALITY_LOCK",
  "result_hash": null,
  "notes": "Rust policy violations: unwrap()",
  "entry_hash": "jkl012..."
}
```

The audit log is:
- **Append-only** — never rewritten or truncated
- **Hash-chained** — each entry references the previous entry's hash
- **Tamper-evident** — any modification breaks the chain
- **Deterministic** — sequence numbers are sequential, never UUIDs

---

## Testing

The policy engine is tested with 20 deterministic, isolated tests:

### Test Categories

1. **Language Detection** (6 tests)
   - Rust, TypeScript, JavaScript, Python, Markdown, Unknown

2. **Universal Denylist** (3 tests)
   - TODO, FIXME, empty catch blocks

3. **Rust Profile** (3 tests)
   - unwrap(), panic!, unsafe {}

4. **TypeScript/JavaScript Profile** (2 tests)
   - any type, @ts-ignore

5. **Python Profile** (1 test)
   - random module import

6. **Valid Content** (2 tests)
   - Clean JavaScript, clean Rust (with intent artifacts)

7. **Input Validation** (2 tests)
   - Missing workspace_root, missing content_bytes

8. **Audit Logging** (1 test)
   - Audit entry created on policy failure

All tests pass deterministically.

---

## Integration Points

The policy engine is invoked in:

1. **write_file.js** (GATE 2.5)
   - After plan enforcement (GATE 2)
   - Before role metadata header (GATE 3)
   - Before filesystem write

2. **Audit System** (audit-system.js)
   - Appends entry on every policy run (pass/fail)
   - Uses hash-chained audit log

3. **Error Handling** (system-error.js)
   - Policy failures throw SystemError with classified codes
   - Errors propagate to MCP client with human-readable messages

---

## Known Limitations

1. **Plan-Scoped Path Enforcement**: Path allowlists (CREATE/MODIFY) are not yet extracted from plan data. Full plan parsing is deferred.

2. **Language Profiles**: Only 4 languages are supported (Rust, TypeScript, JavaScript, Python). Other languages use universal denylist only.

3. **Intent Artifact**: No content validation of intent files. Presence is checked, but content is not parsed.

4. **Comment Detection**: Rust pattern matching uses simple comment detection (`//`). Multi-line comments (`/* */`) may not be fully handled.

---

## Future Enhancements

1. Extract CREATE/MODIFY allowlists from plan YAML/JSON
2. Support additional languages (Go, C++, Java, etc.)
3. Implement intent artifact content validation (Markdown schema)
4. Add plan-specific exception patterns (e.g., allow specific unwrap() calls with justification)
5. Integrate with language-specific AST analysis tools (TypeScript Compiler API, rustc)

---

## Conclusion

The write-time policy engine is a **mandatory, fail-closed** enforcement layer that runs on every write attempt. It ensures that only real, complete, properly-explained code reaches the filesystem. No placeholders. No silent failures. No debug bypasses.

If a write violates policy, **the write does not occur**. The client receives a deterministic, classified error with a human-readable explanation.

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-19  
**Status**: IMPLEMENTED, TESTED, INTEGRATED
