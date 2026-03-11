# Execution Guide: Running Plans with WINDSURF

This guide explains how the WINDSURF agent executes pre-approved ATLAS-GATE plans.

## What WINDSURF Does

WINDSURF is the **execution agent** that:

1. Receives a signed plan from ANTIGRAVITY
2. Verifies the plan's cryptographic signature
3. Extracts constraints and phase definitions
4. Executes each phase with strict enforcement
5. Runs verification gates after completion
6. Records immutable audit trail of all actions

## Before Execution

### Prerequisites

- ANTIGRAVITY has linted and signed a plan
- Plan file exists at `docs/plans/<SIGNATURE>.json`
- Signature is Base64-encoded (43 characters)
- All intent artifacts are prepared

### Information You Need

1. **Plan Signature**: `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`
2. **Workspace Root**: `/path/to/project`
3. **Public Key Path**: `.atlas-gate/.cosign-keys/public.pem`

## The write_file Enforcement Pipeline

Every `write_file` request passes through the server's enforcement flow. If any critical gate fails, the operation is rejected atomically.

### Gate 1: Schema Validation (Zod)

**Purpose**: Ensure the request has required fields with correct types

**Checks**:

- `path`: string, workspace-relative
- `plan`: string, plan signature
- one of `content` or `patch`
- `role`: accepted by the tool and required by this execution guide
- `intent`: accepted by the tool and required by this execution guide

**Failure**: Invalid schema or missing required mutation content is rejected before execution.

**Example Valid Request**:

```json
{
  "path": "src/auth/jwt.js",
  "content": "export function verify(token) { ... }",
  "plan": "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  "role": "EXECUTABLE",
  "intent": "Core authentication logic that validates token signature and expiration"
}
```

### Gate 2: Plan Authority (plan-enforcer.js)

**Purpose**: Verify that the plan signature is valid and authorizes this write

**Checks**:

1. Plan file exists at `docs/plans/<SIGNATURE>.json`
2. Signature in request matches the `atlas_gate_plan_signature` field in the JSON plan
3. Cosign signature verification against public key succeeds
4. Plan `status === "APPROVED"`
5. Plan `role === "ANTIGRAVITY"`

**Failure**: Throws cryptographic mismatch error, operation aborted

**Verification Process**:

```
1. Load plan from docs/plans/SIGNATURE.json
2. Extract `atlas_gate_plan_signature` from the JSON body
3. Remove `atlas_gate_plan_signature` from the canonicalized content
4. Canonicalize JSON (normalize whitespace, key order)
5. Call cosign verify(content, signature, public_key)
6. If verify returns false → HARD FAILURE, abort
7. If verify succeeds → Proceed to Gate 3
```

### Gate 3: Intent Artifact Validation (intent-validator.js)

**Purpose**: Ensure an accompanying `.intent.md` document exists that justifies this write

**Checks**:

1. File `path + ".intent.md"` exists
2. Intent file contains required sections (9 sections total)
3. Intent file references correct plan and phase
4. Intent file has valid SHA256 hash
5. Intent content matches current context

**Intent Artifact Structure** (Required 9 Sections):

```markdown
# Intent: src/auth/jwt.js

## Purpose
Core JWT authentication module for API token validation

## Authority
- Plan Signature: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9WHFh27o
- Phase ID: PHASE_001_JWT_MODULE

## Inputs
- JWT payloads

## Outputs
- Signed tokens and verification results

## Invariants
- Token verification remains deterministic

## Failure Modes
- Invalid token or expired token rejected

## Debug Signals
- Audit log entry and application error signals

## Out-of-Scope
- No frontend authentication behavior
```

**Failure**: Intent file missing or invalid → operation aborted

### Gate 4: Stub Detection (stub-detector.js)

**Purpose**: Prevent incomplete, test, or unsafe code from being written

**Checks** (in order):

#### Phase 1: Hard Block Patterns (NO EXCEPTIONS)

These constructs ABORT immediately, no override possible:

**Policy Bypass Markers**:

- ❌ "always allow"
- ❌ "bypass", "BYPASS"

**Simulated Outcome Markers**:

- ❌ "SIMULATE", "DRY_RUN", "dry-run", "dryrun"

