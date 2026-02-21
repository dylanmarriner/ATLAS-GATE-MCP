# TEMPLATE MIGRATION GUIDE

This guide explains what changed in the updated templates and how to migrate from the old template workflow to the new MCP-integrated workflow.

---

## What Changed

### Overview

The updated templates are tightly integrated with atlas-gate-mcp tools, requiring all file I/O to go through MCP. The old templates assumed direct filesystem access and were less specific about MCP integration.

| Aspect | Old Template | New Template |
|--------|--------------|--------------|
| **File reads** | Assumed direct filesystem access | MUST use `read_file` tool |
| **File writes** | Mentioned MCP but not required | MUST use `write_file` tool exclusively |
| **Path format** | Mix of absolute and relative | MUST be workspace-relative only |
| **Session init** | Optional guidance | MANDATORY: begin_session + read_prompt |
| **Audit verification** | Not specified | MANDATORY: read_audit_log after each write |
| **Plan hashing** | Basic mention | Detailed SHA256 validation rules |
| **Failure handling** | General guidelines | Specific HALT conditions and rollback steps |
| **Metadata** | Optional intent/role | MANDATORY intent (≥20 chars) and role |
| **Code quality** | "No TODOs" | REALITY LOCK: zero tolerance for stubs |

---

## Side-by-Side Comparison

### Planning Phase

#### Old Template Approach

```
1. Read requirements
2. (Optional) Call begin_session
3. (Option: Direct filesystem read)
4. Design solution
5. Write plan markdown
6. (Optional) Validate plan structure
7. Save to docs/plans/
```

#### New Template Approach

```
1. Call begin_session(workspace_root) [MANDATORY]
2. Call read_prompt("ANTIGRAVITY") [MANDATORY]
3. For each target file:
   - Call read_file(path) [MANDATORY, no direct filesystem]
4. Analyze dependencies and design solution
5. Generate plan following EXACT structure (9 sections)
6. Call write_file with intent and role metadata [MANDATORY]
7. Operator calls lint_plan to compute SHA256 hash
8. Plan is sealed with [SHA256_HASH: ...] footer
```

**Key differences**:
- ✅ Session initialization is mandatory
- ✅ read_file is mandatory (no native filesystem reads)
- ✅ write_file is mandatory for plan saving
- ✅ Plan structure is more rigid (all 9 sections required)
- ✅ Metadata is mandatory (intent, role)
- ✅ Plan is sealed with cryptographic hash

---

### Execution Phase

#### Old Template Approach

```
1. Read plan from file
2. Parse plan structure
3. Extract file specifications
4. For each file:
   - Validate it's in allowlist
   - Write file (optional metadata)
   - (Optional) Verify write
5. Run verification commands
6. (Optional) Check workspace integrity
```

#### New Template Approach

```
1. Call begin_session(workspace_root) [MANDATORY]
2. Call read_prompt("WINDSURF_CANONICAL") [MANDATORY]
3. Call read_file(plan_path) to load plan [MANDATORY]
4. Compute SHA256 hash and validate:
   - Strip [SHA256_HASH: ...] footer
   - Hash remaining content
   - Compare with provided Plan Signature (case-insensitive)
   - HALT if mismatch
5. For each file in plan (IN ORDER):
   - Extract path, content, intent, role, dependencies
   - Call write_file with EXACT metadata [MANDATORY]
   - IMMEDIATELY call read_audit_log(limit=1) [MANDATORY]
   - Verify audit entry matches exactly
   - HALT if verification fails
6. Execute verification commands
   - HALT if any command returns non-zero
7. Call verify_workspace_integrity
   - Confirm no files outside allowlist
8. Generate success or failure report
```

**Key differences**:
- ✅ Session initialization is mandatory
- ✅ Plan hash validation is mandatory (not optional)
- ✅ Audit log verification is mandatory after EACH write
- ✅ Execution order is strict (file-by-file, in order)
- ✅ HALT conditions are explicit (not suggestions)
- ✅ Metadata verification is mandatory

