# Enforcement Reference Card

## Quick Facts

| Aspect | Detail |
|--------|--------|
| **Sandbox Type** | Process-level + MCP boundary |
| **Roles Affected** | Windsurf, Antigravity |
| **When Enforced** | At startup + every tool call |
| **Audit Trail** | `audit-log.jsonl` |
| **Config Files** | `core/mcp-sandbox.js`, `core/tool-enforcement.js` |
| **Entrypoints** | `bin/ATLAS-GATE-MCP-*.js` |

## What Gets Blocked

```
❌ fs.readFile()              → ✅ read_file tool
❌ fs.writeFile()             → ✅ write_file tool
❌ require('fs')              → ✅ Use MCP tools
❌ child_process.exec()       → ❌ Shell execution blocked entirely
❌ process.env.HOME           → ✅ process.env.MCP_ROLE only
❌ __dirname                  → ❌ Not defined
❌ eval()                      → ❌ Not defined
❌ setTimeout()               → ❌ Not defined
❌ import('http')             → ❌ Module blocked
```

## Startup Sequence

```javascript
Node process starts
    ↓
1. lockdownProcess() ..................... Lock process.env
2. freezeGlobalObjects() ................. Freeze Object, Array, etc.
3. installAuditHook() .................... Install error handlers
4. verifySandboxIntegrity() .............. Verify lockdown worked
    ↓ (if all OK, continue)
5. startServer(role) ..................... Start MCP server
    ↓
6. installEnforcementLayer() ............. Install tool validation
    ↓
7. Ready for MCP tool calls .............. Accept requests
```

## Tool Call Validation

```
IDE sends: write_file { path, plan, content }
    ↓
validateToolInput() checks:
  ✓ Is input an object?
  ✓ Are all required fields present?
  ✓ Are field types correct?
  ✓ Is session initialized?
    ↓ (if all OK)
validateToolParameters() checks:
  ✓ No unknown fields?
  ✓ Do field values pass validators?
  ✓ Do custom validators pass?
    ↓ (if all OK)
Handler wrapper executes:
  ✓ Run tool handler
  ✓ Audit success/error
  ✓ Return result
```

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `MISSING_REQUIRED_FIELD: "plan"` | Forgot required field | Add `plan` field |
| `INVALID_FIELD_TYPE: path must be string` | Wrong type | Use correct type |
| `INVALID_FIELD_VALUE: plan must be 64-char hex` | Invalid format | Fix value |
| `UNKNOWN_FIELDS: unknown_field not allowed` | Extra field | Remove field |
| `VALIDATION_ERROR: only one of path/hash/content` | Custom rule | Check docs |
| `Session not initialized. Call begin_session first` | No session | Call `begin_session` |

## Safe Environment Variables

```javascript
process.env.NODE_ENV          // ✅ Allowed
process.env.MCP_ROLE          // ✅ Allowed
process.env.MCP_SESSION_ID    // ✅ Allowed
process.env.MCP_SANDBOX_ENABLED  // ✅ Allowed

process.env.HOME              // ❌ Blocked
process.env.PATH              // ❌ Blocked
process.env.SECRET_API_KEY    // ❌ Blocked
```

## Safe JavaScript Builtins

```javascript
✅ Object, Array, String, Number, Boolean
✅ Math, Date, RegExp, JSON
✅ Map, Set, WeakMap, WeakSet
✅ Promise, Error, TypeError
✅ Symbol, Infinity, NaN, undefined

❌ eval, Function, process
❌ require, __dirname, __filename
❌ setTimeout, fetch, XMLHttpRequest
❌ fs, child_process, http, https
```

## Blocked Modules

```javascript
'fs', 'fs/promises'           // Filesystem
'path'                         // Path manipulation
'child_process', 'exec', 'spawn'  // Shell
'cluster', 'worker_threads'   // Process
'vm'                           // Virtual machine
'os', 'process'                // System
'http', 'https', 'net', 'tls'  // Network
'crypto', 'zlib', 'stream'     // System libs
```

