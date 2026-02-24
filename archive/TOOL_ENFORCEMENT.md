# Tool Enforcement Layer

## Overview

The **Tool Enforcement Layer** (`core/tool-enforcement.js`) is a critical security and correctness mechanism that forces any IDE connected to the MCP server to use tools correctly. It operates at the MCP boundary and ensures that no tool can be invoked with invalid parameters, wrong types, or missing required fields.

## How It Works

### 1. **Installation at Server Startup**

The enforcement layer is installed immediately after server initialization but **before** any tool registration or startup audit:

```javascript
// In server.js startServer()
installEnforcementLayer(server, role);  // Installed here
await runStartupAudit(server, role);    // Audit happens after
```

### 2. **Dual-Layer Validation**

Every tool call passes through two enforcement gates:

#### Gate 1: `validateToolInput()` Override (server.js)
- Runs before Zod schema validation
- Performs strict parameter checking via `validateToolParameters()`
- Rejects calls with unknown fields, wrong types, or missing required fields
- Throws `TOOL_ENFORCEMENT_FAILURE` errors

#### Gate 2: Handler Wrapper (via `installEnforcementLayer()`)
- Wraps each registered tool handler
- Validates parameters a second time
- Audits any violations to the audit log
- Throws `SystemError` with `INVALID_INPUT` code

### 3. **What Gets Enforced**

For **every tool**, the enforcement layer ensures:

| Aspect | Behavior |
|--------|----------|
| **Required Fields** | All fields listed in `schema.required` must be present |
| **Field Types** | Each field must match its declared type (string, number, object, array) |
| **Field Values** | Custom validators check content (e.g., must be 64-char hex hash) |
| **Extra Fields** | Unknown fields are **rejected** (fail-closed) |
| **Null Safety** | Objects cannot be null; arrays must actually be arrays |

## Tool Schemas

Each tool has a strict schema defined in `TOOL_SCHEMAS`:

```javascript
{
  required: ['field1', 'field2'],      // Must be present
  fields: {
    field1: {
      type: 'string',                  // Type requirement
      optional: false,                 // Is it required?
      validator: (val) => { ... }      // Custom validation
    },
    field2: {
      type: 'object',
      optional: true,
      validator: (val) => { ... }
    }
  },
  allowExtraFields: false,              // Reject unknown fields
  customValidator: (args) => { ... }   // Tool-level validation
}
```

### Example: `write_file` Tool

```javascript
write_file: {
  required: ['path', 'plan'],
  fields: {
    path: {
      type: 'string',
      validator: (val) => typeof val === 'string' ? null : `must be string`
    },
    plan: {
      type: 'string',
      validator: (val) => {
        if (!/^[a-f0-9]{64}$/.test(val)) 
          return `must be 64-char hex hash`;
        return null;
      }
    },
    content: { type: 'string', optional: true, ... },
    patch: { type: 'string', optional: true, ... },
    role: { type: 'string', optional: true, ... },
    intent: { type: 'string', optional: true, ... }
  },
  allowExtraFields: false  // ← IDE cannot add unknown fields
}
```

**Valid call:**
```json
{
  "path": "/src/index.js",
  "content": "// code",
  "plan": "a1b2c3d4...e5f6g7h8"
}
```

**Invalid calls that get blocked:**
```json
// ❌ Missing required 'plan'
{ "path": "/src/index.js", "content": "// code" }

// ❌ 'plan' is not 64-char hex
{ "path": "/src/index.js", "content": "// code", "plan": "short" }

// ❌ Wrong type for 'path'
{ "path": 123, "plan": "a1b2c3d4...e5f6g7h8" }

// ❌ Unknown field 'workspace_id'
{ "path": "/src/index.js", "content": "// code", 
  "plan": "a1b2c3d4...e5f6g7h8", "workspace_id": "xyz" }
```

## Current Tool Schemas

### Universal Tools

#### `begin_session`
- **Required:** `workspace_root` (string, absolute path)
- **Allowed extra fields:** No
- **Validation:** Must start with `/` or drive letter (Windows)

#### `read_file`
- **Required:** `path` (string)
- **Optional:** None
- **Allowed extra fields:** No

#### `read_prompt`
- **Required:** `name` (string)
- **Optional:** None
- **Allowed extra fields:** No

#### `read_audit_log`
- **Required:** None
- **Optional:** None
- **Allowed extra fields:** No

#### `list_plans`
- **Required:** None
- **Optional:** `path` (string)
- **Allowed extra fields:** No

#### `replay_execution`
- **Required:** `plan_hash` (64-char hex string)
- **Optional:** `phase_id`, `tool`, `seq_start`, `seq_end`
- **Allowed extra fields:** No

#### `verify_workspace_integrity`
- **Required:** None
- **Optional:** None
- **Allowed extra fields:** No

#### `generate_attestation_bundle`
- **Required:** None
- **Optional:** `workspace_root_label`, `plan_hash_filter`, `time_window` (object)
- **Allowed extra fields:** No

#### `verify_attestation_bundle`
- **Required:** `bundle` (object)
- **Optional:** None
- **Allowed extra fields:** No

#### `export_attestation_bundle`
- **Required:** `bundle` (object)
- **Optional:** `format` ("json" or "markdown")
- **Allowed extra fields:** No

### Windsurf-Only Tools

#### `write_file`
- **Required:** `path`, `plan`
- **Optional:** `content`, `patch`, `previousHash`, `role`, `intent`
- **Allowed extra fields:** No
- **Validation:**
  - `plan` must be 64-char hex hash
  - `previousHash` must be 64-char hex hash (if provided)
  - `role` must be one of: `EXECUTABLE`, `BOUNDARY`, `INFRASTRUCTURE`, `VERIFICATION`

