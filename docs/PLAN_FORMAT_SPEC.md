# ATLAS-GATE Plan Format Specification

**Authority**: ATLAS-GATE-v2 Governance System  
**Status**: PRODUCTION  
**Last Updated**: 2026-03-11

---

## Overview

All plans in ATLAS-GATE MCP are **strict JSON objects**. This specification defines the canonical structure that:

- ANTIGRAVITY creates and signs
- plan-linter validates
- save_plan persists
- WINDSURF executes

---

## Top-Level Structure

Plans MUST be valid JSON objects with exactly 10 required top-level keys (in any order):

```json
{
  "atlas_gate_plan_signature": "",
  "role": "ANTIGRAVITY",
  "status": "APPROVED",
  "plan_metadata": { /* ... */ },
  "scope_and_constraints": { /* ... */ },
  "phase_definitions": [ /* ... */ ],
  "path_allowlist": [ /* ... */ ],
  "verification_gates": [ /* ... */ ],
  "forbidden_actions": [ /* ... */ ],
  "rollback_failure_policy": { /* ... */ }
}
```

### Key Descriptions

| Key | Type | Purpose | Notes |
|-----|------|---------|-------|
| `atlas_gate_plan_signature` | string | Cryptographic signature (base64) | Empty string `""` before signing; filled by `save_plan` |
| `role` | string | Actor role that created plan | MUST be `"ANTIGRAVITY"` |
| `status` | string | Plan readiness state | MUST be `"APPROVED"` |
| `plan_metadata` | object | Plan identity and version info | See section below |
| `scope_and_constraints` | object | Boundary conditions and rules | See section below |
| `phase_definitions` | array | Execution phases (minimum 1) | See section below |
| `path_allowlist` | array | Allowed file paths | Workspace-relative, no `/`, no `..` |
| `verification_gates` | array | Verification commands/gates | String descriptions |
| `forbidden_actions` | array | Explicit prohibitions | String descriptions |
| `rollback_failure_policy` | object | Failure recovery procedure | See section below |

---

## Section 1: plan_metadata

**Required fields**: All 5 are mandatory

```json
"plan_metadata": {
  "plan_id": "PLAN_AUTH_V1",
  "version": "1.0.0",
  "author": "ANTIGRAVITY",
  "timestamp": "2026-03-11T12:00:00Z",
  "governance": "ATLAS-GATE-v2"
}
```

### Field Details

| Field | Type | Constraints | Example |
|-------|------|-----------|---------|
| `plan_id` | string | Unique identifier, alphanumeric + underscore | `PLAN_AUTH_JWT_V1` |
| `version` | string | Semantic version (MAJOR.MINOR.PATCH) | `1.0.0` |
| `author` | string | Creator identifier | `ANTIGRAVITY` or email |
| `timestamp` | string | ISO 8601 UTC timestamp | `2026-03-11T12:00:00Z` |
| `governance` | string | MUST be exactly | `ATLAS-GATE-v2` |

---

## Section 2: scope_and_constraints

**Required fields**: All 4 are mandatory

```json
"scope_and_constraints": {
  "objective": "Implement JWT authentication middleware...",
  "affected_files": [
    "src/middleware/auth.js: Create JWT validation module",
    "tests/auth.test.js: Add comprehensive test coverage"
  ],
  "out_of_scope": [
    "Database migrations",
    "User registration endpoints"
  ],
  "constraints": [
    "MUST use jsonwebtoken library",
    "MUST NOT expose private keys",
    "MUST validate token expiration"
  ]
}
```

### Field Details

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| `objective` | string | Plain English (no code symbols) | Describes what plan accomplishes |
| `affected_files` | array of strings | `"path: description"` format recommended | Lists files that will be modified |
| `out_of_scope` | array of strings | Plain English | Explicitly lists what's NOT covered |
| `constraints` | array of strings | Start with `MUST` or `MUST NOT` | Binary enforcement language |

### Validation Rules

**objective field**:

