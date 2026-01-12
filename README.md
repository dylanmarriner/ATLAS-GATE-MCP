# Kaiza MCP Server

> **Enterprise Enforcement Gateway for LLM-Driven Development**

The Kaiza MCP Server is a high-assurance Model Context Protocol (MCP) implementation designed to act as a secure, non-negotiable bridge between Large Language Model (LLM) agents and filesystem operations. It forces all autonomous code generation to adhere to strict provenance, authorization, and quality standards.

Unlike standard MCP servers that provide passive tool access, Kaiza functions as an active **Enforcement Authority**. It does not merely execute commands; it validates the *intent*, *authorization*, and *quality* of every operation before execution.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A governed repository (any repo with a `.kaiza/` directory)
- MCP-compatible client (Claude Desktop, Windsurf, etc.)

### Installation

**Option 1: Global Installation (Recommended)**

```bash
# Clone and install globally
git clone <repository-url> kaiza-mcp
cd kaiza-mcp
npm install
npm install -g .
```

**Option 2: Local Installation**

```bash
git clone <repository-url> kaiza-mcp
cd kaiza-mcp
npm install
```

### configuration

Add to your MCP client configuration (e.g., Claude Desktop):

**For Global Install:**
```json
{
  "mcpServers": {
    "kaiza-mcp": {
      "command": "kaiza-mcp",
      "args": [],
      "cwd": "/path/to/your/governed/repository"
    }
  }
}
```

**For Local Install:**
```json
{
  "mcpServers": {
    "kaiza-mcp": {
      "command": "node",
      "args": ["/path/to/kaiza-mcp/bin/kaiza-mcp.js"],
      "cwd": "/path/to/your/governed/repository"
    }
  }
}
```

## 🌍 Global Portability & Context Detection

Kaiza MCP is designed to be **portability-native**. It can be installed once and used anywhere.

### Automatic Context Detection
When you run `kaiza-mcp` (or invoke it via an MCP client), it automatically detects the "Repository Root" based on your current working directory (CWD).

It looks for:
1. `.kaiza/ROOT` marker (Explicit)
2. `.git/` directory (Implicit)
3. `docs/plans/` directory (Legacy)

If none are found, it treats the current directory as the root. This means you can use Kaiza in any folder, even an empty one, and it will function correctly (creating necessary `.kaiza` structures on demand).

### Logic & Validation
The server uses a **Canonical Path Resolver** to ensure all file operations are relative to the detected root, regardless of where the server binary is located.

To verify portability on your machine:
```bash
./tests/verify-portability.sh
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "kaiza-mcp": {
      "command": "node",
      "args": ["/path/to/KAIZA-MCP-server/server.js"],
      "cwd": "/path/to/your/governed/repository"
    }
  }
}
```

## 🎯 Core Mandate

The system exists to solve the "Agent Alignment & Safety" problem in automated coding workflows. It ensures:

1. **No Unauthorized Writes**: Every modification must be cryptographically linked to an approved "Implementation Plan".
2. **No Silent Corruption**: All writes are hashed and appended to an immutable audit log.
3. **No Placeholder Code**: A hard-blocking static analysis layer rejects any code containing stubs, mocks, TODOs, or non-production patterns.
4. **Global Plan Discovery**: It acts as a universal reader for documentation and planning artifacts across repositories.

## 🏗️ Architecture

The server operates as a standard stdio-based MCP process but injects a rigid middleware layer into the execution pipeline:

```mermaid
graph TD
    User[LLM Agent] -->|Request| Server[Kaiza MCP Server]
    Server -->|1. Normalize| Norm[Input Normalization]
    Norm -->|2. Validate Plan| Policy[Policy Engine]
    Policy -->|3. Check Scope| Scope[Scope Guard]
    Scope -->|4. Scan Quality| Static[Enterprise Stub Detector]
    Static -->|PASS| FS[Filesystem Write]
    Static -->|FAIL| Reject[Hard Block / Error]
    FS -->|Success| Audit[Audit Log (Hash Chain)]
```

