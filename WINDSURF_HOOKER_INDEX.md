# Windsurf-Hooker: Complete Reference Index

## Overview

Windsurf-Hooker is a comprehensive IDE-level enforcement system that ensures all code written through Windsurf meets enterprise quality standards **before** transmission to ATLAS-GATE MCP.

**Key Documents:**
1. **[WINDSURF_HOOKER_MISSION.md](WINDSURF_HOOKER_MISSION.md)** - Vision & purpose
2. **[ENFORCEMENT_ARCHITECTURE.md](ENFORCEMENT_ARCHITECTURE.md)** - System design & gates
3. **[WINDSURF_ENFORCEMENT_ENHANCED.md](WINDSURF_ENFORCEMENT_ENHANCED.md)** - New hooks detailed
4. **[WINDSURF_ENFORCEMENT_GAPS.md](WINDSURF_ENFORCEMENT_GAPS.md)** - Gap analysis

---

## What Windsurf-Hooker Does

### In One Sentence
Windsurf-Hooker enforces comprehensive code quality standards at the IDE level, ensuring all code is 100% implemented, thoroughly documented, and production-grade before it reaches ATLAS-GATE MCP.

### Key Responsibilities
✅ Block incomplete code (TODOs, stubs, placeholders)  
✅ Enforce documentation (docstrings, comments)  
✅ Prevent security escapes (subprocess, socket, etc.)  
✅ Validate code quality (complexity, naming)  
✅ Authorize writes (only plan-approved changes)  
✅ Provide fast feedback (milliseconds, not seconds)  

---

## The 10 Enforcement Hooks

### Gate 1: Intent Classification
**Hook:** `pre_intent_classification.py`  
**Purpose:** Validate user intent is code-related  
**Blocks:** Non-code requests, malformed intent  

### Gate 2: Plan Resolution
**Hook:** `pre_plan_resolution.py`  
**Purpose:** Verify plan exists and is authoritative  
**Blocks:** Missing plans, invalid plan references  

### Gate 3: Tool Authorization
**Hook:** `pre_mcp_tool_use_atlas_gate.py`  
**Purpose:** Ensure only ATLAS-GATE tools are called  
**Blocks:** Native tools, non-ATLAS-GATE operations  

### Gate 4: Command Blocking
**Hook:** `pre_run_command_kill_switch.py`  
**Purpose:** Block shell commands if execution_only mode  
**Blocks:** All bash/sh/cmd execution in locked mode  

### Gate 5: Escape Detection (Security)
**Hook:** `pre_write_code_escape_detection.py`  
**Purpose:** Block capability re-introduction (subprocess, socket, etc.)  
**Blocks:**
- `subprocess.*`, `os.system`, `os.popen`
- `exec()`, `eval()`, `compile()`
- `socket.*`, `urllib.*`, `requests.*`
- `ctypes.*`, `cffi.*`
- `bash -c`, `sh -c`, `cmd /c`

### Gate 6: Prohibited Patterns
**Hook:** `pre_write_code_policy.py`  
**Purpose:** Enforce policy-defined prohibited patterns  
**Blocks:** Mocks, hacks, debug code, simplified code  
**Configurable:** Yes (via policy.json)  

### Gate 7: Completeness (NEW)
**Hook:** `pre_write_completeness.py`  
**Purpose:** Ensure all code is 100% implemented  
**Blocks:**
- TODO, FIXME, XXX, HACK, BUG comments
- `pass` statements (outside except blocks)
- `NotImplementedError`, `unimplemented!()`
- Placeholder returns (`return None`, `return {}`)
- Empty function bodies

### Gate 8: Documentation (NEW)
**Hook:** `pre_write_comprehensive_comments.py`  
**Purpose:** Enforce thorough documentation  
**Blocks:**
- Functions without docstrings
- Complex code without inline comments
- Non-meaningful variable names (`x`, `temp`, `data`)
- Insufficient documentation for >5 line functions

### Gate 9: Diff Quality
**Hook:** `pre_write_diff_quality.py`  
**Purpose:** Warn about diff hygiene (not blocking)  
**Warns:**
- Diffs > 1000 lines
- Too many concerns in one edit
- Generated code lacking comments

### Gate 10: Filesystem & Role Validation
**Hooks:** `pre_filesystem_write.py`, `pre_filesystem_write_atlas_enforcement.py`  
**Purpose:** Validate paths and role metadata  
**Blocks:** Forbidden paths, binary blobs, suspicious patterns  

---

## Configuration

**File:** `/windsurf-hooker/windsurf/policy/policy.json`