- MUST NOT contain code symbols: `function`, `const`, `let`, `var`, `{}`, `=>`, etc.
- MUST NOT contain backticks or template syntax `${...}`
- Minimum 30 characters
- Plain English only

**constraints field**:

- MUST use binary language: `MUST` or `MUST NOT` (not `should`, `may`, `optional`)
- Each constraint is a string (not object)
- Minimum 1 constraint

---

## Section 3: phase_definitions

**Structure**: Array of phase objects (minimum 1 phase)

```json
"phase_definitions": [
  {
    "phase_id": "PHASE_IMPLEMENTATION",
    "objective": "Implement JWT authentication...",
    "allowed_operations": ["write_file", "read_file"],
    "forbidden_operations": ["delete_file"],
    "required_intent_artifacts": [
      "src/middleware/auth.js.intent.md",
      "tests/auth.test.js.intent.md"
    ],
    "verification_commands": [
      "npm test -- tests/auth.test.js",
      "npm run lint src/middleware/"
    ],
    "expected_outcomes": [
      "All tests pass",
      "No linting errors",
      "JWT validation works"
    ],
    "failure_stop_conditions": [
      "Any test fails",
      "Linting errors detected",
      "Code contains TODO or stub"
    ]
  }
]
```

### Field Details

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| `phase_id` | string | `^[A-Z0-9_]+$` only | Uppercase, numbers, underscores |
| `objective` | string | Plain English (no code symbols) | What this phase accomplishes |
| `allowed_operations` | array | String verbs | `["write_file", "read_file"]` |
| `forbidden_operations` | array | String verbs | `["delete_file", "execute_shell"]` |
| `required_intent_artifacts` | array | `<path>.intent.md` format | Files requiring intent artifacts |
| `verification_commands` | array | Shell command strings | Real commands executable in workspace |
| `expected_outcomes` | array | Plain English strings | What success looks like |
| `failure_stop_conditions` | array | Plain English strings | When to halt and rollback |

### Validation Rules

**phase_id**:

- MUST match regex: `^[A-Z0-9_]+$`
- Examples: `PHASE_001`, `PHASE_IMPLEMENTATION`, `GATE_VALIDATION`
- MUST be unique across phases

**allowed_operations / forbidden_operations**:

- Both are arrays of strings
- No nesting or objects
- Examples: `write_file`, `read_file`, `delete_file`, `execute_shell`

**required_intent_artifacts**:

- Each entry MUST be `<workspace_relative_path>.intent.md`
- Example: `src/auth.js.intent.md` (NOT `src/auth.js`)
- The corresponding target file must be in `path_allowlist`

**verification_commands**:

- Real shell commands that can be run via bash
- Must be deterministic (same input = same output)
- Common examples: `npm test`, `npm run lint`, `cargo build`

---

## Section 4: path_allowlist

**Type**: Array of strings

```json
"path_allowlist": [
  "src/middleware/",
  "src/routes/protected.js",
  "tests/auth.test.js",
  "docs/API_AUTH.md"
]
```

### Validation Rules

- MUST be workspace-relative (no leading `/`)
- MUST NOT contain `..` (parent directory traversal)
- MUST NOT contain `${...}` (unresolved variables)
- Can include directories (with `/` suffix) or specific files
- All writes during execution MUST touch only paths in this list

---

## Section 5: verification_gates

**Type**: Array of string descriptions

```json
"verification_gates": [
  "GATE_SYNTAX: All JavaScript files parse without syntax errors",
  "GATE_LINT: ESLint passes with 0 warnings",
  "GATE_TEST: All tests pass 100%",
  "GATE_COVERAGE: Code coverage >= 90%"
]
```

### Structure

Each gate is a `"GATE_<NAME>: description"` string:

- Gate name in uppercase
- Colon separator
- Human-readable description
- No code symbols in description

---

## Section 6: forbidden_actions

**Type**: Array of string descriptions