## 🛠️ Available Tools

### 1. `read_prompt` - Canonical Prompt Access

**Purpose**: Required gateway before any write operations. Fetches the canonical prompt that unlocks write capabilities.

**When to Use**: **Must be called first** before any `write_file` operation in a session.

**Parameters**:
- `name` (string): The prompt name to retrieve. Must be `"ANTIGRAVITY_CANONICAL"` or `"WINDSURF_CANONICAL"`

**Example Usage**:
```javascript
// Call this FIRST before any writes
await mcp.call("read_prompt", {
  "name": "ANTIGRAVITY_CANONICAL"
});

// Response:
{
  "content": [
    {
      "type": "text", 
      "text": "# KAIZA MCP CANONICAL PROMPT\nThis is the authoritative prompt.\nYou must respect the plan.\n"
    }
  ]
}
```

**Error Cases**:
```javascript
// Invalid prompt name
await mcp.call("read_prompt", {
  "name": "INVALID_PROMPT"
});
// Error: UNKNOWN_PROMPT: INVALID_PROMPT
```

---

### 2. `list_plans` - Governance Discovery

**Purpose**: Enumerates currently active and approved implementation plans, allowing agents to understand their authorized scope.

**When to Use**: Before starting any work to understand available plans and authorization scope.

**Parameters**:
- `path` (string): Repository path (used for resolution, can be any valid path in the repo)

**Example Usage**:
```javascript
await mcp.call("list_plans", {
  "path": "/workspace"
});

// Response:
{
  "repoRoot": "/media/ubuntux/DEVELOPMENT/KAIZA-MCP-server",
  "plansDir": "/media/ubuntux/DEVELOPMENT/KAIZA-MCP-server/.kaiza/plans",
  "count": 2,
  "plans": [
    "implement-user-authentication",
    "add-payment-processing"
  ]
}
```

**Plan File Format**:
Plans are Markdown files in `.kaiza/plans/` with YAML frontmatter:

```markdown
---
status: APPROVED
title: "Implement User Authentication"
description: "Add JWT-based authentication system"
author: "AMP"
created: "2024-01-15"
---

## Implementation Details
- Add JWT token handling
- Implement user login/logout endpoints
- Add middleware for protected routes
```

---

### 3. `read_file` - Safe File Access

**Purpose**: Provides read-only access to the filesystem with automatic discovery permissions for documentation paths.

**When to Use**: Reading existing code, documentation, or plan files to understand context.

**Parameters**:
- `path` (string): File path to read

**Special Discovery Paths** (automatically allowed):
- `/docs/**`
- `/docs/plans/**`
- `/docs/planning/**`
- `/docs/antigravity/**`

**Example Usage**:
```javascript
// Reading a plan file
await mcp.call("read_file", {
  "path": ".kaiza/plans/implement-user-authentication.md"
});

// Reading documentation
await mcp.call("read_file", {
  "path": "docs/api/authentication.md"
});

// Reading source code
await mcp.call("read_file", {
  "path": "src/auth/jwt-handler.js"
});

// Response:
{
  "content": [
    {
      "type": "text",
      "text": "// JWT authentication implementation\nexport class JWTHandler { ... }"
    }
  ]
}
```

**Error Cases**:
```javascript
// Path traversal attempt
await mcp.call("read_file", {
  "path": "../../../etc/passwd"
});
// Error: INVALID_PATH: path traversal not permitted

// Non-existent file
await mcp.call("read_file", {
  "path": "non-existent-file.js"
});
// Error: FILE_NOT_FOUND: non-existent-file.js
```

---

### 4. `write_file` - Enforced File Operations

**Purpose**: Authoritative audited file write with comprehensive validation and audit logging.

**When to Use**: Creating or modifying any file in the repository after proper authorization.

**Critical Prerequisites**:
1. Must call `read_prompt` first in the session
2. Must have an approved plan from `list_plans`
3. Content must pass enterprise quality checks

