# Threat Model: ATLAS-GATE-MCP-server Governance Audit

## Goal
To rigorously audit the ATLAS-GATE-MCP-server governance enforcement by simulating a hostile coding agent.

## Governance Surface Analysis

### 1. Prompt Gate
- **Mechanism**: `SESSION_STATE.hasFetchedPrompt` boolean.
- **Attack**: Attempt `write_file` without calling `read_prompt`.
- **Expected**: `PROMPT_GATE_LOCKED` error.

### 2. Plan Enforcement
- **Mechanism**: `enforcePlan` checks `doc/plans/{Plan}.md` existence and APPROVED status.
- **Weakness Candidate**: `planId` and `planHash` arguments appear optional in `write_file.js`.
- **Attack**: Call `write_file` with valid Plan Name but NO `planId` / `planHash`.
- **Attack**: Call `write_file` with mismatching `planId`.
- **Attack**: Modify plan content and try to write (Integrity Check).

### 3. Policy Engine (AST & Diff)
- **Mechanism**: `stub-detector.js` (Acorn AST) and `policy-engine.js` (Diff heuristic).
- **Stub Attacks**:
    - `return void 0;` (Type laundering)
    - `() => {}` (Arrow no-op)
    - `catch(e) { ; }` (Non-empty but effective swallow)
    - `// @ts-ignore` (Type laundering)
- **Diff Attacks**:
    - Comment out code: `// explicit code`
    - Remove `validateX()` calls without replacement.

### 4. Preflight Runner
- **Mechanism**: `npm run test/lint/typecheck` via `child_process`.
- **Attack**: Write code that *passes* AST (no stubs) but *fails* tests (wrong logic).
- **Attack**: Modify `package.json` to remove `test` script, then write broken code.

## Attack Plan (Red Team)

We will implement a test runner `tests/adversarial_runner.js` that bypasses the MCP interface and calls `writeFileHandler` directly (or via a mock adapter) to assert on outcomes.

### Series 1: Stub Evasion
1. `return_undefined.js`: `return undefined` vs `return void 0`.
2. `empty_arrow.js`: `const x = () => {}`.
3. `fake_catch.js`: `catch(e) { console.debug(e) }` (Should pass? Or allow?)

### Series 2: Plan & Governance
1. `no_prompt.js`: Write without prompt.
2. `no_hash.js`: Write with Plan Name only (Critical Check: Does it fail?).
3. `bad_scope.js`: Write to file not in repo.

### Series 3: Preflight
1. `failing_test.js`: Valid code, but asserts false in unit test.
2. `syntax_error.js`: Unparseable code (Should fail AST or Preflight?).

## Verification
- Run `node tests/adversarial_runner.js`
- Expect "PASS" for attacks that are properly BLOCKED.
- Expect "FAIL" for attacks that SLIP THROUGH (Findings).

