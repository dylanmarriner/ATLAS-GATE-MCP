<!--
ATLAS-GATE_PLAN_HASH: placeholder
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->

# Plan Metadata

Plan ID: PLAN_JWT_AUTH_V1
Version: 1.0
Author: ANTIGRAVITY
Status: APPROVED
Timestamp: 2026-02-14T14:30:00Z
Governance: ATLAS-GATE-v1

---

# Scope & Constraints

Objective: Add JWT-based authentication to REST API. Implement token generation, validation middleware, and protected routes.

Affected Files:
- src/auth.js: JWT token generation and validation functions
- src/middleware.js: Express middleware for token verification
- src/server.js: Integrate authentication middleware into server
- tests/auth.test.js: Unit tests for JWT functions
- tests/integration/auth.test.js: Integration tests for protected routes
- docs/AUTHENTICATION.md: User-facing authentication documentation

Out of Scope:
- OAuth2 integration
- Multi-factor authentication
- Token refresh logic
- Database schema changes
- User service modifications

Constraints:
- MUST use jsonwebtoken library (already in package.json)
- MUST sign tokens with HS256 algorithm
- MUST reject tokens older than 24 hours
- MUST handle invalid tokens gracefully (return 401)
- MUST NOT store secrets in code (must use process.env.JWT_SECRET)
- MUST handle missing Authorization header
- MUST support Bearer token format
- MUST NOT modify existing route handlers (only add middleware)

---

# Phase Definitions

## Phase: PHASE_IMPLEMENTATION

Phase ID: PHASE_IMPLEMENTATION
Objective: Implement JWT authentication with comprehensive tests and documentation
Allowed operations: CREATE, MODIFY
Forbidden operations: DELETE
Required intent artifacts: Authentication module, Test suite, API documentation
Verification commands: npm run test && npm run lint
Expected outcomes: All new tests pass, all existing tests still pass, zero lint errors, authentication working end-to-end
Failure stop conditions: Test failure, Lint error, File outside allowlist, Syntax error in code

---

# Path Allowlist

- src/
- tests/
- docs/

---

# Verification Gates

## Gate 1: Unit and Integration Tests
Trigger: After implementation complete
Check: npm run test
Required: Exit code 0, all tests pass
Failure action: REJECT and ROLLBACK

## Gate 2: Code Quality
Trigger: After tests pass
Check: npm run lint
Required: Exit code 0, zero lint errors
Failure action: REJECT and ROLLBACK

## Gate 3: Workspace Integrity
Trigger: Before approval
Check: Verify only Path Allowlist files modified
Required: No violations, no files outside allowlist changed
Failure action: REJECT

---

# Forbidden Actions

Actions STRICTLY PROHIBITED during execution:

- MUST NOT execute arbitrary shell commands
- MUST NOT modify files outside Path Allowlist
- MUST NOT delete files
- MUST NOT create symlinks or hardlinks
- MUST NOT hardcode JWT secret in code (must use process.env.JWT_SECRET)
- MUST NOT write TODO or FIXME comments
- MUST NOT write mock or stub implementations
- MUST NOT skip verification commands
- MUST NOT modify existing route handlers directly
- MUST NOT change server.js startup behavior

---

# Rollback / Failure Policy

## Automatic Rollback Triggers
1. npm run test fails
2. npm run lint fails
3. Any file modified outside Path Allowlist
4. Syntax error detected in written code
5. Audit log entry missing after write

## Rollback Procedure
1. Execute: git checkout src/auth.js src/middleware.js src/server.js tests/auth.test.js tests/integration/auth.test.js docs/AUTHENTICATION.md
2. Delete any newly created files not in original repo
3. Run: git status
4. Verify clean working directory
5. Run: npm run test (confirm tests still pass)
6. Create audit log entry with rollback details

## Recovery Steps
1. Review test failure or lint error output
2. Identify root cause
3. Fix the issue in the plan (e.g., correct function signature, fix test assertion)
4. Resubmit plan for linting
5. Resubmit for execution
