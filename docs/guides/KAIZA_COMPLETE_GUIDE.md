# ATLAS-GATE-MCP Complete Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Planning Phase (AMP/Antigravity)](#planning-phase)
3. [Execution Phase (Windsurf)](#execution-phase)
4. [Example Plan Template](#example-plan-template)
5. [Common Errors and Solutions](#common-errors-and-solutions)
6. [Workflow Diagrams](#workflow-diagrams)

---

## System Overview

ATLAS-GATE-MCP is a three-role governance system:

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

- `bootstrap_create_foundation_plan` via ATLAS-GATE-MCP

---

### Step 2: Understand Plan Requirements

Before creating a plan, understand what it must contain:

#### Required Plan Structure

Plans are now strict JSON. Use `docs/templates/PLAN_SCAFFOLD.json` and the canonical planning prompt.

---

### Step 3: Create the Plan Draft

- Draft as JSON using `PLAN_SCAFFOLD.json`
- Validate with `lint_plan({ content })`
- Save with `save_plan({ content })`
- Saved location becomes `docs/plans/<signature>.json`

---

### Step 4: Call bootstrap_create_foundation_plan

This is how AMP/Antigravity creates plans:

```javascript
// Example: Creating a plan via ATLAS-GATE-MCP
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

const secret = process.env.ATLAS-GATE_BOOTSTRAP_SECRET; // Set this!
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
// Output: Plan created at docs/plans/<signature>.json
```

---

### Step 5: Verify Plan Was Created

After calling `bootstrap_create_foundation_plan`:

1. **Check the file exists**:

   ```bash
   ls -la /media/ubuntux/DEVELOPMENT/gemini_universe/docs/plans/ | grep YOUR_PLAN_NAME
   ```

2. **Verify saved plan is JSON** and has `"status": "APPROVED"`

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
  "<signature-1>.json",
  "<signature-2>.json",
  "<signature-3>.json"
]
```

---

### Step 4: Read a Plan

**Pick a plan and read it completely**:

```
Call: read_file(path: 'docs/plans/<signature>.json')

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
git commit -m "Implement PLAN_AUTHENTICATION per ATLAS-GATE-MCP"
```

**Important**: The pre-commit hook will verify:

- ✅ All files were written via ATLAS-GATE-MCP (in audit log)
- ✅ No bypass of governance

If commit fails, it means a file wasn't written through ATLAS-GATE-MCP. Use `write_file` for that file.

---

## Example Plan Template

Here's a complete example plan that could be created by AMP/Antigravity:

- See `docs/templates/PLAN_EXAMPLE_FINALIZED.json`

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
Step 1: Verify ATLAS-GATE_BOOTSTRAP_SECRET is set correctly
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
❌ COMMIT REJECTED - Files not written through ATLAS-GATE-MCP:
   ❌ src/file.js (NOT IN AUDIT LOG - rejected)
```

**Cause**: File was written without ATLAS-GATE-MCP.

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
        │ Create plan document (JSON)          │
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
              │ received         │  │ ATLAS-GATE validates:   │
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
- [ ] Bootstrap secret is set (`ATLAS-GATE_BOOTSTRAP_SECRET`)
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
3. Read plan JSON document
4. For each file: call `write_file` with complete code
5. If rejected: fix the issue, retry
6. When done: `git commit` (must pass pre-commit hook)

**The Golden Rules**:

- Plans are made by AMP/Antigravity
- Code is written by Windsurf
- All code is production-ready (no mocks, TODOs, type bypasses)
- All code is audited (written via ATLAS-GATE-MCP)
- All commits are traced (must be in audit log)

That's ATLAS-GATE-MCP. Follow these steps. It will work perfectly.
