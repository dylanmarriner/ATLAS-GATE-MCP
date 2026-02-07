# ATLAS-GATE-MCP Quick Reference Card

**One-page guide for using ATLAS-GATE-MCP tools.**

---

## The Three Tools

### 1. read_prompt (Always First)
```javascript
await readPrompt({ name: "ANTIGRAVITY_CANONICAL" })
// Unlocks write gates | Call before your first write
```

### 2. read_file (Understand Code)
```javascript
await readFile({ path: "src/auth.js" })
await readFile({ path: ".atlas-gate/approved_plans/PLAN_NAME.md" })
// Read any file in repo | No side effects
```

### 3. write_file (Make Changes)
```javascript
await writeFile({
  path: "src/auth.js",
  content: "real production code...",
  plan: "PLAN_AUTH_SYSTEM",
  role: "EXECUTABLE"
})
// Only real code allowed | Plan required | Audited
```

---

## Workflow: 3 Steps

```
1. PLAN         2. READ          3. WRITE
└─ Approved    └─ Understand    └─ Real code
  plan exists    existing code     under plan
```

**Example**:
```javascript
// Step 1: Verify plan exists
const plan = await readFile({ path: ".atlas-gate/approved_plans/PLAN_JWT.md" });

// Step 2: Read existing auth code
const auth = await readFile({ path: "src/auth.js" });

// Step 3: Write new JWT validator
await writeFile({
  path: "src/jwt-validator.js",
  content: "real JWT validation code...",
  plan: "PLAN_JWT",
  role: "EXECUTABLE"
});
```

---

## Plan Format

Create `.atlas-gate/approved_plans/YOUR_PLAN.md`:

```markdown
---
status: APPROVED
plan_id: PLAN_YOUR_FEATURE_V1
scope:
  - src/file1.js
  - src/file2.js
---

# Your Feature Name

## Objective
What you're building.

## Scope
Files affected.

## Implementation
How it works (real code, no stubs/mocks).

## Success Criteria
How to measure.
```

---

## Code Rules: All Real, All Production

✅ **Real implementations**
```javascript
const user = await database.users.findById(userId);
const token = jwt.verify(token, publicKey);
const data = await externalAPI.fetchData();
```

❌ **Blocked (non-real constructs)**
```javascript
const user = { id: "123", name: "DEMO" };      // C1: Stub
// TODO: implement validation                   // C3: TODO
const mock = { ok: true, id: "FAKE" };         // C2: Mock
function auth() { return true; }                // C5: Bypass
```

---

## Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `PLAN_NOT_FOUND` | Plan doesn't exist | Use existing plan name: `ls .atlas-gate/approved_plans/` |
| `CONSTRUCT_VIOLATION` | TODO/DEMO/stub/mock found | Remove non-real code |
| `PREFLIGHT_FAILED` | Tests or lints failed | Fix locally: `npm test && npm run lint` |
| `PROMPT_GATE_LOCKED` | read_prompt not called | Call `readPrompt("ANTIGRAVITY_CANONICAL")` first |

---

## write_file Parameters

```javascript
{
  // Required
  path: "src/file.js",           // File to write
  content: "code...",            // File content (or patch)
  plan: "PLAN_NAME",             // Approved plan name
  
  // Optional metadata
  role: "EXECUTABLE",            // EXECUTABLE | BOUNDARY | INFRASTRUCTURE | VERIFICATION
  purpose: "What this does",
  usedBy: "who uses it",
  connectedVia: "how it connects"
}
```

---

## Plan Authorization for Non-Real Code

**Only if absolutely necessary**, add to your plan:

```markdown
## Authorized Non-Real Constructs

### AUTHORIZED_C3_TODO
- **Construct**: C3 (TODO marker)
- **Reason**: Feature incomplete until Q2
- **Location**: src/auth.js line 45
- **Control**: `if (process.env !== "production")`
- **Removal**: Q2 2026
- **Tests**: Asserts code not in prod builds
```

Then reference the plan in write_file.

---

## Best Practices

1. **Always call read_prompt first**
2. **Read existing code** before writing
3. **Reference approved plans** in write_file
4. **Write real code** (no stubs, mocks, TODOs, bypasses)
5. **Use role metadata** (EXECUTABLE, BOUNDARY, INFRASTRUCTURE, VERIFICATION)
6. **Test locally** before write_file
7. **Check audit log** after successful write

---

## One-Minute Example

```javascript
// 1. Unlock writes
await readPrompt({ name: "ANTIGRAVITY_CANONICAL" });

// 2. Check the plan
const plan = await readFile({ path: ".atlas-gate/approved_plans/PLAN_BILLING.md" });
console.log("Plan status:", plan); // Verify APPROVED

// 3. Read existing code
const billing = await readFile({ path: "src/billing.js" });

// 4. Write new code under plan
const result = await writeFile({
  path: "src/payment/stripe.js",
  content: `
    const stripe = require('stripe')(process.env.STRIPE_KEY);
    
    async function charge(customerId, amount) {
      const charge = await stripe.charges.create({
        customer: customerId,
        amount: amount,
        currency: 'usd'
      });
      return charge;
    }
    
    module.exports = { charge };
  `,
  plan: "PLAN_BILLING",
  role: "EXECUTABLE",
  purpose: "Stripe payment processing"
});

console.log("Write successful:", result);
// { status: "OK", plan: "PLAN_BILLING", preflight: "PASSED" }
```

---

## Reference Docs

- **Complete Guide**: `docs/MCP_USAGE_GUIDE.md`
- **Construct Taxonomy**: `docs/CONSTRUCT_TAXONOMY.md`
- **Construct Audit Guide**: `docs/CONSTRUCT_AUDIT_GUIDE.md`
- **Architecture**: `docs/ARCHITECTURE.md`

---

**Key Principle**: Real, production-ready code only. All changes planned and audited.