**Parameters**:
- `path` (string): Target file path
- `content` (string, optional): Full file content
- `patch` (string, optional): Unified diff patch (alternative to content)
- `plan` (string): Plan name or path (required)
- `planId` (string, optional): Plan ID for strict enforcement
- `planHash` (string, optional): Plan hash for integrity verification
- `role` (enum, optional): File role - "EXECUTABLE", "BOUNDARY", "INFRASTRUCTURE", "VERIFICATION"
- `purpose` (string, optional): File purpose description
- `usedBy` (string, optional): Component that uses this file
- `connectedVia` (string, optional): Connection method
- `registeredIn` (string, optional): Registration context
- `executedVia` (string, optional): Execution method
- `failureModes` (string, optional): Potential failure scenarios
- `authority` (string, optional): Authorizing entity
- `previousHash` (string, optional): Previous file hash for concurrency check

**Example Usage**:
```javascript
// First: Get canonical prompt
await mcp.call("read_prompt", {
  "name": "ANTIGRAVITY_CANONICAL"
});

// Then: Write a new file
await mcp.call("write_file", {
  "path": "src/auth/jwt-handler.js",
  "content": `import jwt from 'jsonwebtoken';

export class JWTHandler {
  constructor(secret) {
    this.secret = secret;
  }
  
  generateToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: '24h' });
  }
  
  verifyToken(token) {
    return jwt.verify(token, this.secret);
  }
}`,
  "plan": "implement-user-authentication",
  "role": "EXECUTABLE",
  "purpose": "JWT token generation and verification",
  "authority": "AMP"
});

// Response: Success (file written and audited)
```

**Patch Example**:
```javascript
// Using patch instead of full content
await mcp.call("write_file", {
  "path": "src/auth/jwt-handler.js",
  "patch": `--- a/src/auth/jwt-handler.js
+++ b/src/auth/jwt-handler.js
@@ -10,6 +10,10 @@
   verifyToken(token) {
     return jwt.verify(token, this.secret);
   }
+
+  refreshToken(token) {
+    return jwt.sign(jwt.decode(token), this.secret, { expiresIn: '24h' });
+  }
 }`,
  "plan": "implement-user-authentication",
  "previousHash": "a1b2c3d4e5f6..."
});
```

**Error Cases**:
```javascript
// Forgot to read prompt first
await mcp.call("write_file", {
  "path": "test.js",
  "content": "console.log('test');",
  "plan": "some-plan"
});
// Error: PROMPT_GATE_LOCKED: You must call read_prompt('ANTIGRAVITY_CANONICAL') before any write operations.

// Enterprise code violations
await mcp.call("write_file", {
  "path": "test.js",
  "content": "// TODO: Implement this\nfunction stub() {\n  return null;\n}",
  "plan": "some-plan"
});
// Error: ENTERPRISE_CODE_VIOLATION: Detected prohibited patterns: TODO, stub, return null

// Invalid plan
await mcp.call("write_file", {
  "path": "test.js", 
  "content": "console.log('test');",
  "plan": "non-existent-plan"
});
// Error: PLAN_NOT_FOUND: non-existent-plan
```

**Enterprise Quality Checks** (automatically enforced):
- ❌ `TODO`, `FIXME`, `XXX`, `HACK` comments
- ❌ `stub`, `temporary`, `placeholder`, `simplified` keywords
- ❌ `mockData`, `testData`, `fakeData`, `dummyData`
- ❌ `jest.mock`, `sinon.stub`, `nock`, `vi.mock` calls
- ❌ `faker.*` or `factory.*` calls
- ❌ `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- ❌ `return null`, `return undefined`
- ❌ Empty catch blocks
- ❌ Hardcoded test data or endpoints

---

### 5. `read_audit_log` - Accountability Inspection

**Purpose**: Allows inspection of the immutable operation history for the current session.

**When to Use**: Reviewing what changes have been made, debugging issues, or compliance auditing.

**Parameters**: None

**Example Usage**:
```javascript
await mcp.call("read_audit_log", {});

