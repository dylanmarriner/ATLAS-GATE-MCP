# AGENTS.md: KAIZA MCP Server

## Build, Lint, Test

- **Install**: `npm install`
- **Run tests**: `npm test` (runs `test-ast-policy.js`)
- **Run single test**: `node <test-file>.js` (e.g., `node test-bootstrap.js`)
- **Full verification**: `npm run verify` (all test-*.js files + security checks)

## Architecture

**Type**: Model Context Protocol (MCP) server written in Node.js  
**Entry Points**: 
- `bin/kaiza-mcp-antigravity.js` - Planning role (read-only analysis, plan creation)
- `bin/kaiza-mcp-windsurf.js` - Execution role (file mutations, plan enforcement)
- Both call `server.js`'s `startServer(role)` function

**Core Components**:
- `tools/` - MCP tool handlers (begin_session, write_file, read_file, list_plans, bootstrap_create_foundation_plan, read_audit_log, read_prompt)
- `core/` - Infrastructure modules: path-resolver, plan-enforcer, policy-engine, invariant, governance, audit-log, stub-detector
- `session.js` - Session state management (SESSION_STATE, SESSION_ID)
- `docs/plans/` - Plan storage (hash-addressed .md files with KAIZA_PLAN_HASH header)
- `audit-log.jsonl` - Append-only operation history
- `governance.json` - Bootstrap state

**Tool Distribution**:
- **ANTIGRAVITY**: begin_session, list_plans, read_file, read_audit_log, read_prompt, bootstrap_create_foundation_plan
- **WINDSURF**: begin_session, list_plans, read_file, read_audit_log, read_prompt, write_file

## Code Style & Conventions

**Language**: ES modules (Node.js 18+), CommonJS imports via `import`  
**Types**: JSDoc comments for function signatures; uses Zod for runtime schema validation  
**Naming**: camelCase functions, UPPERCASE_CONSTANTS, descriptive variable names with context  
**Errors**: Classified errors with codes (e.g., `INVALID_INPUT_TYPE`, `PLAN_NOT_APPROVED`); invariant violations throw `InvariantViolationError` and fail fast, unrecoverably  
**Comments**: Role/Purpose/Authority headers for modules; inline explanations for policy enforcement gates  
**Imports**: Standard library first, then @modelcontextprotocol/sdk, then local core/ and tools/  
**Patterns**: Invariants validated via `invariant(condition, CODE, "message")`; all paths resolved through `path-resolver.js`; no discovery outside canonical locations
