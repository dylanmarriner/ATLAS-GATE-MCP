# KAIZA MCP Server: Complete Setup & Usage Guide

**Last Updated**: January 12, 2026  
**Status**: Production Ready  
**Difficulty**: Beginner-Friendly

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation & Setup](#installation--setup)
3. [Starting the Server](#starting-the-server)
4. [Understanding the Tools](#understanding-the-tools)
5. [Tool Usage Guide](#tool-usage-guide)
6. [Example Workflows](#example-workflows)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher (comes with Node.js)
- **Git**: v2.0 or higher (optional, but recommended)
- **Operating System**: Linux, macOS, or Windows (with WSL2 recommended for Windows)
- **Disk Space**: ~500MB for installation
- **Memory**: 512MB RAM minimum

### Check Your System

```bash
# Check Node.js version (should be 18.0+)
node --version

# Check npm version (should be 9.0+)
npm --version

# Check Git version (optional)
git --version
```

If you need to install Node.js, go to [nodejs.org](https://nodejs.org) and download the LTS version.

---

## Installation & Setup

### Step 1: Clone the Repository

The KAIZA MCP Server is designed to work anywhere. Choose any location:

```bash
# Option A: Clone to your home directory (recommended)
cd ~
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
cd KAIZA-MCP-server

# Option B: Clone to a project directory
cd ~/projects
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
cd KAIZA-MCP-server

# Option C: Clone to /opt (system-wide installation)
sudo git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git /opt/kaiza-mcp
cd /opt/kaiza-mcp
```

**After cloning, verify the structure:**

```bash
ls -la

# You should see:
# ├── core/              (Core logic)
# ├── tools/             (MCP tools)
# ├── docs/              (Documentation)
# ├── tests/             (Test files)
# ├── server.js          (Main server file)
# ├── package.json       (Dependencies)
# └── README.md          (Project info)
```

### Step 2: Install Dependencies

```bash
# Navigate to the repository
cd KAIZA-MCP-server

# Install all required packages
npm install

# This will install:
# - @modelcontextprotocol/sdk (MCP framework)
# - acorn (JavaScript parser)
# - acorn-walk (AST walker)
# - js-yaml (YAML parser)
# - zod (Validation library)
# - diff (Diff utility)

# Verify installation
npm list

# You should see all packages listed
```

**Expected output:**
```
mcp-server@1.0.0
├── @modelcontextprotocol/sdk@1.25.1
├── acorn@8.15.0
├── acorn-walk@8.3.4
├── diff@8.0.2
├── js-yaml@4.1.1
└── zod@4.2.1
```

### Step 3: Set Up Environment Variables

The system needs one environment variable for plan creation (bootstrap):

```bash
# Generate a strong secret (32+ characters)
# Option A: Using OpenSSL
openssl rand -base64 32

# Option B: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Copy the output (something like: "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6...")
```

Now set the environment variable:

```bash
# Option A: Temporary (for current terminal session)
export KAIZA_BOOTSTRAP_SECRET="A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6..."

# Option B: Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export KAIZA_BOOTSTRAP_SECRET="A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6..."' >> ~/.bashrc
source ~/.bashrc

# Option C: Windows (PowerShell)
$env:KAIZA_BOOTSTRAP_SECRET = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6..."

# Verify
echo $KAIZA_BOOTSTRAP_SECRET
```

### Step 4: Run Tests (Verify Installation)

```bash
# Run the quick test
npm test

# Expected output:
# > mcp-server@1.0.0 test
# > node test-ast-policy.js
# 
# Testing AST Policy...
# PASS: function valid() { return true; }
# ...
# AST Policy Verified.

# Run comprehensive tests
node test-comprehensive.js

# Expected output:
# ✓ All tests passed!
# ✓ PASS: Allows 'return true' as legitimate code
# ... (22 total tests)
# ✓ All tests passed!
```

**If tests pass**, your installation is complete! ✅

---

## Starting the Server

### Step 1: Start the Server

```bash
# Navigate to repository
cd KAIZA-MCP-server

# Start the server
node server.js

# Expected output:
# [MCP] kaiza-mcp running | session=a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

**The server is now running and listening on stdin/stdout**

### Step 2: Connect a Client

The MCP server uses **stdio protocol** (standard input/output). You need a client that supports this.

#### Option A: Use with Windsurf (Recommended for Beginners)

Windsurf is a user-friendly IDE that works with MCP servers:

1. Install Windsurf from [codeium.com/windsurf](https://codeium.com/windsurf)
2. Configure it to use the KAIZA MCP server
3. The server will be automatically started when needed

#### Option B: Use with Claude in Cline

If you're using Claude API through Cline:

1. Install Cline VSCode extension
2. Configure MCP server in settings
3. Point to your `KAIZA-MCP-server/server.js`

#### Option C: Manual Testing

For testing purposes, you can test the server manually:

```bash
# Terminal 1: Start the server
cd KAIZA-MCP-server
node server.js

# Terminal 2: Send a test request
# (MCP uses JSON-RPC over stdin/stdout)
```

### Keep the Server Running

**Important**: Keep the terminal running while using the server. The server must stay active to process requests.

```bash
# Do NOT close this terminal:
node server.js

# To stop the server later:
# Press Ctrl+C
```

---

## Understanding the Tools

KAIZA MCP exposes 6 main tools that work together:

### Tool 1: `bootstrap_create_foundation_plan`
**Purpose**: Create the very first governance plan in a fresh repository  
**When to Use**: Once per repository, during initial setup  
**Security**: Requires cryptographic signature and secret  
**Returns**: Plan ID and file path  

### Tool 2: `read_prompt`
**Purpose**: Read the canonical governance prompt (required before writes)  
**When to Use**: Before any write operations  
**Security**: Enforces plan-aware LLM context  
**Returns**: The governance prompt text  

### Tool 3: `list_plans`
**Purpose**: Discover all approved governance plans in the repository  
**When to Use**: To find available plans before using write_file  
**Security**: Only lists APPROVED plans  
**Returns**: List of plan names and count  

### Tool 4: `read_file`
**Purpose**: Read files from the repository (read-only access)  
**When to Use**: To examine code before modifying  
**Security**: Path traversal prevention  
**Returns**: File contents  

### Tool 5: `read_audit_log`
**Purpose**: View the immutable audit trail of all operations  
**When to Use**: To verify what operations were performed  
**Security**: Hash-chained integrity protection  
**Returns**: JSON audit log entries  

### Tool 6: `write_file`
**Purpose**: Write or modify files with full enforcement (THE MAIN TOOL)  
**When to Use**: To make code changes  
**Security**: Plan enforcement, stub detection, audit logging  
**Returns**: Success confirmation with audit details  

---

## Tool Usage Guide

### Tool 1: bootstrap_create_foundation_plan

**What it does**: Creates the first governance plan for your repository.

**When to use**: 
- Only on the very first setup
- Only once per repository
- After this, use `write_file` to create additional plans

**Prerequisites**:
- KAIZA_BOOTSTRAP_SECRET environment variable set
- Fresh repository (no existing plans)

**Parameters**:

```json
{
  "path": ".",
  "planContent": "---\nstatus: APPROVED\nplan_id: FOUNDATION-001\nname: Foundation Plan\n---\n\n# Initial Plan\n\nSCOPE:\n- src/\n- docs/\n",
  "payload": {
    "repoIdentifier": "my-repo",
    "timestamp": 1234567890000,
    "nonce": "random-string-12345",
    "action": "BOOTSTRAP_CREATE_FOUNDATION_PLAN"
  },
  "signature": "hmac-sha256-signature-here"
}
```

**Example Usage**:

```
User Prompt:
"I need to create the initial governance plan for this repository. 
Please bootstrap with a basic plan that allows modifications to src/ and docs/ folders.
The environment has KAIZA_BOOTSTRAP_SECRET set to my-secret-key."

Expected Response:
- Plan created: FOUNDATION-{uuid}.md
- Location: docs/plans/FOUNDATION-{uuid}.md
- Bootstrap mode disabled
- Status: APPROVED
```

**Result**:
- Creates `docs/plans/FOUNDATION-{uuid}.md`
- Disables bootstrap mode (prevents further plan creation via bootstrap)
- Makes the plan immediately available for use

**After Bootstrap**:
```bash
# Check that plan was created
ls -la docs/plans/

# You should see:
# FOUNDATION-a1b2c3d4-e5f6-7890-ijkl-mnopqrstuvwx.md
```

---

### Tool 2: read_prompt

**What it does**: Reads the canonical governance prompt that guides LLM behavior.

**When to use**: 
- BEFORE any write operations (enforced)
- To understand governance requirements
- To ensure you're operating within the correct context

**Parameters**:

```json
{
  "name": "ANTIGRAVITY_CANONICAL"  // or "WINDSURF_CANONICAL"
}
```

**Valid names**:
- `ANTIGRAVITY_CANONICAL` - Planning agent prompt
- `WINDSURF_CANONICAL` - Execution agent prompt

**Example Usage**:

```
User Prompt:
"Please read the canonical governance prompt to understand what's required."

Expected Response:
---
# KAIZA MCP CANONICAL PROMPT
This is the authoritative prompt.
You must respect the plan.
---
```

**Why it matters**:
- Sets the governance context for all subsequent operations
- Enables the write_file tool (without this, writes are blocked)
- Must be called before any modifications can be made

**After Reading**:
```bash
# The system now knows you've read the governance requirements
# write_file tool is now available
```

---

### Tool 3: list_plans

**What it does**: Shows all approved plans available in the repository.

**When to use**:
- To see what plans are available
- To find plan names for use with write_file
- To verify a plan was created successfully

**Parameters**:

```json
{
  "path": "."  // Current directory (relative to repo root)
}
```

**Example Usage**:

```
User Prompt:
"Show me all available plans in this repository."

Expected Response:
{
  "repoRoot": "/path/to/repo",
  "plansDir": "/path/to/repo/docs/plans",
  "count": 2,
  "plans": [
    "FOUNDATION-a1b2c3d4-e5f6-7890",
    "FEATURE-implementation-plan"
  ]
}
```

**What each field means**:
- `repoRoot`: The repository root directory
- `plansDir`: Where plans are stored
- `count`: Number of approved plans
- `plans`: List of plan names (use these with write_file)

**After Listing**:
```bash
# Pick a plan from the list to use with write_file
# Example: "FOUNDATION-a1b2c3d4-e5f6-7890"
```

---

### Tool 4: read_file

**What it does**: Reads file contents from the repository.

**When to use**:
- To examine code before modifying
- To understand the current state
- To check dependencies

**Parameters**:

```json
{
  "path": "src/index.js"  // Relative to repo root
}
```

**Valid paths**:
- `src/index.js` - Relative path
- `docs/README.md` - Any file in repo
- `/absolute/path/file.js` - Absolute paths also work

**Example Usage**:

```
User Prompt:
"Please read src/main.js to understand the current implementation."

Expected Response:
{
  "content": [
    {
      "type": "text",
      "text": "// File contents here...\nfunction main() { ... }"
    }
  ]
}
```

**Error Cases**:

```
// File not found
Error: FILE_NOT_FOUND: src/nonexistent.js

// Path traversal attempt
Error: INVALID_PATH: path traversal not permitted

// Outside repo
Error: INVALID_PATH: Path is outside repository root
```

**After Reading**:
```bash
# You now have the file contents
# Use this information to plan your modifications
# Then use write_file to make changes
```

---

### Tool 5: read_audit_log

**What it does**: Shows the immutable record of all operations performed.

**When to use**:
- To verify what was written
- To audit changes
- To understand the operation history
- For compliance/accountability

**Parameters**:

```json
{}  // No parameters needed
```

**Example Usage**:

```
User Prompt:
"Show me the audit log of all operations performed so far."

Expected Response:
{
  "content": [
    {
      "type": "text",
      "text": "{\"timestamp\": \"2026-01-12T10:30:00Z\", \"sessionId\": \"...\", 
              \"path\": \"src/main.js\", \"plan\": \"FOUNDATION-...\", 
              \"role\": \"EXECUTABLE\", \"prevHash\": \"GENESIS\", 
              \"hash\": \"abc123...\"}\n
             {\"timestamp\": \"2026-01-12T10:35:00Z\", ...}"
    }
  ]
}
```

**Log Entry Fields**:
- `timestamp`: When the operation occurred (ISO 8601)
- `sessionId`: Which MCP session performed it
- `path`: What file was modified (relative to repo)
- `plan`: Which plan authorized it
- `role`: What type of operation (EXECUTABLE, BOUNDARY, etc.)
- `prevHash`: Hash of previous entry (creates chain)
- `hash`: Hash of this entry (for integrity)

**Hash Chain Verification**:
```
Entry 1: prevHash="GENESIS", hash="abc123"
Entry 2: prevHash="abc123", hash="def456"
Entry 3: prevHash="def456", hash="ghi789"

If anyone modifies an entry, the hash chain breaks and it's detected!
```

**After Reading**:
```bash
# You can verify:
# - What files were modified
# - When they were modified
# - Which plan authorized each change
# - Whether the log is intact (hashes match)
```

---

### Tool 6: write_file (THE MAIN TOOL)

**What it does**: Writes or modifies files with full enforcement (validation, auditing, stub detection).

**When to use**:
- To create new files
- To modify existing files
- To apply patches
- To generate code

**Prerequisites** (CRITICAL):
1. ✅ Call `read_prompt` first (enables write gate)
2. ✅ Have an APPROVED plan (get from `list_plans`)
3. ✅ Content must pass quality checks (no TODOs, mocks, stubs)
4. ✅ Path must be within repository

**Parameters**:

```json
{
  "path": "src/handler.js",
  "content": "// Your file content here\nfunction handler() { ... }",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "purpose": "Main request handler",
  "usedBy": "API router",
  "connectedVia": "Express middleware",
  "registeredIn": "handlers.js",
  "executedVia": "POST /api/handle",
  "failureModes": "500 error if validation fails",
  "authority": "FOUNDATION-a1b2c3d4-e5f6-7890.md",
  "planHash": "optional-hash-for-integrity-check"
}
```

**Required Fields**:
- `path` - File location (relative to repo root)
- `content` OR `patch` - Either full content or a unified diff
- `plan` - Plan name that authorizes this write

**Optional Fields** (enhance documentation):
- `role` - EXECUTABLE, BOUNDARY, INFRASTRUCTURE, VERIFICATION
- `purpose` - What this file does
- `usedBy` - Where this is used
- `connectedVia` - How this connects
- `registeredIn` - Where it's registered
- `executedVia` - How it's executed
- `failureModes` - What can go wrong
- `authority` - Authority for this code

**Example 1: Create a New File**

```
User Prompt:
"Create a new file src/utils.js with helper functions. 
The content should be production-ready with no TODOs.
Use the FOUNDATION plan."

Expected Prompt Structure:
{
  "path": "src/utils.js",
  "content": "/**\n * ROLE: EXECUTABLE\n * PURPOSE: Utility functions\n */\n\nexport function trim(str) {\n  return str.trim();\n}\n\nexport function isEmpty(str) {\n  return str.length === 0;\n}",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "purpose": "String utility functions",
  "usedBy": "Data validators"
}

Expected Response:
{
  "status": "OK",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "path": "src/utils.js",
  "repoRoot": "/path/to/repo",
  "preflight": "PASSED"
}
```

**Example 2: Modify an Existing File**

```
User Prompt:
"Update src/index.js to add error handling to the main function.
The changes should be complete and production-ready."

Expected Prompt Structure:
{
  "path": "src/index.js",
  "content": "// Updated file with error handling\nfunction main() {\n  try {\n    // main logic\n  } catch (error) {\n    console.error('Fatal error:', error);\n    process.exit(1);\n  }\n}",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "purpose": "Main entry point with error handling"
}

Expected Response:
{
  "status": "OK",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "path": "src/index.js",
  "repoRoot": "/path/to/repo",
  "preflight": "PASSED"
}
```

**Example 3: Apply a Patch (Safer for Large Files)**

```
User Prompt:
"Apply the following patch to src/config.js:
- Add a new configuration option
- Keep all other code the same
- Make sure changes are minimal and focused"

Expected Prompt Structure:
{
  "path": "src/config.js",
  "patch": "--- a/src/config.js\n+++ b/src/config.js\n@@ -1,5 +1,7 @@\n const config = {\n-  port: 3000\n+  port: 3000,\n+  timeout: 5000\n };",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "purpose": "Add timeout configuration"
}

Expected Response:
{
  "status": "OK",
  "plan": "FOUNDATION-a1b2c3d4-e5f6-7890",
  "role": "EXECUTABLE",
  "path": "src/config.js",
  "repoRoot": "/path/to/repo",
  "preflight": "PASSED"
}
```

**Validation Gates** (What will BLOCK writes):

1. ❌ No PROMPT_GATE satisfied
   ```
   Error: PROMPT_GATE_LOCKED: You must call read_prompt first
   ```

2. ❌ Plan doesn't exist
   ```
   Error: PLAN_NOT_FOUND: Plan not found: invalid-plan-name
   ```

3. ❌ Plan not approved
   ```
   Error: PLAN_NOT_APPROVED: Plan is not approved
   ```

4. ❌ Stub code detected
   ```
   Error: HARD_BLOCK_VIOLATION: Detected TODO in code
   Error: HARD_BLOCK_VIOLATION: Empty function body
   Error: HARD_BLOCK_VIOLATION: Returning null
   ```

5. ❌ Mock data detected
   ```
   Error: HARD_BLOCK_VIOLATION: mockUserData variable found
   Error: HARD_BLOCK_VIOLATION: fakeResponse variable found
   ```

6. ❌ Path outside repo
   ```
   Error: INV_PATH_WITHIN_REPO: Path is outside repository root
   ```

7. ❌ Path traversal attempted
   ```
   Error: INV_PATH_WITHIN_REPO: Path traversal (..) not permitted
   ```

**After Successful Write**:
- File is created/modified on disk
- Audit log entry is created (hash-chained)
- Preflight tests pass (code doesn't break build)
- Ready for the next write

---

## Example Workflows

### Workflow 1: Fresh Repository Setup

**Goal**: Set up a new repository with KAIZA governance

**Step 1: Bootstrap**
```
User: "Create the initial governance plan for this repository. 
       Allow modifications to src/, docs/, and config files."

Agent calls: bootstrap_create_foundation_plan
Result: Plan created and approved
```

**Step 2: Read Governance**
```
User: "Show me the governance requirements I need to follow."

Agent calls: read_prompt
Result: Governance prompt displayed
```

**Step 3: Verify Plan**
```
User: "List all available plans."

Agent calls: list_plans
Result: FOUNDATION-xxxxx displayed
```

**Step 4: Create Initial Code**
```
User: "Create src/main.js with the main application entry point."

Agent calls: write_file
Input:
- path: src/main.js
- plan: FOUNDATION-xxxxx
- content: (valid JS code, no stubs)
Result: File created, audit logged
```

---

### Workflow 2: Code Review & Modification

**Goal**: Review and improve existing code

**Step 1: Read Current Code**
```
User: "Show me the contents of src/handler.js"

Agent calls: read_file
Result: File contents displayed
```

**Step 2: Understand**
```
User: "This code is missing error handling. 
       Let me review the governance requirements first."

Agent calls: read_prompt
Result: Governance prompt confirmed
```

**Step 3: Modify**
```
User: "Now update src/handler.js to add proper error handling.
       The code should be production-ready with no TODOs."

Agent calls: write_file
Input:
- path: src/handler.js
- plan: (from list_plans)
- content: (updated code with error handling, no TODOs)
Result: File updated, audit logged
```

**Step 4: Verify**
```
User: "Show me the audit log to confirm the change was recorded."

Agent calls: read_audit_log
Result: Two entries shown:
         - Original file created
         - Updated with error handling
```

---

### Workflow 3: Multi-File Project Creation

**Goal**: Create a complete feature with multiple files

**Step 1: Plan**
```
User: "I'm implementing user authentication. 
       Before starting, show me the current structure."

Agent calls: read_file (src/)
Agent calls: list_plans
Result: Current structure shown, plan listed
```

**Step 2: Create Files Sequentially**
```
User: "Create src/auth/middleware.js - authentication middleware"
Agent calls: write_file
Result: File 1 created

User: "Create src/auth/utils.js - authentication utilities"
Agent calls: write_file
Result: File 2 created

User: "Create src/auth/types.js - type definitions"
Agent calls: write_file
Result: File 3 created
```

**Step 3: Verify**
```
User: "Show me all the changes we've made."

Agent calls: read_audit_log
Result: All 3 files listed in audit trail
```

---

### Workflow 4: Bug Fix with Minimal Changes

**Goal**: Fix a bug with minimal code changes

**Step 1: Identify Issue**
```
User: "Read src/validator.js and check for bugs"

Agent calls: read_file
Result: Code displayed (bug identified)
```

**Step 2: Plan Fix**
```
User: "I need to fix the validation logic. 
       This is a critical bug that must be fixed correctly."

Agent calls: read_prompt
Result: Governance confirmed
```

**Step 3: Apply Minimal Patch**
```
User: "Apply this patch to fix the validation bug:"

Agent calls: write_file
Input:
- path: src/validator.js
- patch: (unified diff with minimal changes)
- plan: (approved plan)
Result: Minimal change applied, audit logged
```

**Step 4: Confirm**
```
User: "Verify the audit shows this exact change."

Agent calls: read_audit_log
Result: Exact change shown in hash-chained log
```

---

## Troubleshooting

### Error: PROMPT_GATE_LOCKED

**Problem**: Getting "You must call read_prompt first" error

**Solution**:
```
User: "Before we make any changes, I need to read the 
       governance prompt to understand the requirements."

Agent should call: read_prompt
Then: write_file will work
```

**Why this happens**: 
- Security feature to ensure LLM understands governance
- Must read prompt before making any modifications

---

### Error: PLAN_NOT_FOUND

**Problem**: Getting "Plan not found" error

**Solution**:
```
User: "Show me what plans are available."

Agent calls: list_plans
Result: Shows available plans

User: "Now use the FOUNDATION plan to create..."
Agent calls: write_file with correct plan name
```

**Why this happens**:
- Typo in plan name
- Plan hasn't been created yet
- Using old plan name that changed

---

### Error: PLAN_NOT_APPROVED

**Problem**: Getting "Plan status is not APPROVED" error

**Solution**:
```
User: "Create a new plan with APPROVED status."

Agent calls: bootstrap_create_foundation_plan
(Or manually edit the plan file to have: status: APPROVED)

User: "Now use this plan..."
Agent calls: write_file
```

**Why this happens**:
- Plan was created but not approved
- Only APPROVED plans can authorize writes

---

### Error: HARD_BLOCK_VIOLATION: TODO found

**Problem**: Code with TODO comments is rejected

**Solution**:
```
User: "The code I'm writing has a TODO comment, 
       but I want to implement it completely."

Agent: DON'T include TODOs!
       Write complete implementation instead.

Example WRONG:
function process() {
  // TODO: add validation
  return data;
}

Example RIGHT:
function process(data) {
  if (!data) throw new Error('Invalid data');
  return transform(data);
}
```

**Why this happens**:
- Quality enforcement: incomplete code can't ship
- TODOs indicate unfinished work
- All code must be production-ready

---

### Error: HARD_BLOCK_VIOLATION: Empty function body

**Problem**: Empty functions are rejected

**Solution**:
```
User: "Create a function but I don't have the logic yet."

Agent: DON'T create empty functions!
       Either:
       1. Implement the full logic, OR
       2. Create the function later when ready

Example WRONG:
function process() {}

Example RIGHT:
function process(data) {
  const result = transform(data);
  validate(result);
  return result;
}
```

**Why this happens**:
- Empty functions are stubs/placeholders
- Production code must be complete

---

### Error: HARD_BLOCK_VIOLATION: Returning null

**Problem**: Functions returning null are rejected

**Solution**:
```
User: "I need a function that returns null for missing data."

Agent: DON'T return null!
       Instead:
       1. Return a valid value (empty string, empty array)
       2. Throw an error for actual problems
       3. Use Optional types/patterns

Example WRONG:
function getData() {
  if (!found) return null;
  return data;
}

Example RIGHT:
function getData() {
  if (!found) throw new Error('Not found');
  return data;
}
```

**Why this happens**:
- Null returns cause downstream errors
- Forces explicit error handling
- Better code reliability

---

### Error: HARD_BLOCK_VIOLATION: mockUserData found

**Problem**: Mock/test data variable names are rejected

**Solution**:
```
User: "I need to create test data for validation."

Agent: Use REAL data structures, not mock/fake/test!
       
Example WRONG:
const mockUserData = { id: 1, name: "test" };
const fakeResponse = { status: 200 };
const dummyArray = [1, 2, 3];

Example RIGHT:
const userData = { id: 1, name: "test" };
const response = { status: 200 };
const items = [1, 2, 3];

(These can still be test data, just without mock/fake/test names)
```

**Why this happens**:
- Mock data in production code indicates incomplete implementation
- Forces use of real implementations

---

### Error: INVALID_PATH: path traversal not permitted

**Problem**: Getting path traversal error

**Solution**:
```
User: "Write to src/../config.json"

Agent: DON'T use path traversal!
       Use direct path from repo root:
       
WRONG: src/../config.json
RIGHT: config.json
```

**Why this happens**:
- Security protection against directory escape
- Keeps all writes within repository

---

### Error: FILE_NOT_FOUND

**Problem**: File doesn't exist

**Solution**:
```
User: "Read src/utils.js"
Agent calls: read_file
Error: FILE_NOT_FOUND

Solution:
User: "List files in src/ to see what exists"
Agent calls: read_file on src/
OR look at file structure first
```

**Why this happens**:
- File name typo
- File location is different
- File hasn't been created yet

---

### Server Won't Start

**Problem**: Error when running `node server.js`

**Solution**:

```bash
# 1. Check Node.js version
node --version  # Must be 18.0+

# 2. Check npm install
npm list  # Should show all packages

# 3. If packages missing, reinstall
npm install

# 4. Check current directory
pwd  # Should be in KAIZA-MCP-server repo

# 5. Check permissions
ls -la server.js  # Should be readable

# 6. Run with verbose output
node server.js 2>&1
```

---

### Audit Log Corruption Detected

**Problem**: Hash chain broken in audit log

**Solution**:
```bash
# Check audit log
cat audit-log.jsonl

# If hashes don't chain, something modified the file
# Solution: 
# 1. Check if file was edited manually (don't do this!)
# 2. Restore from backup
# 3. Use the server normally (it maintains hash chain)
```

**Prevention**:
- Never edit audit-log.jsonl manually
- Only use the server to make changes
- The hash chain will be maintained automatically

---

## Best Practices

### 1. Always Read Prompt First

```
✅ GOOD:
User: "Read the prompt, then create new file src/handler.js"
Agent: calls read_prompt, then write_file

❌ BAD:
User: "Just create src/handler.js without any ceremony"
Agent: calls write_file directly
Result: Error - PROMPT_GATE_LOCKED
```

### 2. List Plans Before Writing

```
✅ GOOD:
User: "Show available plans, then create file"
Agent: calls list_plans, gets plan name, calls write_file

❌ BAD:
User: "Create file with the FEATURE-123 plan"
Agent: calls write_file with plan name
Result: Error - plan doesn't exist
```

### 3. Read Files Before Modifying

```
✅ GOOD:
User: "Show src/handler.js, then improve the error handling"
Agent: calls read_file, understands code, calls write_file

❌ BAD:
User: "Just make the handler async without showing me"
Agent: tries to modify without reading
Result: Lost context, possible conflicts
```

### 4. Use Meaningful Roles

```
✅ GOOD:
{
  "role": "EXECUTABLE",
  "purpose": "Main request handler",
  "usedBy": "API router",
  "failureModes": "500 error if validation fails"
}

❌ BAD:
{
  "role": "EXECUTABLE"
  // No other context
}
```

### 5. Keep Code Production-Ready

```
✅ GOOD:
function validate(input) {
  if (!input) throw new Error('Input required');
  return input.trim().length > 0;
}

❌ BAD (Will be rejected):
function validate(input) {
  // TODO: add validation
  return true; // placeholder
}
```

### 6. Use Patches for Large Files

```
✅ GOOD (for small changes to large files):
{
  "path": "src/config.js",
  "patch": "--- a/...\n+++ b/...\n@@ changes only @@"
}

❌ BAD (for small changes to large files):
{
  "path": "src/config.js",
  "content": "entire 500-line file"
}
```

### 7. Keep Atomic Commits

```
✅ GOOD:
Write 1: src/auth/middleware.js
Write 2: src/auth/utils.js
Write 3: src/auth/index.js
(Each file is one logical unit)

❌ BAD:
Write 1: src/auth/middleware.js + src/helpers.js + src/config.js
(Too many unrelated changes)
```

### 8. Verify with Audit Log

```
✅ GOOD:
After writing, call read_audit_log to confirm

User: "Create src/handler.js"
Agent: calls write_file
User: "Show audit log"
Agent: calls read_audit_log
Verified: Entry shows exact write

❌ BAD:
Just assume write succeeded without verification
```

### 9. Use Relative Paths from Repo Root

```
✅ GOOD:
"path": "src/handler.js"
"path": "docs/README.md"
"path": "config.json"

❌ BAD:
"path": "/home/user/project/src/handler.js"
"path": "../../src/handler.js"
"path": "./src/handler.js"
```

### 10. Plan Your Changes First

```
✅ GOOD:
User: "I need to refactor the auth system. Let me understand the current structure first."
Agent: calls read_file (multiple files)
Agent: understands the system
Agent: plans the refactoring
Agent: calls write_file (multiple coordinated writes)

❌ BAD:
User: "Just refactor the auth system"
Agent: calls write_file randomly
Result: Inconsistent changes, broken functionality
```

---

## Summary

### Quick Reference

| Task | Tools to Use | Required |
|------|--------------|----------|
| Setup | bootstrap_create_foundation_plan | Once |
| Check Requirements | read_prompt | Before writes |
| Find Plan | list_plans | Before writes |
| Examine Code | read_file | Before modifying |
| Write Code | write_file | Main operation |
| Verify Changes | read_audit_log | After important writes |

### Tool Dependency Chain

```
START HERE
    ↓
read_prompt (unlock writing)
    ↓
list_plans (get plan name)
    ↓
read_file (understand current code)
    ↓
write_file (make changes)
    ↓
read_audit_log (verify success)
```

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| PROMPT_GATE_LOCKED | Haven't read prompt | Call read_prompt first |
| PLAN_NOT_FOUND | Wrong plan name | Call list_plans to find it |
| HARD_BLOCK_VIOLATION | Code has TODOs/stubs | Write complete code |
| INVALID_PATH | Path traversal attempted | Use paths from repo root |
| FILE_NOT_FOUND | File doesn't exist | Check path, read dir structure |

---

## Getting Help

### When Things Go Wrong

1. **Read the error message carefully** - it tells you what's wrong
2. **Check the validation gates** - most issues are at validation
3. **Use read_file to examine** - understand before modifying
4. **Use read_audit_log to verify** - confirm what succeeded
5. **Retry with corrections** - the system is deterministic

### Documentation

- **HARDENING_SUMMARY.md** - System overview
- **ZERO_SETUP_GUARANTEE.md** - How zero-setup works
- **FINAL_VERIFICATION_REPORT.md** - Technical details

---

## What's Next?

Once you complete this guide:

1. ✅ You can bootstrap a fresh repository
2. ✅ You can read and list plans
3. ✅ You can create and modify files
4. ✅ You can verify all changes in audit log
5. ✅ You understand all validation gates
6. ✅ You can troubleshoot common issues

**Ready to start?**

```bash
# 1. Clone the repo
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
cd KAIZA-MCP-server

# 2. Install
npm install

# 3. Set environment variable
export KAIZA_BOOTSTRAP_SECRET="your-secret-here"

# 4. Start server
node server.js

# 5. In another terminal, use with your IDE/agent
# (Configure your client to use the MCP server)
```

**You're ready to go! 🚀**

