# MCP Startup Self-Audit Specification

**Document Type**: Enforcement Audit Template  
**Authority**: ATLAS-GATE MCP Governance  
**Status**: ACTIVE  
**Last Updated**: 2026-01-19

---

## Overview

The **MCP Startup Self-Audit** is a mandatory hardening gate that executes during server initialization, BEFORE the MCP server begins accepting requests or registering tools.

### Purpose

- **Refuse-to-boot enforcement**: If any audit check fails, the server terminates immediately with exit code 1
- **Deterministic verification**: All checks produce stable, reproducible results
- **Invariant catalog**: Each check has a unique, stable error code for traceability
- **Non-recoverable**: Failed audits cannot be bypassed, overridden, or degraded

---

## Invariant Catalog

### 1. Tool Registration Invariants

| Invariant ID | Rule | Pass Criteria | Fail Criteria |
|---|---|---|---|
| `INV_STARTUP_TOOL_REGISTRY_EXISTS` | Tool registry must be accessible | Server instance has `_registeredTools` or `tools` property | Registry property missing or null |
| `INV_STARTUP_TOOL_SCHEMAS_DEFINED` | All registered tools must have input schemas | Every tool has a non-null `inputSchema` | Any tool lacks schema definition |

**Examples of FAIL**:
```javascript
// FAIL: Tool registered without schema
server.registerTool("missing_schema", {}, handler);

// FAIL: Server has no tool registry
const server = {}; // No _registeredTools property
```

---

### 2. Role Manifest Invariants

| Invariant ID | Rule | Pass Criteria | Fail Criteria |
|---|---|---|---|
| `INV_STARTUP_TOOL_ROLE_SEPARATION` | Tool visibility must respect role boundaries | Antigravity has NO mutation tools; Windsurf has NO planning tools | Role sees forbidden tool category |

**Role-based tool distribution**:

| Tool | Antigravity | Windsurf | Category |
|---|---|---|---|
| `begin_session` | ✓ | ✓ | Shared (read-only effect) |
| `read_file` | ✓ | ✓ | Shared (read-only) |
| `read_audit_log` | ✓ | ✓ | Shared (read-only) |
| `read_prompt` | ✓ | ✓ | Shared (read-only) |
| `list_plans` | ✓ | ✓ | Shared (read-only) |
| `bootstrap_create_foundation_plan` | ✓ | ✗ | Planning (Antigravity only) |
| `write_file` | ✗ | ✓ | Mutation (Windsurf only) |

**Examples of FAIL**:
```javascript
// FAIL: Windsurf can access planning tool
if (role === 'WINDSURF') {
  server.registerTool('bootstrap_create_foundation_plan', ...); // REJECT
}

// FAIL: Antigravity can access mutation tool
if (role === 'ANTIGRAVITY') {
  server.registerTool('write_file', ...); // REJECT
}
```

---

### 3. Session Ignition Invariants

| Invariant ID | Rule | Pass Criteria | Fail Criteria |
|---|---|---|---|
| `INV_STARTUP_SESSION_GATE_ENFORCED` | Tools cannot be called before `begin_session` completes | Server has `validateToolInput` override | No session gate function present |
| `INV_STARTUP_SESSION_WORKSPACE_LOCKED` | Workspace root immutable after init | `lockWorkspaceRoot()` called once | Workspace root can be changed mid-session |
| `INV_STARTUP_SESSION_NO_REINIT` | `begin_session` refuses if called twice | Session state checks for `SESSION_WORKSPACE_ROOT !== null` | Can call `begin_session` twice in same session |

**Examples of FAIL**:
```javascript
// FAIL: Tool called before begin_session
SESSION_STATE.workspaceRoot = null;
await server.tool.call('read_file', { path: 'file.txt' }); // Should throw

// FAIL: begin_session called twice
await server.tool.call('begin_session', { workspace_root: '/repo1' });
await server.tool.call('begin_session', { workspace_root: '/repo2' }); // Should reject
```

---

### 4. Plan Addressing Invariants

| Invariant ID | Rule | Pass Criteria | Fail Criteria |
|---|---|---|---|
| `INV_STARTUP_PLAN_ADDRESSING_BY_HASH` | Plans addressed by hash only | `enforcePlan()` takes `planHash` parameter and calls `resolvePlanPath(planHash)` | Plan lookup uses name-based resolution |
| `INV_STARTUP_PLAN_DIRECTORY_CANONICAL` | Plans directory is `{workspace_root}/docs/plans` | `getPlansDir()` returns canonical path | Plans directory is discovered or configurable |

**Hash format**: SHA256 (64 hexadecimal characters)

**Examples of FAIL**:
```javascript
// FAIL: Plan addressed by name instead of hash
resolvePlanPath('my-plan-v1'); // REJECT - must be hash

// FAIL: Plans directory is not canonical
const plansDir = process.env.PLANS_DIR || './plans'; // REJECT - must be docs/plans
```

---

### 5. Error Boundary Invariants

| Invariant ID | Rule | Pass Criteria | Fail Criteria |
|---|---|---|---|
| `INV_STARTUP_ERROR_BOUNDARY_CANONICAL` | Single canonical error classification layer exists | `KaizaError` class is defined and importable | Multiple error systems or no error class |
| `INV_STARTUP_ERROR_CODES_COMPLETE` | All required error codes defined | All 10 required codes exist in `ERROR_CODES` object | Missing codes: UNAUTHORIZED_ACTION, INVARIANT_VIOLATION, SESSION_LOCKED, BOOTSTRAP_FAILURE, WRITE_REJECTED, PREFLIGHT_FAILED, POLICY_VIOLATION, INTERNAL_ERROR, SELF_AUDIT_FAILURE, BYPASS_ATTEMPT |

