# HARD BLOCK POLICY

**Absolute enforcement rules. No exceptions. No plan override. No appeals.**

---

## The 4 HARD BLOCKED Constructs

### ❌ C2: Mock/Fake (Test Doubles in Production)

**Forbidden patterns**:

```javascript
class FakePay { ... }          // ❌ HARD BLOCK
class MockDatabase { ... }     // ❌ HARD BLOCK
fakeData, fake_data            // ❌ HARD BLOCK
testData, test_data            // ❌ HARD BLOCK
dummyData, dummy_data          // ❌ HARD BLOCK
```

**Why**: Test doubles in production lead to:

- Data loss (fake charging without collecting payment)
- Financial fraud (orders marked as paid when not)
- Compliance violations (audit trails are fake)

**Fix**: Use real implementations. Always.

---

### ❌ C3: TODO/FIXME (Incomplete Work)

**Forbidden patterns**:

```javascript
// TODO: implement auth          // ❌ HARD BLOCK
// FIXME: add validation         // ❌ HARD BLOCK
// XXX: temporary hack           // ❌ HARD BLOCK
```

**Why**: Incomplete code must never ship:

- Indicates unfinished logic
- Developer intent to return and fix later
- Security gaps when "temporary" becomes permanent

**Fix**: Complete the implementation. No half-done code.

---

### ❌ C5: Policy Bypass (Always-Allow)

**Forbidden patterns**:

```javascript
return true;                   // ❌ HARD BLOCK
=> true                        // ❌ HARD BLOCK
always allow                   // ❌ HARD BLOCK
bypass                         // ❌ HARD BLOCK
BYPASS                         // ❌ HARD BLOCK
```

**Why**: Policy bypasses remove all security:

- Access control disabled
- Privilege escalation
- Data exposure to unauthorized users
- Critical security breach

**Fix**: Implement real access control. No shortcuts.

---

### ❌ C8: Simulated Outcome (Dry-Run, Simulate)

**Forbidden patterns**:

```javascript
if (process.env.SIMULATE)      // ❌ HARD BLOCK
if (DRY_RUN)                   // ❌ HARD BLOCK
SIMULATE, DRY_RUN              // ❌ HARD BLOCK
dryrun, dry-run, dry_run       // ❌ HARD BLOCK
```

**Why**: Simulated outcomes without real work lead to:

- Orders marked paid that weren't charged
- Shipments marked sent that never shipped
- Transactions recorded in audit but never executed
- Data consistency violations

**Fix**: Execute real operations. No simulation flags.

---

## ALSO HARD BLOCKED: Null/Undefined Returns

**Forbidden patterns**:

```javascript
return null;                   // ❌ HARD BLOCK
return undefined;              // ❌ HARD BLOCK
return "";                     // ❌ HARD BLOCK (empty string)
```

**Why**: Null/undefined returns bypass error handling:

- Caller can't distinguish success from failure
- Silent failures propagate
- No audit trail of what went wrong

**Fix**: Return valid data or throw an error. Always.

---

## Enforcement

### Detection

ATLAS-GATE scans all code writes for these patterns:

1. **Text scan**: Looks for literal patterns in code comments and strings
2. **AST scan** (JavaScript/TypeScript): Analyzes code structure
   - Returns null/undefined/empty string
   - Empty catch blocks
   - Unconditional returns

### Enforcement Point

Hard blocks are checked in **GATE 4** of `write_file`:

```
write_file(content, plan, ...)
  ↓
[GATE 1: Plan validation]
  ↓
[GATE 2: Plan verification]
  ↓
[GATE 3: Role metadata]
  ↓
[GATE 4: Enterprise Code Enforcement] ← HARD BLOCKS CHECKED HERE
  ├─ Phase 1: HARD BLOCK rules (C2, C3, C5, C8, nulls)
  │   └─ IF FOUND → IMMEDIATE REJECTION (no plan override)
  ├─ Phase 2: CRITICAL rules (C1, C4, C6, C7)
  │   └─ IF FOUND → REJECTION
  └─ Phase 3: AST analysis (nulls, undefined, empty returns)
      └─ IF FOUND → IMMEDIATE REJECTION
```

### Error Message

When a hard block is detected:

```
HARD_BLOCK_VIOLATION [NO EXCEPTIONS, NO PLAN OVERRIDE]:

The following constructs are ABSOLUTELY FORBIDDEN:

  🚫 "TODO" — Incomplete Work (TODO, FIXME markers)
  🚫 "mock" — Test Double in Production (mock, fake, dummy)
  🚫 "return true" — Policy Bypass (always-allow, return true)
  🚫 "SIMULATE" — Simulated Outcome (SIMULATE, DRY_RUN flags)

POLICY: These 4 constructs (C2, C3, C5, C8) are PERMANENTLY BLOCKED.
No plan authorization, no exceptions, no overrides.

REASON:
- C5 (Policy Bypass): Removes all security
- C8 (Simulated Outcome): Pretends work was done
- C3 (TODO/FIXME): Incomplete code cannot ship
- C2 (Mock/Fake): Test doubles in production = data loss

WHAT TO DO:
1. Remove all TODO, mock, return true, SIMULATE
2. Write real, complete, production code
3. Retry write_file

Reference: docs/CONSTRUCT_TAXONOMY.md
```

---

## No Exceptions. Ever

### ❌ "But I'll remove it later"

No. Code ships with what it has. If TODO is there now, it ships now.

### ❌ "But it's just a stub for testing"

No. Test code goes in separate directories (tests/, spec/, **tests**). Production code must be real.

### ❌ "But I have a plan that authorizes this"

No. Hard blocks override all plans. No amount of documentation overrides them.

### ❌ "But this is in a dev environment"

No. The enforcement applies to all writes. Environment separation is your responsibility (feature flags, separate deployment, etc.).

### ❌ "But I only need it for 2 days"

No. Temporary code has a way of becoming permanent. Either complete it or don't ship it.

---

## What To Do Instead

### Instead of Mock/Fake (C2)

❌ Wrong:

```javascript
class FakeDatabaseClient {
  async query() { return { id: "FAKE" }; }
}
```

✅ Right:

```javascript
// Use real database
const client = new PostgresClient(process.env.DB_URL);
const user = await client.query('SELECT * FROM users WHERE id = $1', [id]);
```

---

### Instead of TODO/FIXME (C3)

❌ Wrong:

```javascript
// TODO: add real validation
if (email) return user;
```

✅ Right:

```javascript
// Real validation
if (!email || !email.includes('@')) {
  throw new Error('INVALID_EMAIL');
}
return user;
```

---

### Instead of Policy Bypass (C5)

❌ Wrong:

```javascript
function canAccessResource(user, resource) {
  return true; // Always allow
}
```

✅ Right:

```javascript
function canAccessResource(user, resource) {
  // Real policy check
  if (user.role === 'admin') return true;
  if (resource.ownerId === user.id) return true;
  if (user.permissions.includes('read:all')) return true;
  return false;
}
```

---

### Instead of Simulated Outcome (C8)

❌ Wrong:

```javascript
async function processPayment(amount) {
  if (process.env.SIMULATE) {
    return { ok: true, ref: "SIM-123" }; // But still commits the order!
  }
  return chargeCard(amount);
}
```

✅ Right:

```javascript
async function processPayment(amount) {
  const charge = await chargeCard(amount);
  if (!charge.success) {
    throw new Error('CHARGE_FAILED');
  }
  return charge;
}
```

---

### Instead of Null Returns

❌ Wrong:

```javascript
function getUser(id) {
  const user = database.find(id);
  if (!user) return null; // Ambiguous
  return user;
}
```

✅ Right:

```javascript
function getUser(id) {
  const user = database.find(id);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return user;
}

// Or, if empty result is valid:
function getUsers(filter) {
  return database.find(filter); // Returns [] if no matches
}
```

---

## FAQ

**Q: Can I get a plan that overrides hard blocks?**
A: No. Hard blocks are absolute. Plans cannot override them.

**Q: What if my use case is special?**
A: Hard blocks apply to everyone equally. No exceptions.

**Q: Can I comment out the hard block pattern?**
A: No. Scanner detects patterns regardless of context (comments, strings, code).

**Q: Can I use a different word that means the same thing?**
A: Hard blocks detect semantic violations, not just literal words. We check code structure too (AST analysis).

**Q: Will this policy ever change?**
A: No. These rules exist because they prevent critical failures (data loss, security breaches, financial fraud). They're permanent.

---

## The Principle

**Real code only.**

- No stubs, scaffolding, or placeholders
- No mocks or test doubles (use real services)
- No incomplete work (TODOs shipped to production)
- No bypasses (security and access control are real)
- No simulation (work either happens or it doesn't)
- No null/undefined (errors are explicit)

Every line of code in production must be:

- ✅ Real (actual implementations, not placeholders)
- ✅ Complete (no TODOs or FIXMEs)
- ✅ Production-ready (no temporary hacks)
- ✅ Auditable (all changes logged and verifiable)

---

## Reference

- **Construct Taxonomy**: `docs/CONSTRUCT_TAXONOMY.md`
- **Usage Guide**: `docs/MCP_USAGE_GUIDE.md`
- **Quick Reference**: `docs/MCP_QUICK_REFERENCE.md`
- **Enforcement**: `core/stub-detector.js`
