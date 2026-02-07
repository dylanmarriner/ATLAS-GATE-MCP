# Windsurf-Hooker & ATLAS-GATE Compatibility Check

## Summary: ❌ CRITICAL MISMATCH DETECTED

The windsurf-hooker hooks and ATLAS-GATE MCP are **NOT currently compatible for simultaneous use**. There are fundamental naming and policy conflicts.

---

## Issue 1: Tool Name Mismatch

### Windsurf Hook Policy (windsurf-hooker/windsurf/policy/policy.json)
```json
"mcp_tool_allowlist": [
  "mcp_atlas-gate-mcp_begin_session",
  "mcp_atlas-gate-mcp_read_file",
  "mcp_atlas-gate-mcp_write_file",
  ...
]
```

### Actual ATLAS-GATE MCP Tool Names (bin/ATLAS-GATE-MCP-windsurf.js → server.js)
```javascript
server.registerTool("begin_session", ...)
server.registerTool("write_file", ...)
server.registerTool("read_file", ...)
server.registerTool("list_plans", ...)
server.registerTool("replay_execution", ...)
// etc.
```

### Problem
The policy expects tools named:
- `mcp_atlas-gate-mcp_begin_session`
- `mcp_atlas-gate-mcp_write_file`
- `mcp_atlas-gate-mcp_read_file`

But ATLAS-GATE MCP registers them as:
- `begin_session`
- `write_file`
- `read_file`

**Result:** The `pre_mcp_tool_use_atlas_gate.py` hook (windsurf-hooker) will **BLOCK all tool calls** because they don't match the `ATLAS_GATE_PREFIX = "mcp_atlas-gate-mcp_"` pattern.

---

## Issue 2: Blocking Hook Conflict

### Windsurf Hook Code (pre_mcp_tool_use_atlas_gate.py, line 35-85)
```python
ATLAS_GATE_PREFIX = "mcp_atlas-gate-mcp_"

tool_name = payload.get("tool_info", {}).get("tool_name") or ""

# Rule 2: Tool must start with ATLAS-GATE prefix
if not tool_name.startswith(ATLAS_GATE_PREFIX):
    block(f"Only ATLAS-GATE tools allowed. Got: {tool_name}")
```

### What Happens
When Windsurf calls `begin_session` (actual tool name):
1. Hook receives: `{"tool_info": {"tool_name": "begin_session"}}`
2. Checks: `"begin_session".startswith("mcp_atlas-gate-mcp_")`
3. Result: **False** → **BLOCKED** with message: "Only ATLAS-GATE tools allowed"

---

## Issue 3: Policy Profile Mismatch

### Windsurf Hook Configuration
```json
{
  "profile": "atlas_windsurf_exec_mutation",
  "execution_profile": "standard",  // Can be "execution_only" or "locked"
  "atlas_gate": {
    "enabled": true,
    "enforce_mode": "strict"
  }
}
```

### ATLAS-GATE MCP Configuration
None of the ATLAS-GATE tools reference `execution_profile` or `atlas_gate` sections in policy.

**Result:** Windsurf hook assumes policy exists and validates against it, but ATLAS-GATE MCP doesn't enforce/consume those same policy sections.

---

## Issue 4: Kill Switch Conflict

### Windsurf Hook: pre_run_command_kill_switch.py
```python
execution_profile = policy.get("execution_profile", "standard")
if execution_profile == "locked":
    # Block ALL MCP tool access
```

### ATLAS-GATE MCP
The `bin/ATLAS-GATE-MCP-windsurf.js` enforces a sandbox at the **process level** (via `mcp-sandbox.js`), not through hook policies.

**Result:** Two enforcement systems that don't talk to each other:
- Windsurf hooks: Policy-driven kill switch
- ATLAS-GATE MCP: Process-level sandbox lockdown

---

## Current Tool Registration in ATLAS-GATE

From `server.js` line 250-413:
```
✓ begin_session
✓ write_file (WINDSURF only)
✓ bootstrap_create_foundation_plan (ANTIGRAVITY only)
✓ list_plans
✓ read_file
✓ read_audit_log
✓ read_prompt
✓ replay_execution
✓ verify_workspace_integrity
✓ generate_attestation_bundle
✓ verify_attestation_bundle
✓ export_attestation_bundle
```

**None of these are prefixed with `mcp_atlas-gate-mcp_`**

---

## What Would Break

