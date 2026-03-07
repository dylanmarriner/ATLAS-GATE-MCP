# ATLAS-GATE MCP: Getting Started

**ATLAS-GATE** is a zero-trust Model Context Protocol (MCP) server that enforces the **"Plans are Laws"** architecture. It wraps AI agents in a cryptographically verified security boundary, ensuring every file write is:

1. **Pre-authorized** via a signed JSON plan
2. **Intent-validated** with accompanying documentation
3. **Stub-free** (no TODOs, mock code, or incomplete implementations)
4. **Audited** in an immutable, hash-chained log

## Who Should Use This

- **Enterprise teams** operating AI agents on production codebases
- **Security-conscious organizations** needing cryptographic proof of authorization
- **Teams wanting deterministic AI execution** with rollback guarantees
- **Operators requiring SIEM-ready audit trails** for compliance

## Core Concepts

### Plans Are Laws

Every code change must be pre-approved via a **JSON plan**—a structured, enforceable specification of what the AI is allowed to do. Plans are cryptographically signed with ECDSA P-256 (Cosign) and cannot be modified without invalidating the signature.

### Two-Agent Architecture

- **ANTIGRAVITY** (Planning Agent): Generates and validates plans
- **WINDSURF** (Execution Agent): Executes pre-approved plans with strict governance

### Five-Gate Write Pipeline

Every `write_file` request passes through:

1. Schema validation (Zod)
2. Plan authority verification (cosign signature check)
3. Intent artifact validation (matching `.intent.md` files)
4. Stub detection (AST analysis, pattern matching)
5. Audit commit (immutable log entry)

If *any* gate fails, the write is rejected and the session is logged.

## 5-Minute Setup

### Prerequisites

- Node.js 18+
- Git
- ~5 MB disk space

### Install

```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
npm install
npm run build
```

### Start Server

```bash
npm run start:windsurf
```

You'll see:

```
[MCP] kaiza-mcp-windsurf running | session=<SESSION_ID>
```

### Create Your First Plan

Save this as `my-first-plan.json`:

```json
{
  "atlas_gate_plan_signature": "",
  "role": "ANTIGRAVITY",
  "status": "APPROVED",
  "plan_metadata": {
    "plan_id": "EXAMPLE_SETUP",
    "version": "1.0.0",
    "author": "me",
    "timestamp": "2026-03-07T00:00:00Z",
    "governance": "ATLAS-GATE-v2"
  },
  "scope_and_constraints": {
    "objective": "Create a test file to verify ATLAS-GATE is working",
    "affected_files": ["test-output.txt"],
    "out_of_scope": ["package.json", "src/", ".git/"],
    "constraints": [
      "MUST create a file with plain text content",
      "MUST NOT modify any source code",
      "MUST verify file was created"
    ]
  },
  "phase_definitions": [
    {
      "phase_id": "PHASE_001_CREATE_TEST",
      "objective": "Create test-output.txt with verification content",
      "allowed_operations": ["write_file", "read_file"],
      "forbidden_operations": ["delete_file", "execute_shell"],
      "required_intent_artifacts": ["test-output.txt.intent.md"],
      "verification_commands": ["test -f test-output.txt && echo 'File created'"],
      "expected_outcomes": ["File test-output.txt exists with content"],
      "failure_stop_conditions": ["File not created", "Content is empty"]
    }
  ],
  "path_allowlist": ["test-output.txt"],
  "verification_gates": [
    "GATE_001: Verify file exists",
    "GATE_002: Verify file contains expected content"
  ],
  "forbidden_actions": [
    "Deleting any file",
    "Modifying non-allowlist files",
    "Writing stub code or TODOs"
  ],
  "rollback_failure_policy": {
    "automatic_rollback_triggers": ["Any write fails"],
    "rollback_procedure": "Delete created files and restore state",
    "recovery_steps": ["Check audit log for failure details"]
  }
}
```

### Validate the Plan

Call:

```bash
lint_plan({ path: "my-first-plan.json" })
```

This will:

1. Validate JSON structure
2. Verify all required sections
3. Check path allowlist (no absolute paths, no `..` escapes)
4. Detect stub patterns (TODO, mock, etc.)
5. Run Spectral linting rules
6. Sign with cosign ECDSA P-256
7. Return signature for filing

### Sign & Save

Once linting passes:

1. You'll receive a signature: `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`
2. Rename plan file: `my-first-plan.json` → `docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.json`
3. Plan is now immutable and cryptographically verified

### Create Intent Artifact

Before writing a file, create an accompanying `.intent.md`:

Save as `test-output.txt.intent.md`:

```markdown
# Intent Artifact: test-output.txt

## Purpose
Verify ATLAS-GATE write pipeline works correctly

## Authorization
- Plan ID: EXAMPLE_SETUP
- Phase: PHASE_001_CREATE_TEST
- Role: WINDSURF

## Content Description
Plain text file with verification message

## Change Justification
Creating minimal test file to confirm all 5 gates pass

## Error Handling
If write fails: Check audit log for gate failures

## Audit Trail
This intent is immutable and hashed in audit-log.jsonl
```

