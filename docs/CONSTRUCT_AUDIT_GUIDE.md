# Construct Audit Guide (C1-C8)

**Quick reference for developers working under ATLAS-GATE MCP governance.**

---

## TL;DR — DEFAULT DENY POLICY

**All non-real code constructs (C1-C8) are BLOCKED by default.**

Code must be:
- ✅ **Real** — Actual implementations, not stubs/mocks
- ✅ **Complete** — No TODO/FIXME markers indicating unfinished work
- ✅ **Production-ready** — No temporary bypasses or simulations
- ✅ **Auditable** — All approvals and limits logged and verifiable

**Only exception**: If your plan explicitly documents and authorizes specific constructs with `AUTHORIZED_C[N]` markers.

---

### Quick Block List

All of these are **BLOCKED unless explicitly authorized in plan**:

- **C1** — Stub (demo data, placeholder functions)
- **C2** — Mock/Fake (test doubles in production code)
- **C3** — TODO/FIXME (unfinished logic markers)
- **C4** — Hardcoded returns (constant values instead of real computation)
- **C5** — Policy bypass (always-allow, hardcoded "true")
- **C6** — Fake approval (SYSTEM approver, bypassed workflows)
- **C7** — Fake limits (tautologies, hardcoded caps, `if(true)`)
- **C8** — Simulated outcome (SIMULATE flags, dry-run that still writes)

---

## What Gets Blocked (All Are Forbidden Unless Authorized in Plan)

### C5: Hardcoded Policy Bypass
```javascript
// BAD ❌
function canAccess(user, resource) { return true; }

// BAD ❌
if (user.role === "admin") return true; // always true for some role
```

**Why**: Removes all access control. Leads to data breaches, privilege escalation.

**How to fix**: Implement real access control logic with policy checks, audit logs, denied paths.

---

### C1: Stub (Incomplete Implementation)
```javascript
// BAD ❌
function loadUser(id) { return { id, name: "DEMO" }; }

// BAD ❌
function fetchData() { return { value: 42 }; } // no real fetch
```

**Why**: Demo code shipped to production. Returns fake data to real users.

**How to fix**: Implement real integration. If blocked, request plan authorization with justification.

---

### C2: Mock/Fake (Test Double in Production)
```javascript
// BAD ❌
class FakePaymentClient implements PaymentClient {
  charge() { return { ok: true, id: "FAKE" }; }
}

// BAD ❌
// In production DI: DI.register(FakePaymentClient); // used when real client fails
```

**Why**: Payments never actually charged. Orders processed as paid when they're not.

**How to fix**: Always use real implementations. If blocked, request plan authorization.

---

### C4: Hardcoded Return Values
```javascript
// BAD ❌
function getBalance(tenantId) { return 1000; } // all tenants same balance

// BAD ❌
function checkQuota(userId) { return { remaining: 9999 }; } // constant
```

**Why**: Multi-tenant apps charge same amount to all. Single-tenant loses actual data.

**How to fix**: Query real data from sources. If blocked, request plan authorization.

---

### C6: Fake Approval Logic
```javascript
// BAD ❌
request.status = "APPROVED"; // no approver, no audit record

// BAD ❌
request.approvedBy = "SYSTEM"; // auto-approval, records claim manual review
```

**Why**: Compliance bypass. Approvals never actually happened. Audit trail is fake.

**How to fix**: Require real approver identity + immutable audit event log.

---

### C8: Simulated Outcome
```javascript
// BAD ❌
if (process.env.SIMULATE) {
  return { ok: true, ref: "SIM-123" };
  // Still marks order as paid, charges customer
}

// BAD ❌
if (env.dryRun) {
  // Logs the action but still writes to DB
  db.save(order);
  return { ok: true };
}
```

**Why**: Simulates work without doing it. Marks orders paid, shipments sent, when nothing happened.

**How to fix**: Implement real execution logic. If blocked, request plan authorization.

---

### C3: TODO/FIXME
```javascript
// BLOCKED ❌
// TODO: replace with real RBAC
if (user.isAdmin) return true;

// BLOCKED ❌
// FIXME: enforce spend limits
if (totalSpent + amount > limit) { /* should throw */ }
```

**Why**: Indicates incomplete work. Incomplete code must not be shipped.

**How to fix**: Complete the implementation. If blocked, request plan authorization with timeline for completion.

---

## Cross-Cutting Patterns

### Pattern: "Always True" / "Always Allow"
```
Any of these are red flags:
  - return true;
  - if (true) { ... }
  - return 1;  (in a boolean context)
  - WHERE 1=1  (SQL)
  - [ ] (always succeeds in shell)
```