## Test Enforcement

### Valid Call (Should Work)
```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read_file",
    "arguments": {"path": "/src/index.js"}
  }'
# ✅ Returns file content
```

### Invalid Call (Should Fail)
```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "write_file",
    "arguments": {"path": "/src/index.js"}
  }'
# ❌ MISSING_REQUIRED_FIELD: "plan" is required
```

### Escape Attempt (Should Fail)
```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom_tool",
    "arguments": {
      "code": "require(\"fs\").readFileSync(\"/etc/passwd\")"
    }
  }'
# ❌ UNKNOWN_TOOL or ENFORCEMENT_FAILURE
```

## Audit Trail Format

Every action logged to `audit-log.jsonl`:

```json
{
  "timestamp": "2024-01-31T12:00:00.000Z",
  "session_id": "sess_abc123",
  "sequence": 42,
  "hash_chain": "abc123def456...",
  "role": "WINDSURF",
  "workspace_root": "/repo/path",
  "tool": "write_file",
  "intent": "Add feature X",
  "phase_id": null,
  "plan_hash": "a1b2c3d4...",
  "args": { "path": "/src/app.js", "content": "..." },
  "result": "ok",
  "error_code": null,
  "notes": "write_file execution completed successfully"
}
```

Failed attempt:
```json
{
  "timestamp": "2024-01-31T12:00:05.000Z",
  "session_id": "sess_abc123",
  "sequence": 43,
  "role": "WINDSURF",
  "tool": "write_file",
  "args": { "path": "/src/app.js" },
  "result": "blocked",
  "error_code": "ENFORCEMENT_VIOLATION",
  "notes": "Tool call blocked: MISSING_REQUIRED_FIELD: \"plan\" is required"
}
```

## Starting Servers

```bash
# Windsurf (MCP-only sandbox)
node bin/ATLAS-GATE-MCP-windsurf.js
# Output:
# [SANDBOX] WINDSURF entrypoint: MCP-only mode ENFORCED
# [SANDBOX] Lockdown applied for role: WINDSURF
# [SANDBOX] Integrity check passed for WINDSURF
# [MCP] ATLAS-GATE-MCP-windsurf running

# Antigravity (MCP-only sandbox)
node bin/ATLAS-GATE-MCP-antigravity.js
# Output:
# [SANDBOX] ANTIGRAVITY entrypoint: MCP-only mode ENFORCED
# [SANDBOX] Lockdown applied for role: ANTIGRAVITY
# [SANDBOX] Integrity check passed for ANTIGRAVITY
# [MCP] ATLAS-GATE-MCP-antigravity running
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Tool call rejected | Missing or wrong field | Check error message, review schema |
| `process.env.X` returns undefined | Var not whitelisted | Use only whitelisted vars |
| Module import fails | Module blocked | Use MCP tools instead |
| `__dirname` not defined | Sandbox blocks it | Don't use it |
| Startup fails | Sandbox broken | Check logs, reinstall |

## Documentation Links

- **Full Sandbox Docs** → `MCP_SANDBOX_ENFORCEMENT.md`
- **Tool Validation Docs** → `TOOL_ENFORCEMENT.md`
- **Quick Start** → `ENFORCEMENT_QUICKSTART.md`
- **Implementation** → `core/mcp-sandbox.js`, `core/tool-enforcement.js`

## Key Principles

| Principle | Meaning |
|-----------|---------|
| **Fail-Closed** | Any doubt = reject |
| **Defense in Depth** | Multiple layers |
| **Transparent** | Tools work normally |
| **Audited** | Every action logged |
| **No Escapes** | Comprehensive blocklist |

## Summary

✅ **Sandbox Active** - Process locked at startup  
✅ **Tool Validation** - Every call checked  
✅ **Audit Trail** - Forensic record  
✅ **Clear Errors** - IDE-friendly messages  
✅ **No Loopholes** - Multiple enforcement layers  

Windsurf & Antigravity = **MCP-only, always**.
