# Security & Governance Policy

## The Trust Model

Kaiza MCP Server operates on a **Zero-Trust** basis regarding the calling agent.

1. **Untrusted Caller**: The LLM/Agent is considered potentially hallucogenic, error-prone, or misaligned. It is **never** implicitly trusted to determine what files it can edit or the quality of its code.
2. **Trusted Authority**: The **Implementation Plan** (stored in `docs/plans/`) is the sole Source of Truth for authorization.
3. **Enforcement Agent**: The MCP Server acts as the non-negotiable guardian of the repository state.

## Governance Controls

### 1. Scope Enforcement (The Barrier)

The server rejects "wild" writes. To modify the system, an agent must cite a specific **Plan ID**.

- **Governance**: Plans effectively act as "Capabilities" or "Tickets".
- **Validation**: The server verifies that the cited plan ID maps to a real, existing planning document in the repository.
- **Result**: An agent cannot randomly edit `core/kernel.js` unless it has a plan that authorizes work in that domain.

### 2. Enterprise Quality Barrier (The Filter)

To prevent "Technical Debt Injection"—where agents leave placeholders that look functional but fail in production—the server enforces a **Hard Block** on non-production code.

**Forbidden Patterns:**

- **Markers**: `TODO`, `FIXME`, `XXX`
- **Fakes**: `stub`, `mock`, `placeholder`, `dummy`
- **Incomplete Logic**: `return null`, `return undefined`, `return {}` (empty objects), `throw "not implemented"`
- **Test Junk**: `hardcoded`, `test data`

**Why?**
Startups often accept "good enough". Enterprise applications require "correct". By blocking stubs at the Write level, we force the agent to solve the problem *now*, rather than deferring it to a human who may never see it.

### 3. Write-Time Validation

Validation occurs **before** the disk is touched.

- **Syntax**: JSON structure is validated.
- **Semantics**: Logic checks (plan existence, stub detection) run.
- **Commit**: Only if all checks pass is the file handle opened.

This "Fail-Fast" approach ensures that a failed operation leaves the filesystem in a pristine, unchanged state.

## Prevention of Silent Corruption

Silent corruption occurs when an agent makes a change that is technically valid (syntactically) but operationally dangerous (e.g., deleting a config key, overwriting a critical lockfile).

### Audit Logging

Every write is cryptographically hashed and logged.

- **Traceability**: `audit-log.jsonl` provides a permanent record of *who* (Session ID) changed *what* (File Path) under *what authority* (Plan ID).
- **Forensics**: If the system breaks, the audit log allows instant identification of the exact write operation that caused that regression.

### Logic Normalization

Input normalization prevents "Format Confusion" attacks or bugs where an agent sends a string when an object is expected, potentially bypassing validation logic. By strictly normalizing inputs server-side, we ensure uniformly applied security policies.

## Governance Recommendations

For teams using Kaiza MCP:

1. **Review Plans First**: Do not allow agents to write plans *and* code in the same loop without human review of the plan.
2. **Treat Warnings as Errors**: The server does this automatically. Do not attempt to patch the server to lower these standards.
3. **Audit the Log**: Periodically review `audit-log.jsonl` to spot patterns of failed attempts or suspicious scope expansion.