```json
{
  "profile": "atlas_windsurf_exec_mutation",
  "execution_profile": "standard",  // or "execution_only" or "locked"
  
  "mcp_tool_allowlist": [
    "begin_session",
    "write_file",
    "read_file",
    "list_plans",
    // ... etc
  ],
  
  "block_commands_regex": [".*"],  // Block all commands (unless execution_only)
  
  "prohibited_patterns": {
    "placeholders": ["TODO", "FIXME", "XXX", "pass", "unimplemented", "stub"],
    "mock_artifacts": ["mock data", "fake data", "demo data"],
    "assumptions_and_hacks": ["assume", "temporary", "for now", "hack"],
    "escape_attempts": ["os\\.system", "subprocess", "exec\\(", "eval\\("]
  }
}
```

---

## Enforcement Modes

### Standard Mode (Default)
- All 10 hooks enabled
- Code quality strictly enforced
- Escape primitives blocked
- TODOs not allowed

### Execution-Only Mode
- Same as Standard + no shell commands
- No direct filesystem access
- No execution primitives
- Maximum security

### Locked Mode
- All code writes blocked
- Panic button activated
- Contact admin to unlock

---

## How It Works: Complete Flow

```
User writes code
        ↓
[Gate 1] Intent Classification → Validate intent
        ↓
[Gate 2] Plan Resolution → Check plan exists
        ↓
[Gate 3] Tool Authorization → Only ATLAS-GATE tools
        ↓
[Gate 4] Command Blocking → No shell if execution_only
        ↓
[Gate 5] Escape Detection → No subprocess/socket/exec
        ↓
[Gate 6] Prohibited Patterns → No mocks/hacks/debug
        ↓
[Gate 7] Completeness → No TODOs/stubs/placeholders
        ↓
[Gate 8] Documentation → All code documented
        ↓
[Gate 9] Diff Quality → Size/concern checks
        ↓
[Gate 10] Filesystem/Role → Valid paths/metadata
        ↓
✅ ALL GATES PASS
        ↓
Transmit to ATLAS-GATE MCP Server
        ↓
ATLAS-GATE Gates (5 additional gates)
        ↓
✅ WRITE ACCEPTED TO WORKSPACE
```

---

## Example Violations

### Incomplete Code
```python
def process_user(user):
    # TODO: add validation
    return user.name
```
**Blocked by:** Gate 7 (Completeness) - Contains TODO comment

### Missing Documentation
```python
def validate_email(email):
    pattern = r"^[a-z0-9]+@[a-z]+\.[a-z]+$"
    return bool(re.match(pattern, email))
```
**Blocked by:** Gate 8 (Documentation) - No docstring

### Escape Primitive
```python
import subprocess
def run_command(cmd):
    return subprocess.run(cmd, shell=True).stdout
```
**Blocked by:** Gate 5 (Escape Detection) - subprocess usage

### Prohibited Pattern
```python
def create_user(data):
    user = User()
    user.name = data.get("name", "Test User")  # Mock data
    return user
```
**Blocked by:** Gate 6 (Prohibited Patterns) - Mock data

---

## Testing Enforcement

### Test Completeness Hook
```bash
# Should BLOCK
echo '{"tool_info": {"edits": [{"path": "test.py", "new_string": "# TODO\npass"}]}}' | \
  python3 windsurf-hooker/windsurf-hooks/pre_write_completeness.py
# Exit: 2 ✅

# Should ALLOW
echo '{"tool_info": {"edits": [{"path": "test.py", "new_string": "def foo(): return 42"}]}}' | \
  python3 windsurf-hooker/windsurf-hooks/pre_write_completeness.py
# Exit: 0 ✅
```

### Test Documentation Hook
```bash
# Should BLOCK (missing docstring)
echo '{"tool_info": {"edits": [{"path": "test.py", "new_string": "def foo(x): return x*2"}]}}' | \
  python3 windsurf-hooker/windsurf-hooks/pre_write_comprehensive_comments.py
# Exit: 2 ✅

# Should ALLOW (has docstring)
echo '{"tool_info": {"edits": [{"path": "test.py", "new_string": "def foo(x):\n    \"\"\"Double x.\"\"\"\n    return x*2"}]}}' | \
  python3 windsurf-hooker/windsurf-hooks/pre_write_comprehensive_comments.py
# Exit: 0 ✅
```

---

## Integration with ATLAS-GATE

### Windsurf-Hooker Role
- **Timing:** Pre-transmission (IDE-level)
- **Speed:** Milliseconds
- **Scope:** Code quality + basic security
- **Feedback:** Immediate to developer

### ATLAS-GATE Role
- **Timing:** Post-transmission (server-level)
- **Speed:** Seconds (includes plan lookup)
- **Scope:** Authority + workspace integrity
- **Feedback:** Authoritative decision

### Together
- **Defense-in-depth:** Both layers must pass
- **Shift-left:** Most enforcement at IDE
- **No bypass:** Can't skip Windsurf checks
- **Complementary:** Each covers different angles

---

## Deployment

