import {
  scanRustForForbiddenPatterns,
  validateRustErrorHandling,
  enforceRustPolicy,
  verifyCargoLintFlags
} from './core/rust-policy-engine.js';
import { KaizaError } from './core/error.js';
import assert from 'assert';

console.log('🧪 Testing Rust Static Enforcement Gate...\n');

// Test 1: Detect unwrap()
console.log('✓ Test 1: Detect unwrap()');
{
  const code = `
    fn main() {
        let result = some_func().unwrap();
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect unwrap()');
  assert(result.violations.length > 0, 'Should have violations');
  assert(result.violations[0].pattern === 'unwrap()', 'Should identify as unwrap()');
  console.log('  ✓ unwrap() detected correctly\n');
}

// Test 2: Detect expect()
console.log('✓ Test 2: Detect expect()');
{
  const code = `
    fn main() {
        let x = value.expect("error message");
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect expect()');
  assert(result.violations.some(v => v.pattern === 'expect()'), 'Should find expect()');
  console.log('  ✓ expect() detected correctly\n');
}

// Test 3: Detect panic!()
console.log('✓ Test 3: Detect panic!()');
{
  const code = `
    fn main() {
        if bad_condition {
            panic!("This is bad");
        }
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect panic!()');
  assert(result.violations.some(v => v.pattern === 'panic!()'), 'Should find panic!()');
  console.log('  ✓ panic!() detected correctly\n');
}

// Test 4: Detect unsafe {}
console.log('✓ Test 4: Detect unsafe {} blocks');
{
  const code = `
    fn main() {
        unsafe {
            libc::printf(b"hello\\n".as_ptr() as *const i8);
        }
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect unsafe blocks');
  assert(result.violations.some(v => v.pattern === 'unsafe {} blocks'), 'Should find unsafe');
  console.log('  ✓ unsafe {} detected correctly\n');
}

// Test 5: Detect static mut
console.log('✓ Test 5: Detect static mut');
{
  const code = `
    static mut COUNTER: u32 = 0;
    
    fn increment() {
        unsafe { COUNTER += 1; }
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect static mut');
  assert(result.violations.some(v => v.pattern === 'static mut'), 'Should find static mut');
  console.log('  ✓ static mut detected correctly\n');
}

// Test 6: Allow patterns in comments
console.log('✓ Test 6: Allow forbidden patterns in comments');
{
  const code = `
    fn main() {
        // SAFETY: This function uses unwrap() for known-safe values
        // unwrap() is acceptable here because error is impossible
        let x = 5;
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(result.allowed, 'Should allow forbidden patterns in comments');
  console.log('  ✓ Comments correctly ignored\n');
}

// Test 7: Allow patterns in test files
console.log('✓ Test 7: Skip cfg(test) in test modules');
{
  const code = `
    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_something() {
            assert_eq!(2 + 2, 4);
        }
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/tests/integration_test.rs', new Set());
  // cfg(test) should be allowed in test files
  const hasTestViolation = result.violations.some(v => v.pattern === 'cfg(test) in non-test modules');
  assert(!hasTestViolation, 'cfg(test) should be allowed in test files');
  console.log('  ✓ cfg(test) allowed in test files\n');
}

// Test 8: Error handling - detect Option<T> returns
console.log('✓ Test 8: Detect Option<T> returns');
{
  const code = `
    fn get_value() -> Option<String> {
        None
    }
  `;
  const result = validateRustErrorHandling(code, 'src/main.rs');
  assert(!result.allowed, 'Should flag Option<T> returns');
  assert(result.violations.length > 0, 'Should have violations');
  console.log('  ✓ Option<T> return flagged\n');
}

// Test 9: Error handling - detect Result<T, Box<dyn Error>>
console.log('✓ Test 9: Detect Result<T, Box<dyn Error>>');
{
  const code = `
    fn parse_file() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        Ok(vec![])
    }
  `;
  const result = validateRustErrorHandling(code, 'src/main.rs');
  assert(!result.allowed, 'Should flag Box<dyn Error>');
  assert(result.violations.some(v => v.pattern === 'Result<T, Box<dyn Error>>'), 'Should find Box<dyn Error>');
  console.log('  ✓ Box<dyn Error> detected\n');
}

// Test 10: Allow patterns explicitly
console.log('✓ Test 10: Allow patterns via explicit set');
{
  const code = `
    fn main() {
        let result = some_func().unwrap();
    }
  `;
  const allowedPatterns = new Set(['unwrap()']);
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', allowedPatterns);
  assert(result.allowed, 'Should allow unwrap() when in allowed set');
  assert(result.violations.length === 0, 'Should have no violations');
  console.log('  ✓ Patterns correctly allowed via set\n');
}

// Test 11: Detect multiple violations
console.log('✓ Test 11: Detect multiple violations in one file');
{
  const code = `
    fn main() {
        let x = unsafe { libc::malloc(10) };
        let y = x.unwrap();
        panic!("error");
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect multiple violations');
  assert(result.violations.length >= 3, 'Should find at least 3 violations');
  console.log('  ✓ Multiple violations detected\n');
}

// Test 12: Clean code passes
console.log('✓ Test 12: Clean code passes validation');
{
  const code = `
    fn divide(a: i32, b: i32) -> Result<i32, String> {
        if b == 0 {
            Err("Division by zero".to_string())
        } else {
            Ok(a / b)
        }
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(result.allowed, 'Clean code should pass');
  assert(result.violations.length === 0, 'Should have no violations');
  const errorResult = validateRustErrorHandling(code, 'src/main.rs');
  assert(errorResult.allowed, 'Error handling should pass');
  console.log('  ✓ Clean code passes all checks\n');
}

// Test 13: enforceRustPolicy throws on violation
console.log('✓ Test 13: enforceRustPolicy throws KaizaError on violation');
{
  const code = `
    fn bad() {
        let x = some_func().unwrap();
    }
  `;
  try {
    enforceRustPolicy('src/main.rs', code, '/tmp/repo', {});
    assert(false, 'Should have thrown');
  } catch (err) {
    assert(err instanceof KaizaError, 'Should throw KaizaError');
    // Access the error object correctly
    const errorCode = err.error_code || (err.error && err.error.error_code);
    assert(errorCode === 'POLICY_VIOLATION', `Should have correct error code, got: ${errorCode}`);
    console.log('  ✓ KaizaError thrown correctly\n');
  }
}

// Test 14: Non-.rs files are skipped
console.log('✓ Test 14: Non-.rs files are skipped');
{
  const code = `
    fn bad() {
        let x = some_func().unwrap();
    }
  `;
  try {
    enforceRustPolicy('src/main.ts', code, '/tmp/repo', {});
    console.log('  ✓ Non-.rs files skipped\n');
  } catch (err) {
    assert(false, `Should not throw for non-.rs files: ${err.message}`);
  }
}

// Test 15: todo!() and unimplemented!() detection
console.log('✓ Test 15: Detect todo!() and unimplemented!()');
{
  const code1 = `fn stub() { todo!("implement this"); }`;
  const result1 = scanRustForForbiddenPatterns(code1, 'src/main.rs', new Set());
  assert(!result1.allowed, 'Should detect todo!()');

  const code2 = `fn stub() { unimplemented!("not ready"); }`;
  const result2 = scanRustForForbiddenPatterns(code2, 'src/main.rs', new Set());
  assert(!result2.allowed, 'Should detect unimplemented!()');
  console.log('  ✓ todo!() and unimplemented!() detected\n');
}

// Test 16: Detect Box::leak
console.log('✓ Test 16: Detect Box::leak');
{
  const code = `
    fn leak_memory() {
        let boxed = Box::new(vec![1, 2, 3]);
        let leaked = Box::leak(boxed);
    }
  `;
  const result = scanRustForForbiddenPatterns(code, 'src/main.rs', new Set());
  assert(!result.allowed, 'Should detect Box::leak');
  assert(result.violations.some(v => v.pattern === 'Box::leak'), 'Should find Box::leak');
  console.log('  ✓ Box::leak detected\n');
}

console.log('\n✅ All Rust policy enforcement tests passed!\n');