Legitimate? Only if:
- Not in a security/policy context
- Explicitly documented as by-design
- Covered by tests asserting it's not in prod code paths

---

### Pattern: Hardcoded Constants in Business Logic
```
Detect:
  - Magic numbers (9999, 100000, 42)
  - Status strings ("SUCCESS", "APPROVED")
  - Fixed IDs ("DEMO", "SYSTEM", "ADMIN")
  
Legitimate? Only if:
  - Defined in centralized constants file (not scattered)
  - Referenced in compliance docs or specs
  - Used only for deterministic defaults (not business logic)
```

---

### Pattern: Feature Flags + Silent State Changes
```javascript
// BAD ❌ (C8 worst case)
if (env.simulate) {
  // Returns success but still writes
  db.order.status = "PAID";
  db.save();
  return { ok: true };
}

// WORSE ❌
if (env.dryRun) {
  // No explicit indication it's simulated
  // Caller can't tell if order was actually placed
  return chargeCard(amount);
}
```

**Fix**: Transactions that fail if writes attempted:
```javascript
// OK ✅
if (env.dryRun) {
  transaction.rollback(); // Undo all writes
  return { ok: true, mode: "dry-run" };
}
```

---

## How to Get Plan Authorization (If Absolutely Necessary)

**IMPORTANT**: In most cases, you should NOT need authorization. Write real code instead.

But if you genuinely need to use a non-real construct:

### Step 1: Create/Update Your Plan

Edit `.atlas-gate/approved_plans/YOUR_PLAN.md` and add an authorization section:

```markdown
---
status: APPROVED
plan_id: PLAN_USER_SYSTEM
---

## Authorized Non-Real Constructs

This plan explicitly authorizes the following constructs:

### AUTHORIZED_C3_TODO
- **Construct**: C3 (TODO/FIXME markers)
- **Reason**: User authentication system design incomplete; temporary scaffolding
- **Location**: `src/auth/oauth-provider.js` lines 45-67
- **Control**: Wrapped in `if (process.env.ENVIRONMENT === "development")`
- **Removal Date**: Before next production release
- **Tests**: `tests/auth.test.js` asserts this code path is not in prod builds

### AUTHORIZED_C1_STUB
- **Construct**: C1 (Stub - demo data)
- **Reason**: Payment integration not ready; using sandbox mock until Q2
- **Location**: `src/billing/stripe-client.js` line 123
- **Control**: Feature flag `STRIPE_LIVE_MODE` gates to real or stub
- **Removal Date**: Q2 2026 when live Stripe API ready
- **Audit**: All transactions logged with `[SANDBOXED]` marker
```

### Step 2: Reference Plan in write_file Call

```javascript
await writeFile({
  path: "src/auth/oauth-provider.js",
  content: "...", // your code with TODO markers
  plan: "PLAN_USER_SYSTEM",
  planId: "plan-user-system-v1",
  planHash: "abc123..." // SHA256 of plan file
});
```

### Step 3: What the Plan Must Document

For each authorized construct, explain:

- **What**: The exact construct (C1-C8) and code location
- **Why**: Business reason (incomplete feature, external dependency, etc.)
- **How**: What controls prevent abuse (feature flags, env gates, tests, logging)
- **When**: Removal date and migration plan
- **Proof**: Tests asserting it's not in production paths

Without this documentation, authorization is **DENIED**.

---

## How to Write Legitimate Code

### Rule 1: Real Implementations
Always use real dependencies. Fail gracefully if they're unavailable:

```javascript
// OK ✅
async function charge(amount) {
  try {
    return await paymentGateway.charge(amount);
  } catch (err) {
    if (isNetworkError(err)) {
      throw new ServiceUnavailable("Payment service temporarily down");
    }
    throw err;
  }
}
```

### Rule 2: Config-Driven Policies
Use configuration files, not hardcoded values:

```javascript
// BAD ❌
if (spent + amount > 9999) throw new Error("cap");

// OK ✅
if (spent + amount > config.SPENDING_CAP) throw new Error("cap");
// config.SPENDING_CAP comes from environment or config files
```

### Rule 3: Immutable Audit Trails
When approvals happen, log them:

```javascript
// BAD ❌
request.status = "APPROVED";

// OK ✅
const approval = {
  requestId: request.id,
  approverId: currentUser.id,
  timestamp: new Date(),
  reason: "Meets policy",
};
auditLog.append(approval);
request.updateStatus("APPROVED", approval.id);
```