### Antigravity-Only Tools

#### `bootstrap_create_foundation_plan`
- **Required:** `description`, `phases`
- **Optional:** `workspace_label`
- **Allowed extra fields:** No
- **Validation:**
  - `phases` must be an array
  - `description` must be a string

#### `lint_plan`
- **Required:** None (at least one of `path`, `hash`, or `content` required)
- **Optional:** `path`, `hash`, `content`
- **Allowed extra fields:** No
- **Validation:**
  - `hash` must be 64-char hex (if provided)
  - Exactly one of `path`, `hash`, or `content` must be provided

## Error Messages

When enforcement fails, IDEs receive clear error messages:

### Wrong Type
```
TOOL_ENFORCEMENT_FAILURE: INVALID_FIELD_TYPE: write_file.plan must be string, got number
```

### Missing Required Field
```
TOOL_ENFORCEMENT_FAILURE: MISSING_REQUIRED_FIELD: "plan" is required for write_file
```

### Unknown Field
```
TOOL_ENFORCEMENT_FAILURE: UNKNOWN_FIELDS: write_file does not accept [workspace_id, role_override]. Allowed: [path, content, patch, previousHash, plan, role, intent]
```

### Invalid Field Value
```
TOOL_ENFORCEMENT_FAILURE: INVALID_FIELD_VALUE: write_file.plan must be 64-char hex hash, got "abc123"
```

### Custom Validation
```
TOOL_ENFORCEMENT_FAILURE: VALIDATION_ERROR: lint_plan only one of: path, hash, or content allowed
```

## Audit Trail

Every tool call (successful or blocked) is recorded in the audit log:

```json
{
  "session_id": "...",
  "role": "WINDSURF",
  "workspace_root": "/path/to/repo",
  "tool": "write_file",
  "result": "blocked",
  "error_code": "ENFORCEMENT_VIOLATION",
  "notes": "Tool call blocked by enforcement layer: INVALID_FIELD_VALUE: write_file.plan must be 64-char hex hash, got \"invalid\""
}
```

## Adding New Tools

To register a new tool with enforcement:

1. **Add schema to `TOOL_SCHEMAS`** in `core/tool-enforcement.js`:
   ```javascript
   my_new_tool: {
     required: ['required_field'],
     fields: {
       required_field: {
         type: 'string',
         validator: (val) => { ... }
       },
       optional_field: {
         type: 'number',
         optional: true
       }
     },
     allowExtraFields: false
   }
   ```

2. **Register tool normally** in `server.js`:
   ```javascript
   server.registerTool('my_new_tool', 
     { 
       description: "...",
       inputSchema: z.object({ ... })
     },
     wrapHandler(handler, 'my_new_tool')
   );
   ```

   The enforcement layer automatically wraps all handlers via `installEnforcementLayer()`.

## Testing Enforcement

### Test Invalid Parameters
```bash
# Missing required field
curl http://localhost:8000/tools/write_file \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"path": "/src/index.js", "content": "code"}'
# Response: TOOL_ENFORCEMENT_FAILURE: MISSING_REQUIRED_FIELD: "plan" is required

# Wrong type
curl http://localhost:8000/tools/write_file \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"path": 123, "plan": "a1b2c3d4..."}'
# Response: TOOL_ENFORCEMENT_FAILURE: INVALID_FIELD_TYPE: write_file.path must be string, got number

# Unknown field
curl http://localhost:8000/tools/write_file \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"path": "/src/index.js", "plan": "a1b2c3d4...", "unknown_field": true}'
# Response: TOOL_ENFORCEMENT_FAILURE: UNKNOWN_FIELDS: write_file does not accept [unknown_field]
```

### Test Valid Parameters
```bash
# Correct call
curl http://localhost:8000/tools/write_file \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/src/index.js",
    "plan": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "content": "// code"
  }'
# Response: Success (or handler-specific error)
```

## Design Principles

### Fail-Closed
- Any validation failure **blocks execution**
- Unknown fields trigger rejection (not silent ignoring)
- Missing required fields block the call

### Clear Feedback
- Error messages explain exactly what was wrong
- Include allowed fields and types
- Suggest valid values for enums

### Comprehensive Audit Trail
- Every attempt (blocked or successful) is logged
- Violations include full context
- Enables forensic analysis of tool misuse

### IDE Transparency
- No hidden rules or "magical" parameter handling
- All schemas are explicit in code
- Error messages are deterministic

## Implementation Details

### Validation Order
1. Check input is object
2. Check all required fields present
3. Check no extra fields (unless `allowExtraFields: true`)
4. Check each field's type
5. Run field-specific validators
6. Run tool-level custom validators

### Performance
- Single-pass validation (no re-parsing)
- Validation happens before handler execution
- Audit log append is async but fail-closed

### Backward Compatibility
- Legacy string inputs are normalized (e.g., `path: "..."` → `{ path: "..." }`)
- Existing handlers continue to work unchanged
- Enforcement is transparent to handler code

## Related Files

- **`core/tool-enforcement.js`** - Enforcement implementation
- **`server.js`** - Installation and integration
- **`core/system-error.js`** - Error types
- **`core/audit-system.js`** - Audit trail

## Summary

The Tool Enforcement Layer ensures that **no IDE can misuse MCP tools**. Every call must match the declared schema, or it's rejected with a clear error message. This prevents bugs, enhances security, and creates an unambiguous contract between clients and the server.
