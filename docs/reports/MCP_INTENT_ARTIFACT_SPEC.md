# MCP Intent Artifact Specification

**Document Status**: APPROVED  
**Authority**: WINDSURF EXECUTION PROMPT — MCP Intent Artifact Law (Schema + Validation)  
**Audience**: Engineers, Governance Systems, Automation Tools  

## 1. Overview

Every file write in ATLAS-GATE MCP requires a corresponding intent artifact that explains WHY the change exists and what it does. This specification defines the canonical schema for intent artifacts.

Intent artifacts are:
- **Deterministic**: Identical content produces identical hash
- **Schema-enforced**: Fail-closed on validation
- **Non-negotiable**: Writes without valid intents are refused
- **Authority-bound**: Intent must reference the executing plan and phase

## 2. Intent Artifact File Naming

For any file being written:

```
<path>/<filename>.<ext>
```

The intent artifact MUST be:

```
<path>/<filename>.<ext>.intent.md
```

No alternatives. No consolidated intents. No directories.

**Examples:**

| Target File | Intent File |
|---|---|
| `core/intent-validator.js` | `core/intent-validator.js.intent.md` |
| `docs/reports/spec.md` | `docs/reports/spec.md.intent.md` |
| `tests/test-auth.js` | `tests/test-auth.js.intent.md` |

## 3. Canonical Schema

Intent artifacts MUST contain the following sections in this EXACT order:

### 3.1 Title
**Header**: `# Intent: <relative file path>`

The title MUST reference the exact file path of the target file (relative to workspace root).

**Valid:**
```
# Intent: core/intent-validator.js
```

**Invalid:**
```
# Intent: validator.js
# Intent: ./core/intent-validator.js
```

### 3.2 Purpose
**Header**: `## Purpose`

One paragraph (plain English) explaining why this file exists and what problem it solves.

**Constraints:**
- No code symbols: `{}`, `;`, `=>`, `function`, `const`, `let`, `var`
- Minimum 30 characters
- Non-technical language preferred
- Single paragraph

**Valid:**
```
## Purpose
This file implements core functionality for validating intent artifacts.
It receives intent content, checks it against schema, and rejects invalid intents.
```

**Invalid:**
```
## Purpose
function validate() {}

## Purpose
Validates stuff.
```

### 3.3 Authority
**Header**: `## Authority`

Declares the plan hash and phase ID that authorized this change.

**Format:**
```
## Authority
Plan Hash: <64-char hex sha256>
Phase ID: PHASE_<identifier>
```

**Valid:**
```
## Authority
Plan Hash: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Phase ID: PHASE_INTENT_ARTIFACT
```

**Invalid:**
```
## Authority
Approved by John (author names forbidden)

## Authority
Plan Hash: 12345 (too short)
Phase ID: phase_1 (must be uppercase PHASE_)
```

### 3.4 Inputs
**Header**: `## Inputs`

Bulleted list of input categories (data, events, function calls).

Each item should describe a category, not types.

**Valid:**
```
## Inputs
- HTTP requests from clients
- Configuration from environment
- Database connection pool
```

**Invalid:**
```
## Inputs
None

## Inputs
```

### 3.5 Outputs
**Header**: `## Outputs`

Bulleted list of externally visible effects (side effects, return values, state mutations).

**Valid:**
```
## Outputs
- Validated requests forwarded downstream
- Error responses for invalid requests
- Audit log entries
```

### 3.6 Invariants
**Header**: `## Invariants`

Bulleted list of declarative rules that MUST hold.

**Constraints:**
- No conditional language: "might", "should", "could", "ideally"
- No "if...then" conditions
- Stated as facts, not aspirations

**Valid:**
```
## Invariants
- All inputs validated before processing
- No state mutation without audit logging
- Errors never silently swallowed
```

**Invalid:**
```
## Invariants
- Should validate inputs (conditional language)
- Might log errors (conditional language)
```

### 3.7 Failure Modes
**Header**: `## Failure Modes`

Bulleted list describing what can fail and why it matters.

