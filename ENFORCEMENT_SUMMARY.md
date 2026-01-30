# Enforcement Summary: MCP-Only Sandbox + Tool Validation

## What Changed

Windsurf and Antigravity are now **permanently locked into MCP-only mode**. They cannot use anything except the MCP tool interface.

## Two-Layer Enforcement

### Layer 1: MCP-Only Sandbox (Process-Level)

**File:** `core/mcp-sandbox.js`

**What It Does:**
- Locks `process.env` (read-only, whitelisted vars only)
- Blocks `process.exit()`, `process.kill()`
- Blocks all dangerous module imports (fs, child_process, etc.)
- Freezes global objects (Object, Array, Function, etc.)
- Prevents dynamic code execution (eval, Function constructor)
- Blocks filesystem access, shell execution, network requests
- Installs audit hooks for escape attempt tracking

**When Applied:**
- **Before** MCP server starts
- **Before** any tool registration
- **Verified** before MCP begins accepting requests

**Files:**
- `bin/ATLAS-GATE-MCP-windsurf.js` - Entrypoint with sandbox
- `bin/ATLAS-GATE-MCP-antigravity.js` - Entrypoint with sandbox

### Layer 2: Tool Parameter Enforcement (MCP Boundary)

**File:** `core/tool-enforcement.js`

**What It Does:**
- Validates all tool parameters against strict schemas
- Rejects wrong types, missing required fields, extra fields
- Provides clear error messages to IDEs
- Audits all violations to trail
- Prevents tool misuse at the protocol level

**When Applied:**
- When IDE sends MCP request
- Before tool handler execution
- At both `validateToolInput()` override and handler wrapper

**Files:**
- `server.js` - Integration into MCP server startup
- `core/tool-enforcement.js` - Validation implementation

## Enforcement Flow

```
┌─────────────────────────────────────────────────────────────┐
│ IDE/Client sends: { name: "write_file", arguments: {...} } │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │ MCP Server Receives  │
                    │ Tool Call Request    │
                    └──────────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │ GATE 1: validateToolInput()         │
        │ - Normalize args                     │
        │ - Call validateToolParameters()      │
        │ - Check session initialized         │
        └─────────────────────────────────────┘
                              ↓
                    Invalid? → REJECT ✗
                    Valid?   ↓
        ┌─────────────────────────────────────┐
        │ GATE 2: installEnforcementLayer()   │
        │ - Wrap handler execution            │
        │ - Validate again (defense in depth) │
        │ - Audit call                        │
        └─────────────────────────────────────┘
                              ↓
                    Invalid? → REJECT ✗
                    Valid?   ↓
        ┌─────────────────────────────────────┐
        │ Tool Handler Executes               │
        │ (Guaranteed valid args)             │
        └─────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │ Audit Success/Error to Trail        │
        └─────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │ Return Result to IDE/Client         │
        └─────────────────────────────────────┘
```

## What's Blocked

### By Sandbox Layer
- ❌ Filesystem access (`fs` module)
- ❌ Shell execution (`child_process` module)
- ❌ Process spawning (`cluster`, `worker_threads`)
- ❌ Code execution (`eval`, `Function`)
- ❌ Network requests (`http`, `https`, `net`)
- ❌ Environment variable access (except whitelisted)
- ❌ Module imports (except safe builtins)
- ❌ Global object modification

### By Tool Enforcement Layer
- ❌ Wrong parameter types
- ❌ Missing required fields
- ❌ Unknown/extra fields
- ❌ Invalid field values (e.g., invalid hash format)
- ❌ Tool-specific validation failures

## What's Allowed

### Via MCP Tools
- ✅ `read_file` - Read files
- ✅ `write_file` - Write files (Windsurf only)
- ✅ `list_plans` - List approved plans
- ✅ `read_audit_log` - Access audit trail
- ✅ `bootstrap_create_foundation_plan` - Create plans (Antigravity)
- ✅ `lint_plan` - Validate plans (Antigravity)
- ✅ And all other registered MCP tools

### Safe JavaScript
- ✅ Object, Array, String, Number, Boolean
- ✅ Math, Date, RegExp, JSON
- ✅ Map, Set, Promise, Error
- ✅ Whitelisted environment variables only
- ✅ Basic builtins (no escape routes)

## Audit Trail

Every action (successful or blocked) is logged:

```json
{
  "timestamp": "2024-01-31T12:00:00Z",
  "session_id": "...",
  "role": "WINDSURF",
  "workspace_root": "/path/to/repo",
  "tool": "write_file",
  "result": "ok",
  "error_code": null,
  "notes": "write_file execution completed successfully"
}
```

Blocked attempts are logged as:

```json
{
  "timestamp": "2024-01-31T12:00:00Z",
  "session_id": "...",
  "role": "WINDSURF",
  "workspace_root": "/path/to/repo",
  "tool": "write_file",
  "result": "blocked",
  "error_code": "ENFORCEMENT_VIOLATION",
  "notes": "Tool call blocked by enforcement layer: MISSING_REQUIRED_FIELD: \"plan\" is required for write_file"
}
```

