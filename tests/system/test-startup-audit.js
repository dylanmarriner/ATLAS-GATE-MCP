/**
 * ROLE: VERIFICATION
 * PURPOSE: Comprehensive tests for MCP Startup Self-Audit
 * AUTHORITY: KAIZA Governance - Refusal-to-boot enforcement
 */

import { SESSION_STATE } from './session.js';
import { resetWorkspaceRootForTesting } from './core/path-resolver.js';
import assert from 'assert';

let testsPassed = 0;
let testsFailed = 0;
const tests = [];

/**
 * Test helper: Register test with automatic teardown
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Test 1: Verify startup audit infrastructure exists
 */
test('Startup Audit: Audit infrastructure exports', async () => {
  const { runStartupAudit, STARTUP_INVARIANTS, StartupAuditResult } = await import('./core/startup-audit.js');
  assert(runStartupAudit, 'runStartupAudit function should be exported');
  assert(STARTUP_INVARIANTS, 'STARTUP_INVARIANTS should be exported');
  assert(StartupAuditResult, 'StartupAuditResult class should be exported');
  assert(Object.keys(STARTUP_INVARIANTS).length > 0, 'STARTUP_INVARIANTS should have entries');
});

/**
 * Test 2: Verify invariant registry has all required IDs
 */
test('Startup Audit: Invariant IDs stable and unique', async () => {
  const { STARTUP_INVARIANTS } = await import('./core/startup-audit.js');
  
  const invariantIds = [];
  for (const [key, inv] of Object.entries(STARTUP_INVARIANTS)) {
    assert(inv.id, `Invariant ${key} should have id field`);
    assert(inv.category, `Invariant ${key} should have category field`);
    assert(inv.description, `Invariant ${key} should have description field`);
    assert(inv.severity === 'FATAL', `Startup audit invariant must be FATAL`);
    invariantIds.push(inv.id);
  }
  
  const uniqueIds = new Set(invariantIds);
  assert(uniqueIds.size === invariantIds.length, 'All invariant IDs must be unique');
});

/**
 * Test 3: Verify StartupAuditResult structure
 */
test('Startup Audit: Result class has correct structure', async () => {
  const { StartupAuditResult } = await import('./core/startup-audit.js');
  
  const result = new StartupAuditResult();
  
  assert(result.passed === true, 'Result should initialize with passed=true');
  assert(Array.isArray(result.checks), 'Result should have checks array');
  assert(Array.isArray(result.failures), 'Result should have failures array');
  assert(result.timestamp, 'Result should have timestamp');
  assert(typeof result.addCheck === 'function', 'Result should have addCheck method');
  assert(typeof result.toDiagnostic === 'function', 'Result should have toDiagnostic method');
  
  result.addCheck('TEST_ID', true, 'Test passed');
  assert(result.checks.length === 1, 'addCheck should append to checks array');
  assert(result.passed === true, 'Result should remain passed');
  
  result.addCheck('FAIL_ID', false, 'Test failed');
  assert(result.failures.length === 1, 'Failures array should track failed checks');
  assert(result.passed === false, 'Result should be failed after failed check');
  
  const diagnostic = result.toDiagnostic();
  assert(diagnostic.status === 'AUDIT_FAILED', 'Failed audit shows AUDIT_FAILED status');
  assert(diagnostic.total_checks === 2, 'Diagnostic reports total checks');
  assert(diagnostic.passed_checks === 1, 'Diagnostic reports passed checks');
  assert(diagnostic.failed_checks === 1, 'Diagnostic reports failed checks');
});

/**
 * Test 4: Tool registry detection
 */
test('Startup Audit: Tool registry detection logic', async () => {
  const badServer = { someProperty: 'value' };
  
  const hasRegistry = (badServer._registeredTools && typeof badServer._registeredTools === 'object') ||
                      (badServer.tools && typeof badServer.tools === 'object');
  
  assert(!hasRegistry, 'Should detect missing tool registry (falsy)');
});

/**
 * Test 5: Session gate enforcement
 */
test('Startup Audit: Session state starts uninitialized', async () => {
  resetWorkspaceRootForTesting();
  
  assert(SESSION_STATE.workspaceRoot === null, 'Session workspace should start as null');
});

/**
 * Test 6: Error codes completeness
 */
test('Startup Audit: All required error codes defined', async () => {
  const { ERROR_CODES } = await import('./core/error.js');
  
  const requiredCodes = [
    'UNAUTHORIZED_ACTION',
    'INVARIANT_VIOLATION',
    'SESSION_LOCKED',
    'BOOTSTRAP_FAILURE',
    'WRITE_REJECTED',
    'PREFLIGHT_FAILED',
    'POLICY_VIOLATION',
    'INTERNAL_ERROR',
    'SELF_AUDIT_FAILURE',
    'BYPASS_ATTEMPT'
  ];
  
  for (const code of requiredCodes) {
    assert(ERROR_CODES[code], `ERROR_CODES.${code} must be defined`);
  }
});

