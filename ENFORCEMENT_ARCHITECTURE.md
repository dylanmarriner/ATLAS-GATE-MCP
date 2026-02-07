# Enforcement Architecture: Windsurf-Hooker + ATLAS-GATE MCP

## Complete Defense-in-Depth System

```
┌──────────────────────────────────────────────────────────────────┐
│                      WINDSURF IDE (Client)                       │
│              User writes code + calls MCP tools                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  PRE-EXECUTION GATES           │
                │ (Windsurf-Hooker Hooks)        │
                ├────────────────────────────────┤
                │ 1. pre_user_prompt_gate        │ ✅ Verify canonical prompt
                │ 2. pre_intent_classification   │ ✅ Intent validation
                │ 3. pre_plan_resolution         │ ✅ Plan authorization
                │ 4. pre_mcp_tool_use_atlas_gate │ ✅ Tool allowlist
                │ 5. pre_run_command_kill_switch │ ✅ Command blocking
                │ 6. pre_write_code_escape_      │ ✅ subprocess/socket/etc
                │    detection                   │
                │ 7. pre_write_code_policy       │ ✅ Prohibited patterns
                │ 8. pre_write_completeness      │ ✅ NEW: No TODOs/stubs
                │ 9. pre_write_comprehensive_    │ ✅ NEW: Documentation
                │    comments                    │
                │ 10. pre_write_diff_quality     │ ⚠️  Quality warnings
                │ 11. pre_filesystem_write       │ ✅ Path validation
                │ 12. pre_filesystem_write_      │ ✅ Boundary enforcement
                │     atlas_enforcement          │
                └───────────────┬────────────────┘
                                │ (Code passes all gates)
                ┌───────────────▼────────────────┐
                │  TRANSMISSION                  │
                │  MCP Protocol → Server         │
                └───────────────┬────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────┐
│                    ATLAS-GATE MCP (Server)                    │
│            Post-Transmission Enforcement Gates                │
├─────────────────────────────────────────────────────────────────┤
│ Tool: write_file (WINDSURF only)                               │
│                                                                 │
│ GATE 0: prompt_gate                                            │
│   Verify canonical prompt context (WINDSURF_CANONICAL)        │
│                                                                │
│ GATE 1: intent_authority                                       │
│   Intent commentary + metadata validation                     │
│                                                                │
│ GATE 1.1: input_validation                                    │
│   Path normalization, type checking                           │
│                                                                │
│ GATE 2: plan_enforcement                                      │
│   Verify plan exists and authorizes file path                 │
│                                                                │
│ GATE 2.5: write_time_policy (FAIL-CLOSED)                     │
│   Universal denylist (TODOs, empty catches, etc.)            │
│   Language-specific rules                                     │
│                                                                │
│ GATE 3: role_validation                                       │
│   Metadata extraction and validation                          │
│                                                                │
│ GATE 3.5: rust_static_enforcement (for .rs files)             │
│   Forbidden patterns, error handling (Rust-specific)          │
│                                                                │
│ GATE 4: enterprise_code_enforcement (OBJECTIVE 3)             │
│   detectStubs() - Final check for stubs/mocks/TODOs          │
│                                                                │
│ GATE 4.5: preflight_check                                     │
│   Run tests/lints - Code must pass                            │
│   If fails: REVERT and reject                                 │
│                                                                │
│ GATE 5: audit_logging                                         │
│   Record write to append-only audit log                       │
│                                                                │
│ ✅ Workspace unlocked + Code in production                     │
└───────────────────────────────────────────────────────────────┘
```

---

## Enforcement By Category

### Boundary Enforcement (Execution Prevention)

| Gate | Enforcer | Catches |
|------|----------|---------|
| `pre_run_command_kill_switch` | Windsurf Hook | All shell commands if `execution_only` |
| `pre_write_code_escape_detection` | Windsurf Hook | subprocess, socket, os.system, exec, eval |
| `pre_mcp_tool_use_atlas_gate` | Windsurf Hook | Non-ATLAS-GATE tools |
| Process sandbox | ATLAS-GATE (`mcp-sandbox.js`) | Direct filesystem/module access |

### Code Quality Enforcement

