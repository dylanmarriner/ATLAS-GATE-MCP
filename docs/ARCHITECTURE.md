# System Architecture

## Overview

The ATLAS-GATE-MCP Server acts as a deterministic state machine that transitions the filesystem from `State A` to `State B` only when a strictly valid transition request is received and authenticated via an explicit `.intent.md` artifact. The architecture prioritizes **safety over availability** and **correctness over flexibility**.

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

1. **Schema Validation**: Zod ensures the strict presence of `path`, `content`, and an explicit `plan` string ID.
2. **Cryptographic Plan Authority (`plan-enforcer.js`)**:
    - The server extracts the provided Cosign signature (`signature`) and matches it against `bundleJSON` or the raw ECDSA fallback.
    - If the signature verification against the pre-provisioned `public.pem` key fails, the request is violently aborted.
    - This proves the agent is acting on a pre-authorized plan.
3. **Intent Artifact Validation (`intent-validator.js`)**:
    - Before a file like `index.js` is modified, the agent must have separately created `index.js.intent.md`.
    - The MCP ensures this intent document exists, matches the 9-section Level-5 schema, is linked to the current plan, and its SHA256 mapping corresponds to the active writing context.
4. **Enterprise Quality Guard (`stub-detector.js`)**:
    - **Static Analysis**: Scans the `content` payload for AST deficiencies.
    - **Pattern Matching**: Rejects regex matches for `TODO`, `return {}`, `mock`, etc.
    - **Outcome**: A "Hard Block" exception is thrown if violations are found, ensuring technical debt cannot be checked in.
5. **Filesystem & Audit Commit (`audit-system.js`)**:
    - The file is written to disk.
    - An immutable entry is appended to `audit-log.jsonl` mapping the session ID, target file, intent validation state, and execution timestamp.

## Subsystems

### Plan Authority System

- **Discovery**: Plans are located in `docs/plans/`.
- **Constraint**: The server treats these files, paired with their respective Cosign Signatures, as the ultimate, irrevocable source of truth for authorization. A write request with an invalid signature is equivalent to cyber-trespass.

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
