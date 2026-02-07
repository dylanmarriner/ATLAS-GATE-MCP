# ATLAS-GATE-MCP Complete Usage Guide

**A step-by-step guide to using the ATLAS-GATE-MCP Model Context Protocol server for governed code development.**

---

## Table of Contents

1. [What is ATLAS-GATE-MCP?](#what-is-atlas-gate-mcp)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [The Three Core Tools](#the-three-core-tools)
5. [Complete Workflow Example](#complete-workflow-example)
6. [Prompt Examples](#prompt-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## What is ATLAS-GATE-MCP?

**ATLAS-GATE-MCP** is a governance and code enforcement system that:

- ✅ **Requires plans**: All code changes must be authorized by an approved plan
- ✅ **Enforces code quality**: Blocks non-real constructs (stubs, mocks, TODOs, hardcoded values)
- ✅ **Audits all writes**: Every change is logged with full provenance
- ✅ **Verifies integrity**: Plans are cryptographically validated before writes
- ✅ **Prevents bypasses**: Default-deny policy—if it's not real code, it's blocked

**Core principle**: Production code must be real, complete, and auditable. Nothing temporary, no shortcuts.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Repository                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  .atlas-gate/                                             │  │
│  │  ├── ROOT                (governance marker)         │  │
│  │  ├── governance.json     (bootstrap status)          │  │
│  │  └── approved_plans/     (authorized plans)          │  │
│  │      ├── PLAN_AUTH_SYSTEM.md                        │  │
│  │      ├── PLAN_BILLING_ENGINE.md                     │  │
│  │      └── ... (one plan per major change)            │  │
│  │                                                      │  │
│  │  docs/plans/             (alternate location)        │  │
│  │  ├── PLAN_*.md                                       │  │
│  │                                                      │  │
│  │  src/                    (your code)                 │  │
│  │  ├── index.js                                        │  │
│  │  ├── auth.js                                         │  │
│  │  └── ...                                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                ┌──────────┴──────────┐
                │                     │
         ┌──────▼──────┐      ┌──────▼──────┐
         │ ATLAS-GATE MCP   │      │ Audit Log   │
         │ Server      │      │ (immutable) │
         │             │      │             │
         │ read_file   │      │ All writes  │
         │ read_prompt │      │ All plans   │
         │ write_file  │      │ All reads   │
         │ list_plans  │      └─────────────┘
         │             │
         └─────────────┘
```

**Flow**:
1. **You** → request via MCP tool (read_file, write_file, etc.)
2. **ATLAS-GATE** → validates plan, checks constructs, runs preflight tests
3. **Filesystem** → changes persisted
4. **Audit Log** → record created (immutable)

---

## Getting Started

### Prerequisites

1. **Repository must be governed**
   ```bash
   ls -la .atlas-gate/
   # Should show:
   # ROOT
   # governance.json
   # approved_plans/ (or docs/plans/)
   ```

2. **At least one approved plan must exist**
   ```bash
   ls .atlas-gate/approved_plans/ | head
   # PLAN_SOMETHING.md
   ```

3. **MCP server must be running**
   ```bash
   cd /path/to/ATLAS-GATE-MCP-server
   npm install
   node server.js
   # Output: [MCP] ATLAS-GATE-MCP running | session=uuid
   ```

### Starting Your First Change

**The workflow has 3 phases**:

1. **PLAN** — Create/review an approved plan
2. **READ** — Understand existing code via read_file
3. **WRITE** — Make changes under plan authorization

**Each write requires**:
- `path` — File to create/modify
- `content` or `patch` — Code changes
- `plan` — Name of approved plan authorizing this change
- Optional: `planId`, `planHash` — For strict verification

---

## The Three Core Tools

### 1️⃣ Tool: `read_prompt`

**Purpose**: Fetch the canonical prompt for your work (pre-gate).

**When to use**: BEFORE your first write. Always.

**What it does**:
- Locks the session to enforce prompt-awareness
- Returns the canonical ANTIGRAVITY_CANONICAL prompt
- Prevents writes until this is called

**Example request**:
```javascript
await readPrompt("ANTIGRAVITY_CANONICAL");
```

**Response**:
```json
{
  "name": "ANTIGRAVITY_CANONICAL",
  "content": "You are building a serverless AI...",
  "version": "2.0",
  "status": "approved"
}
```

---

### 2️⃣ Tool: `read_file`

**Purpose**: Read code and documentation from the repository.

**When to use**: Before writing—understand what you're modifying.

**What it does**:
- Returns file contents
- Works with any file path (relative or absolute)
- Resolves relative paths from workspace root
- Can read plans, code, docs, configs

**Restrictions**:
- Read-only (no side effects)
- Must be in repo (path traversal blocked)

**Example requests**:

```javascript
// Read source code
await readFile({ path: "src/auth.js" });

// Read from docs
await readFile({ path: "docs/ARCHITECTURE.md" });

// Read an approved plan
await readFile({ path: ".atlas-gate/approved_plans/PLAN_AUTH_SYSTEM.md" });

// Read from anywhere in repo
await readFile({ path: "package.json" });
```

---

### 3️⃣ Tool: `write_file`

**Purpose**: Create or modify files with full governance.

**When to use**: When you've completed your changes and have plan authorization.

**What it does**:

1. **Validates plan** exists and is approved
2. **Checks code constructs** (C1-C8 taxonomy)
   - Blocks stubs, mocks, TODOs, hardcoded values, bypasses
   - Enforces real, production-ready code only
3. **Applies patch or content**
4. **Runs preflight checks** (tests, lints)
5. **Writes to filesystem**
6. **Records audit log**

**Required parameters**:
```javascript
{
  path: "src/auth.js",           // File to write
  content: "...",                 // New file content
  // OR
  patch: "...",                   // Unified diff patch
  
  plan: "PLAN_AUTH_SYSTEM",       // Approved plan name
  planId: "plan-auth-v1",         // (Optional) plan identifier
  planHash: "abc123..."           // (Optional) SHA256 of plan
}
```

**Optional metadata** (auto-generates role header):
```javascript
{
  role: "EXECUTABLE",             // EXECUTABLE | BOUNDARY | INFRASTRUCTURE | VERIFICATION
  purpose: "Handle JWT validation",
  usedBy: "auth-middleware",
  connectedVia: "express-router",
  authority: "PLAN_AUTH_SYSTEM.md"
}
```

**Response**:
```json
{
  "status": "OK",
  "plan": "PLAN_AUTH_SYSTEM",
  "role": "EXECUTABLE",
  "path": "src/auth.js",
  "repoRoot": "/path/to/repo",
  "preflight": "PASSED"
}
```

---

## Complete Workflow Example

Let's walk through a real scenario: **Adding JWT validation to the auth system**.

### Phase 1: PREPARE

**Step 1a: Create the Plan**

Create `.atlas-gate/approved_plans/PLAN_JWT_VALIDATION.md`:

```markdown
---
status: APPROVED
plan_id: PLAN_JWT_VALIDATION_V1
governance_version: 2.0
created_date: 2026-01-12
scope:
  - src/auth/jwt-validator.js
  - tests/auth/jwt-validator.test.js
  - docs/AUTH_FLOW.md
---

# JWT Validation Implementation

## Objective
Implement production-grade JWT validation with RS256 support.

## Scope
- Create `src/auth/jwt-validator.js` with real JWT validation
- Add comprehensive tests
- Document in AUTH_FLOW.md

## Implementation Details

### JWT Validator Module
- Validates RS256 tokens from identity provider
- Verifies signature against public key (fetched from JWKS endpoint)
- Extracts claims: sub, iat, exp, aud, iss
- Enforces token expiration (iat + exp window)
- No hardcoded keys or demo data
- All validation real and cryptographic

### Error Handling
- TokenExpiredError → 401 Unauthorized
- InvalidSignatureError → 403 Forbidden
- MissingClaimsError → 400 Bad Request
- All errors logged with user ID and timestamp

### Security Controls
- Public key refreshed every 24h from JWKS endpoint
- Token validation required on all protected routes
- Audit log entry for every failed validation attempt
- Metrics: validation success/failure rate

## Testing
- Unit tests for all validation paths
- Integration tests with real ID provider tokens
- No mock tokens; only real test credentials

## Rollout
- Code review + approval required
- Gradual rollout: 10% → 50% → 100% of users
- Metrics dashboard monitoring token errors
- Rollback plan: feature flag to revert to previous flow

## Success Criteria
- 0 validation bypasses (code scanning confirms)
- 99.9% token validation success rate
- <50ms validation latency (p99)
- No stubs, mocks, TODO markers in final code
```

**Step 1b: Verify the Plan is Approved**

```javascript
await readFile({ path: ".atlas-gate/approved_plans/PLAN_JWT_VALIDATION.md" });
// Should return plan with "status: APPROVED"
```

### Phase 2: READ (Context Gathering)

**Step 2a: Understand existing auth code**

```javascript
await readFile({ path: "src/auth.js" });
// Read existing auth module to understand structure

await readFile({ path: "src/config/index.js" });
// Read config to see where JWKS endpoint is stored

await readFile({ path: "tests/auth.test.js" });
// Read existing tests to match style and patterns
```

**Step 2b: Verify plan details**

```javascript
await readFile({ path: ".atlas-gate/approved_plans/PLAN_JWT_VALIDATION.md" });
// Double-check scope and requirements
```

### Phase 3: WRITE (Implementation)

**Step 3a: Fetch canonical prompt** (required before any write)

```javascript
await readPrompt("ANTIGRAVITY_CANONICAL");
// Returns canonical prompt
// Unlocks write gates
```

**Step 3b: Write JWT validator module**

```javascript
await writeFile({
  path: "src/auth/jwt-validator.js",
  content: `/**
   * ROLE: EXECUTABLE
   * PURPOSE: Validate JWT tokens with RS256 signature verification
   * USED BY: auth-middleware
   * AUTHORITY: PLAN_JWT_VALIDATION.md
   */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const JWKS_ENDPOINT = process.env.JWKS_ENDPOINT;
const EXPECTED_ISSUER = process.env.TOKEN_ISSUER;
const EXPECTED_AUDIENCE = process.env.TOKEN_AUDIENCE;

if (!JWKS_ENDPOINT || !EXPECTED_ISSUER || !EXPECTED_AUDIENCE) {
  throw new Error('JWT environment variables not set');
}

const client = jwksClient({
  jwksUri: JWKS_ENDPOINT,
  rateLimit: true,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function validateToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getSigningKey, {
      algorithms: ['RS256'],
      issuer: EXPECTED_ISSUER,
      audience: EXPECTED_AUDIENCE,
    }, (err, decoded) => {
      if (err) {
        // Log failed validation
        console.error('Token validation failed', {
          error: err.message,
          tokenHead: token.substring(0, 20),
          timestamp: new Date(),
        });
        return reject({
          code: 'TOKEN_INVALID',
          message: err.message,
          statusCode: err.name === 'TokenExpiredError' ? 401 : 403,
        });
      }
      resolve(decoded);
    });
  });
}

module.exports = { validateToken };
`,
  plan: "PLAN_JWT_VALIDATION",
  planId: "PLAN_JWT_VALIDATION_V1",
  role: "EXECUTABLE",
  purpose: "JWT token validation with RS256 signature verification",
  usedBy: "auth-middleware",
  connectedVia: "express-router"
});
// Response: { status: "OK", plan: "PLAN_JWT_VALIDATION", preflight: "PASSED" }
```

**Step 3c: Write tests**

```javascript
await writeFile({
  path: "tests/auth/jwt-validator.test.js",
  content: `/**
   * ROLE: VERIFICATION
   * PURPOSE: Test JWT validation logic
   * AUTHORITY: PLAN_JWT_VALIDATION.md
   */

const { validateToken } = require('../../src/auth/jwt-validator');
const jwt = require('jsonwebtoken');

describe('JWT Validator', () => {
  const testPrivateKey = /* ... actual test key ... */;
  const testPublicKey = /* ... matching public key ... */;

  it('accepts valid tokens with correct signature', async () => {
    const token = jwt.sign(
      { sub: 'user-123', iat: Date.now() / 1000 },
      testPrivateKey,
      { algorithm: 'RS256', issuer: 'test-issuer', audience: 'test-api' }
    );

    const decoded = await validateToken(token);
    expect(decoded.sub).toBe('user-123');
  });

  it('rejects expired tokens', async () => {
    const token = jwt.sign(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 },
      testPrivateKey,
      { algorithm: 'RS256' }
    );

    expect(validateToken(token)).rejects.toThrow('TokenExpiredError');
  });

  it('rejects tokens with wrong signature', async () => {
    const wrongKey = '-----BEGIN PRIVATE KEY-----...';
    const token = jwt.sign(
      { sub: 'user-123' },
      wrongKey,
      { algorithm: 'RS256' }
    );

    expect(validateToken(token)).rejects.toThrow('JsonWebTokenError');
  });

  // More tests...
});
`,
  plan: "PLAN_JWT_VALIDATION",
  role: "VERIFICATION"
});
```

**Step 3d: Update documentation**

```javascript
await writeFile({
  path: "docs/AUTH_FLOW.md",
  content: `# Authentication Flow

## JWT Validation

All API requests require a valid JWT token in the Authorization header.

### Token Format
\`\`\`
Authorization: Bearer <JWT_TOKEN>
\`\`\`

### Validation Process
1. Extract token from Authorization header
2. Decode header to get \`kid\` (key ID)
3. Fetch public key from JWKS endpoint using \`kid\`
4. Verify signature with RS256 algorithm
5. Validate claims: iss, aud, exp
6. Extract \`sub\` claim (user ID)

### Configuration
- \`JWKS_ENDPOINT\` - JWKS endpoint (e.g., https://auth.example.com/.well-known/jwks.json)
- \`TOKEN_ISSUER\` - Expected token issuer (e.g., https://auth.example.com)
- \`TOKEN_AUDIENCE\` - Expected audience (e.g., https://api.example.com)

### Error Handling
- \`TOKEN_EXPIRED\` → 401 Unauthorized
- \`TOKEN_INVALID\` → 403 Forbidden
- \`INVALID_HEADER\` → 400 Bad Request

## Implementation
See \`src/auth/jwt-validator.js\` for details.
Authorized under: PLAN_JWT_VALIDATION
`,
  plan: "PLAN_JWT_VALIDATION",
  role: "BOUNDARY"
});
```

### Result

All three writes succeed:
```json
{
  "status": "OK",
  "plan": "PLAN_JWT_VALIDATION",
  "path": "src/auth/jwt-validator.js",
  "preflight": "PASSED"
}
```

**Audit log entry created**:
```json
{
  "timestamp": "2026-01-12T10:30:00Z",
  "action": "WRITE_FILE",
  "path": "src/auth/jwt-validator.js",
  "plan": "PLAN_JWT_VALIDATION",
  "session": "uuid-123",
  "status": "SUCCESS",
  "role": "EXECUTABLE",
  "preflightStatus": "PASSED"
}
```

---

## Prompt Examples

### Example 1: Reading Phase

**Your prompt to the system**:
```
I need to add JWT validation to the auth system. 
Let me first understand the existing authentication code.
```

**Call to MCP**:
```javascript
// Step 1: Get canonical prompt (required)
tool: "read_prompt"
args: { name: "ANTIGRAVITY_CANONICAL" }

// Step 2: Read existing auth code
tool: "read_file"
args: { path: "src/auth.js" }

// Step 3: Check config structure
tool: "read_file"
args: { path: "src/config/index.js" }

// Step 4: Review plan requirements
tool: "read_file"
args: { path: ".atlas-gate/approved_plans/PLAN_JWT_VALIDATION.md" }
```

---

### Example 2: Writing Phase (Real Code)

**Your prompt**:
```
Implement the JWT validator as described in PLAN_JWT_VALIDATION.
- Real JWT validation with RS256
- No stubs, mocks, or demo data
- Include comprehensive error handling
- Add production-grade tests
```

**Correct call to MCP**:
```javascript
tool: "write_file"
args: {
  path: "src/auth/jwt-validator.js",
  content: "/**\n * ROLE: EXECUTABLE\n * PURPOSE: Validate JWT tokens...\n */\n\nconst jwt = require('jsonwebtoken');\nconst jwksClient = require('jwks-rsa');\n\n// Real configuration from environment\nconst JWKS_ENDPOINT = process.env.JWKS_ENDPOINT;\nif (!JWKS_ENDPOINT) throw new Error('JWKS_ENDPOINT required');\n\nconst client = jwksClient({\n  jwksUri: JWKS_ENDPOINT,\n  rateLimit: true,\n  cache: true,\n});\n\n// Real token validation using cryptographic verification\nasync function validateToken(token) {\n  return new Promise((resolve, reject) => {\n    jwt.verify(token, (header, callback) => {\n      client.getSigningKey(header.kid, (err, key) => {\n        if (err) return callback(err);\n        callback(null, key.publicKey || key.rsaPublicKey);\n      });\n    }, {\n      algorithms: ['RS256'],\n      issuer: process.env.TOKEN_ISSUER,\n      audience: process.env.TOKEN_AUDIENCE,\n    }, (err, decoded) => {\n      if (err) {\n        console.error('Validation failed:', err.message);\n        return reject(err);\n      }\n      resolve(decoded);\n    });\n  });\n}\n\nmodule.exports = { validateToken };",
  plan: "PLAN_JWT_VALIDATION",
  planId: "PLAN_JWT_VALIDATION_V1",
  role: "EXECUTABLE",
  purpose: "JWT token validation with RS256 signature verification",
  usedBy: "auth-middleware"
}
```

**✅ Why this is CORRECT**:
- Uses real JWT library (jsonwebtoken)
- Fetches real public keys from JWKS endpoint
- Validates with real cryptography (RS256)
- Real error handling (no "demo" or "test" logic)
- No TODOs, FIXMEs, stubs, or hardcoded test data
- Includes proper role metadata
- References approved plan

**❌ What would be BLOCKED**:
```javascript
// BAD: Stub implementation
async function validateToken(token) {
  // TODO: implement real validation
  return { valid: true, userId: "DEMO_USER" }; // ❌ DEMO constant
}

// BAD: Fake JWT (mock)
const FAKE_JWT = "eyJ...test";
function validateToken(token) {
  if (token === FAKE_JWT) return { valid: true }; // ❌ Hardcoded test token
}

// BAD: Hardcoded bypass
function validateToken(token) {
  return { valid: true }; // ❌ Always returns true (policy bypass)
}

// BAD: Commented-out real logic
async function validateToken(token) {
  // const client = new JwksClient(...);
  // const key = await client.getSigningKey(...);
  // return jwt.verify(token, key);
  return { ok: true }; // ❌ Real logic disabled
}
```

---

### Example 3: Patch-Based Update

**Scenario**: You only need to modify a specific function in an existing file.

**Correct prompt**:
```
Update the /api/users endpoint to use the new JWT validator.
Apply a patch that replaces the old auth check with the new one.
```

**Correct MCP call**:
```javascript
tool: "write_file"
args: {
  path: "src/api/users.js",
  patch: `--- a/src/api/users.js
+++ b/src/api/users.js
@@ -1,8 +1,9 @@
 const express = require('express');
+const { validateToken } = require('../auth/jwt-validator');
 const app = express.Router();

-app.get('/users/:id', async (req, res) => {
-  // TODO: add real authentication
+app.get('/users/:id', async (req, res) => {
+  const decoded = await validateToken(req.headers.authorization);
-  const userId = req.query.userId || 'DEMO_USER';
+  const userId = decoded.sub;
   const user = await db.users.findById(userId);
   res.json(user);
 });`,
  plan: "PLAN_JWT_VALIDATION",
  role: "EXECUTABLE"
}
```

---

### Example 4: Multi-File Change (Sequential)

**Scenario**: Implementing a feature requires changes to multiple files.

**Correct approach**: Make separate write_file calls for each file, all referencing the same plan.

```javascript
// File 1: New module
await writeFile({
  path: "src/payment/stripe-integration.js",
  content: "// Real Stripe integration code...",
  plan: "PLAN_BILLING_ENGINE",
  role: "EXECUTABLE"
});

// File 2: Tests
await writeFile({
  path: "tests/payment/stripe-integration.test.js",
  content: "// Real tests with actual Stripe API calls...",
  plan: "PLAN_BILLING_ENGINE",
  role: "VERIFICATION"
});

// File 3: Configuration
await writeFile({
  path: "config/stripe.js",
  content: "module.exports = { apiKey: process.env.STRIPE_API_KEY, ... };",
  plan: "PLAN_BILLING_ENGINE",
  role: "INFRASTRUCTURE"
});

// File 4: Documentation
await writeFile({
  path: "docs/BILLING.md",
  content: "# Billing System\n\nStripe integration...",
  plan: "PLAN_BILLING_ENGINE",
  role: "BOUNDARY"
});
```

**All writes succeed under one plan**.

---

## Error Handling

### Error 1: Plan Not Found

**Error message**:
```
PLAN_NOT_APPROVED: PLAN_WRONG_NAME not found in /path/to/.atlas-gate/approved_plans
```

**What happened**: You referenced a plan that doesn't exist.

**Fix**:
1. Check plan name spelling
2. Verify plan exists: `ls .atlas-gate/approved_plans/ | grep PLAN_NAME`
3. Use correct plan name in write_file call

```javascript
// ❌ Wrong
await writeFile({ path: "src/foo.js", content: "...", plan: "PLAN_TYPO" });

// ✅ Correct
await writeFile({ path: "src/foo.js", content: "...", plan: "PLAN_AUTH_SYSTEM" });
```

---

### Error 2: Construct Taxonomy Violation

**Error message**:
```
CONSTRUCT_TAXONOMY_VIOLATION [BLOCKED]:
Detected non-real code constructs that are NOT ALLOWED:

  ❌ C3_todo_fixme|TODO
  ❌ C1_stub|DEMO

POLICY: All non-real constructs (C1-C8) are BLOCKED by default.
Code must be real, production-ready, and complete.

To proceed:
1. Create a plan explicitly documenting why each construct is needed
2. Include the construct identifiers (e.g., "AUTHORIZED_C3_TODO: user_auth_system")
3. Reference the plan in your write_file call
```

**What happened**: Your code contains non-real patterns (TODO, DEMO, stub, etc.).

**Fix**: Remove non-real code.

```javascript
// ❌ Blocked
const user = { id: "123", name: "DEMO" }; // C1: Stub with DEMO

// ✅ Correct
const user = await database.users.findById(userId);
```

**If you MUST use a non-real construct** (rare):
1. Add to your plan:
   ```markdown
   ## Authorized Non-Real Constructs
   
   ### AUTHORIZED_C3_TODO
   - Construct: TODO marker on line 45 of src/auth.js
   - Reason: Two-factor authentication design incomplete
   - Control: Wrapped in `if (process.env.ENVIRONMENT === 'development')`
   - Removal: Before Q2 release
   ```

2. Reference in write_file:
   ```javascript
   await writeFile({
     path: "src/auth.js",
     content: "...",
     plan: "PLAN_WITH_AUTHORIZED_CONSTRUCTS"
   });
   ```

---

### Error 3: Preflight Failed

**Error message**:
```
PREFLIGHT_FAILED: Code rejected because it breaks the build.
npm ERR! Cannot find module 'missing-dependency'
```

**What happened**: Your code doesn't pass tests or linting.

**Fix**:
1. Install missing dependencies
2. Fix linting errors
3. Ensure tests pass
4. Retry write_file

```bash
# Run locally first
npm test
npm run lint
npm run build
```

---

### Error 4: Missing Prompt Gate

**Error message**:
```
PROMPT_GATE_LOCKED: You must call read_prompt('ANTIGRAVITY_CANONICAL') 
before any write operations.
```

**What happened**: You tried to write without calling read_prompt first.

**Fix**: Always call read_prompt before your first write:
```javascript
// ✅ First call
await readPrompt("ANTIGRAVITY_CANONICAL");

// ✅ Then write
await writeFile({ path: "src/foo.js", content: "...", plan: "PLAN" });
```

---

## Best Practices

### ✅ DO

1. **Read existing code first**
   ```javascript
   await readFile({ path: "src/module.js" });
   // Understand structure, patterns, dependencies
   ```

2. **Create detailed plans**
   ```markdown
   ---
   status: APPROVED
   plan_id: PLAN_UNIQUE_ID
   scope:
     - src/file1.js
     - src/file2.js
   ---
   
   ## Objective
   Clear business goal
   
   ## Implementation Details
   Detailed steps
   
   ## Success Criteria
   Measurable outcomes
   ```

3. **Use proper role metadata**
   ```javascript
   {
     role: "EXECUTABLE",        // Main logic
     role: "BOUNDARY",          // API/Interface
     role: "INFRASTRUCTURE",    // Config/Setup
     role: "VERIFICATION"       // Tests/Checks
   }
   ```

4. **Include comprehensive errors**
   ```javascript
   if (!token) {
     throw new Error('MISSING_TOKEN: Authorization header required');
   }
   ```

5. **Write real code**
   - Use real APIs, databases, services
   - No hardcoded test data
   - No mock implementations
   - No TODOs or FIXMEs

---

### ❌ DON'T

1. **Don't write temporary code**
   ```javascript
   // ❌ NO
   function getUser(id) {
     // TODO: implement real lookup
     return { id: "DEMO" };
   }
   ```

2. **Don't use test frameworks in production code**
   ```javascript
   // ❌ NO
   const { jest } = require('jest');
   jest.mock('stripe');
   ```

3. **Don't hardcode test data**
   ```javascript
   // ❌ NO
   const TEST_TOKEN = "eyJ...";
   const FAKE_USER = { id: "test-123" };
   ```

4. **Don't bypass enforcement**
   ```javascript
   // ❌ NO
   // Commenting out the REAL code doesn't help
   // const validation = await validateToken(token);
   // Just return success
   return { ok: true };
   ```

5. **Don't reference non-existent plans**
   ```javascript
   // ❌ NO
   await writeFile({
     path: "src/foo.js",
     content: "...",
     plan: "PLAN_I_JUST_INVENTED"  // Must be pre-approved
   });
   ```

---

## Complete Reference

### read_prompt
```javascript
const prompt = await readPrompt({
  name: "ANTIGRAVITY_CANONICAL"  // Required before writes
});
// Returns: { name, content, version, status }
```

### read_file
```javascript
const content = await readFile({
  path: "src/auth.js"  // Relative to repo root
});
// Returns: string content
```

### write_file
```javascript
const result = await writeFile({
  path: "src/auth.js",                    // Required
  content: "...",                         // Required (or patch)
  patch: "@@ -1,3 +1,4 @@ ...",         // Alternative to content
  
  plan: "PLAN_AUTH_SYSTEM",               // Required
  planId: "plan-auth-v1",                 // Optional
  planHash: "sha256hash",                 // Optional
  
  role: "EXECUTABLE",                     // Optional (EXECUTABLE, BOUNDARY, INFRASTRUCTURE, VERIFICATION)
  purpose: "JWT validation",              // Optional
  usedBy: "auth-middleware",              // Optional
  connectedVia: "express-router",         // Optional
  registeredIn: "auth-module",            // Optional
  executedVia: "request-handler",         // Optional
  failureModes: "Returns 401 on invalid token",  // Optional
  authority: "PLAN_AUTH_SYSTEM.md"        // Optional
});
// Returns: { status, plan, role, path, repoRoot, preflight }
```

### list_plans
```javascript
const plans = await listPlans({
  path: "."  // Repo root
});
// Returns: { repoRoot, plansDir, count, plans: [...] }
```

---

## Summary

**The workflow**:
1. Read the canonical prompt (unlocks writes)
2. Read existing code to understand
3. Create/review an approved plan
4. Write real, production-ready code
5. Reference the plan in write_file calls
6. Let ATLAS-GATE validate and record the change

**The principle**: All code must be real, complete, and auditable. No shortcuts.

**The benefit**: Full governance, audit trail, and confidence that shipped code is production-quality.

---

## Questions & Support

**"Can I write code without a plan?"**
No. All writes require an approved plan.

**"Can I use TODO comments?"**
Only if explicitly authorized in your plan. Default: blocked.

**"What if my code is incomplete?"**
Complete it before writing. Or add to plan explaining the timeline.

**"How do I get a plan approved?"**
Plans default to APPROVED if placed in `.atlas-gate/approved_plans/` with correct frontmatter.

**"What if I make a mistake?"**
Every write is audited. Audit log is immutable. Create a new plan to fix.

