# Usage Guide

## The Mental Model

Do not think of Kaiza MCP as a "File Editor". Think of it as a **"Contractor"** that requires a work order (Implementation Plan) before it will lift a hammer.

**The Workflow:**

1. **Plan**: You (or the agent) create a plan in `docs/plans/`.
2. **Approve**: The plan exists (which counts as approval in this version).
3. **Execute**: The agent calls `write_file` citing that plan.
4. **Verify**: The server enforces quality and logs the work.

## Installation & Startup

### Prerequisites

- Node.js 18+
- NPM / PNPM

### Running the Server

The server is designed to run as a subprocess of an MCP Client (e.g., Claude Desktop, IDE Extensions).

**Command:**

```bash
node server.js
```

**Stdio Communication:**
The server listens on `stdin` and writes to `stdout`. You will not see a UI.
*Startup Log (stderr)*: `[MCP] kaiza-mcp running | session=<uuid>`

## Tool Usage

### 1. Writing Code (`write_file`)

**Correct Pattern:**

```json
{
  "tool": "write_file",
  "arguments": {
    "path": "src/utils/math.js",
    "content": "export function add(a, b) { return a + b; }",
    "plan": "payment-system-refactor", 
    "role": "EXECUTABLE"
  }
}
```

*Note: The `plan` argument MUST match an ID found explicitly in `docs/plans/`.*

### 2. Reading Context (`read_file`)

**Correct Pattern:**

```json
{
  "tool": "read_file",
  "arguments": {
    "path": "docs/plans/payment-system-refactor.md"
  }
}
```

### 3. Listing Authority (`list_plans`)

Use this to find what work orders are currently open.

```json
{
  "tool": "list_plans",
  "arguments": {
    "path": "docs/plans" 
  }
}
```

## Common Failure Modes

### Error: `ENTERPRISE_CODE_VIOLATION`

**Symptom**: The tool returns a massive error message listing "HARD BLOCK" violations.
**Cause**: The content you tried to write contained `TODO`, `FIXME`, incomplete code, or mock data.
**Solution**: **Finish the code.** Do not leave placeholders. If you cannot implement it fully, do not write the file yet.

### Error: `INVALID_INPUT_FORMAT`

**Symptom**: "requires object input, got unparseable string".
**Cause**: The client sent a malformed request.
**Solution**: Ensure your MCP client is sending structured JSON arguments. (Note: The server auto-corrects many string inputs, so this error implies a truly mangled request).

### Error: `Plan not found`

**Symptom**: The write is rejected because the plan ID is invalid.
**Cause**: You cited a plan ID that does not exist in the `docs/plans` directory.
**Solution**: Use `list_plans` to see available plans.

## What NOT To Do

1. **Do NOT ask the server to "scaffold" a file.**
    - *Why?* Scaffolding usually implies empty functions or TODOs. The server will reject it.
2. **Do NOT ask to "fix this later."**
    - *Why?* The server enforces "fix it now."
3. **Do NOT try to bypass the audit log.**
    - *Why?* It is impossible. All writes go through the logging layer.
