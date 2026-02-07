# Plan Linter Integration Roadmap

**Phase**: NEXT (Post-Foundation)  
**Status**: READY FOR IMPLEMENTATION  
**Estimated Effort**: 3-4 hours

---

## Overview

The Plan Linter foundation is complete and tested. This document specifies exactly where and how to integrate it into the ATLAS-GATE MCP approval and execution flows.

---

## Integration Point 1: Plan Proposal (tools/bootstrap_tool.js)

### Location
**File**: `tools/bootstrap_tool.js`  
**Function**: `bootstrapPlanHandler(args)`  
**When**: Immediately after receiving plan content, before any plan creation

### Current Code Flow
```javascript
export async function bootstrapPlanHandler(args) {
    const { path: targetPath, planContent, payload, signature } = args;
    
    // ... authorization checks ...
    
    const repoRoot = getRepoRoot();
    const result = bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature);
    
    return { ... }
}
```

### Required Change
Add linting check before calling `bootstrapCreateFoundationPlan`:

```javascript
// AT START OF FUNCTION, AFTER SIGNATURE VERIFICATION
import { lintPlan } from "../core/plan-linter.js";

// LINT THE PLAN PROPOSAL
const lintResult = lintPlan(planContent);
if (!lintResult.passed) {
    throw SystemError.toolFailure(
        SYSTEM_ERROR_CODES.PLAN_LINT_FAILED,
        {
            human_message: `Plan proposal rejected: linting failed with ${lintResult.errors.length} error(s)`,
            tool_name: "bootstrap_create_foundation_plan",
            violations: lintResult.errors.map(e => ({
                code: e.code,
                message: e.message,
                invariant: e.invariant,
                severity: e.severity
            }))
        }
    );
}

// Log to audit trail
await appendAuditEntry({
    session_id: SESSION_ID,
    role: "ANTIGRAVITY",
    tool: "bootstrap_create_foundation_plan",
    event: "plan_lint_proposal",
    plan_hash: lintResult.hash,
    lint_result: "PASS",
    error_count: 0,
    violations: [],
});

// CONTINUE WITH PLAN CREATION
const repoRoot = getRepoRoot();
const result = bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature);
```

### Test Case
- Proposal with missing section → reject with PLAN_MISSING_SECTION
- Proposal with ambiguous language → reject with PLAN_NOT_ENFORCEABLE
- Proposal with valid structure → accept and proceed

---

## Integration Point 2: Plan Approval (core/governance.js)

### Location
**File**: `core/governance.js`  
**Function**: `bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature)`  
**When**: Immediately after verifying signature, before writing approved plan file

### Current Code Flow
```javascript
export function bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature) {
    if (!isBootstrapEnabled(getRepoRoot())) {
        throw new Error("BOOTSTRAP_DISABLED");
    }

    verifyBootstrapAuth(payload, signature);
    
    const rawHash = crypto.createHash("sha256").update(planContent).digest("hex");
    
    // ... plan file creation ...
    
    const fullPlanPath = path.join(plansDir, planFileName);
    fs.writeFileSync(fullPlanPath, finalContent, "utf8");
    
    // ... update governance state ...
}
```

### Required Change
Add linting with hash validation before approval:

```javascript
// AT START OF FUNCTION, AFTER AUTH VERIFICATION
import { lintPlan } from "./plan-linter.js";

// LINT THE PLAN BEFORE APPROVAL
const lintResult = lintPlan(planContent);
if (!lintResult.passed) {
    throw new Error(
        `APPROVAL_BLOCKED: Plan linting failed. Errors: ${
            lintResult.errors.map(e => `${e.code}: ${e.message}`).join("; ")
        }`
    );
}

// Hash must match lint result hash
const computedHash = lintResult.hash;
if (computedHash !== payload.plan_hash) {
    throw new Error(
        `APPROVAL_BLOCKED: Hash mismatch. Computed ${computedHash}, expected ${payload.plan_hash}`
    );
}

// Log successful approval
await appendAuditEntry({
    session_id: SESSION_ID,
    role: "ANTIGRAVITY",
    tool: "bootstrap_create_foundation_plan",
    event: "plan_lint_approval",
    plan_hash: computedHash,
    lint_result: "PASS",
    error_count: 0,
    violations: [],
    notes: "Plan approved after passing linting"
});

// CONTINUE WITH PLAN FILE CREATION
const rawHash = computedHash; // Use linted hash
// ... rest of function ...
```

### Test Case
- Approval with hash mismatch → reject with PLAN_HASH_MISMATCH
- Approval with failing lint → reject with APPROVAL_BLOCKED
- Approval with valid plan → accept and write APPROVED status

---

## Integration Point 3: Plan Execution (tools/write_file.js)

### Location
**File**: `tools/write_file.js`  
**Function**: `enforcePlan(planHash, targetPath)` in `core/plan-enforcer.js`  
**When**: When WINDSURF calls write_file with a plan hash

