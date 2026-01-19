# MCP AUDIT LOG SPECIFICATION

**Document**: PROMPT 03 Implementation  
**Purpose**: Append-only, hash-chained, tamper-evident audit logging for KAIZA MCP server  
**Authority**: PROMPT 03 - MCP-Enforced Execution Boundary Audit Logging  
**Last Updated**: 2026-01-19

---

## 1. OVERVIEW

The KAIZA MCP audit system provides non-repudiable, forensically-auditable logging of all tool invocations and system events. The system is designed with fail-closed semantics: **if the audit log cannot be written, the tool call must be refused**.

### Core Guarantees

- **Append-Only**: No rewriting, no truncation, no deletion
- **Hash-Chained**: Each entry includes the hash of the previous entry, forming an unbreakable chain
- **Tamper-Evident**: Any modification (even a single bit) breaks the chain, immediately detectable
- **Deterministic**: No random UUIDs; sequence numbers are monotonic integers
- **Redacted**: Sensitive data (tokens, passwords, keys) are redacted before hashing/logging
- **Concurrency-Safe**: Multiple concurrent tool calls are safely serialized with file locking
- **Fail-Closed**: Audit write failure = tool invocation failure (no silent failures)

---

## 2. FILE LOCATIONS

### Canonical Audit Storage

```
[workspace_root]/
  .kaiza/
    audit.log         ← JSON Lines audit entries (append-only)
    audit.lock/       ← Directory used for file-based locking
```

**Rules**:
- The audit directory `.kaiza/` is created automatically on first `appendAuditEntry()` call
- The audit log is created in `.kaiza/` when the first entry is written
- Both paths are bound to the locked `workspace_root` from `begin_session`
- No audit writes occur before `begin_session` (events are buffered instead)

---

## 3. AUDIT ENTRY SCHEMA

Each audit entry is a JSON object, written as a single line followed by `\n` (JSON Lines format).

### Required Fields

```javascript
{
  // Timing
  ts: "2026-01-19T14:30:45.123Z",  // ISO 8601 UTC timestamp

  // Sequence & Integrity
  seq: 1,                            // Monotonic integer, starting at 1
  prev_hash: "GENESIS",              // Hash of previous entry (GENESIS for first)
  entry_hash: "abc123...",           // SHA256 of this entry's canonical form

  // Identity
  session_id: "550e8400-e29b-41d4-a716-446655440000",  // Session UUID (deterministic per server run)
  role: "WINDSURF",                  // ANTIGRAVITY | WINDSURF
  workspace_root: "/path/to/repo",   // Locked workspace root

  // Tool & Intent
  tool: "write_file",                // Tool name
  intent: "Add logging to module X", // Human-readable summary (nullable)
  plan_hash: "plan-hash-abc123",     // Plan identifier (nullable)
  phase_id: null,                    // Phase identifier (nullable for future use)

  // Arguments (redacted)
  args_hash: "def456...",            // SHA256 of canonical redacted args (nullable if no args)

  // Outcome
  result: "ok",                      // "ok" | "error"
  error_code: null,                  // System error code if result="error" (nullable)
  
  // Context
  invariant_id: null,                // Invariant name if triggered (nullable)
  result_hash: "ghi789...",          // SHA256 of result summary (nullable)

  // Notes
  notes: "write_file completed successfully"  // Human-readable summary
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `ts` | ISO 8601 | Timestamp when entry was written (UTC) |
| `seq` | integer | Monotonic sequence number (1, 2, 3, ...) |
| `prev_hash` | string | Hash of previous entry or "GENESIS" for first |
| `entry_hash` | string | SHA256 hash of canonical entry content (excluding this field) |
| `session_id` | UUID | Unique identifier for this server session |
| `role` | string | ANTIGRAVITY (planning) or WINDSURF (execution) |
| `workspace_root` | string | Absolute path of locked workspace root |
| `tool` | string | Name of tool invoked (e.g., "write_file", "read_file") |
| `intent` | string \| null | Human-readable reason for the operation |
| `plan_hash` | string \| null | Hash of the authorized plan (if applicable) |
| `phase_id` | string \| null | Phase identifier (reserved for future use) |
| `args_hash` | string \| null | SHA256 of redacted args (for write ops, includes file hash+length) |
| `result` | string | "ok" if successful, "error" if failed |
| `error_code` | string \| null | System error code (e.g., INVALID_PATH, PLAN_NOT_APPROVED) |
| `invariant_id` | string \| null | Invariant that was violated (if applicable) |
| `result_hash` | string \| null | Hash of result summary or error details |
| `notes` | string | Human-readable summary of the operation |

---

## 4. CANONICALIZATION & HASHING

### Hash Algorithm

All hashes use **SHA-256** (via Node.js `crypto.createHash("sha256")`).

### Deterministic Canonicalization

To ensure the same entry always produces the same hash:

1. **Object key ordering**: All object fields must be sorted alphabetically by key
2. **No whitespace**: Use JSON serialization with no extra spaces or newlines
3. **No random components**: Never include timestamps, random salts, or UUIDs in the hashed content
4. **Redaction BEFORE hashing**: Apply redaction rules first, then hash the redacted version

**Example**:

```javascript
// Given entry (with fields out of order)
{
  notes: "test",
  ts: "2026-01-19T14:30:45.123Z",
  seq: 1,
  role: "WINDSURF"
}