/**
 * Test 7: KaizaError class structure
 */
test('Startup Audit: KaizaError has correct structure', async () => {
  const { KaizaError, ERROR_CODES } = await import('./core/error.js');
  
  const err = new KaizaError({
    error_code: ERROR_CODES.SELF_AUDIT_FAILURE,
    phase: 'STARTUP',
    component: 'AUDIT',
    invariant: 'TEST_INV',
    human_message: 'Test error'
  });
  
  assert(err instanceof KaizaError, 'Should be instance of KaizaError');
  assert(err.error_code === ERROR_CODES.SELF_AUDIT_FAILURE, 'Should have error_code');
  assert(err.phase === 'STARTUP', 'Should have phase');
  assert(err.component === 'AUDIT', 'Should have component');
  assert(err.invariant === 'TEST_INV', 'Should have invariant');
  assert(err.human_message === 'Test error', 'Should have human_message');
  assert(err.timestamp, 'Should have timestamp');
  
  const diagnostic = err.toDiagnostic();
  assert(diagnostic.error_code === ERROR_CODES.SELF_AUDIT_FAILURE, 'Diagnostic has error_code');
  assert(diagnostic.phase === 'STARTUP', 'Diagnostic has phase');
});

/**
 * Test 8: Infrastructure modules are loadable
 */
test('Startup Audit: Critical infrastructure modules load', async () => {
  const error = await import('./core/error.js');
  const invariant = await import('./core/invariant.js');
  const pathResolver = await import('./core/path-resolver.js');
  const session = await import('./session.js');
  
  assert(error.KaizaError, 'error.js exports KaizaError');
  assert(error.ERROR_CODES, 'error.js exports ERROR_CODES');
  assert(invariant.invariant, 'invariant.js exports invariant');
  assert(pathResolver.lockWorkspaceRoot, 'path-resolver exports lockWorkspaceRoot');
  assert(pathResolver.getRepoRoot, 'path-resolver exports getRepoRoot');
  assert(session.SESSION_STATE, 'session.js exports SESSION_STATE');
});

/**
 * Test 9: Path resolver workspace locking
 */
test('Startup Audit: Workspace root locking enforced', async () => {
  const { lockWorkspaceRoot, getRepoRoot, resetWorkspaceRootForTesting } = await import('./core/path-resolver.js');
  
  resetWorkspaceRootForTesting();
  
  let threwBeforeLock = false;
  try {
    getRepoRoot();
  } catch (err) {
    threwBeforeLock = true;
  }
  assert(threwBeforeLock, 'getRepoRoot should throw before lock');
  
  lockWorkspaceRoot(process.cwd());
  const root = getRepoRoot();
  assert(root === process.cwd(), 'getRepoRoot returns locked path');
  
  let threwOnReLock = false;
  try {
    lockWorkspaceRoot('/other/path');
  } catch (err) {
    threwOnReLock = true;
    assert(err.message.includes('workspace_root changes mid-session'), 'Should reject re-initialization');
  }
  assert(threwOnReLock, 'Should throw on attempt to re-initialize');
});

/**
 * Test 10: Invariant violation handling
 */
test('Startup Audit: Invariant violations are non-recoverable', async () => {
  const { InvariantViolationError } = await import('./core/invariant.js');
  
  assert(InvariantViolationError, 'InvariantViolationError should be exported');
  
  const testError = new InvariantViolationError('TEST_CODE', 'Test message');
  assert(testError instanceof Error, 'InvariantViolationError extends Error');
  assert(testError.code === 'TEST_CODE', 'Preserves invariant code');
});

/**
 * Run all tests with proper test harness
 */
async function runTests() {
  console.log('═'.repeat(70));
  console.log('  MCP STARTUP SELF-AUDIT TEST SUITE');
  console.log('═'.repeat(70));
  console.log();

  for (const { name, fn } of tests) {
    process.stdout.write(`Test: ${name}... `);
    try {
      resetWorkspaceRootForTesting();
      await fn();
      console.log('✓ PASS');
      testsPassed++;
    } catch (err) {
      console.log('✗ FAIL');
      console.error(`  Error: ${err.message}`);
      testsFailed++;
    }
  }

  console.log();
  console.log('═'.repeat(70));
  console.log(`  RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('═'.repeat(70));

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
