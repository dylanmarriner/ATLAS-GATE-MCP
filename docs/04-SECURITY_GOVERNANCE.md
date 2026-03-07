# Security & Governance: Complete Reference

This document covers ATLAS-GATE's security model, governance framework, and operational procedures.

## Philosophy

**"Plans are Laws"**: Every file mutation must be pre-authorized via a cryptographically signed, enforceable plan. The system is fail-closed: unsafe states are worse than missing functionality.

## Security Model

### Three-Tier Trust

```
Operator (Human) - Reviews and approves plans
        ↓
ANTIGRAVITY (Planning Agent) - Generates executable plans
        ↓
Plan Signature (Cosign ECDSA P-256) - Cryptographic seal
        ↓
WINDSURF (Execution Agent) - Executes only signed plans
        ↓
File System (with audit trail) - Immutable record
```

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| AI writes unauthorized code | Plans gate all writes |
| AI modifies files outside scope | Path allowlist enforces boundaries |
| AI bypasses error handling | Stub detector blocks empty catches |
| AI introduces test code to production | Stub detector blocks mock/fake data |
| AI returns invalid values | Stub detector blocks null returns |
| AI uses unsafe patterns | AST analysis detects dangerous patterns |
| Audit log is tampered | Hash chain prevents tampering |
| Plan is modified after signing | Cosign signature verification fails |
| Plan signature is forged | ECDSA P-256 prevents forgery |
| Session is hijacked | Session ID in audit trail |

## Cryptography

### Cosign Signing (Plan Signature)

**Algorithm**: ECDSA P-256 (elliptic curve cryptography)

**Key Generation**:
```bash
cosign generate-key-pair
# Produces: cosign.key (private), cosign.pub (public)
# Stored in: .atlas-gate/.cosign-keys/
```

**Signing Process**:
1. Plan JSON is canonicalized (whitespace normalized, keys sorted)
2. SHA256 hash computed
3. Signature created with private key
4. Output: 43-character URL-safe Base64 string

**Verification Process**:
1. Plan signature extracted from header
2. Content canonicalized identically to signing
3. Public key loaded from `.atlas-gate/.cosign-keys/public.pem`
4. cosign verify() called with content, signature, public key
5. Returns true/false

**Signature Format**:
- 43 characters long
- URL-safe Base64 (no `/`, `+`, `=` padding)
- Example: `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`

**Key Rotation**:
```bash
# Generate new key pair
cosign generate-key-pair
# Update public key in repository
# Old plans remain valid (signature verification uses key at time of execution)
# New plans must use new key
```

### Hash Chain (Audit Log)

**Purpose**: Detect tampering in audit log

**Structure**:
```json
{
  "sequence": 1,
  "entry_hash": "sha256:abc123...",
  "hash_chain": "sha256:def456..."
}
```

**How it works**:
1. Entry 1 has `hash_chain: null`
2. Entry 2's `hash_chain` = SHA256(Entry 1)
3. Entry 3's `hash_chain` = SHA256(Entry 2)
4. And so on...

**Tamper Detection**:
```
If someone modifies Entry N:
  Entry N's hash changes
  Entry N+1's hash_chain no longer matches Entry N
  Tampering detected!
```

## Governance Framework

### Invariants (The Laws)

#### I1: Plans Are Immutable
- Plans cannot be modified after cosign signature
- Any modification invalidates the signature
- Operator must re-lint and re-sign if changes needed

#### I2: Deterministic Constraints
- Plans use binary language (MUST/MUST NOT)
- No "may", "should", "optional", or judgment calls
- Verification is objective, not subjective

#### I3: Path Confinement
- All writes must be in `path_allowlist`
- No absolute paths
- No parent directory escapes (`..`)
- No symlink escapes

#### I4: No Stubs in Code
- TODO, FIXME, XXX absolutely forbidden
- mock/fake/dummy data blocked
- Empty functions blocked
- Empty catch blocks blocked
- No null/undefined returns

#### I5: Intent Artifacts Required
- Every file write needs accompanying `.intent.md`
- Intent must be 9 sections
- Intent must reference plan and phase
- Intent provides human-readable justification

#### I6: Immutable Audit Trail
- audit-log.jsonl is append-only
- Entries cannot be deleted or modified
- Hash chain detects tampering
- Every entry includes session ID, plan signature, file path

#### I7: Cryptographic Authorization
- Every write is tied to a signed plan
- Plan signature verified before execution
- If verification fails → operation aborted
- Public key must match key used to sign

#### I8: Fail-Closed Execution
- Any gate failure → entire operation rejected
- No partial writes
- No exceptions or overrides
- Session marked failed
- Rollback executed

