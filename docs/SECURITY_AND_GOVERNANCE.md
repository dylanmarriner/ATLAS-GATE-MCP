# Enterprise Security & Governance Architecture

## The Zero-Trust Model

ATLAS-GATE-MCP operates on a strict **Zero-Trust** basis regarding the executing AI agent (e.g., Windsurf, LobeHub, Claude).

1. **Untrusted Agent**: The connected LLM or orchestration agent is treated as potentially hallucogenic or unaligned. It is **never** implicitly trusted to determine what files it can edit.
2. **Cryptographic Authority**: The **Implementation Plan** (stored in `docs/plans/`) is the sole Source of Truth for authorization. Plans must be cryptographically signed using Cosign (`public.pem`).
3. **Deterministic Gateway**: The MCP Server acts as the non-negotiable, fail-closed guardian of the repository state.

## Core Governance Controls

### 1. Scope Enforcement (Plan Validation)

The server rejects unapproved write operations. To modify the system, an agent must cite an authorized **Plan ID**.

- **Governance**: Plans are not merely text; they are execution tokens backed by cryptographic signatures.
- **Validation**: The server uses Cosign to verify the `bundleJSON` or the raw ECDSA signature against the pre-provisioned `public.pem` key. Any mismatch in the plan's canonical hash results in an immediate authorization failure.
- **Result**: An agent cannot randomly edit `core/server.js` unless it has a signed plan explicitly authorizing work in that domain.

### 2. Mandatory Intent Artifacts (Semantic Validation)

Before any source code modification is permitted, the agent must generate a standalone `.intent.md` artifact.

- **Requirement**: The artifact must strictly follow a 9-section semantic schema defined by `intent-validator.js`.
- **Purpose**: This forces the agent to explicitly declare its structural intent, authority references, and rollback strategies *before* the AST is altered. It creates an explicit, auditable paper trail of reasoning.

### 3. Enterprise Quality Barrier (AST Filter)

To prevent the injection of technical debt—where agents leave placeholders that look functional but fail in production—the server enforces a **Hard Block** during AST static analysis.

**Forbidden Constructs:**

- **Markers**: Code containing `TODO`, `FIXME`, `XXX`.
- **Fakes**: References to `stub`, `mock`, `placeholder`, `dummy`.
- **Incomplete Logic**: Empty object returns (`return {}`), `throw "not implemented"`.

**Rationale**: Enterprise applications require absolute correctness. By blocking functional stubs at the pipeline level, the agent is forced to resolve the implementation completely rather than deferring it.

### 4. Write-Time Atomic Execution

Validation completes **before** any disk manipulation occurs.

- **Authorization**: Cosign signature is verified.
- **Semantic**: Intent validation matches the `.intent.md` hash.
- **Static**: The AST filter scans the target payload.
- **Commit**: The file handle is only opened if *all* gates pass flawlessly.

This "Fail-Closed" pipeline guarantees that a failed operation leaves the filesystem in a pristine, uncorrupted state.

## Prevention of Silent Corruption

Silent corruption occurs when an agent makes a change that is technically valid (syntactically) but operationally dangerous (e.g., deleting a config key, overwriting a critical lockfile).

### Audit Logging

Every write is cryptographically hashed and logged.

- **Traceability**: `audit-log.jsonl` provides a permanent record of *who* (Session ID) changed *what* (File Path) under *what authority* (Plan ID).
- **Forensics**: If the system breaks, the audit log allows instant identification of the exact write operation that caused that regression.

### Logic Normalization

Input normalization prevents "Format Confusion" attacks or bugs where an agent sends a string when an object is expected, potentially bypassing validation logic. By strictly normalizing inputs server-side, we ensure uniformly applied security policies.

## Advanced Governance Capabilities

For enterprise teams utilizing ATLAS-GATE-MCP through LobeHub or custom workflows:

1. **Maturity Reports**: Utilize the `generate_maturity_report` tool to enforce automated assessments of documentation, test coverage, and security, converting arbitrary code metrics into standardized risk data.
2. **Attestation Bundles**: All operations are wrapped in exportable cryptographic Attestation Bundles (`export_attestation_bundle`), providing seamless compliance readiness for SOC2/ISO27001 deployments.
3. **Immutable Auditing**: Treat `audit-log.jsonl` not merely as a text file, but as an Append-Only non-repudiation ledger. Do not attempt to bypass or prune this ledger manually.