```json
"forbidden_actions": [
  "Modify files outside path_allowlist",
  "Delete files unless explicitly authorized",
  "Write stub code (TODO, FIXME, mock implementations)",
  "Skip required verification commands",
  "Hardcode secrets or private keys"
]
```

### Structure

Each action is a plain English prohibition:

- Uses imperative language ("Modify", "Delete", "Write")
- Clear consequence if violated
- No code symbols

---

## Section 7: rollback_failure_policy

**Required fields**: All 3 are mandatory

```json
"rollback_failure_policy": {
  "automatic_rollback_triggers": [
    "Any verification command fails",
    "File written outside path_allowlist",
    "Signature verification fails"
  ],
  "rollback_procedure": [
    "git checkout HEAD -- src/ tests/",
    "Delete any newly created files",
    "Verify workspace clean: git status"
  ],
  "recovery_steps": [
    "Review audit-log.jsonl for root cause",
    "Fix the failing code or tests",
    "Re-run linting locally before resubmitting",
    "Create new plan and resubmit to ANTIGRAVITY"
  ]
}
```

### Field Details

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| `automatic_rollback_triggers` | array | Conditions that trigger rollback | If ANY occur → STOP + ROLLBACK |
| `rollback_procedure` | array | Step-by-step revert instructions | Shell commands or git operations |
| `recovery_steps` | array | How to fix and resubmit | Human guidance for operator |

---

## Content Restrictions

### Forbidden in Plan Content (anywhere)

**Stub/Incomplete Markers** (case-insensitive):

- `TODO`, `FIXME`, `XXX`, `HACK`
- `stub`, `mock`, `placeholder`, `TBD`, `WIP`

**Ambiguous Language**:

- `may`, `should`, `if possible`, `use best judgment`
- `optional`, `try to`, `attempt to`

**Code Symbols in Objectives/Descriptions**:

- `function`, `const`, `let`, `var` (code keywords)
- `${...}` (unresolved variables)
- Backticks, braces, semicolons in plain-English fields

### Validator Behavior

The `plan-linter` will **REJECT** (ERROR severity) any plan containing:

- Stub patterns (anywhere in JSON content)
- Ambiguous language (anywhere in JSON content)
- Code symbols in `objective` fields
- Invalid `phase_id` format
- Missing required fields
- Wrong data types

---

## Example: Complete Minimal Plan

```json
{
  "atlas_gate_plan_signature": "",
  "role": "ANTIGRAVITY",
  "status": "APPROVED",
  "plan_metadata": {
    "plan_id": "PLAN_EXAMPLE_V1",
    "version": "1.0.0",
    "author": "ANTIGRAVITY",
    "timestamp": "2026-03-11T12:00:00Z",
    "governance": "ATLAS-GATE-v2"
  },
  "scope_and_constraints": {
    "objective": "Create a new utility module for text processing with comprehensive tests.",
    "affected_files": [
      "src/utils/text.js: Core text processing functions",
      "tests/text.test.js: Test suite with 95%+ coverage"
    ],
    "out_of_scope": [
      "Performance optimization",
      "Unicode edge cases"
    ],
    "constraints": [
      "MUST NOT modify existing API",
      "MUST include JSDoc comments",
      "MUST pass all tests"
    ]
  },
  "phase_definitions": [
    {
      "phase_id": "PHASE_IMPLEMENTATION",
      "objective": "Implement text processing module and tests.",
      "allowed_operations": ["write_file", "read_file"],
      "forbidden_operations": ["delete_file"],
      "required_intent_artifacts": [
        "src/utils/text.js.intent.md",
        "tests/text.test.js.intent.md"
      ],
      "verification_commands": [
        "npm test",
        "npm run lint"
      ],
      "expected_outcomes": [
        "All tests pass",
        "No linting errors"
      ],
      "failure_stop_conditions": [
        "Test failure",
        "Linting errors"
      ]
    }
  ],
  "path_allowlist": [
    "src/utils/text.js",
    "tests/text.test.js"
  ],
  "verification_gates": [
    "GATE_SYNTAX: Files parse without errors",
    "GATE_TEST: npm test passes 100%",
    "GATE_LINT: npm run lint passes with 0 errors"
  ],
  "forbidden_actions": [
    "Modify files outside path_allowlist",
    "Write stub or incomplete code"
  ],
  "rollback_failure_policy": {
    "automatic_rollback_triggers": [
      "Test failure",
      "Lint error",
      "File outside allowlist"
    ],
    "rollback_procedure": [
      "git checkout HEAD -- src/utils/text.js tests/text.test.js"
    ],
    "recovery_steps": [
      "Fix failing tests locally",
      "Ensure linting passes",
      "Resubmit plan"
    ]
  }
}
```