### Roles & Permissions

#### ANTIGRAVITY (Planning Agent)
Permissions:
- ✓ read_file (analyze codebase)
- ✓ lint_plan (validate plans)
- ✓ save_plan (sign and file plans)
- ✓ list_plans (list existing plans)
- ✓ read_audit_log (review history)

Restrictions:
- ✗ Cannot write files
- ✗ Cannot execute arbitrary code
- ✗ Cannot modify workspace

#### WINDSURF (Execution Agent)
Permissions:
- ✓ begin_session (initialize)
- ✓ read_file (load plans and code)
- ✓ write_file (only path_allowlist)
- ✓ read_audit_log (verify entries)
- ✓ commit_phase (git commits)

Restrictions:
- ✗ Cannot lint plans (ANTIGRAVITY only)
- ✗ Cannot sign plans (ANTIGRAVITY only)
- ✗ Cannot write outside path_allowlist
- ✗ Cannot execute shell commands

#### Operator (Human)
Permissions:
- ✓ Review plans
- ✓ Approve execution
- ✓ Review audit logs
- ✓ Trigger recovery procedures
- ✓ Rotate cosign keys

Restrictions:
- ✗ Cannot directly modify code (use WINDSURF)
- ✗ Cannot approve own plans (human review required)

### Access Control

```
Operation          | Requires        | Enforced By
-------------------|-----------------|--------------------
read_file          | begin_session   | Session lock (RF1)
write_file         | plan + intent   | 5-gate pipeline
lint_plan          | ANTIGRAVITY role| Role check
save_plan          | lint pass       | Validation gate
commit_phase       | phase complete  | Phase tracker
rollback           | failure trigger | Automatic
recovery_initiate  | OWNER role      | Role enforcement
```

## Hard Block Policy

### Absolutely Forbidden Constructs

These are NEVER allowed, no exceptions, no plan override:

#### Category C1: TODO Markers
```javascript
// TODO: Fix error handling   ✗ HARD BLOCK
// FIXME: Add validation      ✗ HARD BLOCK
// XXX: Security issue        ✗ HARD BLOCK
```

#### Category C2: Test Doubles
```javascript
const mockData = { ... }      ✗ HARD BLOCK
const fakeUser = { ... }      ✗ HARD BLOCK
const dummyId = "123"         ✗ HARD BLOCK
const testToken = "abc"       ✗ HARD BLOCK
jest.mock("./module")         ✗ HARD BLOCK
sinon.stub(...)               ✗ HARD BLOCK
```

#### Category C3: Incomplete Returns
```javascript
function getValue() { return null; }      ✗ HARD BLOCK
function getUser() { return undefined; }  ✗ HARD BLOCK
function getName() { return ""; }         ✗ HARD BLOCK
function getConfig() { return {}; }       ✗ HARD BLOCK
```

#### Category C4: Empty Blocks
```javascript
function validate() { }                    ✗ HARD BLOCK
try { ... } catch (e) { }                  ✗ HARD BLOCK
```

#### Category C5: Policy Bypass
```javascript
if (true) {  // always execute
  allowAccess();  ✗ HARD BLOCK
}
```

#### Category C6: Hardcoded Decisions
```javascript
if (user.isAdmin || true) {    ✗ HARD BLOCK
  grantAccess();
}
```

### HARD BLOCK Violations

**Detection**: Regex + AST analysis during write_file Gate 4