// Response:
{
  "count": 3,
  "entries": [
    "{\"timestamp\":\"2024-01-15T10:30:00.123Z\",\"sessionId\":\"abc-123\",\"operation\":\"write_file\",\"path\":\"src/auth/jwt-handler.js\",\"plan\":\"implement-user-authentication\",\"hash\":\"d4e5f6a7b8c9...\"}",
    "{\"timestamp\":\"2024-01-15T10:31:15.456Z\",\"sessionId\":\"abc-123\",\"operation\":\"write_file\",\"path\":\"src/auth/middleware.js\",\"plan\":\"implement-user-authentication\",\"hash\":\"e7f8g9h0i1j2...\"}",
    "{\"timestamp\":\"2024-01-15T10:32:30.789Z\",\"sessionId\":\"abc-123\",\"operation\":\"write_file\",\"path\":\"tests/auth.test.js\",\"plan\":\"implement-user-authentication\",\"hash\":\"f0g1h2i3j4k5...\"}"
  ]
}
```

**Audit Log Format**:
Each entry is a JSON line containing:
- `timestamp`: ISO 8601 timestamp
- `sessionId`: Unique session identifier
- `operation`: Tool name used
- `path`: Target file path
- `plan`: Authorizing plan
- `hash`: Cryptographic hash of content

---

### 6. `bootstrap_create_foundation_plan` - Initial Setup

**Purpose**: Create the first approved plan in a new repository (bootstrap mode only).

**When to Use**: Only during initial repository setup when no plans exist yet.

**Authorization**: Restricted to AMP and Antigravity only. Windsurf (executor) is explicitly blocked.

**Parameters**:
- `path` (string): Repository path
- `planContent` (string): Full plan content (Markdown with YAML frontmatter)
- `payload` (object): Bootstrap payload with repo identifier, timestamp, nonce, and action
- `signature` (string): HMAC-SHA256 signature of the payload

**Example Usage** (AMP/Antigravity only):
```javascript
await mcp.call("bootstrap_create_foundation_plan", {
  "path": "/workspace",
  "planContent": `---
status: APPROVED
title: "Foundation Setup"
description: "Initial repository foundation"
author: "AMP"
created: "2024-01-15"
---

## Foundation Plan
This plan establishes the basic repository structure and governance.
`,
  "payload": {
    "repoIdentifier": "repo-hash-123",
    "timestamp": 1705310400000,
    "nonce": "random-nonce-456", 
    "action": "BOOTSTRAP_CREATE_FOUNDATION_PLAN"
  },
  "signature": "hmac-signature-789"
});
```

**Error Cases**:
```javascript
// Windsurf attempting bootstrap
await mcp.call("bootstrap_create_foundation_plan", {
  // ... parameters
});
// Error: WINDSURF_CANNOT_CREATE_PLANS: You are an EXECUTOR, not a PLANNER.
```

## 🔄 Complete Workflow Example

Here's a complete example of a typical workflow:

```javascript
// Step 1: Discover available plans
const plans = await mcp.call("list_plans", {
  "path": "/workspace"
});
console.log("Available plans:", plans.plans);

// Step 2: Get canonical prompt (required before any writes)
await mcp.call("read_prompt", {
  "name": "ANTIGRAVITY_CANONICAL"
});

// Step 3: Read existing files to understand context
const existingCode = await mcp.call("read_file", {
  "path": "src/auth/index.js"
});

// Step 4: Write new files under plan authority
await mcp.call("write_file", {
  "path": "src/auth/jwt-handler.js",
  "content": jwtImplementation,
  "plan": "implement-user-authentication",
  "role": "EXECUTABLE",
  "purpose": "JWT token management"
});