Format: `<what fails> → <consequence>`

**Valid:**
```
## Failure Modes
- Database timeout → return 503 Service Unavailable
- Invalid JSON → return 400 Bad Request
- Network partition → retry with exponential backoff
```

### 3.8 Debug Signals
**Header**: `## Debug Signals`

Bulleted list of names of logs, events, or snapshots that will exist on failure.

Non-coder readable. Help humans debug.

**Valid:**
```
## Debug Signals
- Access log entries with status codes and latency
- Error log entries with full stack traces
- Metrics counters for request rates and errors
```

**Invalid:**
```
## Debug Signals
- console.log() calls (code references)
- stderr output (too vague)
```

### 3.9 Out-of-Scope
**Header**: `## Out-of-Scope`

Bulleted list explicitly stating what this file must NEVER do.

These are boundary constraints.

**Valid:**
```
## Out-of-Scope
- This file must never modify the request body
- This file must never perform authorization checks
- This file must never store secrets in logs
```

## 4. Forbidden Content (Strict)

The following patterns are ABSOLUTELY FORBIDDEN in intent artifacts:

| Pattern | Reason |
|---|---|
| Code blocks (```...```) | Code references forbidden |
| Code symbols: `{}`, `;`, `=>` | Code syntax forbidden |
| Timestamps: `2025-01-19`, `today`, `now` | Dynamic content breaks determinism |
| Author names: `by John`, `@alice` | Author attribution forbidden |
| Work markers: `TODO`, `FIXME`, `HACK` | Unfinished work forbidden |
| Conditional language: `might`, `should`, `could` | Intent must be declarative |
| URLs (outside Authority section) | URLs only in Authority section |

**Detection Method**: Regex patterns are checked pre-validation.

## 5. Validation Process

Intent artifacts are validated on every write via the policy engine:

### 5.1 Structural Validation
- All required sections present
- Section order correct
- Section headers match exactly
- Bulleted sections contain ≥1 item

### 5.2 Path Consistency
- Title path matches target file path EXACTLY
- Case-sensitive
- Workspace-relative

### 5.3 Authority Binding
- Plan Hash matches executing plan_hash
- Phase ID matches executing phase_id
- On mismatch: write REFUSED with INTENT_AUTHORITY_DRIFT

### 5.4 Language Sanity
- Purpose must not contain code symbols
- Invariants must be declarative
- No forbidden content patterns

### 5.5 Determinism
- No dynamic fields (timestamps, UUIDs, author names)
- Identical intent content → identical hash
- On failure: write REFUSED

## 6. Intent-to-Plan Drift

If a file is modified in a later phase:
- Intent must be updated in that phase
- Old intent referencing old phase is INVALID
- Write is REFUSED on drift

**Example:**
- Intent created in PHASE_1 with `Plan Hash: abc123` and `Phase ID: PHASE_1`
- If file modified in PHASE_2:
  - Intent must be updated to `Phase ID: PHASE_2`
  - Otherwise, write is REFUSED with INTENT_AUTHORITY_DRIFT

## 7. Audit Integration

On every intent validation:

```json
{
  "ts": "2025-01-19T...",
  "seq": 123,
  "session_id": "...",
  "tool": "write_file",
  "plan_hash": "...",
  "phase_id": "PHASE_1",
  "args_hash": "...",
  "result": "ok" or "error",
  "error_code": "INTENT_SCHEMA_INVALID" or null,
  "invariant_id": "MANDATORY_INTENT_LAW",
  "notes": "Intent artifact VALID..." or "Intent validation failed..."
}
```

## 8. Read-Only Validation Tool

Tool: `validate_intents`

Behavior:
- Scans workspace for `*.intent.md` files
- Validates against schema
- Reports missing, invalid, and drifted intents
- DOES NOT modify files
- Returns deterministic summary object