### Current Code Flow
```javascript
export function enforcePlan(planHash, targetPath) {
    invariantNotNull(planHash, "INV_PLAN_HASH_REQUIRED", "Plan hash is required for authorization");

    const planFile = resolvePlanPath(planHash);
    const fileContent = fs.readFileSync(planFile, "utf8");

    const headerMatch = fileContent.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})[\s\S]*?STATUS:\s*APPROVED\s*-->/);

    if (!headerMatch) {
        throw new Error(`REFUSE: Plan ${planHash} is not APPROVED or has invalid header format.`);
    }

    const embeddedHash = headerMatch[1];

    if (embeddedHash !== planHash) {
        throw new Error(`REFUSE: Hash mismatch. Filename ${planHash} does not match embedded hash ${embeddedHash}`);
    }

    // ... scope checks ...
    
    return { repoRoot: getRepoRoot(), plan: planHash, data: {} };
}
```

### Required Change
Add linting re-validation during execution:

```javascript
// AFTER EMBEDDED HASH CHECK, BEFORE SCOPE CHECKS
import { lintPlan } from "./plan-linter.js";

// RE-LINT PLAN AT EXECUTION TIME (FAIL IF MODIFIED)
const lintResult = lintPlan(fileContent, planHash);
if (!lintResult.passed) {
    throw SystemError.toolFailure(
        SYSTEM_ERROR_CODES.PLAN_VALIDATION_FAILED,
        {
            human_message: `Plan execution refused: linting failed. Plan may have been modified.`,
            tool_name: "write_file",
            violations: lintResult.errors.map(e => ({
                code: e.code,
                message: e.message,
                invariant: e.invariant
            }))
        }
    );
}

// Lint passed, execution authorized
// Log to audit trail
await appendAuditEntry({
    session_id: SESSION_ID,
    role: "WINDSURF",
    tool: "write_file",
    event: "plan_lint_execution",
    plan_hash: planHash,
    lint_result: "PASS",
    error_count: 0,
    violations: [],
    notes: "Plan re-validated at execution time"
});

// CONTINUE WITH REST OF FUNCTION
```

### Test Case
- Execution with valid plan → allow
- Execution with modified plan → reject (hash mismatch)
- Execution with corrupted plan → reject (lint fails)

---

## Integration Point 4: Lint Plan Tool (server.js)

### Location
**File**: `server.js`  
**Function**: `startServer(role)` in tool registration section  
**When**: Register new read-only tool for ANTIGRAVITY

### Implementation
Add after read_audit_log tool registration:

```javascript
// LINT_PLAN TOOL (Read-only, ANTIGRAVITY only)
server.registerTool(
  "lint_plan",
  {
    description: "Validate a plan without approval (read-only, non-mutating)",
    inputSchema: z.object({
      path: z.string().optional().describe("Path to plan file in docs/plans/"),
      hash: z.string().optional().describe("Plan hash to validate (64-char hex)"),
      content: z.string().optional().describe("Raw plan content to lint"),
    }),
  },
  wrapHandler(lintPlanHandler, "lint_plan")
);
```

### Handler Implementation (new file: tools/lint_plan.js)
```javascript
import { lintPlan } from "../core/plan-linter.js";
import fs from "fs";
import path from "path";
import { getPlansDir } from "../core/path-resolver.js";

export async function lintPlanHandler({ path: filePath, hash, content }) {
  let planContent;
  let planHash = hash;
  
  if (content) {
    planContent = content;
  } else if (filePath) {
    const fullPath = path.join(getPlansDir(), filePath);
    planContent = fs.readFileSync(fullPath, "utf8");
  } else if (hash) {
    const fullPath = path.join(getPlansDir(), `${hash}.md`);
    planContent = fs.readFileSync(fullPath, "utf8");
  } else {
    throw new Error("Must provide path, hash, or content");
  }

  const lintResult = lintPlan(planContent, planHash);

  return {
    type: "text",
    text: JSON.stringify({
      passed: lintResult.passed,
      hash: lintResult.hash,
      errors: lintResult.errors,
      warnings: lintResult.warnings,
      summary: {
        error_count: lintResult.errors.length,
        warning_count: lintResult.warnings.length,
        invariants_checked: [
          "PLAN_SCOPE_LAW",
          "MECHANICAL_LAW_ONLY",
          "PUBLIC_LAW_READABLE",
          "PLAN_IMMUTABILITY"
        ]
      }
    }, null, 2)
  };
}
```

### Test Case
- Lint existing plan → returns pass/fail with violations
- Lint with wrong hash → shows PLAN_HASH_MISMATCH
- Lint invalid plan → lists all violations
- Read-only: No side effects, no mutations

---

## Audit Trail Integration

### Audit Entry Schema
Every lint operation MUST append to audit log:

```jsonl
{
  "timestamp": 1705700400000,
  "session_id": "...",
  "role": "ANTIGRAVITY|WINDSURF",
  "tool": "bootstrap_create_foundation_plan|write_file|lint_plan",
  "event": "plan_lint_proposal|plan_lint_approval|plan_lint_execution",
  "plan_hash": "d8bb32317a7c1fa04b8203a75388afc6b58a9aa5cad210b85a3e826850b72112",
  "lint_result": "PASS|FAIL",
  "error_count": 0,
  "warning_count": 0,
  "violations": [
    {
      "code": "PLAN_MISSING_SECTION",
      "message": "Required section missing: Plan Metadata",
      "invariant": "PLAN_SCOPE_LAW",
      "severity": "ERROR"
    }
  ],
  "invariants_checked": ["PLAN_SCOPE_LAW", "MECHANICAL_LAW_ONLY", "PUBLIC_LAW_READABLE", "PLAN_IMMUTABILITY"],
  "notes": "Plan approval blocked due to linting failure"
}
```

### Integration Points for Audit Logging
1. **bootstrap_tool.js**: Log proposal linting result
2. **governance.js**: Log approval linting result
3. **plan-enforcer.js**: Log execution linting result
4. **lint_plan handler**: Log lint_plan tool invocation

---

## Error Codes Required

The following error codes must exist in `core/system-error.js`:

- `PLAN_LINT_FAILED` - Plan proposal failed linting
- `PLAN_VALIDATION_FAILED` - Plan execution validation failed
- `PLAN_HASH_MISMATCH` - Hash mismatch at execution

Ensure these are mapped to appropriate HTTP status codes (400 for validation failures).

---

## Testing Strategy

### Unit Tests
- Each integration point: Test with valid plan, invalid plan, malformed input

### Integration Tests
- End-to-end: Create → Approve → Execute
- Hash mutation: Approve plan, modify file, attempt execution (should fail)
- Audit trail: Verify lint events are logged for each operation

### Examples to Create
- `docs/examples/INVALID_PLAN_MISSING_PHASES.md` - Should fail at proposal
- `docs/examples/INVALID_PLAN_AMBIGUOUS.md` - Should fail at approval
- `docs/examples/VALID_PLAN_FOR_LINTER_TESTING.md` - Should pass all gates

---

## Success Criteria

- [ ] Plans cannot be created without passing linting
- [ ] Plans cannot be approved without passing linting
- [ ] Plans cannot be executed if hash doesn't match
- [ ] All lint failures are logged to audit trail
- [ ] Integration tests pass (proposal → approval → execution)
- [ ] lint_plan tool reports correctly
- [ ] No regressions in existing tests

---

## Implementation Order

1. **bootstrap_tool.js**: Add linting to plan proposal (Easy, 30 min)
2. **governance.js**: Add linting to plan approval (Easy, 30 min)
3. **plan-enforcer.js**: Add linting to execution (Easy, 30 min)
4. **server.js**: Add lint_plan tool (Medium, 45 min)
5. **tests**: Add integration tests (Medium, 1 hour)
6. **documentation**: Update guides (Easy, 30 min)

**Total**: 3-4 hours

---

## Rollback Plan

If integration causes issues:
1. Comment out lint checks in bootstrap_tool.js
2. Comment out lint checks in governance.js
3. Comment out lint checks in plan-enforcer.js
4. Remove lint_plan tool registration
5. Verify all tests still pass
6. Identify root cause and fix

---

## API Reference for Integration

### computePlanHash(planContent: string) → string
- Returns: 64-character SHA256 hash
- Note: Strips HTML comment header before hashing

### lintPlan(planContent: string, expectedHash?: string) → LintResult
- Returns structured lint result with errors, warnings, violations
- Error-only: no side effects
- Idempotent: same input → same result

### LintResult Object
```javascript
{
  passed: boolean,              // true if all errors are zero
  hash: string,                 // computed hash of plan
  errors: ViolationObject[],    // fatal violations (approval blocked)
  warnings: ViolationObject[],  // non-fatal warnings
  violations: ViolationObject[] // all violations (errors + warnings)
}
```

### ViolationObject
```javascript
{
  code: string,        // e.g., "PLAN_MISSING_SECTION"
  message: string,     // Human-readable description
  severity: string,    // "ERROR" or "WARNING"
  invariant: string    // e.g., "PLAN_SCOPE_LAW"
}
```

---

## References

- **Spec**: docs/reports/MCP_PLAN_LINTER_SPEC.md
- **Implementation**: core/plan-linter.js
- **Tests**: test-plan-linter.js
- **Example Plan**: docs/examples/EXAMPLE_VALID_PLAN.md

---

## Questions & Support

For questions about integration, refer to:
1. MCP_PLAN_LINTER_SPEC.md for linting rules
2. PHASE_MCP_PLAN_LINTER_IMPLEMENTATION_REPORT.md for architecture
3. test-plan-linter.js for usage examples