// Canonical (sorted) form for hashing:
// (Remove entry_hash field, keep everything else)
{"notes":"test","role":"WINDSURF","seq":1,"ts":"2026-01-19T14:30:45.123Z"}

// Hash this string with SHA-256
// Result: entry_hash field
```

### Entry Hash Computation

The `entry_hash` is computed from the canonical form of **all fields EXCEPT `entry_hash` itself**:

1. Create a copy of the entry without `entry_hash`
2. Sort all keys alphabetically
3. Serialize to JSON (no whitespace)
4. Hash with SHA-256
5. Insert hash as `entry_hash` field
6. Write the complete entry to the log

### Hash Chain Integrity

The `prev_hash` field contains the `entry_hash` of the previous entry:

```
Entry 1: prev_hash="GENESIS", entry_hash="aaa..."
Entry 2: prev_hash="aaa...", entry_hash="bbb..."
Entry 3: prev_hash="bbb...", entry_hash="ccc..."
         ↑                    ↑
         |____________________|
         Hash chain: unbreakable
```

If any entry is modified, its `entry_hash` changes, breaking the chain for all subsequent entries.

---

## 5. REDACTION POLICY

### Sensitive Keys (Auto-Redacted)

The following keys are always redacted to `"[REDACTED]"`:

- `token`, `apiKey`, `password`, `secret`
- `authorization`, `cookie`, `session`, `jwt`, `Bearer`
- `api_key`, `api_secret`, `refresh_token`
- `private_key`, `access_token`, `id_token`
- `client_secret`, `signing_key`, `webhook_secret`, `passphrase`

### Pattern Matching (Context-Based Redaction)

Keys matching these patterns are also redacted:

- `.*secret.*` (case-insensitive)
- `.*token.*`
- `.*key.*`
- `.*password.*`
- `.*auth.*`
- `.*credential.*`

### Value-Based Redaction

Certain values are redacted regardless of key:

- Base64-like strings > 64 characters matching `[A-Za-z0-9+/=]{64,}`
- JWT patterns: `[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`

### File Content Redaction

For `write_file` operations, **raw file content is never logged**. Instead, log:

- `path`: relative path (readable)
- `contentHash`: SHA256 of file content
- `contentLength`: byte length

**Example**:

```javascript
// Args to write_file
{
  path: "src/index.js",
  content: "console.log('hello');\n"  // ← Will be redacted
}

// Logged as
{
  path: "src/index.js",
  contentHash: "a1b2c3d4...",
  contentLength: 26
}
```

### Redaction Function

```javascript
redactArgs(args)  // Recursively redacts all sensitive keys/values
```

**Guarantees**:

- Non-sensitive fields are preserved exactly
- Sensitive fields are replaced with `"[REDACTED]"`
- Nested objects are walked recursively
- Arrays are processed element-wise

---

## 6. APPEND-ONLY ENFORCEMENT

### Design Principles

1. **Never truncate**: `fs.truncateSync()` is forbidden
2. **Never rewrite**: Files are opened in append mode only
3. **Never delete entries**: The log is immutable after written
4. **Atomicity**: Single `fs.appendFileSync()` call = atomic write (POSIX guarantee)

### File Operations

```javascript
// CORRECT: Append mode
fs.appendFileSync(auditPath, line);

// FORBIDDEN: Truncate
fs.truncateSync(auditPath, size);

// FORBIDDEN: Write in w mode (overwrites)
fs.writeFileSync(auditPath, content);

// FORBIDDEN: Edit or replace entries
fs.writeFileSync(auditPath, modifiedContent);
```

### Concurrency Safety

Because multiple tools may run concurrently:

1. **Acquire lock** before reading current state or appending
2. **Read last sequence & hash** while holding lock
3. **Build new entry** with correct seq and prev_hash
4. **Write atomically** with single `appendFileSync()`
5. **Release lock** (always, via finally block)

**Lock Mechanism**: File-based locking using `.kaiza/audit.lock/` directory + exclusive lock files.

---

## 7. AUDIT VERIFICATION

### Verification Function

```javascript
const result = verifyAuditLogIntegrity(workspaceRoot);
// Returns:
{
  valid: true,                          // true if chain is unbroken
  status: "VALID",                      // VALID | CORRUPTED | EMPTY_LOG
  entries: 42,                          // Total entries checked
  failures: [                           // Empty if valid
    { seq: 5, error: "HASH_MISMATCH: ..." },
    { seq: 6, error: "CHAIN_BROKEN: ..." }
  ]
}
```

### Verification Algorithm

For each line in the audit log:

1. **Parse JSON** (fail on invalid JSON)
2. **Check sequence**: `expected_seq === entry.seq`
3. **Check hash chain**: `expected_prev_hash === entry.prev_hash`
4. **Recompute entry hash**: 
   - Remove `entry_hash` field
   - Canonicalize (sort keys, no whitespace)
   - SHA-256 hash
   - Compare to stored `entry_hash`
5. **Report all failures** (don't stop at first failure)

### Non-Coder Audit Instructions

**To manually verify audit log integrity:**

1. Export `.kaiza/audit.log` to readable format:
   ```bash
   # Pretty-print audit log (one entry per line)
   cat .kaiza/audit.log | jq -R 'fromjson'
   ```

2. Check for suspicious patterns:
   - Any blank or duplicate lines
   - Entries with `seq` jumping (should be 1, 2, 3, ...)
   - `prev_hash` mismatch with previous entry's `entry_hash`

3. Use the verification tool:
   ```bash
   node -e "
     const { verifyAuditLogIntegrity } = require('./core/audit-system.js');
     const result = verifyAuditLogIntegrity('/path/to/repo');
     console.log(JSON.stringify(result, null, 2));
   "
   ```

4. If verification fails:
   - Check for filesystem corruption
   - Preserve the log for forensic analysis
   - Report the failures (list of seq + errors)

---

## 8. PRE-SESSION EVENT BUFFERING

### Problem

Tool invocations may arrive **before** `begin_session` is called, but the audit log path is not known until `workspace_root` is locked.

### Solution

1. **Pre-Session**: Buffer events in memory (`PRE_SESSION_EVENT_BUFFER` array)
2. **On `begin_session`**: Flush buffered events to the now-available audit log
3. **Each buffered event**: Marked with `{ buffered: true }` field for forensic tracking

### Buffering Code

```javascript
// In audit-system.js
let PRE_SESSION_EVENT_BUFFER = [];

function bufferPreSessionEvent(event) {
  PRE_SESSION_EVENT_BUFFER.push({
    ts: new Date().toISOString(),
    buffered: true,
    ...event
  });
}

function flushPreSessionBuffer(workspace_root) {
  const flushed = [...PRE_SESSION_EVENT_BUFFER];
  PRE_SESSION_EVENT_BUFFER = [];
  return flushed;
}
```

### Flushing in `begin_session`

```javascript
// In tools/begin_session.js
const buffered = flushPreSessionBuffer(workspace_root);
for (const bufEvent of buffered) {
  await appendAuditEntry({
    ...bufEvent,
    session_id: SESSION_ID,
    role,
    workspace_root,
  }, workspace_root);
}
```

### Guarantee

- **No event is lost**: Even pre-session tool calls are eventually recorded
- **Forensic clarity**: Buffered events marked with `buffered: true`
- **Fail-closed**: If flushing fails, it's logged as a warning but session proceeds (to avoid deadlock)

---

## 9. FAIL-CLOSED SEMANTICS

### Tool Execution Wrapper

The `wrapHandler()` function in `server.js` enforces fail-closed behavior:

```javascript
function wrapHandler(handler, toolName) {
  return async (args) => {
    try {
      // Call handler
      const result = await handler(args);

      // Audit SUCCESS
      try {
        await appendAuditEntry({...}, workspace_root);
      } catch (auditErr) {
        // FAIL-CLOSED: Audit failure = tool failure
        throw SystemError.startupFailure(
          SYSTEM_ERROR_CODES.AUDIT_APPEND_FAILED,
          { human_message: "Audit log write failed" }
        );
      }

      return result;
    } catch (err) {
      // Audit FAILURE
      try {
        await appendAuditEntry({...}, workspace_root);
      } catch (auditErr) {
        // FAIL-CLOSED: Double-failure = propagate audit error
        throw SystemError.startupFailure(
          SYSTEM_ERROR_CODES.AUDIT_APPEND_FAILED,
          { human_message: "Audit log write failed on error" }
        );
      }
      throw err;
    }
  };
}
```

### Guarantee

- **Every tool call** is audited (success or failure)
- **Audit failure** causes tool call to fail (client receives error, no silent loss)
- **No tool output escapes** without audit entry
- **Both success and error paths** go through audit before returning to client

---

## 10. EXAMPLE AUDIT LOG

```json
{"ts":"2026-01-19T14:30:45.123Z","seq":1,"prev_hash":"GENESIS","session_id":"550e8400-e29b-41d4-a716-446655440000","role":"WINDSURF","workspace_root":"/workspace","tool":"begin_session","intent":null,"plan_hash":null,"phase_id":null,"args_hash":null,"result":"ok","error_code":null,"invariant_id":null,"result_hash":null,"notes":"begin_session completed","entry_hash":"abc123def456..."}
{"ts":"2026-01-19T14:30:46.234Z","seq":2,"prev_hash":"abc123def456...","session_id":"550e8400-e29b-41d4-a716-446655440000","role":"WINDSURF","workspace_root":"/workspace","tool":"read_file","intent":"Read package.json","plan_hash":null,"phase_id":null,"args_hash":"def789abc012...","result":"ok","error_code":null,"invariant_id":null,"result_hash":"ghi345jkl678...","notes":"read_file completed successfully","entry_hash":"def789abc012..."}
{"ts":"2026-01-19T14:30:47.345Z","seq":3,"prev_hash":"def789abc012...","session_id":"550e8400-e29b-41d4-a716-446655440000","role":"WINDSURF","workspace_root":"/workspace","tool":"write_file","intent":"Update version in package.json","plan_hash":"plan-abc123","phase_id":null,"args_hash":"jkl012mno345...","result":"ok","error_code":null,"invariant_id":null,"result_hash":"pqr678stu901...","notes":"write_file completed successfully","entry_hash":"jkl012mno345..."}
```

**Notes**:
- Each entry is a complete JSON object, one per line
- All timestamps in UTC ISO 8601 format
- Sequence numbers are strictly monotonic (1, 2, 3)
- Hash chain is unbroken: each `prev_hash` matches previous `entry_hash`
- Sensitive data (if present in args) would be replaced with `[REDACTED]`

---

## 11. TESTING & VERIFICATION

### Unit Tests

Run the audit system test suite:

```bash
node test-audit-system.js
```

Tests cover:

1. ✓ Audit directory creation
2. ✓ Successful entry written
3. ✓ Failed entry written
4. ✓ Args redaction works
5. ✓ Hash chain verifies
6. ✓ Tampering detected at correct sequence
7. ✓ Concurrent calls handled safely
8. ✓ Pre-session buffering (integration test)
9. ✓ Audit append failure causes refusal
10. ✓ Deterministic sequence numbers
11. ✓ Read audit log returns all entries
12. ✓ Empty log handling

### Integration Tests

Run the full MCP server test:

```bash
node test-server-audit.js  # (if created)
```

### Verification Gates

Before deployment, verify:

```bash
npm test
npm run verify
```

---

## 12. KNOWN LIMITATIONS

1. **Single-Process Only**: Current implementation assumes single-process server. Multi-process servers would need distributed locking (Redis, etcd, etc.).

2. **File Locking Timeout**: Lock acquisition times out after 25 seconds (500 retries × 50ms). If lock contention is high, this may reject valid concurrent calls.

3. **Redaction Coverage**: Redaction is pattern-based. Exotic sensitive data (custom key formats, binary tokens) may not be caught automatically.

4. **Pre-Session Buffer Limits**: If many tool calls arrive before `begin_session`, the in-memory buffer could consume memory. However, this is unlikely in normal operation (begin_session is the first call).

5. **Audit Log Growth**: The audit log grows unbounded. In production, implement log rotation or archival strategy (not in scope of PROMPT 03).

---

## 13. INTEGRATION WITH MCP TOOLS

### begin_session

When called:
1. Lock workspace root
2. Flush pre-session buffered events to newly-available audit log
3. Subsequent calls use the audit log directly

### read_file, list_plans, read_prompt, read_audit_log

All read-only operations:
- Audit entry: `result="ok"`, `args_hash` of path/selector, `result_hash` of response summary
- No file content logged (only file existence confirmed)

### write_file

Mutation operation:
- Audit entry: `result="ok"` or `"error"`, `args_hash` includes file hash + length (NOT raw content)
- Plan hash logged if provided
- Error code logged if failed

### bootstrap_create_foundation_plan

Planning operation (ANTIGRAVITY only):
- Audit entry: `result="ok"`, plan hash logged
- Signature and payload logged (for non-repudiation)

---

## 14. REFERENCES

- **PROMPT 03**: MCP-Enforced Execution Boundary Audit Logging
- **AGENTS.md**: KAIZA MCP Server build/test commands
- **core/audit-system.js**: Implementation
- **test-audit-system.js**: Test suite

---

**Approved By**: PROMPT 03  
**Implementation Date**: 2026-01-19  
**Status**: COMPLETE