```json
{
  "tool": "validate_intents",
  "status": "VALID" or "INVALID",
  "summary": {
    "total_scanned": 42,
    "valid_intents": 40,
    "missing_count": 0,
    "invalid_count": 2,
    "drift_count": 0
  },
  "missing_intents": [...],
  "invalid_intents": [...],
  "drifted_intents": [...]
}
```

## 9. Refusal Codes

When intent validation fails, writes are refused with:

| Code | Reason |
|---|---|
| INTENT_ARTIFACT_MISSING | File does not exist |
| INTENT_SCHEMA_INVALID | Sections missing or out of order |
| INTENT_PATH_CONSISTENCY | Title path doesn't match target |
| INTENT_AUTHORITY_DRIFT | Plan hash or phase ID mismatch |
| INTENT_CONTAINS_FORBIDDEN_PATTERNS | Forbidden content detected |
| INTENT_ARTIFACT_CONTENT | Intent is empty |

All refusal codes are mapped to `invariant_id: MANDATORY_INTENT_LAW` or `INTENT_PLAN_BINDING` in audit entries.

## 10. Non-Coder Guide: How to Read an Intent File

An intent file answers these questions:

1. **Title**: What file does this explain?
2. **Purpose**: Why does this file exist?
3. **Inputs**: What data does it receive?
4. **Outputs**: What does it produce or change?
5. **Invariants**: What are the rules it must follow?
6. **Failure Modes**: What can go wrong?
7. **Debug Signals**: How can I tell if something went wrong?
8. **Out-of-Scope**: What does this file explicitly NOT do?

**Example Intent File** (partial):

```markdown
# Intent: core/intent-validator.js

## Purpose
This file implements core validation for intent artifacts. It receives intent content, checks it against a strict schema, and rejects any intent that doesn't conform.

## Authority
Plan Hash: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Phase ID: PHASE_INTENT_ARTIFACT

## Inputs
- Intent artifact content (markdown)
- Target file path
- Executing plan hash
- Executing phase ID

## Outputs
- Validation result (pass/fail)
- Audit log entries
- Error messages for failures

## Invariants
- Validation is deterministic: same intent always produces same result
- Intent must reference the current executing plan and phase
- No forbidden patterns (code blocks, timestamps, author names)

## Failure Modes
- Missing authority section → write refused
- Path mismatch → write refused
- Forbidden content detected → write refused

## Debug Signals
- Audit entries logged for every validation attempt
- Error messages reference specific validation failures
- Intent hash logged on success for traceability

## Out-of-Scope
- This file must never modify intent artifacts
- This file must never perform authorization checks
- This file must never log file content
```

## 11. Exceptions

Only failure reports (files in `docs/reports/`) are exempt from intent requirements.

Failure reports must still conform to all governance standards but do not require intent artifacts.

## 12. Examples

### Valid Intent (Full)

See section 10 above for a realistic example.

### Invalid Intent (Missing Section)

```markdown
# Intent: core/intent-validator.js

## Purpose
This file validates intents.

## Authority
Plan Hash: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Phase ID: PHASE_1

## Inputs
- Intent content

## Outputs
- Validation result

## Invariants
- All inputs validated

# MISSING: Failure Modes section
# MISSING: Debug Signals section
# MISSING: Out-of-Scope section
```

### Invalid Intent (Forbidden Content)

```markdown
# Intent: core/intent-validator.js

## Purpose
This file validates intents. TODO: Add more features.  # FORBIDDEN: TODO marker

## Authority
Plan Hash: ...
```

## 13. Compliance Checklist

- [ ] Intent file exists at `<target>.intent.md`
- [ ] Title matches exact target path (workspace-relative)
- [ ] All 9 sections present in correct order
- [ ] Purpose is plain English (no code symbols)
- [ ] Authority has Plan Hash (64-char hex) and Phase ID (PHASE_*)
- [ ] All bulleted sections have ≥1 item
- [ ] Invariants are declarative (no "might", "should", "could")
- [ ] No forbidden patterns detected
- [ ] No timestamps, author names, or dynamic fields
- [ ] Intent is deterministic (identical content → identical hash)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-19  
**Spec Compliance**: STRICT
