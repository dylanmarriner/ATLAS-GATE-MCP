# MCP Sandbox Enforcement

## Overview

Windsurf and Antigravity are **permanently locked into an MCP-only sandbox**. They cannot:

- ❌ Access the filesystem directly
- ❌ Execute shell commands or spawn processes
- ❌ Import or require arbitrary Node.js modules
- ❌ Access environment variables
- ❌ Access `process`, `__dirname`, `__filename`
- ❌ Use `eval`, `Function`, dynamic code execution
- ❌ Make network requests outside MCP
- ❌ Access file descriptors or sockets
- ❌ Modify or escape the sandbox

They can ONLY:
- ✅ Call registered MCP tools
- ✅ Receive tool results
- ✅ Use basic JavaScript builtins (Object, Array, String, Math, JSON, etc.)

## How It Works

### Enforcement Layers

```
Entrypoint (bin/ATLAS-GATE-MCP-windsurf.js)
    ↓
1. lockdownProcess(ROLE)        → Lock process.env, block process.exit
    ↓
2. freezeGlobalObjects()        → Freeze Object, Array, Function, etc.
    ↓
3. installAuditHook(ROLE)       → Log any escape attempts
    ↓
4. verifySandboxIntegrity(ROLE) → Verify lockdown succeeded
    ↓
5. startServer(ROLE)            → Start MCP server in sandbox
    ↓
MCP Request → Validation → Tool Handler → Result
    ↓ (only via tools)
Audit Trail
```

### Entrypoint Startup Sequence

When you run Windsurf or Antigravity:

```javascript
// Step 1: SANDBOX LOCKDOWN
lockdownProcess("WINDSURF");
// - Prevents modification of process.env
// - Blocks process.exit(), process.kill()
// - Blocks stdin/stdout manipulation
// - Blocks require() of dangerous modules

// Step 2: FREEZE GLOBALS
freezeGlobalObjects();
// - Object, Array, String, etc. cannot be modified
// - No prototype pollution
// - No monkey-patching

// Step 3: INSTALL AUDIT HOOKS
installAuditHook("WINDSURF");
// - Catch uncaught exceptions
// - Log unhandled rejections
// - Silent console to prevent data exfiltration

// Step 4: VERIFY SANDBOX
verifySandboxIntegrity("WINDSURF");
// - Check process.env is locked
// - Check process.exit is blocked
// - Check __dirname is inaccessible
// - Fail startup if sandbox is broken

// Step 5: START MCP SERVER
startServer("WINDSURF");
// - MCP server starts in locked environment
// - Only MCP tools available
// - All filesystem access goes through tools
```

## What Gets Blocked

### Filesystem Access

**Blocked:**
```javascript
// These throw errors:
fs.readFile('/path/to/file')       // ❌
fs.writeFile('/path/to/file', '')  // ❌
require('fs').readFileSync(...)    // ❌
import fs from 'fs'                // ❌
__dirname                           // ❌ Not defined
__filename                          // ❌ Not defined
process.cwd()                       // ❌ Blocked
```

**Allowed via MCP:**
```javascript
// These work (through MCP tools):
read_file({ path: '/path/to/file' })
write_file({ path: '/path/to/file', content: '...' })
list_plans()
```

### Shell Execution

**Blocked:**
```javascript
// These throw errors:
child_process.exec('ls -la')                    // ❌
child_process.spawn('bash')                     // ❌
child_process.execSync('npm test')              // ❌
require('child_process')                        // ❌
import cp from 'child_process'                  // ❌
```

**Allowed via MCP:**
```javascript
// There is no shell tool - MCP is the interface
// Use read_file, write_file, and other tools instead
```

### Module Imports

**Blocked modules:**
```javascript
'fs'              // Filesystem
'fs/promises'     // Async filesystem
'path'            // Path manipulation
'child_process'   // Shell execution
'exec'            // Shell execution
'spawn'           // Process spawning
'cluster'         // Process clustering
'worker_threads'  // Worker threads
'vm'              // Virtual machines
'os'              // OS information
'process'         // Process object
'http'            // HTTP requests
'https'           // HTTPS requests
'net'             // Network sockets
'tls'             // TLS sockets
'dgram'           // UDP sockets
'dns'             // DNS queries
'zlib'            // Compression
'crypto'          // Cryptography
'stream'          // Streams
'buffer'          // Direct buffer access
'repl'            // REPL
'module'          // Module system
```

