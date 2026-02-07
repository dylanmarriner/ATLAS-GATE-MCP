# AGENTS.md: ATLAS-GATE MCP Server

## Build, Lint, Test

- **Install**: `npm install`
- **Run tests**: `npm test` (runs `test-ast-policy.js`)
- **Run single test**: `node <test-file>.js` (e.g., `node test-bootstrap.js`)
- **Full verification**: `npm run verify` (all test-*.js files + security checks)
- **Rust policy tests**: `node test-rust-policy.js` (tests static enforcement gates)

## Architecture

**Type**: Model Context Protocol (MCP) server written in Node.js  
**Entry Points**: 
- `bin/atlas-gate-mcp-antigravity.js` - Planning role (read-only analysis, plan creation)
- `bin/atlas-gate-mcp-windsurf.js` - Execution role (file mutations, plan enforcement)
- Both call `server.js`'s `startServer(role)` function

**Core Components**:
- `tools/` - MCP tool handlers (begin_session, write_file, read_file, list_plans, bootstrap_create_foundation_plan, read_audit_log, read_prompt)
- `core/` - Infrastructure modules: path-resolver, plan-enforcer, policy-engine, invariant, governance, audit-log, stub-detector
- `session.js` - Session state management (SESSION_STATE, SESSION_ID)
- `docs/plans/` - Plan storage (hash-addressed .md files with ATLAS-GATE_PLAN_HASH header)
- `audit-log.jsonl` - Append-only operation history
- `governance.json` - Bootstrap state

**Tool Distribution**:
- **ANTIGRAVITY**: begin_session, list_plans, read_file, read_audit_log, read_prompt, bootstrap_create_foundation_plan
- **WINDSURF**: begin_session, list_plans, read_file, read_audit_log, read_prompt, write_file

## Rust Enforcement Gates (Mandatory for Rust Projects)

**Pre-Write Static Gate** (GATE 3.5 in write_file):
- Detects forbidden patterns: unwrap(), panic!(), unsafe {}, static mut, etc.
- Validates error handling: Result<T, SystemError> pattern required
- Patterns can be allowed via plan with justification
- Location: `core/rust-policy-engine.js`

**Post-Write Verification Gates** (in preflight):
- `cargo fmt --check` - Code style compliance
- `cargo clippy -- -D warnings` - Lint compliance
- `cargo build` - Compilation verification
- Verify `#![deny(...)]` attributes in lib.rs/main.rs
- Fail fast: any gate failure reverts changes and rejects write
- Location: `core/preflight.js` + `core/rust-policy-engine.js`

**Test**: `node test-rust-policy.js` (16 comprehensive tests)
**Documentation**: `RUST_ENFORCEMENT_GATES.md`

## Code Style & Conventions

**Language**: ES modules (Node.js 18+), CommonJS imports via `import`  
**Types**: JSDoc comments for function signatures; uses Zod for runtime schema validation  
**Naming**: camelCase functions, UPPERCASE_CONSTANTS, descriptive variable names with context  
**Errors**: Classified errors with codes (e.g., `INVALID_INPUT_TYPE`, `PLAN_NOT_APPROVED`); invariant violations throw `InvariantViolationError` and fail fast, unrecoverably  
**Comments**: Role/Purpose/Authority headers for modules; inline explanations for policy enforcement gates  
**Imports**: Standard library first, then @modelcontextprotocol/sdk, then local core/ and tools/  
**Patterns**: Invariants validated via `invariant(condition, CODE, "message")`; all paths resolved through `path-resolver.js`; no discovery outside canonical locations
