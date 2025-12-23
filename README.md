# Kaiza MCP Server

A robust, enterprise-grade Model Context Protocol (MCP) server designed for secure, audited file operations. This server acts as a bridge between LLMs and your filesystem, enforcing strict validation plans and maintaining an immutable audit log of all changes.

## Features

- **Secure File Writing**: All `write_file` operations must be linked to an approved "Implementation Plan" ID.
- **Scope Enforcement**: Writes are restricted to file paths explicitly allowed by the plan's scope.
- **Audit Logging**: Every successful write operation is cryptographically hashed and chained in `audit-log.jsonl`, ensuring a tamper-evident history.
- **Stub Detection**: Automatically rejects code containing placeholder patterns (e.g., `TODO`, `FIXME`, empty returns) to ensure production readiness.
- **Read-Only Access**: Provides safe `read_file` access to repository contents.

## Installation

```bash
npm install
```

## Running the Server

The server communicates via `stdio`. It is intended to be run by an MCP client (such as Claude Desktop or an IDE extension).

```bash
node server.js
```

## Tools

### `write_file`

Writes content to a file.

- **path**: Relative path to the file.
- **content**: The string content to write.
- **plan**: The ID of the approved Implementation Plan authorizing this change.

### `read_file`

Reads the contents of a file.

- **path**: Relative path to the file.

### `list_plans`

Lists all currently approved implementation plans (found in `docs/plans/*.md`).

### `read_audit_log`

Reads the current session's audit log entries.

## Architecture

- **Core Logic**:
  - `core/plan-enforcer.js`: Validates operations against `docs/plans`.
  - `core/audit-log.js`: Manages the append-only hash chain.
  - `core/stub-detector.js`: Scans content for non-production patterns.
- **Transport**: Standard Input/Output (`stdio`) using `@modelcontextprotocol/sdk`.

## Development

1. **Configure Plans**: Create markdown files in `docs/plans/` with `ID:`, `STATUS: APPROVED`, and `SCOPE:` headers.
2. **Start Server**: Run `node server.js` to see the session ID startup message.