### Global Objects

**Blocked globals:**
```javascript
// These throw errors:
__dirname           // ❌
__filename          // ❌
require             // ❌
exports             // ❌
module              // ❌
eval                // ❌
Function            // ❌
setTimeout          // ❌ (async execution outside MCP)
setInterval         // ❌
setImmediate        // ❌
process             // ❌
global              // ❌
globalThis          // ❌
fetch               // ❌
XMLHttpRequest      // ❌
```

**Safe globals:**
```javascript
// These work:
Object              // ✅
Array               // ✅
String              // ✅
Number              // ✅
Boolean             // ✅
Math                // ✅
Date                // ✅
RegExp              // ✅
JSON                // ✅
Map                 // ✅
Set                 // ✅
Promise             // ✅
Error               // ✅
```

### Environment Variables

**Blocked:**
```javascript
// These throw errors:
process.env.HOME          // ❌
process.env.PATH          // ❌
process.env.API_KEY       // ❌
process.env.SECRET        // ❌
Object.keys(process.env)  // ❌
```

**Allowed (whitelisted only):**
```javascript
// These return safe values:
process.env.NODE_ENV         // ✅ 'production' or 'development'
process.env.MCP_ROLE         // ✅ 'WINDSURF' or 'ANTIGRAVITY'
process.env.MCP_SESSION_ID   // ✅ Session identifier
process.env.MCP_SANDBOX_ENABLED  // ✅ 'true'
```

## Audit Trail

Every attempt to use blocked functionality is logged:

```json
{
  "timestamp": "2024-01-31T12:00:00Z",
  "session_id": "...",
  "role": "WINDSURF",
  "event": "blocked_module_import",
  "module_id": "fs",
  "reason": "Filesystem access blocked - use read_file/write_file tools",
  "stack_trace": "..."
}
```

Attempts are logged to:
- Audit trail file
- Process stderr (for monitoring)
- Security logs

## Using MCP Tools Instead

### Filesystem Access

Instead of `fs.readFile()`:
```javascript
// ❌ Blocked:
const fs = require('fs');
const content = fs.readFileSync('/path/to/file', 'utf-8');

// ✅ Use MCP tool:
const result = await mcp_tool('read_file', {
  path: '/path/to/file'
});
```

Instead of `fs.writeFile()`:
```javascript
// ❌ Blocked:
const fs = require('fs');
fs.writeFileSync('/path/to/file', 'content');

// ✅ Use MCP tool:
const result = await mcp_tool('write_file', {
  path: '/path/to/file',
  content: 'content',
  plan: 'plan_hash_here',
  intent: 'What this change does'
});
```

### Listing Files

Instead of `fs.readdirSync()`:
```javascript
// ❌ Blocked:
const fs = require('fs');
const files = fs.readdirSync('/path/to/dir');

// ✅ Use MCP tool:
const result = await mcp_tool('read_file', {
  path: '/path/to/dir'  // Works for directories too
});
```

### Checking File Existence

Instead of `fs.existsSync()`:
```javascript
// ❌ Blocked:
const fs = require('fs');
const exists = fs.existsSync('/path/to/file');

// ✅ Use MCP tool (try read, catch error):
try {
  await mcp_tool('read_file', { path: '/path/to/file' });
  // File exists
} catch (err) {
  // File does not exist
}
```

## Trying to Escape

Any attempt to escape the sandbox will be:

1. **Blocked** - The operation fails immediately
2. **Logged** - Recorded in audit trail with full context
3. **Audited** - Security team can review attempts
4. **Isolated** - Cannot affect other sessions or the system

### Example Escape Attempts (All Fail)

