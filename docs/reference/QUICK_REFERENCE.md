# KAIZA MCP Server: Quick Reference Card

**Print this and keep it handy!**

---

## Installation (5 minutes)

```bash
# 1. Clone
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
cd KAIZA-MCP-server

# 2. Install dependencies
npm install

# 3. Set secret (get from: openssl rand -base64 32)
export KAIZA_BOOTSTRAP_SECRET="your-secret-here"

# 4. Test (should pass)
npm test

# 5. Start server
node server.js
# Keep this terminal open
```

---

## 6 Tools Overview

| Tool | Purpose | When | Call First? |
|------|---------|------|-------------|
| `read_prompt` | Unlock writing | Before any write | ✅ MUST |
| `list_plans` | Find plan name | Before write_file | Usually |
| `read_file` | Examine code | Before modifying | Recommended |
| `write_file` | Create/modify code | Main operation | Final step |
| `read_audit_log` | Verify changes | After writing | Recommended |
| `bootstrap_*` | Create first plan | Setup only (once) | Initial |

---

## Tool Usage Patterns

### Pattern 1: Basic Write (Most Common)

```
1. read_prompt()              // Unlock writing
2. list_plans()               // Get plan name
3. write_file(
     path: "src/file.js",
     plan: "FOUNDATION-xxx",
     content: "valid code",
     role: "EXECUTABLE"
   )
4. read_audit_log()           // Verify
```

### Pattern 2: Safe Modify (Check First)

```
1. read_prompt()              // Unlock writing
2. read_file("src/file.js")   // Understand code
3. list_plans()               // Get plan name
4. write_file(
     path: "src/file.js",
     plan: "FOUNDATION-xxx",
     content: "improved code"
   )
5. read_audit_log()           // Verify
```

### Pattern 3: Minimal Change (Use Patch)

```
1. read_prompt()
2. read_file("src/file.js")
3. write_file(
     path: "src/file.js",
     plan: "FOUNDATION-xxx",
     patch: "--- a/...\n+++ b/..."
   )
```

---

## Valid Code Examples

### ✅ ALLOWED

```javascript
// Return true - OK
function isValid() { return true; }

// Return real values - OK
function getData() { return { id: 1, name: "test" }; }

// Error handling - OK
function process(data) {
  if (!data) throw new Error('Invalid');
  return transform(data);
}

// Variables with real names - OK
const userData = { id: 1 };
const apiResponse = { status: 200 };
```

### ❌ BLOCKED

```javascript
// TODO markers - BLOCKED
function work() {
  // TODO: implement this
}

// Empty functions - BLOCKED
function handler() {}

// Empty catch - BLOCKED
try { work(); } catch(e) {}

// Null returns - BLOCKED
function getData() { return null; }

// Mock/fake data - BLOCKED
const mockUserData = { id: 1 };
const fakeResponse = { status: 200 };
const testData = [1, 2, 3];

// Undefined returns - BLOCKED
function getValue() { return undefined; }
```

---

## Common Errors & Quick Fixes

| Error | Fix |
|-------|-----|
| `PROMPT_GATE_LOCKED` | Call `read_prompt` first |
| `PLAN_NOT_FOUND` | Call `list_plans` to get correct name |
| `PLAN_NOT_APPROVED` | Create plan with `bootstrap_*` or ensure it has `status: APPROVED` |
| `HARD_BLOCK_VIOLATION: TODO` | Remove TODO, write complete code |
| `HARD_BLOCK_VIOLATION: Empty function` | Implement the function fully |
| `HARD_BLOCK_VIOLATION: null` | Return real value or throw error |
| `HARD_BLOCK_VIOLATION: mock` | Use real variable names (remove mock/fake/test prefix) |
| `INVALID_PATH: traversal` | Use paths from repo root (no `../`) |
| `FILE_NOT_FOUND` | Check path, file must exist |

---

## File Paths

```
✅ CORRECT (relative to repo root):
- "src/handler.js"
- "docs/README.md"
- "config.json"

❌ WRONG:
- "../src/handler.js"  (path traversal)
- "/home/user/src/handler.js"  (absolute)
- "./src/handler.js"  (dot prefix)
```

---

## Tool Parameters

### read_prompt
```json
{
  "name": "ANTIGRAVITY_CANONICAL"
}
// or "WINDSURF_CANONICAL"
```

### list_plans
```json
{
  "path": "."
}
```

### read_file
```json
{
  "path": "src/handler.js"
}
```

### write_file (MINIMAL)
```json
{
  "path": "src/handler.js",
  "content": "code here",
  "plan": "FOUNDATION-xxxxx"
}
```

