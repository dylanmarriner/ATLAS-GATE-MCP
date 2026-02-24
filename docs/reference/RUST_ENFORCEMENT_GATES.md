# Rust Static Enforcement Gates

## Overview

ATLAS-GATE MCP enforces mandatory Rust policy gates at two critical phases:

1. **Pre-Write Gate (STATIC)** - Analyzes code before it's committed
2. **Post-Write Gate (VERIFICATION)** - Verifies compiler compliance after write

---

## 1️⃣ Rust Static Enforcement Gate (MANDATORY)

### Location

- **Module**: `core/rust-policy-engine.js`
- **Function**: `enforceRustPolicy(filePath, content, repoRoot, planAllowances)`
- **Invoked**: In `tools/write_file.js` GATE 3.5 (after role validation, before stubs detection)

### Forbidden Patterns (BY DEFAULT)

MCP **REFUSES** any write containing these patterns unless explicitly allowed in the plan:

| Pattern | Reason |
|---------|--------|
| `unwrap()` | Panic if None/Err |
| `expect()` | Panic with message |
| `panic!()` | Explicit panic |
| `todo!()` | Unfinished code stub |
| `unimplemented!()` | Unimplemented stub |
| `unsafe {}` | Memory safety escape hatch |
| `static mut` | Mutable global state |
| `Box::leak()` | Memory leak |
| `unwrap_or(_)` | Fallback to panic |
| `unwrap_or_default()` | Fallback to default |
| `let _ = foo()?` | Ignored Result (error discarded) |
| `cfg(test)` in non-test modules | Test-only code in prod |

### Example Rejection

```rust
// ❌ REJECTED
fn bad() {
    let x = some_func().unwrap();  // FORBIDDEN PATTERN: unwrap()
}
```

```
Error: Rust static enforcement gate blocked write:
  Line 3: unwrap()
    Context: let x = some_func().unwrap();

Forbidden patterns detected. Plan must explicitly allow these patterns.
```

### Allowing Patterns in a Plan

To allow specific patterns, include them in the plan with justification:

```yaml
# plan.md header
phase: EXECUTION
rust-allowed-patterns:
  - unwrap()  # Safe because error is impossible for known inputs
  - unsafe{}  # FFI call to libc::memcpy (verified safe)
```

### Comments Bypass

Forbidden patterns in comments are **allowed** (not executed):

```rust
// ✅ ALLOWED (in comment)
// NOTE: This code uses unwrap() because the error is impossible here
```

---

## 2️⃣ Rust Error-Handling Law

### Principle

All Rust code must comply with hard-fail error handling:

- ✅ **Correct**: `fn parse() -> Result<T, SystemError>`
- ❌ **Forbidden**: `fn parse() -> Option<T>` (for meaningful failures)
- ❌ **Forbidden**: `fn parse() -> Result<T, Box<dyn Error>>`

### Validation

**Function**: `validateRustErrorHandling(content, filePath)`

Detects and rejects:

1. **Option<T> returns** - Use Result with explicit error type

   ```rust
   // ❌ REJECTED
   fn get_value() -> Option<String> { ... }
   
   // ✅ REQUIRED
   fn get_value() -> Result<String, SystemError> { ... }
   ```

2. **Result<T, Box<dyn Error>>** - Use canonical error type

   ```rust
   // ❌ REJECTED
   fn parse() -> Result<Vec<u8>, Box<dyn std::error::Error>> { ... }
   
   // ✅ REQUIRED (depends on crate)
   fn parse() -> Result<Vec<u8>, MyError> { ... }
   ```

### Error Type Requirements

All errors must:

- Carry error codes (not just messages)
- Carry invariant context
- Be explainable in plain English
- Use canonical crate error type (e.g., `SystemError`, `AppError`)

---

## 3️⃣ Compiler + Clippy Verification Gates (CRITICAL)

### Location

- **Module**: `core/rust-policy-engine.js`
- **Function**: `runRustVerificationGates(repoRoot)`
- **Invoked**: In `core/preflight.js` (runs before JavaScript tests)

### Gates (Sequential, Fail-Fast)

#### Gate 1: `cargo fmt --check`

Verifies code formatting compliance.

```bash
cargo fmt --check
```

- ✅ Pass: Code is properly formatted
- ❌ Fail: Code style violation detected

#### Gate 2: `cargo clippy -- -D warnings`

Runs clippy with warnings-as-errors.

```bash
cargo clippy -- -D warnings
```

- ✅ Pass: No clippy warnings
- ❌ Fail: Lint violations detected

#### Gate 3: `cargo build`

Verifies compilation succeeds.

```bash
cargo build
```

- ✅ Pass: Code compiles
- ❌ Fail: Compilation errors

#### Gate 4: Compiler Deny Flags

Verifies required deny attributes in `src/lib.rs` or `src/main.rs`.

**Required deny attributes**:

```rust
#![deny(unsafe_code)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]
```

These must be present at the top of the root crate file.

### Failure Handling

If **any** gate fails:

1. ⛔ Phase fails immediately
2. ⛔ File changes are **reverted**
3. 📋 Failure report is generated
4. ⛔ No further execution

```
PREFLIGHT_FAILED: Code rejected because it breaks the build.

cargo clippy -- -D warnings failed:
  error: this function has an average complexity of 18.6, which is too high
    --> src/main.rs:45:5
     |
  45 | fn process_data() {
     | ^^^^^^^^^^^^^^^^^
     |
     = note: `-D clippy::cognitive_complexity` implied by `-D warnings`
```