---

## Detailed Changes

### 1. Session Initialization

**OLD**: "Call begin_session if needed"

**NEW**: "MANDATORY. Call begin_session before any other operations."

```javascript
// NEW - Required before anything else
await begin_session({ workspace_root: "/absolute/path" });
```

**Why**: Locks workspace root globally, prevents scope creep.

---

### 2. File I/O

**OLD**: "Use MCP tools or native filesystem"

**NEW**: "MANDATORY MCP tools only. No native filesystem access."

```javascript
// OLD - Allowed native filesystem
const content = require('fs').readFileSync('./src/file.js', 'utf8');

// NEW - Only MCP tool
const result = await read_file({ path: 'src/file.js' });
const content = result.content[0].text;
```

**Why**: Audit trail integrity, workspace boundary enforcement.

---

### 3. Path Format

**OLD**: "Use workspace-relative or absolute paths"

**NEW**: "MANDATORY workspace-relative ONLY. No absolute paths."

```javascript
// OLD - Both were allowed
'src/file.js'                    // relative
'/home/user/project/src/file.js' // absolute

// NEW - Only relative
'src/file.js'  // ✅ correct
'/home/user/project/src/file.js' // ❌ error
```

**Why**: MCP resolves all paths relative to locked workspace root.

---

### 4. Plan Structure

**OLD**: "Include objectives, scope, phases, verification"

**NEW**: "MANDATORY all 9 sections in exact order"

```
OLD could skip sections or reorder them:
1. Metadata (optional)
2. Objective (required)
3. Implementation (required)
4. Phases (required)
... (others optional)

NEW - All 9 required in order:
1. YAML Frontmatter (required)
2. Plan Metadata (required)
3. Scope & Constraints (required)
4. Implementation Specification (required)
5. Path Allowlist (required)
6. Verification Gates (required)
7. Forbidden Actions (required)
8. Rollback Procedure (required)
9. Hash Footer (required)
```

**Why**: Enables deterministic parsing and validation.

---

### 5. Metadata Requirements

**OLD**: "Intent and role are optional"

**NEW**: "MANDATORY. Intent ≥20 chars, role is one of 4 values"

```javascript
// OLD - Optional
write_file({ path: 'src/file.js', content: '...' })

// NEW - Required
write_file({
  path: 'src/file.js',
  content: '...',
  intent: 'Implements feature X with complete error handling',  // ≥20 chars
  role: 'EXECUTABLE'  // one of: EXECUTABLE, BOUNDARY, INFRASTRUCTURE, VERIFICATION
})
```

**Why**: Audit trail clarity, intent traceability.

---

### 6. Plan Hashing

**OLD**: "Optional plan hashing"

**NEW**: "MANDATORY SHA256 hash validation"

```javascript
// OLD - Hash was optional
// Plan might not have hash footer

// NEW - Hash is required and validated
// Plan footer: [SHA256_HASH: a1b2c3d4...e5f6g7h8] (64-char hex)
// 
// WINDSURF MUST:
// 1. Extract hash from footer
// 2. Compute SHA256 of plan content (excluding footer)
// 3. Compare: computed === provided (case-insensitive)
// 4. HALT if mismatch
```

**Why**: Cryptographic integrity verification of sealed plans.

---

### 7. Audit Verification

**OLD**: "Audit operations as they happen"

**NEW**: "MANDATORY: Verify audit entry IMMEDIATELY after each write"

```javascript
// OLD - Fire and forget
write_file({ path: '...', ... });

// NEW - Verify immediately
write_file({ path: '...', ... });
// IMMEDIATELY after, MUST do:
const auditResult = await read_audit_log({ limit: 1 });
const entry = JSON.parse(auditResult.content[0].text)[0];
// MUST verify:
// - entry.path === path (exact match)
// - entry.plan_signature === planSignature (case-insensitive hex)
// - entry.intent === intent (exact match)
// - entry.role === role (exact match)
// HALT if ANY field wrong
```