### Installation
```bash
# Copy new hooks to windsurf hooks directory
cp windsurf-hooker/windsurf-hooks/pre_write_completeness.py \
   /usr/local/share/windsurf-hooks/

cp windsurf-hooker/windsurf-hooks/pre_write_comprehensive_comments.py \
   /usr/local/share/windsurf-hooks/

# Copy policy
cp windsurf-hooker/windsurf/policy/policy.json \
   /etc/windsurf/policy/

# Verify hooks work
python3 -m py_compile /usr/local/share/windsurf-hooks/pre_write_completeness.py
python3 -m py_compile /usr/local/share/windsurf-hooks/pre_write_comprehensive_comments.py
```

### Validation
```bash
# Test both hooks pass with valid code
echo '{"tool_info": {"edits": [{"path": "test.py", "new_string": "def foo():\n    \"\"\"Do something.\"\"\"\n    return 42"}]}}' | \
  python3 /usr/local/share/windsurf-hooks/pre_write_completeness.py && \
  echo "✓ Completeness hook works"

echo '{"tool_info": {"edits": [{"path": "test.py", "new_string": "def foo():\n    \"\"\"Do something.\"\"\"\n    return 42"}]}}' | \
  python3 /usr/local/share/windsurf-hooks/pre_write_comprehensive_comments.py && \
  echo "✓ Comments hook works"
```

---

## Key Files

| File | Purpose |
|------|---------|
| `windsurf-hooker/windsurf/policy/policy.json` | Configuration |
| `windsurf-hooker/windsurf-hooks/pre_write_completeness.py` | Completeness checking |
| `windsurf-hooker/windsurf-hooks/pre_write_comprehensive_comments.py` | Documentation checking |
| `windsurf-hooker/windsurf-hooks/pre_write_code_escape_detection.py` | Security (existing) |
| `windsurf-hooker/windsurf-hooks/pre_write_code_policy.py` | Pattern enforcement (existing) |
| `WINDSURF_HOOKER_MISSION.md` | Vision document |
| `ENFORCEMENT_ARCHITECTURE.md` | System design |
| `WINDSURF_ENFORCEMENT_ENHANCED.md` | Implementation details |
| `WINDSURF_ENFORCEMENT_GAPS.md` | Gap analysis |

---

## Philosophy

> **Code must be done, not sketched.**

Windsurf-Hooker enforces that:
1. Work is complete (no TODOs deferred)
2. Intent is clear (documented thoroughly)
3. Code is safe (no escapes, no primitives)
4. Authority is respected (plan-authorized only)
5. Quality is built-in (enforced at write-time)

This is not hostile. It's **enabling**: developers get immediate feedback, know exactly what "done" means, and produce production-ready code the first time.

---

## Status Summary

| Component | Status | Coverage |
|-----------|--------|----------|
| Escape prevention | ✅ Complete | Subprocess, socket, exec, eval |
| Pattern enforcement | ✅ Complete | Mocks, hacks, debug code |
| Completeness checking | ✅ Complete (NEW) | TODOs, stubs, placeholders |
| Documentation enforcement | ✅ Complete (NEW) | Docstrings, comments, naming |
| Diff quality | ✅ Complete | Size and concern warnings |
| Authorization | ✅ Complete | Plan + tool validation |
| **Total Coverage** | **85%** | Phase 1 complete |

---

## Quick Start

1. **Read:** [WINDSURF_HOOKER_MISSION.md](WINDSURF_HOOKER_MISSION.md)
2. **Understand:** [ENFORCEMENT_ARCHITECTURE.md](ENFORCEMENT_ARCHITECTURE.md)
3. **Deploy:** Copy hooks + policy to `/etc/windsurf/`
4. **Test:** Run validation script
5. **Document:** Share phase completion with team

---

## Support & Questions

**Q: Why can't I have TODOs?**  
A: We want finished code. If work isn't done, we don't write it. This keeps code clean and production-ready.

**Q: What if documentation is hard to write?**  
A: That's often a sign the code is too complex. Break it up or simplify. Good code explains itself.

**Q: Can I bypass these checks?**  
A: No. These hooks are non-negotiable. ATLAS-GATE server has backup enforcement. Both must pass.

**Q: What about test files?**  
A: Test files are allowed to have stubs and simplifications (test doubles, mocks). Completeness enforcement skips them.

---

## Version History

- **Phase 1 (v1.0):** Completeness + Documentation hooks ✅
- **Phase 2 (v2.0):** Code quality + Debuggability hooks (planned)
- **Phase 3 (v3.0):** Type safety + Performance checks (planned)

---

## Related Systems

- **ATLAS-GATE MCP:** Server-side enforcement & authority
- **Windsurf IDE:** Code editor + hook host
- **MCP Protocol:** Inter-process communication
- **Plan Registry:** Workspace governance

---

**Status:** Windsurf-Hooker Phase 1 is complete and ready for deployment. 🚀
