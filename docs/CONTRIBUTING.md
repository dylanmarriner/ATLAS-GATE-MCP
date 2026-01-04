# Contributing to Kaiza MCP

## The Prime Directive

**We do not ship broken code.**

This repository follows a "Shift-Left" quality philosophy taken to its logical extreme. We do not rely on pull request reviews to catch `TODO` comments or incomplete logic; we rely on **Compiler-Level Enforcement** (via the MCP Middleware) to prevent them from ever being written to disk.

## Code Quality Bar

To contribute to this project (or to use this server in your own project), your code must meet the following criteria **at the moment of creation**:

1. **Complete**: No `TODO`, `FIXME`, or `XXX`.
2. **Concrete**: No `stub`, `mock`, `fake`, or `placeholder` implementations.
3. **Real**: No hardcoded test data where logic should be.
4. **Handling**: No swallowing errors or returning `null` as a default.

### Why so strict?

In AI-assisted development, it is trivial to generate 80% of a solution. The last 20%—the edge cases, the error handling, the actual integration—is where the risk lies. By strictly banning the "80% solution" artifacts, we force the resolution of the hard problems immediately.

## Development Workflow

1. **Plan**: Create a markdown file in `docs/plans/` describing your change.
2. **Implement**: Write the code. If the server rejects it, read the error message. It is telling you exactly what is unfinished.
3. **Verify**: Ensure your code runs.
4. **Commit**: Your plan and your implementation should be committed together.

## Contributing to the MCP Server Codebase

If you are modifying the `kaiza-mcp` server itself (e.g., editing `server.js` or `core/`):

1. **Respect the Invariants**: Do not remove the `stub-detector.js` logic.
2. **Maintain Determinism**: Do not add stateful logic that persists across sessions (except for the audit log).
3. **Test Security**: Any change to `tools/` must be tested against path traversal and authorized scope.

## Rejection Criteria

Your Pull Request (or AI generation attempt) will be automatically rejected if:

- It attempts to weaken the `ENTERPRISE_CODE_VIOLATION` rules.
- It introduces "soft" warnings instead of "hard" errors.
- It bypasses the `audit-log.jsonl`.

**Quality is not an option. It is a constraint.**
