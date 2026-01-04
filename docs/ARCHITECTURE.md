# System Architecture

## Overview

The Kaiza MCP Server acts as a deterministic state machine that transitions the filesystem from `State A` to `State B` only when a strictly valid transition request is received. The architecture prioritizes **safety over availability** and **correctness over flexibility**.

## System Lifecycle

### 1. Boot Sequence

- **Entry Point**: `server.js`
- **Session Initialization**: A cryptographic UUID is generated for the `SESSION_ID`. This identifier binds all audit logs to the current execution context.
- **Transport Binding**: The server attaches to `StdioServerTransport`, listening for JSON-RPC 2.0 messages over standard input.
- **Tool Registration**: Handlers for `write_file`, `read_file`, `list_plans`, and `read_audit_log` are registered with Zod schemas.

### 2. Request Processing Pipeline

Every incoming tool request traverses a strict middleware pipeline before reaching the business logic.

#### A. Input Normalization Layer

*Objective: Eliminate ambiguity in LLM calls.*
Located in `server.js`, this layer intercepts `validateToolInput`:

1. **Type Detection**: Checks if the request arguments are a raw string or a structured object.
2. **Transformation**:
    - If `string`: Attempts JSON parsing. If parsing fails, it wraps the string (e.g., `{ path: <string> }` for read operations).
    - If `object`: Validates structure.
3. **Sanitization**: Input is passed to the Zod schema validator only after normalization.

#### B. Execution Gates (The `write_file` Pipeline)

A write operation must pass **five distinct gates** to succeed. Failure at any gate results in an immediate atomic abort.

1. **Schema Validation**: Zod ensures presence of `path`, `content`, and `plan` ID.
2. **Plan Authority Check**:
    - The server resolves the `plan` ID against the `docs/plans/` directory.
    - The plan must exist and be in a valid directory structure.
    - *Note: In strict computation, the plan is the capability token.*
3. **Role Metadata Validation**:
    - Checks `role`, `purpose`, and verification fields if provided.
    - Ensures alignment with the plan's architectural intent.
4. **Enterprise Quality Guard (`stub-detector.js`)**:
    - **Static Analysis**: Scans the `content` payload.
    - **Pattern Matching**: Rejects regex matches for `TODO`, `return null`, `mock`, etc.
    - **Outcome**: A "Hard Block" exception is thrown if violations are found.
5. **Filesystem & Audit Commit**:
    - The file is written to disk.
    - An entry is immediately appended to `audit-log.jsonl` containing the file path, plan ID, session ID, and timestamp.

## Subsystems

### Plan Authority System

- **Discovery**: Plans are discovered in `docs/plans/`, `docs/planning/`, and `docs/antigravity/`.
- **Constraint**: The server treats these files as the source of truth for authorization. A write request referencing a non-existent plan is invalid by definition.

### Stub Detection Engine

- **Philosophy**: "Better to fail than to ship incomplete code."
- **Mechanism**: A synchronous scan of the full content buffer.
- **Scope**: Includes comments, variable names, and return values.
- **Bypass**: There is no bypass mechanism. This is a deliberate architectural constraint.

## Failure Semantics

- **Fail-Secure**: All errors result in a "no-op" on the filesystem.
- **Explicit Reporting**: Errors return structured, human-readable descriptions (e.g., listing the exact lines causing a stub violation).
- **Atomic Operations**: A write execution is atomic; the audit log is updated only if the write succeeds.

## Determinism & State

- **Stateless Execution**: The server does not maintain an internal memory of the file tree between requests.
- **Stateful Audit**: The `audit-log.jsonl` is the only persistent state managed by the server itself (outside the repo content).
- **Idempotency**: Repeated writes of the same content are permitted but will produce duplicate audit entries.
