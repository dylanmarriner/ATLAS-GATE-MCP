<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
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

Objective: Add JWT-based authentication to REST API. Implement token generation, validation middleware, and protected routes. Users without valid JWT tokens will receive 401 Unauthorized responses.

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
- MUST use jsonwebtoken library (already in package.json as dependency)
- MUST sign tokens with HS256 algorithm only
- MUST reject tokens older than 24 hours (token expiration)
- MUST handle invalid tokens gracefully (return 401 status code)
- MUST NOT store secrets in code (use process.env.JWT_SECRET from environment)
- MUST validate Authorization header format (Bearer <token>)
- MUST handle missing Authorization header (return 401)
- MUST NOT modify existing route handlers (only add middleware to call stack)
- MUST NOT skip validation for any protected routes
- MUST log authentication failures with timestamp and details

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
Failure stop conditions: Test failure, Lint error, File outside allowlist, Syntax error in code, Signature verification fails

**Note**: Linter Stage 2 validates Phase ID is uppercase (✓ PHASE_IMPLEMENTATION) and all required fields are present

---

# Path Allowlist

- src/
- tests/
- docs/

**Note**: Linter Stage 3 validates all paths are workspace-relative (no leading `/`), no `..` escapes, no unresolved variables

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

## Gate 4: Plan Integrity (Cosign Verification)
Trigger: Before WINDSURF execution
Check: Verify COSIGN_SIGNATURE with cosign using public key
Required: Signature valid, plan not tampered
Failure action: REJECT (plan not approved)

---

# Forbidden Actions

Actions STRICTLY PROHIBITED during execution:

- MUST NOT execute arbitrary shell commands
- MUST NOT modify files outside Path Allowlist
- MUST NOT delete files
- MUST NOT create symlinks or hardlinks
- MUST NOT hardcode JWT secret in code (must use process.env.JWT_SECRET)
- MUST NOT write TODO or FIXME comments (Linter Stage 4 blocks these)
- MUST NOT write mock or stub implementations (Linter Stage 4 blocks: stub, mock, placeholder, temp.*implementation)
- MUST NOT skip verification commands
- MUST NOT modify existing route handlers directly
- MUST NOT change server.js startup behavior
- MUST NOT write code with incomplete implementations (Linter Stage 4 blocks: "to be implemented", "to be determined", tbd, wip)

**Linter Validation**: Stage 4 (Enforceability) scans for all stub patterns and ambiguous language

---

# Rollback / Failure Policy

## Automatic Rollback Triggers
1. Cosign signature verification fails (plan integrity compromised)
2. npm run test fails
3. npm run lint fails
4. Any file modified outside Path Allowlist
5. Syntax error detected in written code
6. Audit log entry missing after write

## Rollback Procedure
1. Execute: git checkout src/auth.js src/middleware.js src/server.js tests/auth.test.js tests/integration/auth.test.js docs/AUTHENTICATION.md
2. Delete any newly created files not in original repo
3. Run: git status
4. Verify clean working directory
5. Run: npm run test (confirm tests still pass)
6. Create audit log entry with rollback details

## Recovery Steps
1. Review failure logs:
   - Signature failure: Plan was tampered with or public key mismatch (security issue)
   - Test/lint failure: Code needs fixing (resubmit to linter)
2. Identify root cause and fix
3. If code issue: Update plan, resubmit for linting (runs 7 stages including Spectral and Cosign signing)
4. If signature issue: Verify public key, check plan wasn't tampered
5. WINDSURF re-executes with new/verified signature