// Step 5: Review audit log
const audit = await mcp.call("read_audit_log", {});
console.log("Operations performed:", audit.count);
```

## 🛡️ Enterprise Guarantees

### The "Hard Block" Policy

Kaiza is designed to be **intolerant** of low-quality code. The `StubDetector` component analyzes every write payload. If it detects any prohibited patterns, the operation is **rejected immediately** with an `ENTERPRISE_CODE_VIOLATION`. This is not a warning; it is a failure state.

### Immutable Audit Trail

Every successful modification is recorded in `audit-log.jsonl`. This log is an append-only ledger that survives server restarts, providing a forensic timeline of exactly what changed, when, and under which plan's authority.

### Plan-Based Governance

All write operations must be linked to an approved plan. Plans are:
- Stored in `.kaiza/plans/` as Markdown files
- Must have `status: APPROVED` in YAML frontmatter
- Provide scope and authority for operations
- Can be discovered via `list_plans` tool

## 🎯 Intended Audience

This server is built for:

- **Autonomous Agents**: That require a safety rail to prevent destructive or low-quality code generation.
- **Enterprise Environments**: Where "human-in-the-loop" review needs to be augmented by "machine-in-the-loop" policy enforcement.
- **High-Integrity Projects**: Where architectural drift and technical debt must be prevented at the commit level.

### ❌ NOT Intended For:

- Rapid prototyping where "broken code" is acceptable.
- Environments requiring unrestricted, arbitrary filesystem access.
- Users who wish to bypass planning and governance workflows.

## 🚨 Critical Stop Conditions

The server will refuse to operate if:

1. The requested plan ID does not exist or is not in an `APPROVED` state.
2. The target file path is outside the scope defined by the plan.
3. The input content fails the enterprise quality scan.
4. The canonical prompt has not been fetched before write operations.
5. Path traversal attacks are detected.
6. Unauthorized agents attempt to create plans.

## 🔧 Development & Testing

### Running Tests

```bash
# Run all tests
npm test

# Run verification suite
npm run verify

# Individual test components
node test-bootstrap.js
node test-enforcement.js
node test-preflight.js
node test-ast-policy.js
node test-plan-enforcement.js
```

### Security Verification

```bash
# Run comprehensive security checks
node verify_security.js

# Verify audit log integrity
node verify-audit-log.js
```

## 📁 Repository Structure

```
KAIZA-MCP-server/
├── server.js                 # Main MCP server entry point
├── package.json              # Dependencies and scripts
├── tools/                    # MCP tool implementations
│   ├── write_file.js        # Enforced file writing
│   ├── read_file.js         # Safe file reading
│   ├── list_plans.js        # Plan discovery
│   ├── read_audit_log.js    # Audit log inspection
│   ├── read_prompt.js       # Canonical prompt access
│   └── bootstrap_tool.js    # Initial plan creation
├── core/                     # Core enforcement components
│   ├── policy-engine.js     # Content validation
│   ├── plan-enforcer.js     # Plan authorization
│   ├── stub-detector.js     # Quality enforcement
│   ├── audit-log.js         # Immutable logging
│   └── path-resolver.js     # Canonical path handling
├── session.js               # Session state management
└── audit-log.jsonl          # Append-only audit trail
```

## 🤝 Contributing

This is a governance enforcement system. Contributions must:

1. Maintain strict backward compatibility
2. Preserve all security invariants
3. Pass comprehensive test suites
4. Follow enterprise code quality standards
5. Include proper audit trails for all changes

## 📄 License

ISC License - See LICENSE file for details.

## 🔗 Related Documentation

- [Complete Setup Guide](./COMPLETE_SETUP_GUIDE.md)
- [Engineering Standards](./ENGINEERING_STANDARDS.md)
- [Role Definitions](./ROLE_DEFINITIONS.md)
- [Global Invariants](./GLOBAL_INVARIANTS.md)
- [Quick Reference](./QUICK_REFERENCE.md)

---

**Remember**: Kaiza MCP Server is not just a tool - it's a governance framework that ensures every line of code written by autonomous agents meets enterprise standards and is properly authorized.