| Gate | Enforcer | Catches |
|------|----------|---------|
| `pre_write_code_policy` | Windsurf Hook | Prohibited patterns (configurable) |
| `pre_write_completeness` | Windsurf Hook | TODOs, FIXMEs, stubs, placeholders |
| `pre_write_comprehensive_comments` | Windsurf Hook | Missing docstrings, insufficient comments |
| `pre_write_diff_quality` | Windsurf Hook | Large diffs, too many concerns |
| `GATE 2.5: write_time_policy` | ATLAS-GATE Server | Language-specific rules (Rust unwrap, TS any) |
| `GATE 4: enterprise_code` | ATLAS-GATE Server | Final stub/mock/TODO validation |

### Authority Enforcement

| Gate | Enforcer | Validates |
|------|----------|-----------|
| `pre_plan_resolution` | Windsurf Hook | Plan file exists in repo |
| `GATE 2: plan_enforcement` | ATLAS-GATE Server | Plan authorizes write, hash verification |
| `GATE 3: role_validation` | ATLAS-GATE Server | Role metadata correctness |
| `GATE 5: audit_logging` | ATLAS-GATE Server | Canonical audit trail |

### Workspace Integrity

| Gate | Enforcer | Validates |
|------|----------|-----------|
| `pre_filesystem_write` | Windsurf Hook | Basic path validation |
| `pre_filesystem_write_atlas_enforcement` | Windsurf Hook | Forbidden paths, binary blobs |
| `GATE 4.5: preflight_check` | ATLAS-GATE Server | Tests/lints pass, build not broken |

---

## Example Flow: "Write User Validation Function"

```
User: "Write a function to validate email addresses"

┌─── WINDSURF HOOKS ───────────────────────────────────┐
│                                                       │
│ 1. pre_intent_classification                        │
│    → Intent detected: "Write code" ✅               │
│                                                       │
│ 2. pre_plan_resolution                              │
│    → Plan exists: docs/plans/auth-system.md ✅     │
│                                                       │
│ 3. pre_mcp_tool_use_atlas_gate                       │
│    → Tool: write_file (ATLAS-GATE registered) ✅   │
│                                                       │
│ 4. User writes code:                                 │
│    def validate_email(email):                        │
│        # TODO: implement                             │
│        return False                                  │
│                                                       │
│ 5. pre_write_code_escape_detection                   │
│    → No subprocess/socket/exec ✅                    │
│                                                       │
│ 6. pre_write_code_policy                             │
│    → Check prohibited patterns                        │
│    → "TODO" found in code! ❌ BLOCKED                │
│    "Code contains incomplete markers (TODO)"         │
│                                                       │
│ User sees error immediately in IDE               │
└───────────────────────────────────────────────────────┘

⏸ Iteration: User removes TODO, adds implementation

┌─── WINDSURF HOOKS (Attempt 2) ───────────────────────┐
│                                                       │
│ User's revised code:                                 │
│    def validate_email(email: str) -> bool:           │
│        """Validate email using RFC 5322 pattern."""  │
│        pattern = r"^[a-z0-9._%+-]+@[a-z]+"          │
│        return bool(re.match(pattern, email))        │
│                                                       │
│ 5. pre_write_code_escape_detection ✅ PASS          │
│ 6. pre_write_code_policy ✅ PASS                     │
│ 7. pre_write_completeness                            │
│    → No TODOs/FIXMEs/stubs ✅ PASS                  │
│                                                       │
│ 8. pre_write_comprehensive_comments                  │
│    → Function has docstring ✅                       │
│    → Documentation explains purpose ✅              │
│    → Variable names meaningful (email, pattern) ✅  │
│    → Logic clear and simple ✅ PASS                 │
│                                                       │
│ 9. pre_write_diff_quality ✅ PASS (small change)    │
│                                                       │
│ ✅ ALL WINDSURF GATES PASS                           │
│                                                       │
│ → Transmit to ATLAS-GATE MCP Server                  │
└───────────────────────────────────────────────────────┘

┌─── ATLAS-GATE SERVER ────────────────────────────────┐
│                                                       │
│ GATE 0: prompt_gate                                  │
│   Verify WINDSURF_CANONICAL prompt ✅               │
│                                                       │
│ GATE 1: intent_authority                            │
│   Intent provided: "Validate email addresses" ✅    │
│                                                       │
│ GATE 2: plan_enforcement                            │
│   Plan: docs/plans/auth-system.md ✅                │
│   Authorizes write to src/auth/validators.py ✅    │
│                                                       │
│ GATE 2.5: write_time_policy                         │
│   No escape patterns ✅                              │
│   No TODOs ✅                                        │
│   Language: Python (no Rust rules) ✅               │
│                                                       │
│ GATE 3: role_validation                             │
│   Role: EXECUTABLE (matches write) ✅               │
│                                                       │
│ GATE 4: enterprise_code_enforcement                 │
│   detectStubs() - No stubs/mocks/TODOs ✅           │
│                                                       │
│ GATE 4.5: preflight_check                           │
│   Run tests: test_validators.py passes ✅           │
│   Lint: flake8 passes ✅                            │
│                                                       │
│ GATE 5: audit_logging                               │
│   Write to audit log ✅                              │
│   Hash chain verified ✅                             │
│                                                       │
│ ✅ WRITE ACCEPTED                                    │
│ File: src/auth/validators.py                         │
│ Status: In production                                │
└───────────────────────────────────────────────────────┘

Result: Email validation function deployed safely.
All enforcement gates passed.
```

