# Rust Enforcement Gates - Quick Start

## What's New?

ATLAS-GATE MCP now enforces mandatory Rust safety gates:

1. **Pre-Write Static Gate** - Blocks forbidden patterns before code is written
2. **Post-Write Verification** - Verifies cargo fmt, clippy, build, and compiler flags

---

## ✋ Forbidden Patterns

MCP will **REJECT** your Rust file if it contains:

```rust
❌ .unwrap()              → panic if None/Err
❌ .expect("msg")         → panic with message
❌ panic!("msg")          → explicit panic
❌ todo!()                → unfinished code
❌ unimplemented!()       → unimplemented stub
❌ unsafe { ... }         → memory safety escape
❌ static mut X           → mutable global state
❌ Box::leak()            → memory leak
❌ let _ = foo()?         → ignored Result (error discarded)
❌ cfg(test) outside tests → test code in production
```

---

## ✅ Correct Patterns

Always use safe error handling:

```rust
// ✅ CORRECT: Use Result
fn divide(a: i32, b: i32) -> Result<i32, DivisionError> {
    if b == 0 {
        Err(DivisionError::ZeroDivisor)
    } else {
        Ok(a / b)
    }
}

// ✅ CORRECT: Propagate errors
fn process(data: &[u8]) -> Result<String, ParseError> {
    validate(data)?;
    parse_safe(data)
}

// ✅ CORRECT: Include deny flags
#![deny(unsafe_code)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]
```

---

## 📝 If You Need an Exception

Include in your plan with **justification**:

```yaml
# plan.md
rust-allowed-patterns:
  - unwrap()  # Safe because error is impossible for known-good indices
  - unsafe{}  # FFI call to libc::memcpy (verified safe by code review)
```

**Note**: Exception requires detailed justification.

---

## 🚨 Common Rejection Messages

### Forbidden Pattern

```
Error: Rust static enforcement gate blocked write:
  Line 45: unwrap()
    Context: let x = some_func().unwrap();
Forbidden patterns detected.
```

**Fix**: Use `?` operator or match expression instead.

### Wrong Error Type

```
Error: Rust error-handling law violation:
  Line 12: function returns Option<T>
  Reason: Use Result<T, SystemError> for meaningful failures
```

**Fix**: Change `Option<T>` to `Result<T, SystemError>`.

### Build Failed

```
Error: Code rejected because it breaks the build.
cargo clippy -- -D warnings failed:
  error: this function has an average complexity of 18.6
```

**Fix**: Run `cargo clippy -- -D warnings` locally and fix warnings.

---

## 🔧 Setup Required

For Rust projects, ensure `src/lib.rs` or `src/main.rs` has:

```rust
#![deny(unsafe_code)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]
```

---

## 📚 Full Documentation

See `RUST_ENFORCEMENT_GATES.md` for comprehensive details:

- All forbidden patterns explained
- Error handling law details
- Verification gates (cargo fmt, clippy, build)
- Plan allowance format
- Examples and debugging

---

## 🧪 Testing

Run tests locally:

```bash
# Test Rust policy engine
node test-rust-policy.js

# Test integration with write_file
node test-rust-integration.js

# Run all tests
npm test
```

---

## 💡 Tips

1. **Use `?` operator** instead of `.unwrap()`

   ```rust
   // ❌ let x = foo().unwrap();
   // ✅ let x = foo()?;
   ```

2. **Pattern match on errors**

   ```rust
   match risky_operation() {
       Ok(value) => { /* success */ }
       Err(e) => { /* handle */ }
   }
   ```

3. **Create canonical error types**

   ```rust
   pub enum MyError {
       ParseError(String),
       IoError(std::io::Error),
   }
   ```

4. **Use From trait for conversions**

   ```rust
   impl From<std::io::Error> for MyError {
       fn from(err: std::io::Error) -> Self {
           MyError::IoError(err)
       }
   }
   ```

---

## ❓ FAQ

**Q: Why are these patterns forbidden?**  
A: They can cause silent panics, making production code unreliable. Forced Result types make errors explicit.

**Q: Can I comment out the deny flags?**  
A: No. They're verified post-write. They protect your code from regressions.

**Q: What about tests?**  
A: Test files can use `cfg(test)`. Other patterns still forbidden (tests should also be safe).

**Q: How do I allow a pattern?**  
A: Include it in your plan with clear justification. All exceptions are audited.

**Q: Is this permanent?**  
A: Yes. These gates are mandatory for Rust projects in ATLAS-GATE MCP.

---

## Need Help?

- Read `RUST_ENFORCEMENT_GATES.md` for details
- Check `test-rust-policy.js` for examples
- Run `node test-rust-integration.js` to verify setup
- Review error messages carefully (they explain the issue)