**Incomplete Work Markers**:

- ❌ TODO, FIXME, XXX

**Test Doubles in Production**:

- ❌ mock, Mock, fake, Fake, testData, test_data
- ❌ fakeData, fake_data, dummyData, dummy_data, dummy

#### Phase 2: Critical Violation Patterns (CRITICAL)

These abort unless explicitly overridden in plan constraints:

**Stub Indicators**:

- ❌ stub, STUB, DEMO, placeholder, temporary

**Hardcoded Returns**:

- ❌ `return false`, `return 0`, `return 1`, `=> false`

**Fake Approval**:

- ❌ SYSTEM, APPROVED, approved_by, approvedBy

**Fake Limits**:

- ❌ `if (true)`, `if(true)`, `1=1`, `1==1`

**Linting/Type Bypasses**:

- ❌ @ts-ignore, @ts-nocheck, @ts-expect-error
- ❌ // eslint-disable
- ❌ suppress, suppress-next-line

**Test Framework Abuse**:

- ❌ jest.mock, sinon.stub, nock(), vi.mock, vi.stubGlobal

**Non-Real Code**:

- ❌ sample, Sample, test_only, testonly, noop, no-op
- ❌ hack, HACK, temp, TMP, tmp

#### Phase 3: AST Analysis (JavaScript/TypeScript)

Deep code structure checks:

**Empty Functions**:

```javascript
function validate() { }  // ❌ Hard block - empty body
```

**Empty Catch Blocks**:

```javascript
try { ... } catch (e) { }  // ❌ Hard block - swallows errors
```

**Null/Undefined Returns**:

```javascript
function getValue() { return null; }        // ❌ Hard block
function getItem() { return undefined; }    // ❌ Hard block
function getName() { return ""; }           // ❌ Hard block
function getConfig() { return {}; }         // ❌ Hard block - empty object
```

**Valid Returns** (these are OK):

```javascript
return true;          // ✓ OK
return 0;             // ✓ OK (unless hardcoded return in policy context)
return [];            // ✓ OK - empty array is valid
return "";            // ✓ OK in contexts where empty string makes sense
```

**Failure**: Any violation throws SystemError with detailed message → operation aborted

### Gate 5: Audit Commit (audit-system.js)

**Purpose**: Write file to disk and create immutable audit log entry

**Actions**:

1. Write `content` to `path`
2. Create audit entry with:
   - `session_id`: Cryptographic session ID
   - `plan_signature`: Plan's cosign signature
   - `file_path`: Path written to
   - `role`: EXECUTABLE, BOUNDARY, etc.
   - `intent_hash`: SHA256 hash of intent artifact
   - `timestamp`: ISO 8601 timestamp
   - `hash_chain`: Links to previous entry for integrity
3. Append entry to `audit-log.jsonl`
4. Entry is immutable - cannot be modified or deleted

**Failure**: If audit append fails → file write is rolled back → FAIL_CLOSED

## Execution Sequence

### Step 1: Session Initialization

```bash
begin_session({
  workspace_root: "/absolute/path/to/project"
})
```

**Actions**:

- Generates cryptographic session ID
- Locks workspace root (cannot be changed)
- Initializes session state
- Verifies plans directory exists

