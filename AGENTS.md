# AGENTS.md – Coding Guide for AI Agents

## CRITICAL: Sandbox & Enforcement Enforcement

**Windsurf and Antigravity MUST run in sandboxed mode:**
- Cannot access filesystem directly (only via `read_file` / `write_file` MCP tools)
- Cannot execute shell commands
- Cannot import dangerous modules
- Cannot access environment variables
- **Enforced at process startup** via `core/mcp-sandbox.js`

See `MCP_SANDBOX_ENFORCEMENT.md` and `TOOL_ENFORCEMENT.md` for details.

## Build, Test & Verification

```bash
npm test                  # Run primary test suite (test-ast-policy.js)
npm run verify            # Full verification: all tests + security audit + docs validation
node tests/system/test-TESTNAME.js  # Run single test (e.g., test-bootstrap.js)
npm run docs:build        # Build and validate documentation
node bin/ATLAS-GATE-MCP-windsurf.js  # Start Windsurf in sandbox (MCP-only)
node bin/ATLAS-GATE-MCP-antigravity.js  # Start Antigravity in sandbox (MCP-only)
```

## Architecture & Structure

**Core modules** (`core/`): Governance engines, audit trails, role validation, policy enforcement, plan registry, remediation, attestation  
**Tools** (`tools/`): MCP handlers for file I/O, audit logs, planning, linting, verification  
**Tests** (`tests/system/`): Integration and system tests organized by feature  
**Entrypoints** (`bin/`): CLI binaries for different roles (Windsurf, Antigravity)

Key databases/systems: In-memory session state (`session.js`), persistent audit log (`audit-log.jsonl`), plan registry, proposal store

## Code Style & Conventions

- **Imports**: ES modules (`import`/`export`), not CommonJS
- **Async**: Use `async`/`await`, never `.then()`
- **Variables**: `const`/`let` (never `var`), `camelCase` for functions/vars, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- **Indentation**: 2 spaces
- **Comments**: Explain WHY, not WHAT; wrap error context like `"[CONTEXT] detail"`
- **Error Handling**: Always catch and throw `SystemError` or `KaizaError` with context; never swallow errors
- **Files**: Descriptive names; avoid abbreviations; use hyphens for multi-word files
- **Naming**: Avoid `x`, `temp`, `data`; use `err` not `error` in catch blocks
- **No Stubs**: Code must be complete—forbidden: empty functions, TODO, FIXME, placeholder returns, swallowed exceptions (AST policy enforced at runtime)
