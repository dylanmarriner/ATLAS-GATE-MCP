# ATLAS-GATE MCP TEMPLATES - QUICK REFERENCE

## 📋 Template Files at a Glance

| File | Purpose | Size | When to Use |
|------|---------|------|-------------|
| **PLANNING_PROMPT_UPDATED.md** | Canonical prompt for ANTIGRAVITY planning | 472 lines | Call: `read_prompt("ANTIGRAVITY")` |
| **WINDSURF_EXECUTION_PROMPT_UPDATED.md** | Canonical prompt for WINDSURF execution | 425 lines | Call: `read_prompt("WINDSURF_CANONICAL")` |
| **EXAMPLE_PLAN.md** | Production-ready example plan | 650 lines | Reference for plan structure |
| **TEMPLATES_README.md** | Quick start guide for all templates | 300 lines | Read first to understand system |
| **MIGRATION_GUIDE.md** | Migrate from old templates to new | 400 lines | When updating old plans |
| **QUICK_REFERENCE.md** | This file | - | Quick lookup |

---

## 🚀 Quick Start (60 seconds)

### For ANTIGRAVITY (Planning)

```bash
# 1. Initialize session
call: begin_session(workspace_root="/absolute/path")

# 2. Get canonical prompt
call: read_prompt(name="ANTIGRAVITY")

# 3. Read target files
call: read_file(path="src/file.js")

# 4. Generate plan following PLANNING_PROMPT_UPDATED.md structure

# 5. Save plan with metadata
call: write_file(
  path="docs/plans/PLAN_ID.md",
  content="...complete plan...",
  intent="Implementation plan for [objective]",
  role="VERIFICATION"
)

# 6. Operator validates plan
call: lint_plan(path="docs/plans/PLAN_ID.md")
# → Returns: { status: "VALID", hash: "a1b2c3d4..." }
```

### For WINDSURF (Execution)

```bash
# 1. Initialize session
call: begin_session(workspace_root="/absolute/path")

# 2. Get canonical prompt
call: read_prompt(name="WINDSURF_CANONICAL")

# 3. Load and validate plan
call: read_file(path="docs/plans/PLAN_ID.md")
# Compute SHA256 hash and validate against Plan Signature

# 4. For each file in plan (IN ORDER):
call: write_file(
  path="src/feature.js",
  content="...complete code...",
  intent="Implements feature X",
  role="EXECUTABLE",
  plan="PLAN_ID",
  planSignature="a1b2c3d4...e5f6g7h8"
)

# IMMEDIATELY verify:
call: read_audit_log(limit=1)
# Check: plan_signature, intent, role match exactly

# 5. Run verification commands
npm run test && npm run lint

# 6. Final integrity check
call: verify_workspace_integrity(workspace_root="/absolute/path")

# 7. Report success or failure
```

---

## 📝 Plan Structure (9 Required Sections)

```yaml
---
status: APPROVED
plan_id: PLAN_ID_v1
timestamp: 2026-02-21T14:30:00Z
scope:
  - src/file1.js
  - src/file2.js
governance: ATLAS-GATE-v1
---

# 1. Plan Title

## 2. Plan Metadata
- Plan ID: PLAN_ID_v1
- Version: 1.0
- Author: ANTIGRAVITY
- Status: APPROVED

## 3. Objective
Clear statement of what will be built

## 4. Current State Analysis
Baseline: what exists today

## 5. Scope & Constraints
- Affected files: [list]
- Out of scope: [list]
- Hard constraints: [list]

## 6. Implementation Specification

### Phase: PHASE_IMPLEMENTATION
Phase ID: PHASE_IMPLEMENTATION
Objective: [describe]
Allowed operations: Create files, Modify files
Forbidden operations: Delete files
Required artifacts: [list]
Verification commands: npm test, npm lint
Expected outcomes: [describe success]
Failure stop conditions: [list halt conditions]

### File: src/file.js
Role: EXECUTABLE|BOUNDARY|INFRASTRUCTURE|VERIFICATION
Intent: [What this file does, ≥20 characters]
Content:
\`\`\`javascript
// Complete, production-ready code here
// NO STUBS, NO TODOS
\`\`\`

## 7. Verification Gates
### Gate 1: Code Quality
- Trigger: After implementation
- Check: npm test && npm lint
- Required: Exit code 0, no errors
- Failure: REJECT and ROLLBACK

## 8. Path Allowlist
- src/
- tests/
- docs/

## 9. Forbidden Actions
- MUST NOT modify files outside allowlist
- MUST NOT write stub code
- [additional constraints]

## Rollback Procedure
1. git checkout [files]
2. Delete new files
3. Verify integrity

[SHA256_HASH: placeholder]
```

---

## 🔑 Key Rules

### REALITY LOCK
```
✅ Complete, production-ready code only
❌ NO stubs, TODOs, placeholders, mocks
❌ NO "will implement later"
❌ NO incomplete functions
```

### BINARY LANGUAGE
```
✅ MUST, MUST NOT, SHALL, SHALL NOT
❌ may, should, try to, optional
❌ perhaps, maybe, if possible
```

### PATH FORMAT
```
✅ src/main.js (workspace-relative)
❌ /home/user/project/src/main.js (absolute)
❌ ./src/main.js (contains ./)
```

### METADATA REQUIRED
```javascript
// Every write_file MUST have:
{
  intent: "...", // ≥20 characters, clear description
  role: "EXECUTABLE", // or BOUNDARY|INFRASTRUCTURE|VERIFICATION
  plan: "PLAN_ID",
  planSignature: "64-char-hex-hash"
}
```

