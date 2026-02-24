# Tool Enforcement Quick Start

## For IDE Users

Your IDE **must send parameters exactly as specified**. The MCP server enforces strict validation.

### What Gets Rejected

| Issue | Example | Error |
|-------|---------|-------|
| **Missing required field** | `write_file` without `plan` | `MISSING_REQUIRED_FIELD` |
| **Wrong type** | `plan: 123` instead of string | `INVALID_FIELD_TYPE` |
| **Invalid value** | `plan: "abc123"` (not 64-char hex) | `INVALID_FIELD_VALUE` |
| **Unknown field** | `write_file` with `role_override` | `UNKNOWN_FIELDS` |
| **Null object** | `time_window: null` | `INVALID_FIELD_TYPE` |

### Example: Correct `write_file` Call

```json
{
  "path": "/src/app.js",
  "plan": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "content": "// new code",
  "intent": "Add feature X"
}
```

### Example: What Gets Blocked

```json
{
  "path": "/src/app.js",
  "content": "// new code"
  // ❌ Missing: plan
  // ❌ Unknown: workspace_id (line below)
  "workspace_id": "abc"
}
```

## For Tool Authors

When adding a new tool:

### 1. Define Schema in `core/tool-enforcement.js`

```javascript
my_tool: {
  required: ['input_path'],
  fields: {
    input_path: {
      type: 'string',
      validator: (val) => {
        if (!val.startsWith('/')) return 'must be absolute path';
        return null;
      }
    },
    options: {
      type: 'object',
      optional: true
    }
  },
  allowExtraFields: false  // Strict!
}
```

### 2. Register Tool in `server.js`

```javascript
server.registerTool('my_tool', 
  { 
    description: "My tool description",
    inputSchema: z.object({
      input_path: z.string().describe("..."),
      options: z.any().optional().describe("...")
    })
  },
  wrapHandler(myToolHandler, 'my_tool')
);
```

**Note:** The enforcement layer automatically wraps all handlers—you don't need to do anything special.

### 3. Your Handler Gets Called With Validated Args

```javascript
export async function myToolHandler(args) {
  // args is guaranteed to be valid:
  // - All required fields present
  // - All fields match declared types
  // - No unknown fields
  // - All custom validators passed
  
  const { input_path, options } = args;
  // ... your code ...
}
```

## Common Schemas by Tool Type

### Read-Only Tools
```javascript
{
  required: [],
  fields: {
    path: { type: 'string', optional: true }
  },
  allowExtraFields: false
}
```

### Write Tools  
```javascript
{
  required: ['path', 'plan'],
  fields: {
    path: { type: 'string' },
    plan: {
      type: 'string',
      validator: (val) => /^[a-f0-9]{64}$/.test(val) ? null : 'must be 64-char hex hash'
    },
    content: { type: 'string', optional: true }
  },
  allowExtraFields: false
}
```

### Planning Tools
```javascript
{
  required: ['description'],
  fields: {
    description: { type: 'string' },
    phases: { type: 'array' },
    metadata: { type: 'object', optional: true }
  },
  allowExtraFields: false
}
```

## Testing Your Enforcement

### Valid Call (Should Succeed)
```bash
curl -X POST http://localhost:8000/call_tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read_file",
    "arguments": {"path": "/src/index.js"}
  }'
# Response: File contents
```

### Missing Required Field (Should Fail)
```bash
curl -X POST http://localhost:8000/call_tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "write_file",
    "arguments": {"path": "/src/index.js"}
  }'
# Response: MISSING_REQUIRED_FIELD: "plan" is required for write_file
```

### Unknown Field (Should Fail)
```bash
curl -X POST http://localhost:8000/call_tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read_file",
    "arguments": {"path": "/src/index.js", "encoding": "utf-8"}
  }'
# Response: UNKNOWN_FIELDS: read_file does not accept [encoding]
```

### Wrong Type (Should Fail)
```bash
curl -X POST http://localhost:8000/call_tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "write_file",
    "arguments": {
      "path": 123,
      "plan": "a1b2c3...",
      "content": "code"
    }
  }'
# Response: INVALID_FIELD_TYPE: write_file.path must be string, got number
```

## Enforcement Guarantees

When you call a tool and it succeeds validation, you know:

✓ All required fields are present  
✓ All fields have correct types  
✓ All field values pass custom validators  
✓ No unknown/extra fields were sent  
✓ The call is logged to audit trail  
✓ The handler will receive valid args  

## Handling Errors

When enforcement fails, you get a clear error:

```
TOOL_ENFORCEMENT_FAILURE: INVALID_FIELD_VALUE: write_file.plan must be 64-char hex hash, got "short"
```

### Error Types

| Type | Meaning | Fix |
|------|---------|-----|
| `MISSING_REQUIRED_FIELD` | You forgot a required parameter | Add the missing field |
| `INVALID_FIELD_TYPE` | Your parameter has wrong type (e.g., number vs string) | Use correct type |
| `INVALID_FIELD_VALUE` | Your parameter is wrong format (e.g., invalid hash) | Fix the value |
| `UNKNOWN_FIELDS` | You sent a field the tool doesn't accept | Remove unknown field |
| `VALIDATION_ERROR` | Tool-specific validation failed | Check error message |

## IDE Integration

If you're implementing IDE support for ATLAS-GATE-MCP tools:

1. **Parse tool schemas from `TOOL_SCHEMAS`** in `core/tool-enforcement.js`
2. **Show required fields first** in UI (marked with `*`)
3. **Validate types before sending** (even though server will validate)
4. **Show enum options** (e.g., `role: [EXECUTABLE, BOUNDARY, INFRASTRUCTURE, VERIFICATION]`)
5. **Display descriptions** from Zod schemas
6. **Catch `TOOL_ENFORCEMENT_FAILURE` errors** and show which field is wrong

## FAQ

**Q: Can I send extra fields?**  
A: No. The enforcement layer rejects unknown fields. Send only documented fields.

**Q: Can optional fields be null?**  
A: No. Omit optional fields entirely. Don't send `field: null`.

**Q: Can I send parameters in different order?**  
A: Yes, order doesn't matter. Only presence and values matter.

**Q: What if handler throws error?**  
A: Enforcement passes valid args to handler. Handler errors are separate from enforcement errors.

**Q: Are enforcement rules documented?**  
A: Yes, see `TOOL_ENFORCEMENT.md` for complete schemas for all tools.

---

**File:** `core/tool-enforcement.js`  
**Installed:** `server.js` at startup  
**Audit Trail:** Every call (blocked or successful) logged to `audit-log.jsonl`
