# Planning Guide: Creating ATLAS-GATE Plans

This guide explains how to design and validate execution plans using the ANTIGRAVITY agent.

## What Is a Plan?

A **plan** is a cryptographically signed JSON document that:

- Specifies *exactly* what the AI is allowed to do
- Lists all affected files and constraints
- Defines implementation phases with verification gates
- Cannot be modified without invalidating the signature
- Serves as proof of authorization in the audit trail

## Plan Structure

Every ATLAS-GATE plan MUST be a strict JSON object with these required top-level keys:

### 1. Header (Meta + Signature)

```json
{
  "atlas_gate_plan_signature": "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  "role": "ANTIGRAVITY",
  "status": "APPROVED"
}
```

| Field | Value | Notes |
|-------|-------|-------|
| `atlas_gate_plan_signature` | Base64 (43 chars) | ECDSA P-256 signature; empty before linting |
| `role` | `ANTIGRAVITY` | Always ANTIGRAVITY for plans |
| `status` | `APPROVED` | Must be exactly this value |

### 2. Plan Metadata

```json
{
  "plan_metadata": {
    "plan_id": "FEATURE_JWT_AUTH_V1",
    "version": "1.0.0",
    "author": "engineering@example.com",
    "timestamp": "2026-03-07T12:00:00Z",
    "governance": "ATLAS-GATE-v2"
  }
}
```

| Field | Format | Rules |
|-------|--------|-------|
| `plan_id` | UPPERCASE_WITH_UNDERSCORES | Unique identifier; used in phase IDs |
| `version` | X.Y.Z | Semantic versioning |
| `author` | String | Email or team name |
| `timestamp` | ISO 8601 | When plan was created |
| `governance` | `ATLAS-GATE-v2` | Always this value |

### 3. Scope & Constraints

```json
{
  "scope_and_constraints": {
    "objective": "Implement JWT authentication module for API",
    "affected_files": [
      "src/auth/jwt.js",
      "src/auth/validators.js",
      "tests/auth.test.js"
    ],
    "out_of_scope": [
      "Database schema changes",
      "Client-side auth logic",
      "Deployment configuration"
    ],
    "constraints": [
      "MUST use industry-standard HS256 algorithm",
      "MUST NOT expose private keys in logs or comments",
      "MUST handle expired tokens gracefully",
      "MUST include comprehensive error messages",
      "MUST verify token signature before processing claims"
    ]
  }
}
```

**Rules**:

- `objective`: Plain English, no code symbols
- `affected_files`: Relative paths, no leading `/`
- `out_of_scope`: List what's explicitly NOT allowed
- `constraints`: Use **MUST** or **MUST NOT**; no ambiguous language (avoid "may", "should", "optional")

### 4. Phase Definitions

```json
{
  "phase_definitions": [
    {
      "phase_id": "PHASE_001_JWT_MODULE",
      "objective": "Create core JWT authentication module with signing and verification",
      "allowed_operations": ["write_file", "read_file"],
      "forbidden_operations": ["delete_file", "execute_shell", "modify_package_json"],
      "required_intent_artifacts": [
        "src/auth/jwt.js.intent.md",
        "src/auth/validators.js.intent.md"
      ],
      "verification_commands": [
        "npm run lint src/auth/",
        "npm test -- tests/auth.test.js",
        "node -c src/auth/jwt.js"  # Syntax check
      ],
      "expected_outcomes": [
        "JWT module exports sign() and verify() functions",
        "All tests pass with 100% success rate",
        "No linting errors in auth module"
      ],
      "failure_stop_conditions": [
        "Any verification command exits non-zero",
        "Module missing required functions",
        "Tests fail or hang",
        "Code contains TODO or stub comments"
      ]
    },
    {
      "phase_id": "PHASE_002_TESTS",
      "objective": "Write comprehensive test suite for JWT module",
      "allowed_operations": ["write_file", "read_file"],
      "forbidden_operations": ["delete_file", "execute_shell"],
      "required_intent_artifacts": ["tests/auth.test.js.intent.md"],
      "verification_commands": [
        "npm test -- tests/auth.test.js --coverage"
      ],
      "expected_outcomes": [
        "All tests pass",
        "Coverage >= 95%",
        "No skipped or pending tests"
      ],
      "failure_stop_conditions": [
        "Test coverage < 95%",
        "Any test fails",
        "File has pending.skip or .skip() calls"
      ]
    }
  ]
}
```

**Phase Rules**:

