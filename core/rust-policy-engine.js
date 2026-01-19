import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { KaizaError, ERROR_CODES } from './error.js';

/**
 * RUST STATIC ENFORCEMENT GATE
 * 
 * Pre-write Rust policy validation.
 * Detects forbidden patterns in *.rs files before they are committed.
 */

// Forbidden patterns that trigger hard-fail by default
const FORBIDDEN_PATTERNS = [
  { pattern: /\bunwrap\s*\(\s*\)/, name: 'unwrap()' },
  { pattern: /\bexpect\s*\(\s*/, name: 'expect()' },
  { pattern: /\bpanic\s*\!\s*\(/, name: 'panic!()' },
  { pattern: /\btodo\s*\!\s*\(/, name: 'todo!()' },
  { pattern: /\bunimplemented\s*\!\s*\(/, name: 'unimplemented!()' },
  { pattern: /\bunsafe\s*\{/, name: 'unsafe {} blocks' },
  { pattern: /\bstatic\s+mut\b/, name: 'static mut' },
  { pattern: /\bBox\s*::\s*leak\s*\(/, name: 'Box::leak' },
  { pattern: /\bunwrap_or\s*\(\s*_\s*\)/, name: 'unwrap_or(_)' },
  { pattern: /\bunwrap_or_default\s*\(\s*\)/, name: 'unwrap_or_default()' },
  { pattern: /\bcfg\s*\(\s*test\s*\)\s*(?!.*tests?\/|.*\.rs#\[cfg\(test\)\])/, name: 'cfg(test) in non-test modules' },
];

// Pattern to detect ignored Results
const IGNORED_RESULT_PATTERN = /let\s+_\s*=\s+[^;]+\?;/g;

/**
 * Scan Rust file for forbidden patterns
 * @param {string} content - File content
 * @param {string} filePath - File path (to determine context like test module)
 * @param {object} allowedPatterns - Set of patterns explicitly allowed in plan
 * @returns {object} { violations: Array<string>, allowed: boolean }
 */
export function scanRustForForbiddenPatterns(content, filePath, allowedPatterns = new Set()) {
  const violations = [];
  const isTestFile = filePath.includes('.rs') && (
    filePath.includes('tests/') || 
    filePath.includes('test.rs') ||
    filePath.includes('_test.rs')
  );

  // Split into lines for tracking
  const lines = content.split('\n');

  // Check each forbidden pattern
  for (const { pattern, name } of FORBIDDEN_PATTERNS) {
    // Skip cfg(test) checks in test modules
    if (name === 'cfg(test) in non-test modules' && isTestFile) {
      continue;
    }

    // Skip patterns explicitly allowed
    if (allowedPatterns.has(name)) {
      continue;
    }

    // Find matches
    let match;
    const regex = new RegExp(pattern.source, 'g');
    let lineNum = 1;
    let charPos = 0;

    while ((match = regex.exec(content)) !== null) {
      // Count newlines up to match position
      charPos = match.index;
      lineNum = content.substring(0, charPos).split('\n').length;

      // Check if in comment (simple heuristic)
      const line = lines[lineNum - 1];
      const commentPos = line.indexOf('//');
      const matchPosInLine = match.index - content.substring(0, charPos).lastIndexOf('\n') - 1;
      
      if (commentPos !== -1 && matchPosInLine > commentPos) {
        // In comment, skip
        continue;
      }

      violations.push({
        pattern: name,
        line: lineNum,
        context: line.trim()
      });
    }
  }

  // Check for ignored Results
  if (!allowedPatterns.has('ignored Result')) {
    let match;
    while ((match = IGNORED_RESULT_PATTERN.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];
      violations.push({
        pattern: 'ignored Result',
        line: lineNum,
        context: line.trim()
      });
    }
  }

  return {
    violations,
    allowed: violations.length === 0
  };
}

/**
 * Rust Error-Handling Validation
 * Ensures Rust code uses Result<T, SystemError> pattern
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {object} { violations: Array<string>, allowed: boolean }
 */
export function validateRustErrorHandling(content, filePath) {
  const violations = [];
  const lines = content.split('\n');

  // Detect function signatures that return Option<T> without justification
  const optionReturnPattern = /fn\s+\w+\s*\([^)]*\)\s*->\s*Option\s*<[^>]+>/g;
  let match;

  while ((match = optionReturnPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const context = lines[lineNum - 1];

    // Exclude known acceptable Option uses (like getters in tests)
    if (!context.includes('test') && !context.includes('#[')) {
      violations.push({
        pattern: 'function returns Option<T>',
        line: lineNum,
        context: context.trim(),
        reason: 'Use Result<T, SystemError> for meaningful failures'
      });
    }
  }

  // Detect Result<T, Box<dyn Error>>
  // Look for Box followed by dyn and Error (accounting for nested generics)
  const boxErrorPattern = /Box\s*<\s*dyn\s+[^>]*Error/g;
  while ((match = boxErrorPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1];
    
    // Verify it's in a Result context
    if (line.includes('Result')) {
      violations.push({
        pattern: 'Result<T, Box<dyn Error>>',
        line: lineNum,
        context: line.trim(),
        reason: 'Use canonical error type from crate'
      });
    }
  }

  return {
    violations,
    allowed: violations.length === 0
  };
}

/**
 * Run Cargo fmt check
 * @param {string} repoRoot - Repository root
 * @returns {boolean} true if format is correct
 */
export function runCargoFmtCheck(repoRoot) {
  try {
    execSync('cargo fmt --check', {
      cwd: repoRoot,
      stdio: 'pipe',
      timeout: 30000
    });
    return true;
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    throw new KaizaError({
      error_code: ERROR_CODES.PREFLIGHT_FAILED,
      phase: 'VERIFICATION',
      component: 'RUST_CARGO_FMT',
      invariant: 'CODE_STYLE',
      human_message: `cargo fmt --check failed:\n${stdout}\n${stderr}`
    });
  }
}

/**
 * Run Cargo clippy with deny warnings
 * @param {string} repoRoot - Repository root
 * @returns {boolean} true if clippy passes
 */
export function runCargoClippy(repoRoot) {
  try {
    execSync('cargo clippy -- -D warnings', {
      cwd: repoRoot,
      stdio: 'pipe',
      timeout: 60000
    });
    return true;
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    throw new KaizaError({
      error_code: ERROR_CODES.PREFLIGHT_FAILED,
      phase: 'VERIFICATION',
      component: 'RUST_CLIPPY',
      invariant: 'LINT_COMPLIANCE',
      human_message: `cargo clippy -- -D warnings failed:\n${stdout}\n${stderr}`
    });
  }
}

/**
 * Run Cargo build
 * @param {string} repoRoot - Repository root
 * @returns {boolean} true if build succeeds
 */
export function runCargoBuild(repoRoot) {
  try {
    execSync('cargo build', {
      cwd: repoRoot,
      stdio: 'pipe',
      timeout: 120000
    });
    return true;
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    throw new KaizaError({
      error_code: ERROR_CODES.PREFLIGHT_FAILED,
      phase: 'VERIFICATION',
      component: 'RUST_BUILD',
      invariant: 'COMPILATION',
      human_message: `cargo build failed:\n${stdout}\n${stderr}`
    });
  }
}

/**
 * Verify Rust compiler flags in Cargo.toml
 * Ensures deny attributes are set
 * @param {string} repoRoot - Repository root
 * @returns {object} { violations: Array<string>, allowed: boolean }
 */
export function verifyCargoLintFlags(repoRoot) {
  const violations = [];
  const cargoTomlPath = path.join(repoRoot, 'Cargo.toml');

  if (!fs.existsSync(cargoTomlPath)) {
    // Not a Rust project, skip
    return { violations: [], allowed: true };
  }

  const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

  // Check for required deny attributes
  const requiredDenyList = [
    'deny(unsafe_code)',
    'deny(clippy::unwrap_used)',
    'deny(clippy::expect_used)',
    'deny(clippy::panic)'
  ];

  // Look for these in lib.rs or main.rs at the top
  const libRsPath = path.join(repoRoot, 'src', 'lib.rs');
  const mainRsPath = path.join(repoRoot, 'src', 'main.rs');

  let sourceContent = '';
  if (fs.existsSync(libRsPath)) {
    sourceContent += fs.readFileSync(libRsPath, 'utf8');
  }
  if (fs.existsSync(mainRsPath)) {
    sourceContent += fs.readFileSync(mainRsPath, 'utf8');
  }

  for (const deny of requiredDenyList) {
    if (!sourceContent.includes(`#![${deny}]`)) {
      violations.push({
        pattern: deny,
        reason: `Missing #![${deny}] attribute in lib.rs or main.rs`
      });
    }
  }

  return {
    violations,
    allowed: violations.length === 0
  };
}

/**
 * Master Rust validation gate (called from write_file)
 * @param {string} filePath - File being written
 * @param {string} content - Content being written
 * @param {string} repoRoot - Repository root
 * @param {object} planAllowances - Patterns allowed by plan { allowed: Set<string> }
 * @throws {KaizaError} if validation fails
 */
export function enforceRustPolicy(filePath, content, repoRoot, planAllowances = {}) {
  // Only check .rs files
  if (!filePath.endsWith('.rs')) {
    return { passed: true };
  }

  const allowedPatterns = planAllowances.allowed || new Set();

  // GATE 1: Forbidden patterns
  const patternResult = scanRustForForbiddenPatterns(content, filePath, allowedPatterns);
  if (!patternResult.allowed) {
    const details = patternResult.violations
      .map(v => `  Line ${v.line}: ${v.pattern}\n    Context: ${v.context}`)
      .join('\n');
    
    throw new KaizaError({
      error_code: ERROR_CODES.POLICY_VIOLATION,
      phase: 'EXECUTION',
      component: 'RUST_STATIC_GATE',
      invariant: 'FORBIDDEN_PATTERNS',
      human_message: `Rust static enforcement gate blocked write:\n${details}\n\nForbidden patterns detected. Plan must explicitly allow these patterns.`
    });
  }

  // GATE 2: Error handling compliance
  const errorResult = validateRustErrorHandling(content, filePath);
  if (!errorResult.allowed) {
    const details = errorResult.violations
      .map(v => `  Line ${v.line}: ${v.pattern}\n    Context: ${v.context}\n    Reason: ${v.reason}`)
      .join('\n');
    
    throw new KaizaError({
      error_code: ERROR_CODES.POLICY_VIOLATION,
      phase: 'EXECUTION',
      component: 'RUST_ERROR_GATE',
      invariant: 'ERROR_HANDLING',
      human_message: `Rust error-handling law violation:\n${details}`
    });
  }

  return { passed: true };
}

/**
 * Run all Rust verification gates (post-write)
 * Enforces: cargo fmt, cargo clippy, cargo build, compiler flags
 * @param {string} repoRoot - Repository root
 * @throws {KaizaError} if any gate fails
 */
export function runRustVerificationGates(repoRoot) {
  // Check if this is a Rust project
  const cargoTomlPath = path.join(repoRoot, 'Cargo.toml');
  if (!fs.existsSync(cargoTomlPath)) {
    // Not a Rust project, skip
    return { passed: true };
  }

  const results = {
    fmt: false,
    clippy: false,
    build: false,
    flags: false
  };

  try {
    // GATE 1: cargo fmt --check
    runCargoFmtCheck(repoRoot);
    results.fmt = true;
  } catch (err) {
    throw err; // Fail fast
  }

  try {
    // GATE 2: cargo clippy -- -D warnings
    runCargoClippy(repoRoot);
    results.clippy = true;
  } catch (err) {
    throw err; // Fail fast
  }

  try {
    // GATE 3: cargo build
    runCargoBuild(repoRoot);
    results.build = true;
  } catch (err) {
    throw err; // Fail fast
  }

  try {
    // GATE 4: Verify compiler deny flags
    const flagResult = verifyCargoLintFlags(repoRoot);
    if (!flagResult.allowed) {
      const details = flagResult.violations
        .map(v => `  ${v.pattern}: ${v.reason}`)
        .join('\n');
      
      throw new KaizaError({
        error_code: ERROR_CODES.POLICY_VIOLATION,
        phase: 'VERIFICATION',
        component: 'RUST_COMPILER_FLAGS',
        invariant: 'DENY_ATTRIBUTES',
        human_message: `Missing required Rust compiler deny attributes:\n${details}`
      });
    }
    results.flags = true;
  } catch (err) {
    throw err;
  }

  return { passed: true, results };
}