**Response**:

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_root": "/absolute/path/to/project",
  "plans_directory": "/absolute/path/to/project/docs/plans",
  "audit_log": "/absolute/path/to/project/audit-log.jsonl"
}
```

### Step 2: Load and Verify Plan

```bash
read_file({
  path: "docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.json"
})
```

**Actions**:

- Load plan JSON
- Extract plan metadata
- Verify plan structure
- Cache plan details in session

### Step 3: Execute Phase

For each phase in `phase_definitions`:

#### A. Pre-Phase Validation

- Verify all required intent artifacts exist
- Check path_allowlist for phase files
- Validate verification commands are available

#### B. Execute Phase Operations

For each file in phase:

1. **Create Intent Artifact** (if not exists)
   - Must be 9 sections
   - Must reference plan and phase
   - Must have valid hash

2. **Call write_file**

   ```bash
   write_file({
     path: "src/auth/jwt.js",
     content: "export function verify(token) { ... }",
     plan: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
     role: "EXECUTABLE",
     intent: "Token validation with signature and expiry checks"
   })
   ```

3. **Verify Audit Entry**
   - Read latest entry from audit-log.jsonl
   - Confirm hash chain is valid
   - Confirm file path matches request

#### C. Post-Phase Verification

```bash
verification_commands: [
  "npm run lint src/auth/",
  "npm test -- tests/auth.test.js"
]
```

- Execute each verification command
- Capture exit code
- If exit code != 0 → PHASE FAILED → ROLLBACK
- If all pass → PHASE SUCCEEDED → Continue to next phase

### Step 4: Run All Verification Gates

After all phases complete:

```bash
verification_gates: [
  "GATE_SYNTAX: All JS must parse",
  "GATE_LINT: ESLint 0 warnings",
  "GATE_TEST: 100% test pass"
]
```

Execute real commands to verify overall success

### Step 5: Commit Changes

After verification passes:

```bash
commit_phase({
  plan_id: "FEATURE_JWT_AUTH_V1",
  phase_id: "PHASE_001_JWT_MODULE",
  plan_signature: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  path_allowlist: ["src/auth/jwt.js", "src/auth/validators.js", "tests/auth.test.js"]
})
```

- Creates git commit with plan details
- Commit message includes plan signature
- Changes are now in source control

## Rollback Procedure

If *any* step fails, WINDSURF executes rollback:

### Automatic Rollback Triggers

- Phase verification command fails (non-zero exit)
- write_file rejected at any gate
- Intent artifact invalid
- Audit log append fails
- Verification gate fails

### Rollback Actions

Configured in plan's `rollback_failure_policy`:

```json
{
  "rollback_procedure": [
    "Delete: src/auth/jwt.js",
    "Delete: src/auth/validators.js",
    "Delete: tests/auth.test.js",
    "Restore: git checkout HEAD -- src/ tests/"
  ]
}
```

Executed in order:

1. Delete newly created files
2. Restore from git
3. Clear working directory changes
4. Log rollback in audit trail

### Recovery Steps

```json
{
  "recovery_steps": [
    "Review audit-log.jsonl for failure location",
    "Identify which gate/phase failed",
    "Fix code or constraints",
    "Re-lint plan if changes made",
    "Re-submit for execution"
  ]
}
```

## Audit Trail Structure

Each operation creates an immutable entry in `audit-log.jsonl`:

```json
{
  "sequence": 1,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-03-07T15:30:45.123Z",
  "role": "WINDSURF",
  "tool": "write_file",
  "plan_signature": "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  "phase_id": "PHASE_001_JWT_MODULE",
  "file_path": "src/auth/jwt.js",
  "intent_hash": "sha256:abc123...",
  "result": "success",
  "error_code": null,
  "notes": "JWT module verification logic implemented",
  "hash_chain": "sha256:def456..."
}
```

**Properties**:

- `sequence`: Monotonic counter per session
- `session_id`: Links all entries to session
- `timestamp`: When operation occurred
- `role`: WINDSURF, ANTIGRAVITY, etc.
- `tool`: MCP tool name (write_file, read_file)
- `plan_signature`: Authorizing plan's signature
- `phase_id`: Phase where operation occurred
- `file_path`: File affected
- `intent_hash`: Hash of intent artifact
- `hash_chain`: SHA256 linking to previous entry (tamper detection)

**Immutability**: Entries cannot be:

- Deleted
- Modified
- Reordered
- Inserted in middle

## Common Workflow: Complete JWT Feature

### 1. ANTIGRAVITY Creates Plan

```
→ lint_plan({ content: "<jwt-plan-json>" })
→ Returns: passed = true
→ save_plan({ content: "<jwt-plan-json>" })
→ Returns: signature = "y6RIU0Xr1..."
→ Saves to: docs/plans/y6RIU0Xr1....json
```

### 2. WINDSURF Initializes Session

```
→ begin_session({ workspace_root: "/project" })
→ Returns: session_id, workspace_root, audit_log_path
```

### 3. WINDSURF Loads Plan

```
→ read_file({ path: "docs/plans/y6RIU0Xr1....json" })
→ Verifies plan structure
→ Caches plan metadata
```

### 4. WINDSURF Executes Phase 1

```
→ For each file in phase:
  → Create src/auth/jwt.js.intent.md (or verify exists)
  → write_file(path, content, plan, ...)
    → Gate 1: Schema ✓
    → Gate 2: Plan authority ✓
    → Gate 3: Intent artifact ✓
    → Gate 4: Stub detection ✓
    → Gate 5: Audit commit ✓
  → Verify audit entry created