---

## Key Design Properties

### 1. Defense-in-Depth
- **Client-side** (Windsurf): Fast feedback, developer-centric
- **Server-side** (ATLAS-GATE): Authoritative, forensic
- **Both required** to pass (AND logic, not OR)

### 2. Shift-Left Enforcement
- 80% of gates run at IDE (Windsurf hooks)
- 20% at server (ATLAS-GATE gates)
- Fail fast, iterate quickly

### 3. No Fallback Paths
- If any gate blocks, code is rejected
- No "warning and proceed"
- No privilege escalation

### 4. Complementary Coverage
- Windsurf hooks: Broad patterns, configurable
- ATLAS-GATE gates: Deep validation, authoritative
- Together: Comprehensive coverage

### 5. Audit Trail
- Every attempt logged (Windsurf-side)
- Every write recorded (ATLAS-GATE-side)
- Full forensic history

---

## Configuration Points

### Windsurf-Hooker Policy
**File:** `/windsurf-hooker/windsurf/policy/policy.json`

```json
{
  "execution_profile": "standard",          // or "execution_only" or "locked"
  "mcp_tool_allowlist": [...],              // Tools permitted
  "block_commands_regex": [".*"],           // Commands to block
  "prohibited_patterns": {                  // Denylist patterns
    "placeholders": [...],
    "mock_artifacts": [...],
    "escape_attempts": [...]
  }
}
```

### ATLAS-GATE MCP Policy
**File:** `(kernel level, not configurable per-repo)`

Enforced in:
- `core/write-time-policy-engine.js`
- `core/stub-detector.js`
- `core/preflight.js`
- `core/plan-enforcer.js`

---

## Enforcement Checklist

- [x] No code without intent/commentary
- [x] No shell execution (execution_only mode)
- [x] No subprocess/socket/exec/eval
- [x] No prohibited patterns (configurable)
- [x] No TODOs, FIXMEs, stubs
- [x] All functions documented
- [x] Complex code has inline comments
- [x] Meaningful variable names
- [x] Code passes tests (preflight)
- [x] Plan authorized the change
- [x] Role metadata valid
- [x] Audit trail recorded

---

## What Gets Blocked?

### At Windsurf Hooks (Fast Feedback)
- Missing intent/commentary
- TODOs, FIXMEs, stubs
- Escape primitives (subprocess, etc.)
- Non-existent plans
- Non-ATLAS-GATE tools
- Missing documentation
- Shell commands (if execution_only)

### At ATLAS-GATE Server (Final Authority)
- Plan hash mismatch
- Role metadata incorrect
- Language-specific violations
- Preflight tests fail
- Suspicious file writes

### Never Allowed (Both Layers)
- Code without explanation
- Stub implementations
- Execution primitives (in execution_only)
- Plan violations
- Broken tests

---

## Status: Complete Defense-in-Depth

✅ **Windsurf-Hooker:** Pre-execution enforcement (6 hooks → 10 hooks)
✅ **ATLAS-GATE MCP:** Post-transmission enforcement (5 gates)
✅ **Together:** Comprehensive code quality + security system
