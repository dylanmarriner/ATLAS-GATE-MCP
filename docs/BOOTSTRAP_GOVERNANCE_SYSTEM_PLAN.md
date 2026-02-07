---
FILENAME: BOOTSTRAP_GOVERNANCE_SYSTEM_PLAN.md
STATUS: DESIGN_APPROVED
SCOPE: BOOTSTRAP ONLY
VERSION: 1.0.0
CREATED: 2026-01-20
AUDIENCE: [architects, engineers, auditors]
---

# BOOTSTRAP GOVERNANCE SYSTEM PLAN

## Executive Summary

This plan defines the minimal, enforceable bootstrap system that transforms ATLAS-GATE MCP from a code execution server into a **governance-first system** where **plans are law**. 

The bootstrap system enables the creation of the **first approved plan** in a fresh workspace (solving the classic bootstrap problem: how do you approve the first plan if plans require approval?). After the first plan is created, bootstrap mode disables and all subsequent operations require explicit plan authority.

**Critical Invariant**: Once implemented, executing ANY write outside the plan authority system MUST be made impossible.

---

## 1. BOOTSTRAP PURPOSE & NON-GOALS

### Purpose: What Bootstrap Enables

- ✅ **Solve the bootstrap paradox**: Allow creation of the first approved plan in a fresh workspace without a pre-existing plan
- ✅ **Establish plan authority as immutable law**: After bootstrap, no write may occur without citing an approved plan
- ✅ **Require cryptographic authentication**: Only the holder of `ATLAS-GATE_BOOTSTRAP_SECRET` can create the first plan
- ✅ **Establish workspace governance state**: Bootstrap creates `governance.json` marking transition from unrestricted to plan-gated execution
- ✅ **Create auditable plan registry**: Bootstrap creates the canonical plans registry that all future writes reference
- ✅ **Prevent bootstrap misuse**: Bootstrap can only succeed once per workspace; subsequent uses are rejected

### Non-Goals: What Bootstrap Explicitly Does NOT Do