---

## JSON Schema Reference

For automated validation, use this JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ATLAS-GATE Plan",
  "type": "object",
  "required": [
    "atlas_gate_plan_signature",
    "role",
    "status",
    "plan_metadata",
    "scope_and_constraints",
    "phase_definitions",
    "path_allowlist",
    "verification_gates",
    "forbidden_actions",
    "rollback_failure_policy"
  ],
  "properties": {
    "atlas_gate_plan_signature": { "type": "string" },
    "role": { "type": "string", "enum": ["ANTIGRAVITY"] },
    "status": { "type": "string", "enum": ["APPROVED"] },
    "plan_metadata": {
      "type": "object",
      "required": ["plan_id", "version", "author", "timestamp", "governance"],
      "properties": {
        "plan_id": { "type": "string" },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "author": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" },
        "governance": { "type": "string", "enum": ["ATLAS-GATE-v2"] }
      }
    },
    "scope_and_constraints": {
      "type": "object",
      "required": ["objective", "affected_files", "out_of_scope", "constraints"],
      "properties": {
        "objective": { "type": "string", "minLength": 30 },
        "affected_files": { "type": "array", "items": { "type": "string" } },
        "out_of_scope": { "type": "array", "items": { "type": "string" } },
        "constraints": { "type": "array", "items": { "type": "string" } }
      }
    },
    "phase_definitions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": [
          "phase_id",
          "objective",
          "allowed_operations",
          "forbidden_operations",
          "required_intent_artifacts",
          "verification_commands",
          "expected_outcomes",
          "failure_stop_conditions"
        ],
        "properties": {
          "phase_id": { "type": "string", "pattern": "^[A-Z0-9_]+$" },
          "objective": { "type": "string" },
          "allowed_operations": { "type": "array", "items": { "type": "string" } },
          "forbidden_operations": { "type": "array", "items": { "type": "string" } },
          "required_intent_artifacts": { "type": "array", "items": { "type": "string", "pattern": "\\.intent\\.md$" } },
          "verification_commands": { "type": "array", "items": { "type": "string" } },
          "expected_outcomes": { "type": "array", "items": { "type": "string" } },
          "failure_stop_conditions": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "path_allowlist": { "type": "array", "items": { "type": "string" } },
    "verification_gates": { "type": "array", "items": { "type": "string" } },
    "forbidden_actions": { "type": "array", "items": { "type": "string" } },
    "rollback_failure_policy": {
      "type": "object",
      "required": ["automatic_rollback_triggers", "rollback_procedure", "recovery_steps"],
      "properties": {
        "automatic_rollback_triggers": { "type": "array", "items": { "type": "string" } },
        "rollback_procedure": { "type": "array", "items": { "type": "string" } },
        "recovery_steps": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

## References

- **Linter**: `src/application/plan-linter.js`
- **Save Tool**: `src/interfaces/tools/save_plan.js`
- **Intent Spec**: `docs/reports/MCP_INTENT_ARTIFACT_SPEC.md`
- **Prompts**:
  - ANTIGRAVITY: `docs/templates/antigravity_planning_prompt_v2.md`
  - WINDSURF: `docs/templates/windsurf_execution_prompt_v2.md`