## Startup Sequence

```javascript
// bin/ATLAS-GATE-MCP-windsurf.js

1. lockdownProcess("WINDSURF")
   ↓
   - Lock process.env
   - Block process.exit()
   - Block dangerous imports

2. freezeGlobalObjects()
   ↓
   - Freeze Object, Array, Function, etc.
   - Prevent prototype pollution
   - Disable monkey-patching

3. installAuditHook("WINDSURF")
   ↓
   - Catch exceptions
   - Log rejections
   - Silent console

4. verifySandboxIntegrity("WINDSURF")
   ↓
   - Check lockdown worked
   - Verify __dirname not accessible
   - Fail startup if broken

5. startServer("WINDSURF")
   ↓
   - MCP server starts
   - Tool enforcement installed
   - Ready to accept MCP requests
```

## Usage Examples

### Correct Tool Call

```json
POST /tool/call_tool
{
  "name": "write_file",
  "arguments": {
    "path": "/src/app.js",
    "plan": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "content": "// code",
    "intent": "Add feature X"
  }
}

→ ✅ Success (or handler error)
```

### Blocked: Missing Required Field

```json
POST /tool/call_tool
{
  "name": "write_file",
  "arguments": {
    "path": "/src/app.js",
    "content": "// code"
  }
}

→ ❌ TOOL_ENFORCEMENT_FAILURE: MISSING_REQUIRED_FIELD: "plan" is required for write_file
```

### Blocked: Unknown Field

```json
POST /tool/call_tool
{
  "name": "read_file",
  "arguments": {
    "path": "/src/app.js",
    "encoding": "utf-8"
  }
}

→ ❌ TOOL_ENFORCEMENT_FAILURE: UNKNOWN_FIELDS: read_file does not accept [encoding]
```

### Blocked: Wrong Type

```json
POST /tool/call_tool
{
  "name": "write_file",
  "arguments": {
    "path": 123,
    "plan": "a1b2c3d4...",
    "content": "code"
  }
}

→ ❌ TOOL_ENFORCEMENT_FAILURE: INVALID_FIELD_TYPE: write_file.path must be string, got number
```

## Documentation Files

| File | Purpose |
|------|---------|
| `MCP_SANDBOX_ENFORCEMENT.md` | Complete sandbox documentation |
| `TOOL_ENFORCEMENT.md` | Complete tool validation documentation |
| `ENFORCEMENT_QUICKSTART.md` | Quick start guide for developers |
| `core/mcp-sandbox.js` | Sandbox implementation |
| `core/tool-enforcement.js` | Tool validation implementation |
| `AGENTS.md` | Updated with enforcement requirements |

## Key Design Principles

### 1. **Fail-Closed**
Any ambiguity results in rejection. No "maybe safe" decisions.

### 2. **Defense in Depth**
Multiple layers: sandbox + tool validation + audit trail

### 3. **Transparent to Tools**
Tool handlers work normally. Enforcement is invisible to them.

### 4. **Comprehensive Audit**
Every action logged with full context for forensics.

### 5. **No Escape Routes**
Globals frozen, process locked, modules blocked, network restricted.

## Starting the Servers

```bash
# Windsurf (execution role) - MCP-only sandbox
node bin/ATLAS-GATE-MCP-windsurf.js

# Antigravity (read-only role) - MCP-only sandbox
node bin/ATLAS-GATE-MCP-antigravity.js
```

Both will log:

```
[SANDBOX] WINDSURF entrypoint: MCP-only mode ENFORCED
[SANDBOX] No filesystem access, shell execution, or direct module imports allowed
[SANDBOX] Lockdown applied for role: WINDSURF
[SANDBOX] Integrity check passed for WINDSURF
[MCP] ATLAS-GATE-MCP-windsurf running | session=...
```

## IDE Integration

IDEs should:

1. **Know the schemas** - Read `TOOL_SCHEMAS` from `core/tool-enforcement.js`
2. **Validate locally** - Check types/required fields before sending
3. **Handle errors gracefully** - Catch `TOOL_ENFORCEMENT_FAILURE` errors
4. **Show tool documentation** - Display available fields and types
5. **Track audit trail** - Monitor `read_audit_log` for compliance

## Summary

You now have:

✅ **Process-level sandbox** - Windsurf/Antigravity cannot escape  
✅ **Tool parameter validation** - Every call checked at MCP boundary  
✅ **Audit trail** - Every action logged for forensics  
✅ **Clear errors** - IDEs get detailed feedback on violations  
✅ **Defense in depth** - Multiple enforcement layers  
✅ **No escape routes** - Comprehensive blocklist + freezing  

Windsurf and Antigravity are permanently locked into MCP-only mode. They can only use the tools you define.