### Rule 4: Explicit Gating for Test Code
If you need test doubles, gate them:

```javascript
// OK ✅
let client = paymentClient;
if (process.env.TEST_MODE) {
  client = new MockPaymentClient();
  // Only in test mode
  process.on("exit", () => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TEST_MODE enabled in production!");
    }
  });
}
```

### Rule 5: No Silent Bypasses
If something is simulated, say so:

```javascript
// BAD ❌
if (env.simulate) return { ok: true }; // looks like real success

// OK ✅
if (env.simulate) {
  logger.info("SIMULATED_RUN: Order processing skipped");
  return { ok: true, simulated: true, warnings: ["Order not actually placed"] };
}

// Even better: don't use simulate flags, use explicit types
class OrderProcessor {
  process(order, options = {}) {
    if (options.dryRun) {
      return this._planOnly(order); // Different code path
    }
    return this._processReal(order);
  }
}
```

---

## Audit Checklist

Before writing code, ask:

- [ ] Am I returning real data from real sources, or constants?
- [ ] Does a network/DB call happen, or am I short-circuiting?
- [ ] Are approvals real (with audit log), or simulated (status set directly)?
- [ ] Are limits checked against real configs, or hardcoded?
- [ ] If I'm using a feature flag, does it prevent writes if disabled?
- [ ] Are there tests asserting this code doesn't run in prod?
- [ ] Can I explain why this code exists without saying "temporary" or "for now"?

---

## What GATE 4 (Enforcement) Checks

```
write_file({
  path: "src/index.js",
  content: "...",
  plan: "PLAN_NAME"  // Required
})
```

Your code is scanned for:

1. **TEXT PATTERNS** — Comments and strings containing suspicious keywords
   - "TODO", "FIXME" (C3)
   - "stub", "demo", "DEMO" (C1)
   - "mock", "fake", "Fake", "Mock" (C2)
   - "SIMULATE", "DRY_RUN" (C8)
   - "return true", "bypass" (C5)

2. **AST ANALYSIS** — Code structure (JavaScript/TypeScript only)
   - Functions returning constants while taking params
   - Functions with unused parameters
   - Empty function bodies
   - Unconditional returns

3. **BLOCKED PATTERNS** — Never allowed
   - C5 (Policy Bypass): Always returns true, always allows
   - AST empty functions, missing implementations

If violations found:
- **CRITICAL**: Block immediately
- **HIGH**: Block, suggest creating a plan that authorizes
- **MEDIUM**: Warn, may require plan reference

---

## Example: Legitimate Code That Passes GATE 4

```javascript
/**
 * Retrieves user profile from authenticated data source.
 * 
 * Authorized under: PLAN_USER_SYSTEM_IMPLEMENTATION
 * 
 * @param {string} userId - User ID from auth context
 * @returns {Promise<UserProfile>}
 * @throws {NotFoundError} if user not found
 */
async function getUserProfile(userId) {
  const user = await database.users.findById(userId);
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }
  
  const profile = await enrichProfileWithDefaults(user);
  
  // Audit all profile requests
  auditLog.log({
    action: "GET_PROFILE",
    subject: userId,
    timestamp: new Date(),
  });
  
  return profile;
}
```

**Why this passes**:
- ✅ Uses real database query (not hardcoded)
- ✅ Throws on missing data (doesn't return null/demo)
- ✅ Logs audit event for security
- ✅ No mock/fake/stub patterns
- ✅ Documented with plan reference

---

## Questions?

1. **"Can I use feature flags?"** 
   - Yes, but they must prevent writes if simulating. And test that it works.

2. **"Can I use deterministic test data in production code?"**
   - Only for system defaults, and only if documented + centralized.

3. **"Can I have TODO comments?"**
   - Yes, but not in critical logic that affects behavior. If behavior is incomplete, block the code.

4. **"How do I authorize an exception?"**
   - Create a plan (`.md` file) that documents:
     1. Why this construct is legitimate
     2. How it's controlled (gating, tests)
     3. When it will be removed
   - Reference the plan in your `write_file` call

5. **"What if my language isn't supported?"**
   - Text patterns are language-agnostic. AST analysis is JS/TS only (for now).
   - Use the detection rules as a manual checklist for your language.

---

## Reference

- **Taxonomy**: `docs/CONSTRUCT_TAXONOMY.md`
- **Detection Rules**: `core/construct-detection-rules.json`
- **Enforcement**: `core/stub-detector.js` (GATE 4)
- **Plans**: `.atlas-gate/approved_plans/*.md`

