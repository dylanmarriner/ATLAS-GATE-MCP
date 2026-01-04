# Kaiza MCP Server

> **Enterprise Enforcement Gateway for LLM-Driven Development**

The Kaiza MCP Server is a high-assurance Model Context Protocol (MCP) implementation designed to act as a secure, non-negotiable bridge between Large Language Model (LLM) agents and filesystem operations. It forces all autonomous code generation to adhere to strict strict provenance, authorization, and quality standards.

Unlike standard MCP servers that provide passive tool access, Kaiza functions as an active **Enforcement Authority**. It does not merely execute commands; it validates the *intent*, *authorization*, and *quality* of every operation before execution.

## Core Mandate

The system exists to solve the "Agent Alignment & Safety" problem in automated coding workflows. It ensures:

1. **No Unauthorized Writes**: Every modification must be cryptographically linked to an approved "Implementation Plan".
2. **No Silent Corruption**: All writes are hashed and appended to an immutable audit log.
3. **No Placeholder Code**: A hard-blocking static analysis layer rejects any code containing stubs, mocks, TODOs, or non-production patterns.
4. **Global Plan Discovery**: It acts as a universal reader for documentation and planning artifacts across repositories.

## High-Level Architecture

The server operates as a standard stdio-based MCP process but injects a rigid strict middleware layer into the execution pipeline:

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

## Tooling Model

The server exposes a minimal, high-leverage toolset. Each tool is designed to be deterministic and secure.

### 1. `write_file` (Enforced)

Writes content to the filesystem.

- **Enforcement**: Requires a valid `plan` ID.
- **Validation**: Content is scanned for strict prohibition of `TODO`, `FIXME`, stubs, and mocks.
- **Audit**: Operation is logged with a cryptographic hash of the content.

### 2. `read_file` (Safe)

Provides read-only access to the filesystem.

- **Discovery**: Automatically permits reading from `/docs/**` and `/docs/plans/**` in any governed repository to facilitate context gathering.
- **Safety**: Path traversal protections are strictly enforced.

### 3. `list_plans` (Governance)

enumerates currently active and approved implementation plans, allowing agents to understand their authorized scope.

### 4. `read_audit_log` (Accountability)

Allows inspection of the immutable operation history for the current session.

## Enterprise Guarantees

### The "Hard Block" Policy

Kaiza is designed to be **intolerant** of low-quality code. The `StubDetector` component analyzes every write payload. If it detects:

- `TODO` or `FIXME` comments
- `mock`, `stub`, or `placeholder` variable names
- Empty function bodies or no-op returns (e.g., `return null` where logic is expected)
- Hardcoded test data

The operation is **rejected immediately** with an `ENTERPRISE_CODE_VIOLATION`. This is not a warning; it is a failure state.

### Immutable Audit Trail

Every successful modification is recorded in `audit-log.jsonl`. This log is an append-only ledger that survives server restarts, providing a forensic timeline of exactly what changed, when, and under which plan's authority.

## Intended Audience

This server is built for:

- **Autonomous Agents**: That require a safety rail to prevent destructive or low-quality code generation.
- **Enterprise Environments**: Where "human-in-the-loop" review needs to be augmented by "machine-in-the-loop" policy enforcement.
- **High-Integrity Projects**: Where architectural drift and technical debt must be prevented at the commit level.

It is **NOT** intended for:

- Rapid prototyping where "broken code" is acceptable.
- Environments requiring unrestricted, arbitrary filesystem access.
- Users who wish to bypass planning and governance workflows.

## Critical Stop Conditions

The server will refuse to operate if:

1. The requested plan ID does not exist or is not in an `APPROVED` state.
2. The target file path is outside the scope defined by the plan.
3. The input content fails the enterprise quality scan.