---

## Configuration

### Automatic Detection

ATLAS-GATE automatically detects Rust projects via `Cargo.toml` presence:

- If `Cargo.toml` exists → Run all Rust gates
- If no `Cargo.toml` → Skip Rust enforcement (not a Rust project)

### Required Setup

For a Rust project to pass verification, ensure:

1. ✅ `Cargo.toml` exists at repo root
2. ✅ `src/lib.rs` or `src/main.rs` contains deny attributes
3. ✅ `cargo fmt` is configured (usually default)
4. ✅ `cargo clippy` is available (usually default)
5. ✅ Project compiles with `cargo build`

---

## Integration with MCP Write Flow

### Complete Gate Sequence

```
write_file() request
  ↓
GATE 0: PROMPT GATE (must have fetched canonical prompt)
  ↓
GATE 1: INTENT & AUTHORITY (mandatory commentary)
  ↓
GATE 1.1: INPUT VALIDATION (path normalization)
  ↓
GATE 2: PLAN ENFORCEMENT (plan must authorize file)
  ↓
GATE 3: ROLE VALIDATION (role metadata checked)
  ↓
GATE 3.5: ✨ RUST STATIC GATE ✨ (NEW)
  ├─ scanRustForForbiddenPatterns()
  └─ validateRustErrorHandling()
  ↓
GATE 4: ENTERPRISE CODE ENFORCEMENT (stubs, mocks, TODOs)
  ↓
GATE 4.5: PREFLIGHT CHECK
  ├─ ✨ runRustVerificationGates() ✨ (NEW - CRITICAL)
  │   ├─ cargo fmt --check
  │   ├─ cargo clippy -- -D warnings
  │   ├─ cargo build
  │   └─ Verify deny flags
  └─ JavaScript/TypeScript tests (npm test, lint, etc.)
  ↓
GATE 5: AUDIT LOGGING
  ↓
✅ Write succeeds
```

---

## Examples

### ✅ Compliant Rust Code

```rust
// ✅ Proper error handling
fn divide(a: i32, b: i32) -> Result<i32, DivisionError> {
    if b == 0 {
        Err(DivisionError::ZeroDivisor)
    } else {
        Ok(a / b)
    }
}

// ✅ No forbidden patterns
fn process(data: &[u8]) -> Result<String, ParseError> {
    // Process safely with Result
    validate(data)?;
    parse_safe(data)
}

// ✅ Required deny attributes
#![deny(unsafe_code)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]

fn main() {
    println!("Safe Rust!");
}
```

### ❌ Non-Compliant Rust Code

```rust
// ❌ Forbidden: unwrap()
fn bad_divide(a: i32, b: i32) -> i32 {
    (a as f32 / b as f32).round() as i32  // ← No bounds check
}

// ❌ Forbidden: panic!()
fn validate(x: i32) {
    if x < 0 {
        panic!("Invalid value");  // ← Rejects with hard panic
    }
}

// ❌ Forbidden: Option<T> for meaningful failures
fn get_user(id: u32) -> Option<User> {  // ← No error info
    None  // User not found? Unknown error? Timeout?
}

// ❌ Forbidden: Box<dyn Error>
fn parse() -> Result<Data, Box<dyn Error>> {  // ← Loses error type
    Ok(Data::new())
}

// ❌ Missing deny attributes
// (will fail verification gate)
```

---

## Testing

### Run Tests

```bash
# Test Rust policy engine
node test-rust-policy.js

# Run all tests (including Rust)
npm test
```

### Test Coverage

- Pattern detection (unwrap, panic, unsafe, etc.)
- Error handling validation (Option, Box<dyn Error>)
- Comment bypasses
- Test file exceptions
- Plan allowances
- KaizaError propagation
- Gate fail-fast behavior

---

## Debugging

### Pattern Not Detected?

1. Check if pattern is in a comment (comments are allowed)
2. Check if file is a test file (cfg(test) allowed)
3. Verify regex pattern in `FORBIDDEN_PATTERNS` array
4. Test with `scanRustForForbiddenPatterns()` directly

### Build Fails After Preflight?

1. Run `cargo fmt --check` locally
2. Run `cargo clippy -- -D warnings` locally
3. Run `cargo build` locally
4. Verify deny attributes are present

### Confused About Pattern Allowance?

- Patterns are **forbidden by default**
- Must explicitly allow in plan
- Comments automatically bypass detection
- Test files have exceptions (cfg(test), Option usage)

---

## Future Enhancements

- [ ] Parse plan files to extract rust-allowed-patterns section
- [ ] AST-based analysis using `syn` crate (more robust than regex)
- [ ] Per-module deny overrides (e.g., FFI modules)
- [ ] Semantic error type validation
- [ ] Integration with `cargo-deny` for dependencies

---

## References

- **Policy Engine**: `core/rust-policy-engine.js`
- **Tests**: `test-rust-policy.js`
- **Integration**: `tools/write_file.js` (GATE 3.5), `core/preflight.js`
- **Error Codes**: `core/error.js` (POLICY_VIOLATION, PREFLIGHT_FAILED)
- **Clippy Docs**: <https://doc.rust-lang.org/clippy/>
- **Deny Attributes**: <https://doc.rust-lang.org/rustc/lints/levels.html>