**Why**: Detect audit system failures immediately, prevent partial writes.

---

### 8. Failure Handling

**OLD**: "Halt on critical errors, continue if possible"

**NEW**: "HALT on ANY error. No continued execution."

```javascript
// OLD - Could continue after some errors
try {
  write_file(...);
} catch (e) {
  if (isRecoverable(e)) {
    // Attempt recovery, continue
  } else {
    // Halt
  }
}

// NEW - HALT on ANY error
try {
  write_file(...);
  await verify_write(); // IMMEDIATE verification
} catch (e) {
  // HALT: no recovery attempted
  // Generate failure report
  // Initiate rollback
  // STOP execution
}
```

**Why**: Fail-closed governance prevents partial execution corruption.

---

### 9. Code Quality

**OLD**: "No TODOs or stubs allowed"

**NEW**: "REALITY LOCK: Zero tolerance for incomplete code"

```javascript
// OLD - Might accept placeholder functions
export function featureX() {
  // TODO: implement this
  return null;
}

// NEW - REJECTED by write_file
export function featureX() {
  // TODO: implement this  ← REJECTED
  return null;
}

// NEW - ACCEPTED
export function featureX(param) {
  // Validate input
  if (!param) {
    throw new Error('featureX requires param');
  }
  
  // Implement full logic with error handling
  try {
    const result = processParam(param);
    return result;
  } catch (e) {
    // Handle error
    console.error('featureX failed:', e);
    throw new Error(`featureX error: ${e.message}`);
  }
}
```

**Why**: Production-ready code guarantee, no incomplete implementations.

---

## Migration Checklist

If you have existing plans created with the old template, here's how to migrate:

### Step 1: Review Old Plan

- [ ] Plan exists in docs/plans/
- [ ] Identify plan_id and objective
- [ ] List all files that will be modified

### Step 2: Validate Against New Template

- [ ] Does plan have all 9 required sections?
- [ ] Is YAML frontmatter present and valid?
- [ ] Are all paths workspace-relative?
- [ ] Is every code block complete (no TODOs)?
- [ ] Does every file have intent (≥20 chars) and role?
- [ ] Does plan have [SHA256_HASH: placeholder] footer?

### Step 3: Update Plan Structure (If Needed)

- [ ] Add missing YAML frontmatter if absent
- [ ] Ensure all 9 sections are present
- [ ] Reformat sections to match new template exactly
- [ ] Add intent descriptions for each file
- [ ] Add role metadata for each file
- [ ] Add [SHA256_HASH: placeholder] footer

### Step 4: Complete Code Snippets

- [ ] Remove any TODOs or FIXMEs
- [ ] Complete placeholder functions
- [ ] Add error handling where missing
- [ ] Add tests for new functionality
- [ ] Remove any stubs or mocks

### Step 5: Save Updated Plan

```javascript
// Use new write_file approach
await write_file({
  path: "docs/plans/OLD_PLAN_ID_migrated.md",
  content: updatedPlanContent,
  intent: "Migrated plan from v1 template to v2 MCP-integrated template",
  role: "VERIFICATION"
});
```

### Step 6: Validate Plan

```javascript
// Use lint_plan to validate new structure
const result = await lint_plan({
  path: "docs/plans/OLD_PLAN_ID_migrated.md"
});

// If valid:
// - Use new Plan ID with migrated suffix
// - Get Plan Signature hash from lint_plan result
// - Execute with WINDSURF using new execution template
```

---

## Execution Migration

### Old WINDSURF Workflow

```
1. Read plan (any method)
2. Parse plan informally
3. Execute files as found
4. Optionally verify writes
5. Run tests
6. Report results
```

### New WINDSURF Workflow