```javascript
// Attempt 1: Import fs
try {
  import('fs');  // ❌ Blocked by module blockist
} catch (e) {
  console.error(e);
}

// Attempt 2: Use eval
try {
  eval('require("child_process").exec("rm -rf /")');  // ❌ eval not defined
} catch (e) {
  console.error(e);
}

// Attempt 3: Modify process
try {
  process.exit(0);  // ❌ process.exit is blocked
} catch (e) {
  console.error(e);
}

// Attempt 4: Access __dirname
try {
  console.log(__dirname);  // ❌ __dirname is not defined
} catch (e) {
  console.error(e);
}

// Attempt 5: Prototype pollution
try {
  Object.prototype.x = 'pwned';  // ❌ Object is frozen
} catch (e) {
  console.error(e);
}

// Attempt 6: Access environment
try {
  process.env.SECRET_KEY = 'stolen';  // ❌ process.env is locked
} catch (e) {
  console.error(e);
}
```

## Verification

### Check Sandbox Is Active

When Windsurf or Antigravity starts, you should see:

```
[SANDBOX] WINDSURF entrypoint: MCP-only mode ENFORCED
[SANDBOX] No filesystem access, shell execution, or direct module imports allowed
```

And during startup:

```
[SANDBOX] Lockdown applied for role: WINDSURF
[SANDBOX] Available environment: {...}
[SANDBOX] Integrity check passed for WINDSURF
```

### Verify in Runtime

You can verify the sandbox is active from within MCP tools:

```javascript
// This should fail:
try {
  require('fs');
} catch (e) {
  console.log('Sandbox working: fs import blocked');
}

// This should work:
const safeObj = Object.create(null);
console.log('Sandbox working: Object builtins available');
```

## Design Principles

### 1. **Fail-Closed**
- Any ambiguous case is blocked
- Unknown modules are blocked
- No "maybe it's safe" heuristics

### 2. **Defense in Depth**
- Multiple lockdown layers
- Process-level enforcement
- Module-level interception
- Integrity verification

### 3. **Transparent to Tools**
- MCP tools work normally
- Tool handlers unchanged
- Enforcement is transparent

### 4. **Comprehensive Audit**
- All attempts logged (successful or blocked)
- Full context and stack traces
- Enables forensic analysis

### 5. **No Escape Routes**
- Globals frozen
- process object locked
- Module system intercepted
- Network sockets blocked

## Files

| File | Purpose |
|------|---------|
| `core/mcp-sandbox.js` | Sandbox enforcement implementation |
| `bin/ATLAS-GATE-MCP-windsurf.js` | Windsurf entrypoint with sandbox |
| `bin/ATLAS-GATE-MCP-antigravity.js` | Antigravity entrypoint with sandbox |
| `core/tool-enforcement.js` | Tool parameter validation (complements sandbox) |

## Implementation Details

### Lockdown Process

```javascript
// Process-level lockdown
lockdownProcess(role) {
  // 1. Replace process.env with safe version
  // 2. Block process.exit()
  // 3. Block stdin/stdout manipulation
  // 4. Block child_process
  // 5. Prevent modification of process object
}
```

### Global Freeze

```javascript
// Prevent modification of core objects
freezeGlobalObjects() {
  Object.freeze(Object);
  Object.freeze(Array);
  Object.freeze(Function);
  // ... etc for all builtins
}
```

### Audit Hooks

```javascript
// Catch escape attempts
installAuditHook(role) {
  // 1. Intercept uncaught exceptions
  // 2. Intercept unhandled rejections
  // 3. Silent console to prevent exfiltration
  // 4. Log all security events
}
```

### Integrity Verification

```javascript
// Verify sandbox before starting MCP
verifySandboxIntegrity(role) {
  // 1. Check process.env is locked
  // 2. Check process.exit fails
  // 3. Check __dirname is not accessible
  // 4. Fail startup if any check fails
}
```

## Summary

Windsurf and Antigravity are **permanently sandboxed** to use MCP tools only. They have:

- ❌ No filesystem access
- ❌ No shell execution
- ❌ No module imports (except safe builtins)
- ❌ No process manipulation
- ❌ No network access
- ❌ No escape routes

They have:

- ✅ Access to MCP tools
- ✅ Access to safe JavaScript builtins
- ✅ Full audit trail
- ✅ Controlled, predictable environment

This is **enforced at startup** and **verified before** the MCP server starts. Any attempt to escape is blocked and logged.