- `phase_id`: UPPERCASE_WITH_UNDERSCORES, must be unique
- `objective`: What this phase accomplishes (plain English)
- `allowed_operations`: List exact MCP tools (read_file, write_file, etc.)
- `forbidden_operations`: Explicitly banned operations
- `required_intent_artifacts`: Each file needs a matching `.intent.md`
- `verification_commands`: Shell commands to validate phase success
- `expected_outcomes`: Plain English descriptions of success
- `failure_stop_conditions`: When to abort the phase

### 5. Path Allowlist

```json
{
  "path_allowlist": [
    "src/auth/jwt.js",
    "src/auth/validators.js",
    "tests/auth.test.js"
  ]
}
```

**Rules**:

- Relative to workspace root (no leading `/`)
- No `..` parent directory escapes
- No variables or `${...}` placeholders
- Only these files can be modified during execution
- Any write to unlisted path is rejected

### 6. Verification Gates

```json
{
  "verification_gates": [
    "GATE_SYNTAX: All JavaScript files must parse without errors",
    "GATE_LINT: ESLint must pass with 0 warnings",
    "GATE_TEST: Jest test suite must pass 100%",
    "GATE_COVERAGE: Coverage >= 95% for modified files",
    "GATE_SECURITY: No hardcoded credentials or secrets"
  ]
}
```

**Guidelines**:

- Plain text descriptions of success criteria
- Executed after all phases complete
- Should map to real verification commands in phases
- Help operator understand what "success" looks like

### 7. Forbidden Actions

```json
{
  "forbidden_actions": [
    "Modifying files outside path_allowlist",
    "Deleting any files",
    "Creating symlinks",
    "Writing code with TODO or mock comments",
    "Returning null or undefined",
    "Using @ts-ignore or @ts-nocheck",
    "Committing changes to git"
  ]
}
```

**These are absolute**. Any detected violation causes immediate abort.

### 8. Rollback / Failure Policy

```json
{
  "rollback_failure_policy": {
    "automatic_rollback_triggers": [
      "Any phase fails verification",
      "Any written file contains TODO or stub code",
      "Path allowlist violation detected",
      "Audit log append fails"
    ],
    "rollback_procedure": [
      "Delete: src/auth/jwt.js",
      "Delete: src/auth/validators.js",
      "Delete: tests/auth.test.js",
      "Restore: git checkout HEAD -- src/ tests/"
    ],
    "recovery_steps": [
      "Review audit-log.jsonl for failure location",
      "Examine plan constraints that were violated",
      "Modify plan or code and re-attempt"
    ]
  }
}
```

**Key points**:

- Defines when execution should roll back
- Lists explicit rollback commands
- Provides recovery guidance for operator

## Linting: 7-Stage Validation

When you call `lint_plan()`, the system runs:

### Stage 1: JSON Parse & Structure

- Validates JSON syntax
- Checks all required top-level keys
- Verifies `status === "APPROVED"`
- Verifies `role === "ANTIGRAVITY"`

### Stage 2: Phase Validation

- All required phase fields present
- `phase_id` format: UPPERCASE_WITH_UNDERSCORES
- No duplicate phase IDs
- All phase array fields are actual arrays

### Stage 3: Path Allowlist Validation

- No absolute paths (no leading `/`)
- No parent directory escapes (`..`)
- No unresolved variables

### Stage 4: Enforceability Check

- No stub markers: TODO, FIXME, XXX, HACK
- No ambiguous language: may, should, optional, try to
- All action language must be binary (MUST/MUST NOT)

### Stage 5: Auditability Check

- Objectives contain no code symbols (`${`, `<...>`, backticks)
- All objectives are readable plain English
- No function names in constraint descriptions

### Stage 6: Spectral Linting

- JSON-aware validation rules
- Field format verification
- Structure consistency checks

### Stage 7: Cosign Signing

- Performed by `save_plan`, not `lint_plan`
- Canonicalizes JSON content
- Signs with ECDSA P-256 private key
- Returns URL-safe Base64 signature
- Inserts signature into `atlas_gate_plan_signature` field and writes the saved plan

## Creating a Plan: Step-by-Step

### Step 1: Understand the Objective

```
Goal: Add JWT authentication to API
Scope: Core authentication module + tests
Timeline: 2 phases (implementation + testing)
```

### Step 2: Analyze Affected Code

- Read target files
- Understand existing structure
- Identify dependencies
- Plan implementation phases

### Step 3: Design Phases

Think about the natural sequence:

1. **Phase 1**: Core authentication logic
2. **Phase 2**: Test suite
3. **Phase 3** (if needed): Integration or docs

