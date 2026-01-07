# KAIZA-MCP Complete Guide


## Table of Contents
1. [System Overview](#system-overview)
2. [Planning Phase (AMP/Antigravity)](#planning-phase)
3. [Execution Phase (Windsurf)](#execution-phase)
4. [Example Plan Template](#example-plan-template)
5. [Common Errors and Solutions](#common-errors-and-solutions)
6. [Workflow Diagrams](#workflow-diagrams)

---

## System Overview

KAIZA-MCP is a three-role governance system:

```
AMP/Antigravity (Planners)
    ↓ create plans via bootstrap_create_foundation_plan
    ↓
docs/plans/ (Approved Plans)
    ↓
Windsurf (Executor)
    ↓ implements via write_file
    ↓
Production Code
```

**Key Rule**: Plans must be created first, then executed. Never the other way around.

---

## PLANNING PHASE (AMP/Antigravity)

### Step 1: Plan Creation Authority

**Who can create plans?**
- ✅ AMP (strategic planner)
- ✅ Antigravity (implementation planner)
- ❌ Windsurf (executor - BLOCKED)

**What tool do they use?**
- `bootstrap_create_foundation_plan` via KAIZA-MCP

---

### Step 2: Understand Plan Requirements

Before creating a plan, understand what it must contain:

#### Required Plan Structure

```yaml
---
status: APPROVED              # REQUIRED: Must be APPROVED
plan_id: unique-id-here      # RECOMMENDED: For tracking
title: Plan Title             # RECOMMENDED: Clear title
created_by: AMP or Antigravity # RECOMMENDED: Authority
created_date: 2026-01-07      # RECOMMENDED: Timestamp
---

# PLAN CONTENT STARTS HERE
## Objective
Clear statement of what this plan accomplishes

## Requirements
1. Requirement 1: Description
2. Requirement 2: Description
3. Requirement 3: Description

## Architecture/Design
If applicable, describe the technical design

## Implementation Specifications
1. File: src/component.js
   - Purpose: [clear purpose]
   - Behavior: [exact behavior expected]
   - Dependencies: [what it depends on]
   - Exports: [what it exports]

2. File: src/service.js
   - Purpose: [clear purpose]
   - Behavior: [exact behavior expected]
   - Dependencies: [what it depends on]
   - Exports: [what it exports]

## Success Criteria
- Code passes npm run test
- Code passes npm run lint
- Code passes npm run typecheck
- No mock data
- No stubs or TODOs
- All requirements implemented

## Related Plans
- Links to dependent or related plans

## Approved By
Name: AMP or Antigravity
Authority: Plan creation authority
Date: 2026-01-07
```

---

### Step 3: Create the Plan File

**File location**: `docs/plans/YOUR_PLAN_NAME.md`

**File naming**:
- Use UPPERCASE with underscores
- Examples: `FEATURE_AUTHENTICATION.md`, `IMPLEMENT_CACHE.md`
- Avoid generic names like `PLAN_1.md`

**File content**: See "Example Plan Template" section below

---

### Step 4: Call bootstrap_create_foundation_plan

This is how AMP/Antigravity creates plans:

```javascript
// Example: Creating a plan via KAIZA-MCP
const planContent = `---
status: APPROVED
plan_id: plan-auth-2026-01-07
title: User Authentication System
created_by: Antigravity
created_date: 2026-01-07
---

# User Authentication System

## Objective
Implement complete user authentication with JWT tokens

## Requirements
1. User registration with email verification
2. User login with JWT token generation
3. Token refresh mechanism
4. Logout functionality

## Implementation Specifications
1. File: src/auth/auth.service.js
   - Exports: AuthService class
   - Methods: register(), login(), refreshToken(), logout()
   - Uses: bcrypt for password hashing, jsonwebtoken for token generation
   - Database: Real database connection (no mocks)

2. File: src/auth/jwt.middleware.js
   - Exports: verifyToken middleware function
   - Behavior: Validates JWT tokens from Authorization header
   - Returns: User object if valid, error if invalid

## Success Criteria
- All functions implemented
- Passwords hashed with bcrypt
- JWTs signed and validated correctly
- No test mocks or fixtures
- All tests pass
- No TypeScript errors
`;

// Create the signature
const payload = {
  repoIdentifier: 'gemini_universe',
  timestamp: Date.now(),
  nonce: crypto.randomUUID(),
  action: 'BOOTSTRAP_CREATE_FOUNDATION_PLAN'
};

const secret = process.env.KAIZA_BOOTSTRAP_SECRET; // Set this!
const hmac = crypto.createHmac('sha256', secret);
hmac.update(JSON.stringify(payload));
const signature = hmac.digest('hex');

// Call the MCP tool
const result = await bootstrap_create_foundation_plan({
  path: '/media/ubuntux/DEVELOPMENT/gemini_universe',
  planContent: planContent,
  payload: payload,
  signature: signature
});

console.log('Plan created:', result);
// Output: Plan created at docs/plans/PLAN_AUTH_2026_01_07.md
```

---

### Step 5: Verify Plan Was Created

After calling `bootstrap_create_foundation_plan`:

1. **Check the file exists**:
   ```bash
   ls -la /media/ubuntux/DEVELOPMENT/gemini_universe/docs/plans/ | grep YOUR_PLAN_NAME
   ```

2. **Verify status is APPROVED**:
   ```bash
   grep "status: APPROVED" /media/ubuntux/DEVELOPMENT/gemini_universe/docs/plans/YOUR_PLAN_NAME.md
   ```

3. **List plans via MCP**:
   ```
   Call: list_plans with path '.'
   Output: Should show YOUR_PLAN_NAME in the list
   ```

---

## EXECUTION PHASE (Windsurf)

### Step 1: Understand Your Role

**Windsurf is an EXECUTOR, NOT a planner.**

✅ You can:
- Read plans from `docs/plans/`
- Understand requirements exactly
- Implement code per plan specifications
- Ask for clarification if unclear

❌ You cannot:
- Create plans
- Modify plans
- Make architectural decisions
- Interpret vague requirements
- Deviate from plan specifications

---

### Step 2: Start a Session

**Every time you start working:**

```
Call: read_prompt('ANTIGRAVITY_CANONICAL')

Response: Prompts loaded, write gate unlocked
```

This unlocks your ability to use `write_file`.

---

### Step 3: List Available Plans

**See what plans are available**:

```
Call: list_plans with path '.'

Response:
[
  "PLAN_AUTHENTICATION.md",
  "PLAN_CACHING.md",
  "PLAN_LOGGING.md"
]
```

---

### Step 4: Read a Plan

**Pick a plan and read it completely**:

```
Call: read_file(path: 'docs/plans/PLAN_AUTHENTICATION.md')

Response: Full plan document with:
- Objective
- Requirements
- Implementation specifications
- Success criteria
```

---

### Step 5: Implement Code Per Plan

**For each file specified in the plan**:

```
Call: write_file(
  path: 'src/auth/service.js',
  content: '[FULL PRODUCTION CODE]',
  plan: 'PLAN_AUTHENTICATION',
  role: 'EXECUTABLE',
  purpose: '[what this does]',
  connectedVia: '[how it connects]',
  failureModes: '[what can fail]',
  [other required metadata]
)

Response: File written successfully (or error)
```

**Important**: Each call to `write_file` includes:
- The complete, production-ready code
- Metadata linking back to the plan
- Role information (EXECUTABLE, BOUNDARY, INFRASTRUCTURE, VERIFICATION)
- Purpose statement
- Failure modes description

---

### Step 6: Handle Errors

If `write_file` returns an error:

1. **Read the error message** - it tells you exactly what's wrong
2. **Fix the issue** in your code
3. **Call write_file again**

Common errors are detailed in "Common Errors and Solutions" below.

---

### Step 7: Commit When Done

When all files for a plan are written successfully:

```bash
git add .
git commit -m "Implement PLAN_AUTHENTICATION per KAIZA-MCP"
```

**Important**: The pre-commit hook will verify:
- ✅ All files were written via KAIZA-MCP (in audit log)
- ✅ No bypass of governance

If commit fails, it means a file wasn't written through KAIZA-MCP. Use `write_file` for that file.

---

## Example Plan Template

Here's a complete example plan that could be created by AMP/Antigravity:

```markdown
---
status: APPROVED
plan_id: plan-cache-layer-2026-01-07
title: Implement Redis Caching Layer
created_by: Antigravity
created_date: 2026-01-07
---

# Redis Caching Layer Implementation

## Objective
Implement a production-grade Redis caching layer that reduces database queries by 70% while maintaining data consistency.

## Requirements
1. Redis connection pooling with reconnect logic
2. Cache key generation from query parameters
3. Automatic cache invalidation on data mutations
4. Cache hit/miss metrics
5. Support for multiple data types (strings, objects, lists)
6. Full test coverage (unit and integration)

## Architecture

The caching system sits between the application and database:

```
Application
    ↓
Cache Layer (new)
    ↓ (if hit)
Redis
    ↓ (if miss)
Database
```

## Implementation Specifications

### File 1: src/cache/redis-client.js

- **Purpose**: Manages Redis connection and provides reusable Redis client
- **Behavior**:
  - Creates connection pool on startup
  - Implements automatic reconnection (exponential backoff)
  - Provides health check method
- **Dependencies**: redis, dotenv
- **Exports**:
  - `RedisClient` class with methods:
    - `connect()`: Async, establishes connection
    - `get(key)`: Async, returns cached value
    - `set(key, value, ttl)`: Async, stores value with TTL
    - `delete(key)`: Async, removes key
    - `healthCheck()`: Returns boolean
- **Error Handling**:
  - Connection errors → retry with backoff
  - Invalid keys → throw TypeError
  - Redis errors → log and throw
- **Notes**: Must use real Redis instance (no mocks)

### File 2: src/cache/cache-layer.js

- **Purpose**: Application-level caching logic
- **Behavior**:
  - Intercepts read operations
  - Generates cache keys from function args
  - Tracks cache hits/misses
  - Invalidates on mutations
- **Dependencies**: src/cache/redis-client.js
- **Exports**:
  - `CacheLayer` class with methods:
    - `wrap(fn, options)`: Wraps function with caching
    - `invalidate(pattern)`: Clears keys matching pattern
    - `metrics()`: Returns {hits, misses, hitRate}
- **Error Handling**: Graceful degradation (bypass cache on error)

### File 3: src/cache/cache-invalidation.js

- **Purpose**: Handles cache invalidation events
- **Behavior**:
  - Listens to data mutation events
  - Invalidates affected cache keys
  - Supports pattern-based invalidation
- **Dependencies**: src/cache/redis-client.js, event emitter
- **Exports**:
  - `CacheInvalidator` class
- **Error Handling**: Log invalidation errors but don't block mutations

### File 4: tests/cache.test.js

- **Purpose**: Complete test coverage
- **Includes**:
  - Connection pool tests
  - Cache hit/miss scenarios
  - TTL expiration tests
  - Invalidation tests
  - Metrics accuracy tests
  - Error scenarios
- **Test Data**: Uses fixtures from tests/fixtures/ (no faker)
- **Coverage**: Must be > 95%

## Success Criteria

- ✅ All files implemented per specification
- ✅ `npm run test` passes (95%+ coverage)
- ✅ `npm run lint` passes
- ✅ `npm run typecheck` passes (no @ts-ignore)
- ✅ No mock Redis instances (use testcontainers or real Redis)
- ✅ No TODOs or FIXMEs
- ✅ No console.log() in production code
- ✅ All error scenarios handled
- ✅ Documentation updated

## Related Plans

- PLAN_DATABASE_OPTIMIZATION.md (depends on this)
- PLAN_METRICS_COLLECTION.md (uses metrics from this)

## Approved By

Name: Antigravity  
Authority: Implementation Planner  
Date: 2026-01-07
```

---

## Common Errors and Solutions

### Error: BOOTSTRAP_FAILED

**Message**:
```
BOOTSTRAP_FAILED: Invalid signature
```

**Cause**: HMAC signature doesn't match.

**Solution**:
```
Step 1: Verify KAIZA_BOOTSTRAP_SECRET is set correctly
Step 2: Verify payload JSON stringification is exact
Step 3: Verify signature calculation:
   const hmac = crypto.createHmac('sha256', secret);
   hmac.update(JSON.stringify(payload));
   const signature = hmac.digest('hex');
Step 4: Ensure NO extra whitespace in payload
```

---

### Error: PLAN_NOT_FOUND

**Message**:
```
PLAN_NOT_FOUND: Plan PLAN_AUTHENTICATION not found
```

**Cause**: Plan doesn't exist or name is wrong.

**Solution**:
```
Step 1: Call list_plans to see available plans
Step 2: Use exact plan name from list (case-sensitive)
Step 3: Ensure plan was created with bootstrap_create_foundation_plan
Step 4: Check docs/plans/ directory exists
```

---

### Error: PREFLIGHT_FAILED

**Message**:
```
PREFLIGHT_FAILED: Code rejected because it breaks the build.
PREFLIGHT_FAILURE: Command 'npm run test' failed.
```

**Cause**: Code doesn't pass tests.

**Solution**:
```
Step 1: Run npm run test locally
Step 2: Read the test failure
Step 3: Fix the actual code issue
Step 4: Run npm run test again (should pass)
Step 5: Try write_file again
```

---

### Error: ROLE_HEADER_MISSING

**Message**:
```
ROLE_HEADER_MISSING: file must start with /** */ block
ROLE_CONTRACT_VIOLATION: EXECUTABLE missing required field "PURPOSE"
```

**Cause**: Missing role metadata in write_file call.

**Solution**:
```
Include in write_file:
- ✅ role: "EXECUTABLE"
- ✅ connectedVia: "string"
- ✅ executedVia: "string"
- ✅ registeredIn: "plan name"
- ✅ usedBy: "who uses this"
- ✅ purpose: "what does it do"
- ✅ failureModes: "what can fail"
```

---

### Error: COMMIT REJECTED

**Message**:
```
❌ COMMIT REJECTED - Files not written through KAIZA-MCP:
   ❌ src/file.js (NOT IN AUDIT LOG - rejected)
```

**Cause**: File was written without KAIZA-MCP.

**Solution**:
```
Step 1: git reset HEAD
Step 2: Use write_file to write the file
Step 3: Try commit again
```

---

## Workflow Diagrams

### Planning Workflow (AMP/Antigravity)

```
┌─────────────────────────────────────┐
│  START: Planning a new feature      │
└────────────────────┬────────────────┘
                     ▼
        ┌─────────────────────────┐
        │ Define requirements     │
        │ Design architecture     │
        │ Specify behavior        │
        └────────────┬────────────┘
                     ▼
        ┌─────────────────────────────────────┐
        │ Create plan document (Markdown)      │
        │ Include:                             │
        │ - Objective                          │
        │ - Requirements                       │
        │ - Implementation specs               │
        │ - Success criteria                   │
        └────────────┬────────────────────────┘
                     ▼
        ┌─────────────────────────────────────┐
        │ Call bootstrap_create_foundation    │
        │ - Set status: APPROVED              │
        │ - Set plan_id                       │
        │ - Provide proper signature          │
        └────────────┬────────────────────────┘
                     ▼
        ┌─────────────────────────────────────┐
        │ Plan created in docs/plans/         │
        │ Ready for Windsurf to execute       │
        └─────────────────────────────────────┘
```

### Execution Workflow (Windsurf)

```
┌──────────────────────────────────────┐
│  START: New session or new task      │
└────────────┬───────────────────────┘
             ▼
┌────────────────────────────────────┐
│ Call read_prompt('ANTIGRAVITY_..') │
│ (Unlock write operations)          │
└────────────┬───────────────────────┘
             ▼
┌──────────────────────────────────────┐
│ Call list_plans                      │
│ (See available plans to execute)    │
└────────────┬───────────────────────┘
             ▼
┌──────────────────────────────────────┐
│ Call read_file(plan_path)            │
│ (Understand plan requirements)      │
└────────────┬───────────────────────┘
             ▼
┌──────────────────────────────────────┐
│ Plan understood?                     │
└─┬──────────────────────────────────┬─┘
  │ No                                │ Yes
  ▼                                   ▼
┌─────────────────────┐   ┌────────────────────────────┐
│ Ask for clarification│   │ Call write_file             │
│ (request from       │   │ - path: file to create      │
│  AMP/Antigravity)   │   │ - content: production code  │
└──────────┬──────────┘   │ - plan: plan name           │
           │              │ - role: EXECUTABLE/etc      │
           └──────────┬──┤ - All metadata              │
                      ▼  └────────────┬───────────────┘
              ┌──────────────────┐    ▼
              │ Clarification    │  ┌────────────────────┐
              │ received         │  │ KAIZA validates:   │
              └────────┬─────────┘  │ - No mock data    │
                       │            │ - No TODOs        │
                       │            │ - No type bypass  │
                       │            │ - Tests pass      │
                       │            └────────┬──────────┘
                       │                     │
                       └──────────┬──────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │ Code accepted?          │
                    └┬──────────────────────┬─┘
                     │ No                   │ Yes
                     ▼                      ▼
        ┌─────────────────────────┐  ┌──────────────────┐
        │ Read error message      │  │ File written OK  │
        │ Fix the issue           │  │ Move to next file│
        │ Try write_file again    │  └────────┬─────────┘
        └────────────┬────────────┘           │
                     │                        ▼
                     └──────────┬─────────────┘
                                ▼
                    ┌───────────────────────────┐
                    │ All plan files done?      │
                    └┬─────────────────────────┬┘
                     │ No                      │ Yes
                     │                         ▼
                     │          ┌────────────────────────┐
                     │          │ git add .              │
                     │          │ git commit -m "..."    │
                     │          │ (pre-commit validates) │
                     │          └────────┬───────────────┘
                     │                   ▼
                     │          ┌────────────────────────┐
                     │          │ Commit successful      │
                     │          │ Plan executed!         │
                     │          └────────────────────────┘
                     │
                     └────────────────────┐
                                          ▼
                             ┌──────────────────────┐
                             │ Next file in plan    │
                             │ Go to: write_file    │
                             └──────────────────────┘
```

---

## Quick Reference Checklists

### For Planners (AMP/Antigravity)

- [ ] Plan has clear objective
- [ ] Plan has detailed requirements
- [ ] Plan has implementation specifications for each file
- [ ] Each file specification includes:
  - [ ] Purpose
  - [ ] Behavior/functionality
  - [ ] Dependencies
  - [ ] Exports/API
  - [ ] Error handling
- [ ] Plan has success criteria
- [ ] Plan status is `APPROVED`
- [ ] Plan has unique ID
- [ ] Plan has clear, descriptive name
- [ ] Bootstrap secret is set (`KAIZA_BOOTSTRAP_SECRET`)
- [ ] Called `bootstrap_create_foundation_plan` with proper signature
- [ ] Plan exists in `docs/plans/`

### For Executors (Windsurf)

- [ ] Called `read_prompt('ANTIGRAVITY_CANONICAL')`
- [ ] Called `list_plans` to see available plans
- [ ] Read plan document completely
- [ ] Understand all requirements
- [ ] For each file in plan:
  - [ ] Called `write_file` with complete code
  - [ ] Code passes `npm run test`
  - [ ] Code passes `npm run lint`
  - [ ] Code passes `npm run typecheck`
  - [ ] No mock data (mockData, testData, fakeData, dummyData)
  - [ ] No TODOs (TODO, FIXME, XXX, HACK)
  - [ ] No type bypasses (@ts-ignore)
  - [ ] No stubs or placeholders
  - [ ] Included all role metadata
  - [ ] Referenced correct plan name
- [ ] Called `git add .` and `git commit`
- [ ] Commit succeeded (pre-commit hook passed)

---

## Summary

**For Planners (AMP/Antigravity)**:
1. Create plan document with clear requirements
2. Call `bootstrap_create_foundation_plan` with proper auth
3. Plan goes to `docs/plans/` with status APPROVED
4. Wait for Windsurf to execute

**For Executors (Windsurf)**:
1. Call `read_prompt` to unlock
2. Call `list_plans` to see plans
3. Read plan document
4. For each file: call `write_file` with complete code
5. If rejected: fix the issue, retry
6. When done: `git commit` (must pass pre-commit hook)

**The Golden Rules**:
- Plans are made by AMP/Antigravity
- Code is written by Windsurf
- All code is production-ready (no mocks, TODOs, type bypasses)
- All code is audited (written via KAIZA-MCP)
- All commits are traced (must be in audit log)

That's KAIZA-MCP. Follow these steps. It will work perfectly.