```
1. Call begin_session (MANDATORY)
2. Call read_prompt("WINDSURF_CANONICAL") (MANDATORY)
3. Call read_file(plan_path) (MANDATORY)
4. Validate plan hash (MANDATORY)
5. For each file (IN ORDER):
   - Call write_file with metadata (MANDATORY)
   - Call read_audit_log (MANDATORY)
   - Verify audit entry (MANDATORY)
   - HALT on any error (MANDATORY)
6. Run verification commands (MANDATORY)
7. Call verify_workspace_integrity (MANDATORY)
8. Report with complete context (MANDATORY)
```

**Key difference**: Old workflow was more flexible, new workflow is deterministic and auditable.

---

## Backward Compatibility

### What BREAKS with New Templates

Old plans that:
- [ ] Use absolute paths (must convert to relative)
- [ ] Don't have proper YAML frontmatter (must add)
- [ ] Are missing sections (must add all 9)
- [ ] Have incomplete code (must complete)
- [ ] Don't have [SHA256_HASH: ...] footer (must add)

These plans MUST be updated or re-generated to execute under the new template.

### What WORKS Unchanged

- Old plan IDs and naming conventions
- Existing audit-log.jsonl format (no changes)
- Existing file structure and workspace layout
- Previous execution history (still auditable)

---

## Testing Migration

### Test 1: Simple Plan Migration

1. Take an old completed plan
2. Reformat to new template structure
3. Run `lint_plan` to validate
4. Execute with WINDSURF using new template
5. Verify all operations recorded with correct metadata

### Test 2: Audit Trail Validation

1. Execute plan with new WINDSURF template
2. Call `read_audit_log` to retrieve entries
3. Verify each entry has:
   - Correct `plan_signature` (64-char hex)
   - Correct `intent` (matches plan)
   - Correct `role` (EXECUTABLE|BOUNDARY|INFRASTRUCTURE|VERIFICATION)
   - Correct `path` (workspace-relative)

### Test 3: Hash Validation

1. Generate new plan with ANTIGRAVITY
2. Save plan with write_file
3. Operator runs `lint_plan`
4. Copy [SHA256_HASH: ...] value from lint output
5. Execute with WINDSURF using hash as Plan Signature
6. Verify hash matches exactly (case-insensitive)

---

## Common Migration Issues

### Issue: Plan has Absolute Paths

**Old**: `/home/user/project/src/file.js`
**New**: `src/file.js`

**Fix**: Replace all absolute paths with workspace-relative paths.

---

### Issue: Missing YAML Frontmatter

**Old**: Plan starts with `# Plan Title`
**New**: Plan starts with `---\nstatus: APPROVED\n...`

**Fix**: Add YAML frontmatter to top of plan.

---

### Issue: Code Has TODOs

**Old**: Some incomplete implementations allowed
**New**: ZERO tolerance for stubs

**Fix**: Complete all functions, add error handling, implement fully.

---

### Issue: No Hash Footer

**Old**: Plan might not have footer
**New**: [SHA256_HASH: ...] is required

**Fix**: Add `[SHA256_HASH: placeholder]` to very end of plan.

---

## When to Migrate

**Migrate immediately if**:
- [ ] You're starting new planning work
- [ ] You need audit trail integrity
- [ ] You're using WINDSURF for execution
- [ ] You want cryptographic plan verification

**Can postpone if**:
- [ ] You have old completed plans that don't need modification
- [ ] You're not using WINDSURF for execution
- [ ] You don't need audit trail verification

**MUST migrate if**:
- [ ] You want to use new atlas-gate-mcp tools
- [ ] You need plan hash validation
- [ ] You need audit log verification after each write

---

## Support and Questions

If migrating causes issues:

1. **Validate old plan structure**: `lint_plan(oldPlanPath)`
2. **Review error messages**: What sections are missing?
3. **Compare to EXAMPLE_PLAN.md**: Structure correct?
4. **Check PLANNING_PROMPT_UPDATED.md**: Missing requirements?
5. **Verify code completeness**: Any TODOs or stubs?

---

**Migration Version**: 1.0  
**Date**: 2026-02-21  
**Status**: Production-Ready