Each phase should be independently verifiable.

### Step 4: List Constraints

Use binary language:

- ✓ "MUST use HMAC-SHA256 algorithm"
- ✗ "Should probably use standard encryption"
- ✓ "MUST NOT expose private keys"
- ✗ "Try to keep credentials safe"

### Step 5: Write Path Allowlist

List every file that will be touched:

```json
"path_allowlist": [
  "src/auth/jwt.js",
  "src/auth/validators.js",
  "src/auth/index.js",
  "tests/auth.test.js"
]
```

### Step 6: Define Verification Gates

For each phase, write verification commands:

```json
"verification_commands": [
  "npm run lint src/auth/",
  "npm test -- tests/auth.test.js",
  "npm run build"
]
```

### Step 7: Lint the Plan

```json
lint_plan({ content: "<full JSON plan>" })
```

Response:

```json
{
  "passed": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "error_count": 0,
    "warning_count": 0,
    "invariants_checked": [
      "PLAN_SCOPE_LAW",
      "MECHANICAL_LAW_ONLY",
      "PUBLIC_LAW_READABLE",
      "PLAN_IMMUTABILITY"
    ]
  }
}
```

### Step 8: Save Signed Plan

```json
save_plan({ content: "<full JSON plan>" })
```

The plan is now:

- Immutable (can't modify without breaking signature)
- Verifiable (cosign can verify authenticity)
- Ready for execution (operator has signature)

## Common Mistakes

### ❌ Ambiguous Language

```json
"constraints": [
  "Should use proper error handling",  // ✗ "Should"
  "Try to validate input",               // ✗ "Try to"
  "Optionally include logging"           // ✗ "Optionally"
]
```

**Fix**: Use binary language

```json
"constraints": [
  "MUST handle all errors explicitly",
  "MUST validate all input",
  "MUST include detailed error logging"
]
```

### ❌ Absolute Paths

```json
"path_allowlist": [
  "/home/user/project/src/auth.js",  // ✗ Absolute
  "/src/auth.js"                      // ✗ Leading /
]
```

**Fix**: Relative paths

```json
"path_allowlist": [
  "src/auth.js",   // ✓ Relative
  "tests/auth.test.js"
]
```

### ❌ Parent Directory Escapes

```json
"path_allowlist": [
  "../other-project/file.js",  // ✗ Escapes sandbox
  "../../file.js"              // ✗ Goes up 2 levels
]
```

**Fix**: Only use files within workspace

```json
"path_allowlist": [
  "src/auth.js",
  "src/api/auth-routes.js"
]
```

### ❌ Code in Plan

```json
"constraints": [
  "function authenticateToken(token) { ... }",  // ✗ Code
  "const jwt = require('jsonwebtoken')"         // ✗ Code
]
```

**Fix**: Describe in plain English

```json
"constraints": [
  "MUST implement token validation function",
  "MUST use standard JWT library for parsing"
]
```

### ❌ Stub Markers

```json
"phase_definitions": [{
  "objective": "TODO: Add error handling",     // ✗ TODO in plan
  "expected_outcomes": ["Implementation stub"]  // ✗ "stub" in plan
}]
```

**Fix**: Complete descriptions

```json
"phase_definitions": [{
  "objective": "Implement comprehensive error handling with typed exceptions",
  "expected_outcomes": ["All error conditions handled", "Custom error types defined"]
}]
```

## Real-World Example: Add Database Migration

```json
{
  "atlas_gate_plan_signature": "",
  "role": "ANTIGRAVITY",
  "status": "APPROVED",
  "plan_metadata": {
    "plan_id": "MIGRATION_ADD_USERS_TABLE",
    "version": "1.0.0",
    "author": "devops@company.com",
    "timestamp": "2026-03-07T15:30:00Z",
    "governance": "ATLAS-GATE-v2"
  },
  "scope_and_constraints": {
    "objective": "Create database migration to add users table with authentication fields",
    "affected_files": [
      "migrations/001_create_users_table.sql",
      "migrations/README.md"
    ],
    "out_of_scope": [
      "Data backfill",
      "Index optimization",
      "Permission changes"
    ],
    "constraints": [
      "MUST use atomic transaction",
      "MUST include rollback procedure",
      "MUST NOT modify existing tables",
      "MUST validate foreign key relationships"
    ]
  },
  "phase_definitions": [
    {
      "phase_id": "PHASE_001_CREATE_MIGRATION",
      "objective": "Create SQL migration file with users table definition",
      "allowed_operations": ["write_file", "read_file"],
      "forbidden_operations": ["delete_file", "execute_shell"],
      "required_intent_artifacts": ["migrations/001_create_users_table.sql.intent.md"],
      "verification_commands": [
        "sqlfluff lint migrations/001_create_users_table.sql",
        "file migrations/001_create_users_table.sql"
      ],
      "expected_outcomes": [
        "Migration file exists with proper SQL syntax",
        "All linting passes",
        "Rollback procedure included"
      ],
      "failure_stop_conditions": [
        "SQL syntax errors",
        "Linting fails",
        "Missing rollback procedure"
      ]
    },
    {
      "phase_id": "PHASE_002_DOCUMENT",
      "objective": "Document migration in migrations README",
      "allowed_operations": ["write_file", "read_file"],
      "forbidden_operations": ["delete_file"],
      "required_intent_artifacts": ["migrations/README.md.intent.md"],
      "verification_commands": [
        "grep -q 'users table' migrations/README.md"
      ],
      "expected_outcomes": [
        "README updated with migration details"
      ],
      "failure_stop_conditions": [
        "Documentation missing or incomplete"
      ]
    }
  ],
  "path_allowlist": [
    "migrations/001_create_users_table.sql",
    "migrations/README.md"
  ],
  "verification_gates": [
    "GATE_SQL_SYNTAX: All SQL must be valid syntax",
    "GATE_LINTING: sqlfluff must pass",
    "GATE_ROLLBACK: Migration must include ROLLBACK procedure",
    "GATE_DOCUMENTATION: Migration must be documented in README"
  ],
  "forbidden_actions": [
    "Modifying existing migration files",
    "Creating tables without rollback procedure",
    "Omitting NOT NULL constraints without defaults",
    "Creating foreign keys without constraint names"
  ],
  "rollback_failure_policy": {
    "automatic_rollback_triggers": [
      "SQL syntax errors detected",
      "Linting failures",
      "Missing rollback procedure"
    ],
    "rollback_procedure": [
      "Delete: migrations/001_create_users_table.sql",
      "Restore: migrations/README.md to HEAD"
    ],
    "recovery_steps": [
      "Fix SQL syntax issues",
      "Ensure migration includes ROLLBACK command",
      "Re-run linting verification",
      "Re-submit plan for linting"
    ]
  }
}
```

## Checklist: Before Submitting for Linting

- [ ] All required top-level keys present
- [ ] `status === "APPROVED"`
- [ ] `role === "ANTIGRAVITY"`
- [ ] `plan_id` is UPPERCASE_WITH_UNDERSCORES
- [ ] All `phase_id` are UPPERCASE_WITH_UNDERSCORES
- [ ] All phases have 8 required fields
- [ ] No absolute paths (no leading `/`)
- [ ] No `..` in path_allowlist
- [ ] No TODO, FIXME, XXX, mock, stub, or fake keywords
- [ ] All constraints use MUST/MUST NOT language
- [ ] Objectives have no code symbols
- [ ] `governance === "ATLAS-GATE-v2"`
- [ ] Verification commands are real, runnable commands

## Validation Flow

```
Write Plan JSON
    ↓
lint_plan({ content: "<json-plan>" })
    ↓
Stage 1: JSON Parse
    ↓ (if fails → violations returned)
    ↓
Stage 2-6: Custom Validation + Spectral
    ↓ (if fails → violations returned)
    ↓
Return: { passed: true, errors: [], warnings: [] }
    ↓
save_plan({ content: "<json-plan>" })
    ↓
Sign canonicalized JSON + inject atlas_gate_plan_signature
    ↓
Return: { status: "PLAN_SAVED", signature, path, bundlePath }
    ↓
Plan is immutable & verified
```

## Reference

- **Constraint Language**: Use MUST/MUST NOT/SHOULD with proper justification
- **Path Format**: Workspace-relative, no leading `/`, no `..`
- **Phase Format**: UPPERCASE_WITH_UNDERSCORES, all 8 fields required
- **Verification**: Real shell commands that can be executed
- **Linting**: 7 stages, fails fast on first error

## Next Steps

1. **Review real plans**: See `docs/examples/plans/` for production examples
2. **Understand execution**: Read `docs/02-EXECUTION_GUIDE.md`
3. **Set up templates**: Use `docs/templates/antigravity_planning_prompt_v2.md` for AI agents

---

**Status**: Complete Planning Guide v2
**Last Updated**: 2026-03-07
**Authority**: ATLAS-GATE Governance