**Examples of FAIL**:
```javascript
// FAIL: Missing error code
export const ERROR_CODES = {
  UNAUTHORIZED_ACTION: '...',
  // Missing others...
};

// FAIL: Multiple error systems
class AppError extends Error { ... }
class SystemError extends Error { ... }
// Should have single KaizaError
```

---

### 6. Infrastructure Module Invariants

| Invariant ID | Rule | Pass Criteria | Fail Criteria |
|---|---|---|---|
| `INV_STARTUP_INFRASTRUCTURE_LOADABLE` | Critical infrastructure modules are loadable | All 5 modules load without error: `error.js`, `invariant.js`, `path-resolver.js`, `plan-enforcer.js`, `session.js` | Any module fails to import or has syntax error |

---

## Test Commands

### Run Startup Audit Tests

```bash
# Run unit tests that verify startup audit behavior
npm test

# Run specific startup audit test
node test-startup-audit.js

# Simulate audit failure (with test harness)
node test-startup-audit-failure.js
```

### Manual Verification

```bash
# Start server and check for boot refusal if invariant is broken
bin/atlas-gate-mcp-windsurf.js

# Check audit logs for recorded violations
cat docs/reports/PHASE_MCP_STARTUP_AUDIT_LOG.jsonl
```

---

## Interpreting Results

### AUDIT_PASSED

```json
{
  "status": "AUDIT_PASSED",
  "timestamp": "2026-01-19T14:30:45.123Z",
  "total_checks": 8,
  "passed_checks": 8,
  "failed_checks": 0
}
```

**Meaning**: Server is safe to boot. All governance invariants verified.

### AUDIT_FAILED

```json
{
  "status": "AUDIT_FAILED",
  "timestamp": "2026-01-19T14:30:45.123Z",
  "total_checks": 8,
  "passed_checks": 6,
  "failed_checks": 2,
  "failures": [
    {
      "invariant_id": "INV_STARTUP_TOOL_REGISTRY_EXISTS",
      "message": "Tool registry check failed: Server instance is not an object",
      "details": { "error": "..." }
    },
    {
      "invariant_id": "INV_STARTUP_SESSION_GATE_ENFORCED",
      "message": "Session ignition check failed: validateToolInput is not a function",
      "details": { "error": "..." }
    }
  ]
}
```

**Meaning**: Server refuses to boot. 2 invariants violated. Check `failures` array for details.

---

## Failure Scenarios

### Scenario 1: Tool Registry Corruption

**Trigger**: Server instance loses `_registeredTools` property  
**Audit Fails**: `INV_STARTUP_TOOL_REGISTRY_EXISTS`  
**Resolution**: Verify server initialization code doesn't accidentally clear registry

### Scenario 2: Role Boundary Violated

**Trigger**: Windsurf accidentally registers `bootstrap_create_foundation_plan`  
**Audit Fails**: `INV_STARTUP_TOOL_ROLE_SEPARATION`  
**Resolution**: Ensure tool registration respects role checks

### Scenario 3: Session Gate Removed

**Trigger**: `validateToolInput` override is deleted from `server.js`  
**Audit Fails**: `INV_STARTUP_SESSION_GATE_ENFORCED`  
**Resolution**: Restore session validation function

### Scenario 4: Module Import Error

**Trigger**: Syntax error in `error.js` or `path-resolver.js`  
**Audit Fails**: `INV_STARTUP_INFRASTRUCTURE_LOADABLE`  
**Resolution**: Fix syntax error in failing module

---

## Non-Technical Summary

The **MCP Startup Self-Audit** is an automated safety check that runs every time the server starts. Think of it as a pre-flight checklist for an airplane:

1. **Tool Registry Check** - Are all tools registered and ready?
2. **Role Check** - Does each role (Antigravity vs Windsurf) have the right tools?
3. **Session Gate Check** - Can users call tools before logging in? (They shouldn't)
4. **Workspace Lock Check** - Once a workspace is chosen, can it be changed? (It shouldn't)
5. **Plan Addressing Check** - Are plans found by their hash ID? (They should be)
6. **Error Handling Check** - Do we have a single, clear way to report errors?
7. **Module Check** - Are all the critical system modules loaded?

If **ANY** check fails, the server **refuses to start** and shows you exactly which check failed and why. This prevents partially-broken servers from running.

---

## Maintenance & Updates

| Aspect | Responsibility | Frequency |
|---|---|---|
| Adding new invariants | Governance team | When new enforcement is added |
| Running audit | Every server start | Automatic (non-negotiable) |
| Updating failure scenarios | Documentation team | When failure modes discovered |
| Test coverage | QA team | Per sprint |

---

## Related Documents

- [GLOBAL_INVARIANTS.md](../../GLOBAL_INVARIANTS.md) - System-wide invariants
- [ENGINEERING_STANDARDS.md](../../ENGINEERING_STANDARDS.md) - Code standards
- [ROLE_DEFINITIONS.md](../../ROLE_DEFINITIONS.md) - Tool role separation
- [core/startup-audit.js](../../core/startup-audit.js) - Implementation

---

## See Also

- `test-startup-audit.js` - Unit tests
- `core/startup-audit.js` - Implementation
- `server.js` - Audit integration point (line ~106)