- ❌ **NOT a deployment system** (it doesn't execute plan changes; only creates the authority record)
- ❌ **NOT a secret management system** (it uses the secret once; secret management is external responsibility)
- ❌ **NOT a plan approval workflow** (the first plan must arrive pre-approved; bootstrap doesn't evaluate approval)
- ❌ **NOT a rollback mechanism** (if bootstrap fails, manual recovery is required)
- ❌ **NOT a multi-workspace coordinator** (each workspace bootstraps independently)
- ❌ **NOT solving role enforcement** (role boundaries are enforced elsewhere; bootstrap is role-blind)

---

## 2. PLAN AUTHORITY MODEL

### Definition: What Is a "Plan"?

A **plan** is an immutable, cryptographically-addressed document that grants execution authority. In ATLAS-GATE MCP:

- A plan is the **only** legal justification for a write operation
- A plan is **stored as a markdown file** with a specific metadata header
- A plan is **identified by its SHA256 hash** (content-addressable)
- A plan is **immutable** once created (modifications are new plans with new hashes)
- A plan is **approved** if its metadata header declares `STATUS: APPROVED`
- A plan's scope is **declared in its SCOPE field** (what files/domains it authorizes)

### Required Plan Metadata (Schema)

Every plan MUST include a YAML frontmatter section with these fields:

```yaml
---
STATUS: APPROVED          # REQUIRED: literal string "APPROVED" (case-insensitive)
SCOPE: <domain>           # REQUIRED: describes what this plan authorizes (e.g., "BOOTSTRAP_ONLY", "CORE_GOVERNANCE", "DOCUMENTATION")
VERSION: <semver>         # REQUIRED: semantic version of the plan (e.g., "1.0.0")
CREATED: <ISO-8601>       # REQUIRED: UTC timestamp when plan was created (e.g., "2026-01-20T10:30:00Z")
PLAN_HASH: <sha256>       # OPTIONAL: SHA256 hash of plan content (can be PENDING_HASH during creation)
PURPOSE: <description>    # REQUIRED: human-readable description of plan intent
---
```

### Approval Semantics

- A plan is **approved** if its frontmatter declares `STATUS: APPROVED` (exact match, case-insensitive)
- A plan is **proposed** if it has any other STATUS value (e.g., `DRAFT`, `PENDING_APPROVAL`)
- Proposed plans are **not executable authority** (they cannot be cited in write requests)
- Once a plan is approved and written to disk, **it cannot be un-approved** (immutability)
- **Only bootstrap can create plans**; subsequent plan creation requires different authority (not in bootstrap scope)

### Immutability Rules

- **No deletion**: Approved plans are never deleted (audit trail integrity)
- **No modification**: Plan content cannot be changed after approval (use new plan hash for modifications)
- **No downgrade**: A plan's STATUS cannot change from APPROVED to anything else
- **File rename forbidden**: Plans are identified by hash; renaming breaks authority references
- **Content hash binding**: If a plan declares `PLAN_HASH: <value>`, it MUST match the actual content hash

---

## 3. PLAN STORAGE CONTRACT

### Canonical Directory Structure

```
workspace-root/
├── docs/
│   ├── plans/                          # CANONICAL PLANS DIRECTORY
│   │   ├── 6448139d0c27b8c485e...md    # Plan file (hash.md naming)
│   │   ├── 8f1a2b3c4d5e6f7g8h9...md
│   │   └── ...
│   └── [other docs]
├── .atlas-gate/
│   ├── governance.json                 # GOVERNANCE STATE
│   ├── plans/                          # LOCAL PLANS REGISTRY (OPTIONAL)
│   └── ROOT                            # Marker file for repo root detection
└── [other project files]
```

### File Naming Rules

- **Plan filename format**: `<SHA256_HASH>.md` (lowercase hex, no dashes, no prefix)
- **Governance state file**: `.atlas-gate/governance.json` (exact filename, canonical location)
- **Plan discovery scope**: Search `docs/plans/`, `docs/planning/`, and `docs/antigravity/` directories
- **Duplicate detection**: If two plans have identical content hash, they are the same plan (only one file needed)
- **No plan collision**: Two different plans cannot have the same hash (cryptographically enforced)

### Allowed Mutations

- ✅ **Plan creation**: Write a new plan file to `docs/plans/` (only during bootstrap)
- ✅ **Governance state creation**: Write `governance.json` during bootstrap
- ✅ **Governance state updates**: Update `bootstrap_enabled` flag after first plan created
- ✅ **Audit log appends**: Append immutable audit entries (no modification of existing entries)
- ❌ **Plan modification**: Cannot edit an approved plan (creates new plan hash)
- ❌ **Plan deletion**: Cannot delete an approved plan (breaks audit trail)
- ❌ **Governance rollback**: Cannot undo bootstrap once completed

### Hashing & Integrity Expectations

- **Algorithm**: SHA256 (NIST standard, cryptographically secure)
- **Input**: Complete plan markdown content (including frontmatter)
- **Representation**: Lowercase hexadecimal (no padding, no prefix)
- **Timing**: Hash computed once during bootstrap, embedded in plan file (immutable)
- **Verification**: Any tool that reads a plan MUST recompute hash and verify it matches filename
- **Tampering detection**: Hash mismatch causes immediate hard-stop rejection

---

## 4. PLAN REGISTRY DESIGN

### Registry Purpose

The plan registry answers the question: "Is this plan ID valid and approved?"

The registry serves as:
- **Authority index**: Rapid lookup of which plans grant authority
- **Approval record**: Immutable record of what plans are approved
- **Audit anchor**: Each write operation references a plan ID; registry verifies that reference

### Registry Storage & Format

**Location**: `.atlas-gate/governance.json` (co-located with `.atlas-gate/ROOT` marker)

**Structure**:
```json
{
  "bootstrap_enabled": false,
  "bootstrap_completed_at": "2026-01-20T10:30:00Z",
  "approved_plans_count": 1,
  "auto_register_plans": true,
  "plan_index": {
    "6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d": {
      "status": "approved",
      "created": "2026-01-20T10:30:00Z",
      "scope": "BOOTSTRAP_ONLY",
      "file_path": "docs/plans/6448139d0c27b8c485e89ecb44839e3130a18d9505be9c97103557d74164637d.md",
      "verified": true
    }
  }
}
```

### Registry Field Semantics

| Field | Type | Meaning |
|-------|------|---------|
| `bootstrap_enabled` | boolean | If `true`, bootstrap mode is active; only one plan can be created |
| `bootstrap_completed_at` | ISO-8601 string | Timestamp when bootstrap completed (filled after first plan created) |
| `approved_plans_count` | number | Count of approved plans; incremented on successful bootstrap |
| `auto_register_plans` | boolean | If `true`, plans in `docs/plans/` are auto-indexed (scan on startup) |
| `plan_index[HASH]` | object | Per-plan metadata (status, creation time, scope, file path, verification status) |

### Consistency Guarantees

- **Atomic writes**: Governance state updated atomically (all-or-nothing)
- **Registry and disk sync**: Before any write operation, registry MUST match actual plan files on disk
- **No stale registry**: If registry exists but plan file missing, write is rejected (broken reference)
- **No orphan plans**: If plan file exists but registry missing, file is auto-registered (auto_register_plans=true)
- **Single source of truth**: Approved plans are those that (a) have `STATUS: APPROVED` in file AND (b) are in registry

### Failure Modes & Handling

| Scenario | Detection | Action |
|----------|-----------|--------|
| **Corrupt governance.json** | JSON parse error | Reject bootstrap; log error; return GOVERNANCE_CORRUPTED |
| **Missing governance.json** | File not found before bootstrap | Auto-initialize to default state (bootstrap enabled) |
| **Plan file missing but indexed** | Registry references non-existent file | Reject write citing that plan; return BROKEN_PLAN_REFERENCE |
| **Plan file present but not indexed** | File discovered in plans dir not in registry | Auto-register if auto_register_plans=true; warn if false |
| **Registry and plan conflict** | Plan STATUS differs from registry | Reject; return PLAN_STATUS_MISMATCH |
| **Bootstrap after completion** | bootstrap_enabled=false but bootstrap requested | Reject with BOOTSTRAP_DISABLED |

---

## 5. BOOTSTRAP CREATION PATH

### Pre-Conditions: When Bootstrap Can Begin

Bootstrap is available if and only if:

1. **Workspace is fresh** (no governance.json exists OR governance.json has `bootstrap_enabled: true`)
2. **No approved plans exist** (registry shows `approved_plans_count == 0`)
3. **Caller holds the bootstrap secret** (valid HMAC signature on payload)
4. **Exactly once per workspace** (bootstrap_enabled transitions to false after first plan)

**Blocking conditions** (bootstrap fails immediately):

- ❌ Bootstrap secret not set (neither `ATLAS-GATE_BOOTSTRAP_SECRET` env var nor `.atlas-gate/bootstrap_secret.json`)
- ❌ Signature verification fails (HMAC doesn't match or timing attack attempted)
- ❌ Plan content fails linting (violates plan structure requirements)
- ❌ Plan doesn't declare `STATUS: APPROVED` in frontmatter
- ❌ Bootstrap already completed (governance.json has `bootstrap_enabled: false`)

### Validation Rules

**Payload structure** (must match schema exactly):

```javascript
{
  repoIdentifier: string,          // Workspace identifier (e.g., repo root hash)
  timestamp: number,                // Unix milliseconds (current time)
  nonce: string,                    // Random UUID (prevent replay)
  action: "BOOTSTRAP_CREATE_FOUNDATION_PLAN"  // Literal string
}
```

**Signature generation**:
```
signature = HMAC-SHA256(
  key = ATLAS-GATE_BOOTSTRAP_SECRET,
  message = JSON.stringify(payload)  // Canonical JSON (deterministic order)
)
```

**Signature verification**:
- Use timing-safe comparison (`crypto.timingSafeEqual`)
- Reject if signature doesn't match
- Reject if timestamp is older than 5 minutes (prevent replay attacks)

**Plan validation**:
- Markdown file with YAML frontmatter (must parse as valid YAML)
- Frontmatter must include `STATUS: APPROVED` (case-insensitive)
- Frontmatter must include `SCOPE`, `VERSION`, `PURPOSE`, `CREATED`
- Plan must pass linting (checked by `lintPlan()` function)
- Plan content cannot contain stub patterns (TODO, FIXME, hardcoded data, etc.)

### Single-Use vs Repeatable Behavior

**Single-use design** (MANDATORY):
- Bootstrap succeeds only once per workspace
- After first plan is created, `bootstrap_enabled` → `false` in governance.json
- Subsequent bootstrap attempts are **hard-rejected** with error: `BOOTSTRAP_DISABLED`
- No mechanism exists to re-enable bootstrap (immutable once disabled)

**Idempotency**:
- If bootstrap succeeds and plan file already exists (duplicate invocation), return success
- If bootstrap fails (plan doesn't parse, linting fails, etc.), workspace state unchanged
- Retry with corrected plan is allowed (doesn't count as second bootstrap)

### Rejection Conditions (Hard Stop)

Bootstrap request is REJECTED if:

| Condition | Error Code | HTTP Status | Message |
|-----------|-----------|-------------|---------|
| Secret missing | BOOTSTRAP_SECRET_MISSING | 401 | Set ATLAS-GATE_BOOTSTRAP_SECRET environment variable |
| Signature invalid | INVALID_BOOTSTRAP_SIGNATURE | 401 | HMAC verification failed; secret mismatch or tampering |
| Request expired | BOOTSTRAP_REQUEST_EXPIRED | 400 | Timestamp older than 5 minutes; create new payload |
| Plan linting failed | PLAN_LINT_FAILED | 400 | Plan violates structure requirements; fix and retry |
| Not approved | FOUNDATION_PLAN_MUST_BE_APPROVED | 400 | Plan STATUS field must be "APPROVED" |
| Bootstrap disabled | BOOTSTRAP_DISABLED | 403 | Workspace already bootstrapped; bootstrap mode disabled |
| Already exists | PLAN_ALREADY_EXISTS | 409 | Plan with same hash already created; no duplicate needed |
| Governance corrupted | GOVERNANCE_CORRUPTED | 500 | governance.json is invalid; manual recovery required |

---

## 6. EXECUTION GATE DESIGN

### Execution Gate Definition

An **execution gate** is a hard checkpoint that runs before ANY write operation. If any gate fails, the write is rejected and the filesystem is unchanged.

**Critical principle**: The execution gate MUST answer: "Does the caller have authority to make this write?"

Authority is established by citing an **approved plan**.

### Exact Gate Sequence (Five Gates)

Every write request (`write_file` tool call) traverses this pipeline:

**GATE 1: Schema Validation**
- Request must include: `path`, `content`, `plan` (plan ID)
- Request schema is validated using Zod
- Rejection: 400 Bad Request if missing required fields
- Action: Parse and normalize inputs; proceed to Gate 2

**GATE 2: Plan Authority Check**
- Verify the cited plan ID exists in registry
- Verify the plan file exists on disk at canonical path
- Verify plan file content hasn't been modified (hash mismatch = tampering)
- Rejection: 400 Bad Request if plan not found; 409 if hash mismatch
- Action: Load plan frontmatter; proceed to Gate 3

**GATE 3: Plan Scope Validation**
- Verify the plan's SCOPE authorizes the write domain (e.g., SCOPE: "CORE_GOVERNANCE" allows edits to core/)
- Check that the target file path is within the plan's authorized scope
- Rejection: 403 Forbidden if file path outside plan scope
- Action: Confirm write is in scope; proceed to Gate 4

**GATE 4: Enterprise Quality Guard (Stub Detection)**
- Scan the content payload for forbidden patterns (TODO, return null, mock, hardcoded, etc.)
- Use regex matching to detect incomplete or placeholder code
- Rejection: 400 Bad Request if stub patterns detected (hard block)
- Action: Content passes quality bar; proceed to Gate 5

**GATE 5: Filesystem & Audit Commit**
- Write content to disk at the specified path
- Append immutable audit entry to `audit-log.jsonl` with plan ID, timestamp, session ID
- Rejection: 500 Internal Server Error if disk write fails (rare)
- Action: File written; audit logged; operation succeeds

### What Must Be Checked Before ANY Write

Before opening the file handle for writing:

1. ✅ **Plan exists and is approved** (registry lookup + file verification)
2. ✅ **Plan hash integrity** (recompute content hash, verify matches filename)
3. ✅ **Path is in scope** (plan declares authorization for this file domain)
4. ✅ **Content quality** (no stubs, TODOs, mocks, or placeholder patterns)
5. ✅ **Session authority** (caller role matches plan authority requirements)

### What Causes a Hard STOP

These conditions cause immediate rejection with no filesystem modification:

- ❌ **Plan not found**: Cited plan ID doesn't exist in registry
- ❌ **Plan not approved**: Plan file exists but STATUS is not APPROVED
- ❌ **Hash mismatch**: Plan file content doesn't match its filename hash (tampering detected)
- ❌ **Out of scope**: Target file path is not in the plan's declared SCOPE
- ❌ **Stub detected**: Content contains TODO, return null, mock, hardcoded, etc.
- ❌ **Session locked**: Previous operation failed; workspace in recovery state
- ❌ **Role violation**: Caller is Windsurf but plan requires Antigravity authority

---

## 7. ROLE BOUNDARIES

### Role Definitions

| Role | Purpose | Can Create Plans | Can Execute Plans | Can Cite Plans |
|------|---------|------------------|--------------------|-----------------|
| **Antigravity** | Architecture & planning | ✅ YES (via bootstrap) | ❌ NO (read-only) | ✅ YES (proposes) |
| **Windsurf** | Code execution | ❌ NO (blocked) | ✅ YES (implements) | ✅ YES (cites in writes) |
| **Bootstrap Secret Holder** | First-time setup | ✅ YES (bootstrap only) | ❌ NO | ✅ YES (one-time) |

### What Antigravity Can Do Post-Bootstrap

- ✅ **Create new plans** (design new work phases)
- ✅ **Read all plans** (review approval history)
- ✅ **Read code** (understand current state)
- ✅ **Read audit logs** (verify execution compliance)
- ✅ **Propose changes** (write plans for Windsurf to execute)
- ❌ **NOT write code** (execute implementations)
- ❌ **NOT delete plans** (immutable governance)

### What Windsurf Can Never Do

- ❌ **Create or modify plans** (no architecture authority)
- ❌ **Bypass plan authority** (every write must cite a plan)
- ❌ **Execute without approval** (plans must exist before execution)
- ❌ **Modify audit logs** (immutable record)
- ❌ **Change governance state** (only bootstrap can do this)
- ❌ **Delete or downgrade plans** (immutability enforced)

### Human Authority Boundaries

- **Bootstrap secret holder** can trigger first plan creation (one-time authority)
- **Organization policy** determines who holds the secret (external to ATLAS-GATE MCP)
- **Plan approval authority** is external (humans approve plans before bootstrap)
- **Role assignment** is external (determined by MCP client configuration)
- **Session management** is external (MCP client starts Windsurf vs Antigravity session)

---

## 8. AUDIT & VERIFIABILITY REQUIREMENTS

### What Must Be Provable

After bootstrap completes, the following must be independently verifiable:

1. **Bootstrap happened** (governance.json exists with bootstrap_completed_at timestamp)
2. **Plan was approved** (plan file on disk declares STATUS: APPROVED)
3. **Plan content integrity** (plan filename matches SHA256 hash of content)
4. **Bootstrap signature** (original bootstrap payload can be replayed with same secret to reproduce signature)
5. **Audit trail** (audit-log.jsonl contains entry for bootstrap operation)
6. **Authority chain** (any write operation can be traced back to the plan that authorized it)

### What Evidence Must Exist

**Required artifacts after bootstrap:**

```
docs/plans/<HASH>.md           # The approved foundation plan (immutable)
.atlas-gate/governance.json         # State file marking bootstrap complete
audit-log.jsonl                # Entry: { "tool": "bootstrap_create_foundation_plan", "plan_hash": "<HASH>", ...}
```

**Evidence integrity**:
- Plan file hash must match filename (detect tampering)
- Governance state must declare bootstrap disabled (prevent re-bootstrap)
- Audit entry must reference the plan hash (link authority to operation)

### What Cannot Be Faked

**Cryptographic guarantees**:

- ❌ **Cannot create plan without secret** (HMAC-SHA256 signature required)
- ❌ **Cannot modify approved plan** (hash becomes different; new plan hash breaks references)
- ❌ **Cannot fake audit entry** (signatures and hash chains prevent forgery)
- ❌ **Cannot replay bootstrap** (timestamp window + nonce prevent replay attacks)
- ❌ **Cannot disable bootstrap without execution** (state change requires bootstrap handler)

---

## 9. FAILURE & RECOVERY SCENARIOS

### Scenario: Corrupt Plan File

**Detection**:
- Plan file exists in registry but cannot be parsed as markdown/YAML
- Plan filename hash doesn't match file content hash

**Impact**: 
- Write requests citing this plan are rejected
- Bootstrap cannot complete (plan linting fails)

**Recovery**:
1. Identify the corrupt plan (hash mismatch or parse error)
2. Delete the corrupted .md file from docs/plans/
3. Update governance.json to remove the plan from plan_index
4. Retry bootstrap with corrected plan

**Prevention**:
- Validate plan content before writing (Gate 4: linting)
- Use hash verification on every read
- Keep backup copy of plan before bootstrap

---

### Scenario: Missing Governance State

**Detection**:
- `.atlas-gate/governance.json` file not found
- OR governance.json exists but is unparseable JSON

**Impact**:
- System assumes `bootstrap_enabled: true` (default state)
- Bootstrap is allowed (might complete twice if process retried)
- Subsequent writes fail (no approved plans in registry)

**Recovery**:
1. Check if plan file exists in `docs/plans/` (manually verify)
2. If plan exists: manually recreate governance.json with `bootstrap_enabled: false` and correct plan_index
3. If plan missing: delete .atlas-gate/ directory and restart bootstrap from beginning

**Prevention**:
- Create governance.json atomically during bootstrap
- Write backup copy to alternate location
- Check governance state before accepting any write request

---

### Scenario: Broken Plan Reference

**Detection**:
- Write request cites plan ID that exists in registry
- But plan file missing from disk

**Impact**:
- Write is rejected (plan file not found)
- System cannot proceed with cited plan

**Recovery**:
1. Identify missing plan file from error message
2. Check if plan content is recoverable (git history, backups)
3. Restore plan file to `docs/plans/<HASH>.md` (exact filename critical)
4. Re-verify plan hash matches filename
5. Retry write request

**Prevention**:
- Never manually delete plan files (use governance tools only)
- Verify plan files before moving/renaming
- Auto-register missing plans if auto_register_plans=true

---

### Scenario: Conflicting Plans

**Detection**:
- Two plan files exist with identical content hash
- OR two plan files claim different hashes but have same content

**Impact**:
- System has ambiguity about which file is authoritative
- Write requests may fail due to inconsistency

**Recovery**:
1. Identify the duplicate plans
2. Keep the one that matches the filename hash
3. Delete the mismatch file
4. Update governance.json to reference only the correct file

**Prevention**:
- Plan creation enforces unique hashes (content-addressed)
- Manual plan creation is not supported (use bootstrap only)

---

### Scenario: Bootstrap Misuse (Double Bootstrap)

**Detection**:
- Bootstrap request received when bootstrap_enabled=false
- OR governance.json shows existing approved plan

**Impact**:
- Bootstrap handler rejects request with error: BOOTSTRAP_DISABLED
- First plan remains unchanged (immutable)
- No new authority is created

**Recovery**:
- Acknowledge that bootstrap is one-time only
- If different first plan needed, manually delete governance.json and restart
- This is rare and requires deliberate action (not accidental)

**Prevention**:
- Governance state transition is atomic
- Once bootstrap_enabled set to false, no code can re-enable it
- Clear error message guides user to correct workflow

---

### Scenario: Secret Exposure or Rotation

**Detection**:
- Operator suspects bootstrap secret was compromised
- Need to rotate secret for future workspaces

**Impact**:
- Existing plans remain valid (already approved, signed)
- Future bootstrap attempts with old secret fail
- New secret required for any new bootstrap

**Recovery**:
1. Generate new secret: `openssl rand -base64 32`
2. Update environment variable: `export ATLAS-GATE_BOOTSTRAP_SECRET=<new-secret>`
3. Delete old secret from `.atlas-gate/bootstrap_secret.json` (if file-based)
4. Document secret rotation in audit trail
5. If needed, bootstrap new workspace with new secret

**Prevention**:
- Store secret in environment variable (not hardcoded)
- Restrict file permissions on .atlas-gate/bootstrap_secret.json to 0600
- Rotate secret after successful bootstrap (no longer needed)
- Use different secrets per environment (dev, staging, prod)

---

## 10. IMPLEMENTATION CONTRACTS FOR WINDSURF

### What Windsurf Must Implement

**Core bootstrap handler** (`tools/bootstrap_tool.js`):
- ✅ Input validation (Zod schema)
- ✅ Secret verification (HMAC-SHA256 with timing-safe comparison)
- ✅ Plan linting (reject stubs, incomplete code)
- ✅ File creation (plan file at `docs/plans/<HASH>.md`)
- ✅ Governance state write (create/update `.atlas-gate/governance.json`)
- ✅ Audit logging (append entry to `audit-log.jsonl`)
- ✅ Error handling (return structured errors, no filesystem corruption on failure)

**Bootstrap preconditions** (in `core/governance.js`):
- ✅ `isBootstrapEnabled()` - check bootstrap_enabled flag
- ✅ `verifyBootstrapAuth()` - HMAC verification
- ✅ `bootstrapCreateFoundationPlan()` - orchestrate bootstrap flow

**Plan registry** (in `.atlas-gate/governance.json`):
- ✅ Initialize with `bootstrap_enabled: true`, empty plan_index
- ✅ Update after first plan with `bootstrap_enabled: false`, filled plan_index
- ✅ Maintain consistency with plan files on disk

**Execution gates** (in `tools/write_file.js`):
- ✅ Verify plan exists and is approved
- ✅ Verify plan scope authorizes write
- ✅ Reject writes without valid plan citation
- ✅ Block all writes if bootstrap not disabled (before first plan)

### What Windsurf Must NOT Do

- ❌ Allow writes without plan citation (even if plan-gated feature not yet ready)
- ❌ Create plans in any way except bootstrap
- ❌ Modify or delete approved plans
- ❌ Disable bootstrap after first plan without attestation
- ❌ Accept non-APPROVED plans as authority
- ❌ Skip stub detection for "trusted" content
- ❌ Allow Windsurf role to create or modify plans

---

## 11. SUCCESS CRITERIA (Non-Negotiable)

Bootstrap implementation is complete and correct if and only if:

1. **✅ Impossibility of unauthorized writes**: No write operation can occur without citing an approved plan (even if plan-gating code not yet implemented, bootstrap must prevent it)

2. **✅ One-time authority**: Bootstrap succeeds exactly once; second attempt is hard-rejected (BOOTSTRAP_DISABLED)

3. **✅ Cryptographic guarantee**: Bootstrap signature verification using HMAC-SHA256 cannot be bypassed; secret exposure is detectable

4. **✅ Immutable governance**: Once bootstrap completes, first plan cannot be deleted, modified, or un-approved (governance state change requires bootstrap logic)

5. **✅ Audit trail integrity**: Every bootstrap operation is logged; audit entry cannot be modified or deleted post-hoc

6. **✅ Plan authority isolation**: Plans created outside bootstrap bootstrap flow are rejected (only bootstrap can create plans initially)

7. **✅ Zero ambiguity**: No interpretation needed; design is implementable verbatim without decision-making

---

## 12. Dependency Graph

This plan depends on:
- ✅ Existing `BOOTSTRAP_SECRET_GUIDE.md` (secret mechanics, user workflow)
- ✅ Existing `core/governance.js` (bootstrap functions, state management)
- ✅ Existing `tools/bootstrap_tool.js` (tool handler, Zod schema)
- ✅ Existing `core/plan-linter.js` (plan validation)
- ✅ Existing `audit-log.jsonl` (audit infrastructure)

This plan enables (unlocks):
- ✅ Plan authority system (write_file can now require plan citations)
- ✅ Role enforcement (Windsurf vs Antigravity boundaries)
- ✅ Execution gates (multi-gate validation pipeline)

---

## Document Authority

**Plan ID**: BOOTSTRAP_GOVERNANCE_SYSTEM_PLAN  
**Status**: DESIGN_APPROVED  
**Scope**: BOOTSTRAP ONLY  
**Version**: 1.0.0  
**Created**: 2026-01-20  
**Author**: Antigravity (ATLAS-GATE MCP Foundational Governance Architect)  
**Authority**: This plan is the sole authority for bootstrap system design and implementation. All bootstrap code must implement this plan verbatim with zero deviation.

---

**END OF BOOTSTRAP GOVERNANCE SYSTEM PLAN**