### Execute the Plan

Call:

```bash
write_file({
  path: "test-output.txt",
  content: "ATLAS-GATE working correctly - created at $(date)",
  plan: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o",
  role: "EXECUTABLE",
  purpose: "Create test file for verification",
  intent: "Verify ATLAS-GATE pipeline with minimal test",
  authority: "EXAMPLE_SETUP",
  failureModes: "If any gate fails, abort and log entry"
})
```

The system will:

1. Validate schema
2. Verify plan signature
3. Check intent artifact exists
4. Scan content for stubs
5. Write file to disk
6. Append audit entry

### Check Results

```bash
cat audit-log.jsonl | jq .
cat test-output.txt
```

You should see an immutable audit entry with:

- Session ID
- Plan signature
- File path
- Timestamp
- Cryptographic hash

## Next Steps

1. **Read Planning Guide** → `docs/01-PLANNING_GUIDE.md`
   - How to design real plans
   - All 10 required sections
   - Constraint language rules

2. **Read Execution Guide** → `docs/02-EXECUTION_GUIDE.md`
   - How WINDSURF executes plans
   - Write pipeline details
   - Rollback procedures

3. **Read Templates** → `docs/templates/`
   - Complete plan examples
   - Prompt templates for agents
   - Real-world scenarios

4. **Read Governance** → `docs/SECURITY_AND_GOVERNANCE.md`
   - Hard block policies
   - Audit requirements
   - Recovery procedures

## Common Workflows

### Workflow 1: Fix a Bug

1. ANTIGRAVITY creates plan specifying files to modify
2. ANTIGRAVITY creates plan intent artifact
3. Plan is linted, signed, filed
4. WINDSURF executes: reads plan, validates signature, writes fixes
5. Audit log captures proof of execution

### Workflow 2: Add a Feature

1. ANTIGRAVITY analyzes codebase
2. ANTIGRAVITY designs phased implementation plan
3. Each phase has verification gates
4. Plan is signed and committed
5. WINDSURF executes phase-by-phase with verification between phases
6. If phase fails, plan specifies rollback

### Workflow 3: Security Audit

1. Operator reviews `audit-log.jsonl`
2. Each entry can be traced to plan signature
3. Plan signature can be verified with cosign public key
4. Cryptographic proof of authorization for every write

## Core Files You Need to Know

| File | Purpose |
|------|---------|
| `docs/plans/*.json` | Signed, immutable execution plans |
| `audit-log.jsonl` | Append-only, hash-chained audit trail |
| `.atlas-gate/.cosign-keys/` | Public/private key pair for signing |
| `docs/templates/antigravity_planning_prompt_v2.md` | How to generate plans |
| `docs/templates/windsurf_execution_prompt_v2.md` | How to execute plans |

## Key Constraints

**HARD BLOCKS** (No Exceptions):

- 🚫 TODO, FIXME, XXX comments
- 🚫 mock, fake, dummy data/functions
- 🚫 Policy bypass markers (always allow, SIMULATE, DRY_RUN)
- 🚫 Empty functions or catch blocks
- 🚫 Returning null, undefined, or empty strings

**SOFT BLOCKS** (Plan can override, but must be explicit):

- Type safety bypasses (@ts-ignore, @ts-nocheck)
- Lint bypasses (// eslint-disable)
- Hardcoded returns (return false, return 0)

## Troubleshooting

**Plan won't lint**
→ Check `docs/01-PLANNING_GUIDE.md` for required sections

**Write fails on intent artifact**
→ Ensure `.intent.md` file exists matching `REQUIRED_INTENT_ARTIFACTS` in plan

**Write fails on stub detection**
→ Check error message for which pattern was detected
→ Remove TODO, mock, or incomplete code
→ See `docs/CONSTRUCT_TAXONOMY.md` for complete list

**Cosign signature invalid**
→ Plan file was modified after signing
→ Signature is in `atlas_gate_plan_signature` field
→ Cannot be changed without re-linting

## Architecture Overview

```
HUMAN INPUT
    ↓
ANTIGRAVITY (Planning Agent)
    ↓
lint_plan() → 7-Stage Validation + Cosign Signing
    ↓
docs/plans/<SIGNATURE>.json (Immutable)
    ↓
WINDSURF (Execution Agent)
    ↓
write_file() → 5-Gate Pipeline
    ├─ Gate 1: Schema validation
    ├─ Gate 2: Plan authority (cosign verify)
    ├─ Gate 3: Intent artifact validation
    ├─ Gate 4: Stub detection (AST + regex)
    └─ Gate 5: Audit commit
    ↓
audit-log.jsonl (Hash-Chained)
```

## Support

- **Docs**: `/docs/` directory
- **Examples**: `/examples/` directory
- **Issues**: GitHub issues on the repository
- **Governance**: See `/docs/SECURITY_AND_GOVERNANCE.md`

---

**Status**: Production-Ready v2
**Last Updated**: 2026-03-07
**Author**: Dylan Marriner