### AUDIT VERIFICATION
```javascript
// AFTER every write_file, MUST do:
const result = await read_audit_log({ limit: 1 });
const entry = JSON.parse(result)[0];
// VERIFY:
// - entry.path === path
// - entry.plan_signature === planSignature (case-insensitive)
// - entry.intent === intent
// - entry.role === role
// HALT if any field wrong
```

### PLAN HASHING
```
1. Read plan content (including YAML frontmatter)
2. Strip [SHA256_HASH: ...] footer
3. Compute SHA256 of remaining content
4. Compare: computed === provided (case-insensitive)
5. HALT if mismatch
```

---

## ⚠️ Common Mistakes

| Mistake | ❌ Wrong | ✅ Right |
|---------|---------|----------|
| **Path format** | `/home/user/project/src/file.js` | `src/file.js` |
| **Intent too short** | `"Feature X"` (8 chars) | `"Implements feature X with full error handling"` (47 chars) |
| **Missing role** | `write_file({...})` | `write_file({..., role: "EXECUTABLE"})` |
| **No verification** | Write file, continue | Write file, `read_audit_log()`, verify, then continue |
| **TODOs in code** | `// TODO: implement` | Complete implementation with error handling |
| **Optional wording** | `"should implement"` | `"MUST implement"` |
| **Absolute paths** | `/opt/workspace/` | `workspace_root` parameter |

---

## 📊 Execution Sequence (WINDSURF)

```
Step 1: Session Ignition
├─ begin_session(workspace_root)
└─ read_prompt("WINDSURF_CANONICAL")

Step 2: Plan Validation
├─ read_file(plan_path)
├─ Compute SHA256 hash
└─ Verify hash matches Plan Signature

Step 3: Execute Files (IN ORDER)
├─ write_file(path, content, intent, role, planSignature)
├─ IMMEDIATELY: read_audit_log(limit=1)
├─ Verify audit entry
└─ [Repeat for each file]

Step 4: Verification
├─ npm run test
├─ npm run lint
└─ All commands: exit code 0

Step 5: Integrity Check
└─ verify_workspace_integrity()

Step 6: Report
├─ Success report OR
└─ Failure report + rollback
```

---

## 🛑 HALT Conditions (WINDSURF)

Stop execution IMMEDIATELY if:

1. **Session init fails**: begin_session or read_prompt returns error
2. **Plan unreadable**: read_file(plan_path) fails
3. **Hash mismatch**: Computed SHA256 ≠ Plan Signature
4. **Write fails**: write_file returns error
5. **Audit entry wrong**: read_audit_log shows incorrect metadata
6. **Verification fails**: npm test or npm lint returns non-zero
7. **Integrity violation**: Files outside allowlist modified

On ANY halt:
- [ ] Do NOT continue
- [ ] Generate failure report
- [ ] Initiate rollback
- [ ] STOP execution

---

## 📈 File Complexity Reference

| Type | Lines | Complexity | Example |
|------|-------|-----------|---------|
| **Utility function** | 20-50 | Low | Helper, formatter, validator |
| **Service module** | 100-200 | Medium | Manager, handler, processor |
| **Test suite** | 50-150 | Medium | Unit tests, fixtures |
| **Integration module** | 200-400 | High | Orchestrator, aggregator |
| **Platform feature** | 300-600 | Very High | Full feature with all layers |

All code must be production-ready with complete error handling.

---

## 🔍 Verification Commands

Standard verification commands (in plan):

```bash
# Unit tests
npm run test

# Linting
npm run lint

# Type checking (if TypeScript)
npm run type-check

# Build (if applicable)
npm run build

# Integration tests (if applicable)
npm run test:integration
```

All commands MUST return exit code 0 to proceed.

---

## 💾 Audit Log Entry Structure

Every write_file call creates an audit entry:

```json
{
  "timestamp": "2026-02-21T14:30:00.123Z",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "WINDSURF",
  "workspace_root": "/absolute/path",
  "tool": "write_file",
  "path": "src/feature.js",
  "intent": "Implements feature X with full error handling",
  "role": "EXECUTABLE",
  "plan_signature": "a1b2c3d4e5f6g7h8...(64 hex chars)",
  "phase_id": "PHASE_IMPLEMENTATION",
  "error": null,
  "status": "SUCCESS"
}
```

WINDSURF MUST verify these fields match exactly.

---

## 🎯 Success Criteria Checklist

Plan execution is successful ONLY if:

- [ ] Session initialized (begin_session succeeded)
- [ ] Prompt fetched (read_prompt succeeded)
- [ ] Plan hash validated (computed === provided)
- [ ] All write_file calls succeeded
- [ ] All audit entries recorded with correct metadata
- [ ] All verification commands passed (exit code 0)
- [ ] Workspace integrity check passed (no violations)
- [ ] No files outside allowlist modified
- [ ] All expected files created/modified
- [ ] All dependencies satisfied

If ANY criterion fails → **EXECUTION FAILED**

---

## 📚 Template Versions

**Current Version**: 2.0 (2026-02-21)
- MCP-integrated
- Mandatory session initialization
- Mandatory audit verification
- Mandatory plan hashing
- REALITY LOCK: production-code only
- All 9 plan sections required

**Previous Version**: 1.2 (2026-02-14)
- Basic structure
- Optional MCP integration
- No audit verification
- No plan hashing

---

## 🔗 Related Documentation

- **PLANNING_PROMPT_UPDATED.md**: Full ANTIGRAVITY prompt
- **WINDSURF_EXECUTION_PROMPT_UPDATED.md**: Full WINDSURF prompt
- **EXAMPLE_PLAN.md**: Production example
- **TEMPLATES_README.md**: Complete guide
- **MIGRATION_GUIDE.md**: Old→New migration

---

**Last Updated**: 2026-02-21  
**Status**: Production-Ready  
**Governance**: ATLAS-GATE-v1