→ Run: npm run lint src/auth/
→ Run: npm test -- tests/auth.test.js
→ Phase 1 SUCCESS
```

### 5. WINDSURF Executes Phase 2

```
→ (Same as Phase 1 for test files)
```

### 6. Run All Verification Gates

```
→ Run: npm run lint
→ Run: npm test
→ Run: npm run build
→ All gates pass
```

### 7. Commit Changes

```
→ commit_phase(plan_id, phase_id, signature, paths)
→ Git commit created with plan reference
→ Changes in source control
```

### 8. Audit Trail Complete

```
audit-log.jsonl contains:
- Entry 1: write_file for src/auth/jwt.js
- Entry 2: write_file for src/auth/validators.js
- Entry 3: write_file for tests/auth.test.js
- Entry 4: write_file for package.json (if updated)
- All linked with hash chain
- All signed with plan signature
```

## Troubleshooting

### Gate 1 Fails: Schema Validation

**Error**: `path must be a string`

**Fix**: Ensure the execution template fields are present with correct types:

```json
{
  "path": "src/file.js",
  "content": "...",
  "plan": "signature",
  "role": "EXECUTABLE",
  "intent": "..."
}
```

### Gate 2 Fails: Plan Authority

**Error**: `REFUSE: Signature verification failed`

**Possible causes**:

1. Plan file was modified after signing
2. Wrong signature provided
3. Public key doesn't match private key used to sign
4. Plan not found in `docs/plans/`

**Fix**:

- Verify plan filename matches signature
- Check public key path is correct
- Re-lint plan if modified

### Gate 3 Fails: Intent Artifact

**Error**: `Intent artifact not found: src/file.js.intent.md`

**Fix**:

- Create `.intent.md` file before write_file
- Must be in same directory as target file
- Must contain all 9 required sections
- Must reference correct plan and phase

### Gate 4 Fails: Stub Detection

**Error**: `HARD_BLOCK_VIOLATION: TODO found at line 42`

**Fix**:

- Remove TODO/FIXME comments
- Complete stub code
- Remove mock/fake/dummy variables
- Re-run write_file

### Gate 5 Fails: Audit Commit

**Error**: `Audit append failed`

**Possible causes**:

1. Disk full
2. No write permission on audit-log.jsonl
3. File descriptor limit

**Fix**:

- Check disk space
- Check file permissions
- Review audit log
- Rollback and retry

## Key Behaviors

| Situation | Behavior |
|-----------|----------|
| Plan signature invalid | HARD FAILURE - abort immediately |
| Intent artifact missing | HARD FAILURE - abort immediately |
| Stub code detected | HARD FAILURE - abort immediately |
| Verification command fails | PHASE FAILURE - execute rollback |
| Audit append fails | ATOMIC FAILURE - rollback file write |
| Path not in allowlist | HARD FAILURE - abort immediately |
| File already exists | OVERWRITE (audit logs old version) |
| Multiple writes same file | ALLOWED (audit logs each separately) |
| Session already initialized | REFUSE - cannot begin_session twice |

## Reference

- **Schema**: 8 required fields with specific types
- **Gates**: 5 sequential validations, fail-closed
- **Intent**: 9 sections, must pre-exist
- **Stub Detection**: Hard blocks + critical + AST analysis
- **Audit Trail**: Immutable, hash-chained, sequence-ordered
- **Rollback**: Automatic on phase failure

## Next Steps

1. **Review Phase Execution**: Understand each phase in plan
2. **Check Verification Gates**: Know what commands will run
3. **Prepare Intent Artifacts**: Create all `.intent.md` files
4. **Start Execution**: Call begin_session and start writing

---

**Status**: Complete Execution Guide v2
**Last Updated**: 2026-03-07
**Authority**: ATLAS-GATE Governance