### write_file (FULL)
```json
{
  "path": "src/handler.js",
  "content": "code here",
  "plan": "FOUNDATION-xxxxx",
  "role": "EXECUTABLE",
  "purpose": "Main handler",
  "usedBy": "API route",
  "connectedVia": "Express",
  "registeredIn": "index.js",
  "executedVia": "POST /api",
  "failureModes": "Throws on invalid input",
  "authority": "FOUNDATION-xxxxx.md"
}
```

### read_audit_log
```json
{}
// No parameters
```

---

## Role Types (for write_file)

| Role | Use For |
|------|---------|
| `EXECUTABLE` | Main application code |
| `BOUNDARY` | API handlers, entry points |
| `INFRASTRUCTURE` | Build, tooling, setup |
| `VERIFICATION` | Tests, validation, checks |

---

## Workflow Quick Start

### First Time Setup

```
1. Clone repo
2. npm install
3. export KAIZA_BOOTSTRAP_SECRET="..."
4. node server.js (keep running)
5. In another terminal/IDE:
   - Call: read_prompt
   - Call: bootstrap_create_foundation_plan
   - Result: Plan created
```

### Create New File

```
1. Call: read_prompt
2. Call: list_plans
3. Call: write_file(
     path: "src/file.js",
     plan: <from list_plans>,
     content: "valid production code",
     role: "EXECUTABLE"
   )
4. Call: read_audit_log (to verify)
```

### Modify Existing File

```
1. Call: read_prompt
2. Call: read_file("src/file.js")
3. Call: list_plans
4. Call: write_file(
     path: "src/file.js",
     plan: <from list_plans>,
     content: "improved code"
   )
5. Call: read_audit_log (to verify)
```

---

## Environment

### Required
```bash
export KAIZA_BOOTSTRAP_SECRET="your-secret-32-chars-or-more"
```

### How to Generate Secret
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Make Permanent
```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export KAIZA_BOOTSTRAP_SECRET="your-secret"' >> ~/.bashrc
source ~/.bashrc
```

---

## Testing

```bash
# Quick test
npm test
# Expected: AST Policy Verified.

# Full test
node test-comprehensive.js
# Expected: ✓ All tests passed! (22/22)
```

---

## Directory Structure (Auto-Created)

After first use, you'll have:

```
your-repo/
├── src/                  (your code)
├── docs/
│   └── plans/           ← Plan files stored here
├── audit-log.jsonl      ← Immutable operation log
└── .kaiza/              ← Governance metadata
```

All auto-created. No manual setup needed.

---

## Key Facts

✅ **Works in ANY directory** - No setup markers required  
✅ **Auto-creates directories** - Plans dir, audit log created on demand  
✅ **Zero configuration** - No config files needed  
✅ **Bootstrap enabled** - Default mode allows plan creation  
✅ **Atomically safe** - Hash-chained audit log prevents corruption  
✅ **Deterministic** - Same behavior in any repo/folder  
✅ **Production-ready** - All code must be complete, no stubs  

---

## One-Liner Quick Start

```bash
cd ~/my-project && \
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git && \
cd KAIZA-MCP-server && \
npm install && \
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32) && \
npm test && \
node server.js
```

---

## Debugging

### Server won't start
```bash
node --version     # Must be 18+
npm list           # Check packages installed
npm install        # Reinstall if needed
```

### Tools not working
```bash
# Check you're in repo directory
pwd

# Check server is running
# (should see in other terminal)

# Check environment
echo $KAIZA_BOOTSTRAP_SECRET
```

### Errors writing
```
1. Did you call read_prompt?     ← Required first
2. Did you call list_plans?       ← Get plan name
3. Is code production-ready?      ← No TODOs/stubs
4. Is plan APPROVED?              ← Check list_plans
5. Is path correct?               ← From repo root
```

---

## Documentation

- **COMPLETE_SETUP_GUIDE.md** - Detailed setup & examples
- **HARDENING_SUMMARY.md** - System overview
- **ZERO_SETUP_GUARANTEE.md** - How zero-setup works
- **FINAL_VERIFICATION_REPORT.md** - Technical details
- **QUICK_REFERENCE.md** - This document

---

## Support

**Most common issue**: Forgetting to call `read_prompt` first

**Solution**: Always call `read_prompt` before any write operations

---

## Last Checklist

Before using in production:

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (npm install)
- [ ] KAIZA_BOOTSTRAP_SECRET set
- [ ] Tests passing (npm test)
- [ ] Server starts (node server.js)
- [ ] Can read prompt (read_prompt)
- [ ] Can list plans (list_plans)
- [ ] Can write file (write_file)
- [ ] Can verify audit (read_audit_log)

---

**You're ready! 🚀**

Keep this card handy. Most issues are solved by:
1. Calling read_prompt first
2. Getting plan name from list_plans
3. Ensuring code is production-ready
4. Checking paths are relative to repo root

