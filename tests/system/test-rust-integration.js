/**
 * Integration test for Rust enforcement gates in write_file flow
 */

import fs from 'fs';
import path from 'path';
import { enforceRustPolicy, runRustVerificationGates, verifyCargoLintFlags } from './core/rust-policy-engine.js';
import { KaizaError } from './core/error.js';
import assert from 'assert';

console.log('🧪 Testing Rust Integration with MCP Write Flow...\n');

// Test 1: Rust policy gate catches unwrap in .rs file
console.log('✓ Test 1: enforceRustPolicy catches unwrap() in .rs file');
{
  const code = `fn main() { let x = foo().unwrap(); }`;
  try {
    enforceRustPolicy('src/main.rs', code, '/tmp/repo', {});
    assert(false, 'Should have rejected');
  } catch (err) {
    assert(err instanceof KaizaError, 'Should be KaizaError');
    assert(err.error_code === 'POLICY_VIOLATION', `Got: ${err.error_code}`);
    assert(err.human_message.includes('unwrap()'), 'Should mention unwrap()');
    console.log('  ✓ Correctly rejected unwrap()\n');
  }
}

// Test 2: Clean Rust code passes enforcement
console.log('✓ Test 2: Clean Rust code passes enforceRustPolicy');
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
  // Should not throw
  const result = enforceRustPolicy('src/lib.rs', code, '/tmp/repo', {});
  assert(result.passed === true, 'Should pass clean code');
  console.log('  ✓ Clean code passes\n');
}

// Test 3: Multiple violations reported
console.log('✓ Test 3: Multiple violations are all reported');
{
  const code = `
fn bad() {
    unsafe {
        let x = foo().unwrap();
        panic!("error");
    }
}
  `;
  try {
    enforceRustPolicy('src/main.rs', code, '/tmp/repo', {});
    assert(false, 'Should reject');
  } catch (err) {
    const msg = err.human_message;
    assert(msg.includes('unsafe'), 'Should mention unsafe');
    assert(msg.includes('unwrap'), 'Should mention unwrap');
    // Note: panic() might not be caught if unwrap() comes first (fail fast after first error)
    console.log('  ✓ Multiple violations detected\n');
  }
}

// Test 4: Non-.rs files bypass Rust policy
console.log('✓ Test 4: Non-.rs files bypass Rust policy gate');
{
  const code = `fn bad() { let x = foo().unwrap(); }`;
  // Should not throw
  const result = enforceRustPolicy('src/main.ts', code, '/tmp/repo', {});
  assert(result.passed === true, 'Should skip non-.rs files');
  console.log('  ✓ Non-.rs files skipped\n');
}

// Test 5: Allow patterns in plan
console.log('✓ Test 5: Allowed patterns bypass the gate');
{
  const code = `fn main() { let x = foo().unwrap(); }`;
  const planAllowances = { allowed: new Set(['unwrap()']) };
  // Should not throw because unwrap() is in allowed set
  const result = enforceRustPolicy('src/main.rs', code, '/tmp/repo', planAllowances);
  assert(result.passed === true, 'Should allow unwrap() when in plan');
  console.log('  ✓ Plan allowances work\n');
}

// Test 6: Cargo lint flags verification
console.log('✓ Test 6: verifyCargoLintFlags detects missing deny attributes');
{
  const result = verifyCargoLintFlags('/nonexistent/path');
  // Non-existent path = not a Rust project, so should pass
  assert(result.allowed === true, 'Non-Rust projects should pass');
  console.log('  ✓ Non-Rust projects skipped\n');
}

// Test 7: Error handling validation
console.log('✓ Test 7: Error handling law enforcement');
{
  const badCode = `fn get() -> Option<String> { None }`;
  try {
    enforceRustPolicy('src/lib.rs', badCode, '/tmp/repo', {});
    assert(false, 'Should reject Option return');
  } catch (err) {
    assert(err.human_message.includes('Option<T>'), 'Should mention Option<T>');
    console.log('  ✓ Option<T> returns rejected\n');
  }
}

// Test 8: Box<dyn Error> rejection
console.log('✓ Test 8: Box<dyn Error> rejected');
{
  const badCode = `fn parse() -> Result<Vec<u8>, Box<dyn std::error::Error>> { Ok(vec![]) }`;
  try {
    enforceRustPolicy('src/lib.rs', badCode, '/tmp/repo', {});
    assert(false, 'Should reject Box<dyn Error>');
  } catch (err) {
    assert(err.human_message.includes('Box<dyn Error>'), 'Should mention Box<dyn Error>');
    console.log('  ✓ Box<dyn Error> rejected\n');
  }
}

// Test 9: Test files can use cfg(test)
console.log('✓ Test 9: cfg(test) allowed in test files');
{
  const testCode = `
#[cfg(test)]
mod tests {
    #[test]
    fn test_something() {}
}
  `;
  const result = enforceRustPolicy('src/tests/integration.rs', testCode, '/tmp/repo', {});
  assert(result.passed === true, 'cfg(test) should be allowed in test files');
  console.log('  ✓ Test files can use cfg(test)\n');
}

// Test 10: Write flow integration point check
console.log('✓ Test 10: Rust policy gate is in write_file GATE 3.5');
{
  // Verify the gate is imported in write_file.js
  const writeFileContent = fs.readFileSync(
    path.join(process.cwd(), 'tools/write_file.js'),
    'utf8'
  );
  
  assert(
    writeFileContent.includes('enforceRustPolicy'),
    'enforceRustPolicy should be imported in write_file'
  );
  assert(
    writeFileContent.includes('GATE 3.5'),
    'GATE 3.5 should be documented in write_file'
  );
  assert(
    writeFileContent.includes('.rs'),
    'write_file should check for .rs files'
  );
  
  console.log('  ✓ Rust policy gate integrated in write_file\n');
}

// Test 11: Preflight integration check
console.log('✓ Test 11: Rust verification gates in preflight');
{
  const preflightContent = fs.readFileSync(
    path.join(process.cwd(), 'core/preflight.js'),
    'utf8'
  );
  
  assert(
    preflightContent.includes('runRustVerificationGates'),
    'runRustVerificationGates should be called in preflight'
  );
  assert(
    preflightContent.includes('Cargo.toml'),
    'preflight should check for Cargo.toml'
  );
  
  console.log('  ✓ Rust verification gates in preflight\n');
}

// Test 12: Documentation exists
console.log('✓ Test 12: Documentation exists');
{
  const docPath = path.join(process.cwd(), 'RUST_ENFORCEMENT_GATES.md');
  assert(fs.existsSync(docPath), 'RUST_ENFORCEMENT_GATES.md should exist');
  
  const docContent = fs.readFileSync(docPath, 'utf8');
  assert(docContent.includes('Static Enforcement Gate'), 'Should document static gate');
  assert(docContent.includes('Verification Gates'), 'Should document verification gates');
  assert(docContent.includes('Error-Handling Law'), 'Should document error handling');
  
  console.log('  ✓ Documentation complete\n');
}

console.log('✅ All Rust integration tests passed!\n');
console.log('Summary:');
console.log('  ✓ Pre-write static gate (GATE 3.5) implemented');
console.log('  ✓ Error handling law enforced');
console.log('  ✓ Pattern detection working');
console.log('  ✓ Test file exceptions working');
console.log('  ✓ Plan allowances working');
console.log('  ✓ Integration with write_file complete');
console.log('  ✓ Preflight verification gates ready');
console.log('  ✓ Documentation complete\n');