**Response**:
1. Error thrown immediately
2. Write rejected
3. Audit entry created
4. Session marked failed
5. No rollback needed (write didn't happen)

**Recovery**:
1. Remove hard block pattern
2. Re-run write_file
3. If recurring, redesign feature

### Critical Violations

**Detection**: Regex + AST analysis

**Patterns**:
- @ts-ignore, @ts-nocheck
- // eslint-disable
- Type safety bypasses
- Linting suppressions

**Response**:
1. Error thrown
2. Write rejected
3. Can be overridden in plan constraints (not recommended)

**Recovery**:
1. Fix underlying issue (don't bypass)
2. Remove bypass directive
3. Re-run write_file

## Session Management

### Session Lifecycle

```
begin_session()
    ↓
[Session locked to workspace_root]
    ↓
[Can execute operations]
    ↓
[Audit entries created]
    ↓
[Session ends on process exit]
    ↓
[Audit trail immutable]
```

### Session Locking (RF1)

```javascript
// First call: succeeds
begin_session({ workspace_root: "/project" })
// → Session locked to /project

// Second call: fails
begin_session({ workspace_root: "/other" })
// → Error: Session already locked to /project
```

**Purpose**: Single tenant per server instance, no session switching

### Session State

Each session has:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_root": "/absolute/path",
  "active_plan_id": "FEATURE_JWT_AUTH_V1",
  "active_phase_id": "PHASE_001_JWT_MODULE",
  "role": "WINDSURF",
  "start_time": "2026-03-07T12:00:00Z"
}
```

## Audit Trail

### Entry Structure

```json
{
  "sequence": 42,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-03-07T15:30:45.123Z",
  "role": "WINDSURF",
  "workspace_root": "/project",
  "tool": "write_file",
  "plan_signature": "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  "phase_id": "PHASE_001_JWT_MODULE",
  "file_path": "src/auth/jwt.js",
  "result": "success",
  "error_code": null,
  "invariant_id": null,
  "notes": "JWT module verification logic",
  "entry_hash": "sha256:abc123...",
  "hash_chain": "sha256:def456..."
}
```

### Properties

| Field | Purpose |
|-------|---------|
| `sequence` | Monotonic counter, detects missing entries |
| `session_id` | Links all entries to one execution |
| `timestamp` | When operation occurred |
| `role` | WINDSURF, ANTIGRAVITY |
| `workspace_root` | Which project was modified |
| `tool` | read_file, write_file, lint_plan, etc. |
| `plan_signature` | Authorization for this write |
| `phase_id` | Which phase executed this operation |
| `file_path` | File affected |
| `result` | success or error |
| `error_code` | SystemError code if failed |
| `notes` | Human-readable description |
| `entry_hash` | SHA256 of entry content |
| `hash_chain` | SHA256 of previous entry (tamper detection) |

### Immutability Properties

Audit log cannot be:
- ✗ Deleted
- ✗ Modified (any change breaks hash chain)
- ✗ Reordered
- ✗ Partially purged
- ✗ Forged (would break hash chain)

Audit log can be:
- ✓ Read
- ✓ Appended (only new entries)
- ✓ Searched
- ✓ Exported for compliance

### Compliance

For systems with SIEM/audit requirements:

```bash
# Export audit log for Splunk
cat audit-log.jsonl | jq -c . | /path/to/splunk/agent

# Export for Datadog
cat audit-log.jsonl | jq -c . | dd-agent log

# Export for AWS S3 (compliance archival)
aws s3 cp audit-log.jsonl s3://compliance-bucket/$(date +%Y-%m-%d)-audit.jsonl
```

Each entry is JSON, one per line, ready for ingestion.

## Recovery Procedures

### Kill Switch (Level 5 Failsafe)

For emergency situations (rogue agent behavior), OWNER role can trigger kill-switch:

```bash
recovery_initiate({
  owner_acknowledgement: "I understand this will stop all AI execution",
  reason: "Rogue agent behavior detected"
})
```

Response:
```json
{
  "status": "RECOVERY_INITIATED",
  "confirmation_code": "ABCD-1234-EFGH-5678",
  "expires_at": "2026-03-07T16:00:00Z",
  "message": "Confirm with recovery_confirm() within 5 minutes"
}
```

Then confirm:
```bash
recovery_confirm({
  confirmation_code: "ABCD-1234-EFGH-5678",
  final_acknowledgement: "Clear kill switch and restore normal operation"
})
```

**Effect**:
- All pending operations stopped
- Session terminated
- Rollback executed if mid-phase
- Audit entry created with RECOVERY reason

### Rollback Procedures

Automatic rollback on phase failure:

```json
{
  "rollback_failure_policy": {
    "automatic_rollback_triggers": [
      "Verification command fails",
      "Write rejected at gate",
      "Stub code detected",
      "Intent artifact missing"
    ],
    "rollback_procedure": [
      "Delete: [newly created files]",
      "Restore: git checkout HEAD -- [modified files]",
      "Clear: working directory changes"
    ]
  }
}
```

**Execution**:
1. Each command executed in order
2. Success/failure logged
3. If rollback itself fails → escalate to OWNER
4. Audit entry created with ROLLBACK_EXECUTED

### Recovery Steps

After rollback:

1. **Review Failure**
   ```bash
   # Find failure in audit log
   tail -20 audit-log.jsonl | jq '.[] | select(.result=="error")'
   ```

2. **Identify Root Cause**
   - Which gate failed?
   - What was the error?
   - What constraint was violated?

3. **Fix Code or Plan**
   - Fix code issue, or
   - Revise plan constraints, or
   - Both

4. **Resubmit**
   - Re-lint plan if modified
   - Create new intent artifacts
   - Re-run execution

## Security Checklist

Before deploying ATLAS-GATE:

- [ ] Cosign keys generated and stored securely
- [ ] Private key accessible only to ANTIGRAVITY
- [ ] Public key available to WINDSURF
- [ ] Key rotation procedure documented
- [ ] Audit log location secured
- [ ] Regular audit log backups configured
- [ ] Plans directory exists with correct permissions
- [ ] Session isolation verified
- [ ] Path allowlist enforced
- [ ] Stub detector tested on known patterns
- [ ] Hash chain verified (no entry modifications)
- [ ] Recovery procedure tested
- [ ] OWNER role defined and trained
- [ ] SIEM integration configured (if required)

## Operational Procedures

### Daily Operations

1. **Monitor Audit Log**
   ```bash
   # Check for errors
   tail -100 audit-log.jsonl | jq '.[] | select(.result=="error")'
   ```

2. **Verify Hash Chain**
   ```bash
   # Custom script to verify hash continuity
   node scripts/verify_hash_chain.js
   ```

3. **Review Plans**
   ```bash
   # List all executed plans
   find docs/plans -name "*.json" | wc -l
   ```

### Weekly Operations

1. **Rotate Logs**
   ```bash
   # Archive old audit logs
   cp audit-log.jsonl audit-log-$(date +%Y-%m-%d).jsonl
   ```

2. **Key Rotation** (quarterly, minimum)
   ```bash
   cosign generate-key-pair
   # Update repository
   # Communicate change to operators
   ```

3. **Compliance Report**
   - Export audit log for compliance team
   - Verify all critical operations logged
   - Check for policy violations

### Incident Response

**Incident**: Unauthorized file modification

1. **Stop Operations**
   ```bash
   recovery_initiate({ reason: "Unauthorized modification detected" })
   ```

2. **Investigate**
   ```bash
   # Find the operation
   grep "unauthorized-file.js" audit-log.jsonl
   # Check if plan was legitimate
   # Verify signature
   ```

3. **Remediate**
   - If plan valid but execution wrong: fix and rerun
   - If plan tampered: revoke and reauthorize
   - If rogue agent: escalate to OWNER

4. **Document**
   ```bash
   # Add to incident log
   echo "Incident: ..." >> incidents.log
   ```

## Threat Response Matrix

| Threat | Detection | Response |
|--------|-----------|----------|
| Modified plan | Signature verification fails | Reject execution, audit entry |
| Rogue writes | Path allowlist violation | Abort, audit entry |
| Test code shipped | Stub detector activation | Abort, audit entry |
| Tampering attempt | Hash chain break | Detect, audit entry |
| Session hijacking | Audit log analysis | Session ID mismatch detected |
| Key compromise | Signature fails verification | Revoke, rotate keys |

## Compliance & Standards

### SOC 2 Type II
- ✓ Immutable audit trail
- ✓ Cryptographic signing
- ✓ Role-based access control
- ✓ Session isolation
- ✓ Hash chain tamper detection

### HIPAA
- ✓ Audit log immutability
- ✓ User identification (role, session_id)
- ✓ Comprehensive logging
- ✓ Encryption (cosign P-256)

### PCI-DSS
- ✓ Change management (plans gate all changes)
- ✓ Audit trails
- ✓ Non-repudiation (signatures)
- ✓ Access controls (role-based)

### NIST Cybersecurity Framework
- ✓ Identify: Plans document intent
- ✓ Protect: Cryptographic signing, path confinement
- ✓ Detect: Stub detection, hash chain
- ✓ Respond: Recovery procedures
- ✓ Recover: Rollback mechanism

## Frequently Asked Questions

**Q: Can the audit log be encrypted?**
A: Yes. Recommended for systems with sensitive data. Encrypt audit-log.jsonl with AES-256-GCM.

**Q: How often should keys be rotated?**
A: Every 90 days for high-security environments, annually minimum for others.

**Q: What if a plan is approved but contains a bug?**
A: Rollback executes, then redesign phase and resubmit for approval.

**Q: Can WINDSURF override ANTIGRAVITY decisions?**
A: No. WINDSURF only executes signed plans from ANTIGRAVITY. No exceptions.

**Q: What's the maximum plan complexity?**
A: No hard limit, but keep to 5-10 phases per plan for clarity.

**Q: Can multiple WINDSURFs execute simultaneously?**
A: No. One WINDSURF instance per session. Deploy multiple instances for parallelism, but each gets unique workspace_root.

---

**Status**: Complete Security & Governance v2
**Last Updated**: 2026-03-07
**Authority**: ATLAS-GATE Governance