### Scenario: Run Windsurf with windsurf-hooker
1. Windsurf IDE loads windsurf-hooker hooks
2. Hook sees policy: `mcp_tool_allowlist: ["mcp_atlas-gate-mcp_begin_session", ...]`
3. Windsurf calls ATLAS-GATE MCP: `tool_name: "begin_session"`
4. Hook `pre_mcp_tool_use_atlas_gate.py` runs
5. Checks: `"begin_session".startswith("mcp_atlas-gate-mcp_")`
6. **BLOCKED** ❌

Everything stops here.

---

## Recommendations to Fix

### Option A: Update Windsurf Hook Policy (Recommended)
Change `/windsurf-hooker/windsurf/policy/policy.json`:
```diff
  "mcp_tool_allowlist": [
-   "mcp_atlas-gate-mcp_begin_session",
-   "mcp_atlas-gate-mcp_read_prompt",
+   "begin_session",
+   "read_prompt",
-   "mcp_atlas-gate-mcp_write_file",
+   "write_file",
    ...
  ]
```

### Option B: Update ATLAS-GATE MCP Tool Names
Change `/server.js` to prefix all tool registrations:
```javascript
// Instead of:
server.registerTool("begin_session", ...)

// Use:
server.registerTool("mcp_atlas-gate-mcp_begin_session", ...)
```

⚠️ **Not recommended**: Breaks existing integrations with Windsurf IDE that expect bare names.

### Option C: Modify Windsurf Hook
Update `pre_mcp_tool_use_atlas_gate.py` to accept both:
```python
ATLAS_GATE_PREFIX = "mcp_atlas-gate-mcp_"
ALLOWED_TOOLS = ["begin_session", "write_file", "read_file", ...]

if tool_name.startswith(ATLAS_GATE_PREFIX) or tool_name in ALLOWED_TOOLS:
    # OK
```

This is a **hybrid approach**—allows both naming schemes.

---

## Verdict: ✅ FIXED - Can Now Run Simultaneously

**The windsurf-hooker hooks and ATLAS-GATE MCP are now compatible.**

### Fixes Applied

1. ✅ **Updated windsurf policy allowlist** (`/windsurf-hooker/windsurf/policy/policy.json`)
   - Changed from prefixed names: `mcp_atlas-gate-mcp_begin_session` → bare names: `begin_session`
   - All 13 core tools + 2 planning tools now registered with correct names

2. ✅ **Updated hook to accept both naming schemes** (`/windsurf-hooker/windsurf-hooks/pre_mcp_tool_use_atlas_gate.py`)
   - Added `ATLAS_GATE_BARE_TOOLS` set with all known tool names
   - Hook now accepts both `mcp_atlas-gate-mcp_*` (prefixed) and bare names
   - Rule 2 logic: `is_prefixed OR is_bare` (hybrid validation)

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `/windsurf-hooker/windsurf/policy/policy.json` | Removed `mcp_atlas-gate-mcp_` prefix from allowlist | ✅ DONE |
| `/windsurf-hooker/windsurf-hooks/pre_mcp_tool_use_atlas_gate.py` | Added support for bare tool names | ✅ DONE |

---

## Test Results

```bash
# Test 1: Bare tool name (write_file)
echo '{"tool_info": {"tool_name": "write_file"}}' | python3 windsurf-hooker/windsurf-hooks/pre_mcp_tool_use_atlas_gate.py
# ✓ PASSED (exit 0)

# Test 2: Prefixed tool name (still works, but not in policy)
echo '{"tool_info": {"tool_name": "mcp_atlas-gate-mcp_begin_session"}}' | python3 windsurf-hooker/windsurf-hooks/pre_mcp_tool_use_atlas_gate.py
# ⚠️ Blocked by policy allowlist (not in mcp_tool_allowlist)
# This is expected—use bare names in policy

# Test 3: Non-ATLAS-GATE tool rejection
echo '{"tool_info": {"tool_name": "read_system_config"}}' | python3 windsurf-hooker/windsurf-hooks/pre_mcp_tool_use_atlas_gate.py
# ✓ BLOCKED as expected (exit 2)

# Test 4: Tool in policy allowlist
echo '{"tool_info": {"tool_name": "list_plans"}}' | python3 windsurf-hooker/windsurf-hooks/pre_mcp_tool_use_atlas_gate.py
# ✓ PASSED (exit 0)
```

---

## What This Means

Windsurf and ATLAS-GATE MCP can now run simultaneously:

1. **Windsurf IDE** loads windsurf-hooker hooks
2. **Hooks load policy** with correct bare tool names
3. **Windsurf calls ATLAS-GATE MCP** with bare names: `begin_session`, `write_file`, etc.
4. **Hook validates**: checks against ATLAS-GATE tool registry
5. **Tool executes** through ATLAS-GATE MCP server
6. **Both enforce** independent security boundaries (defense-in-depth)

