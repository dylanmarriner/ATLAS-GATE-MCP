# ATLAS-GATE MCP TEMPLATES - Complete Guide

This directory contains the updated templates for working with atlas-gate-mcp. These templates ensure that both ANTIGRAVITY (planning) and WINDSURF (execution) agents operate with complete integration with the MCP tool ecosystem.

---

## Files in This Directory

### 1. PLANNING_PROMPT_UPDATED.md

**Purpose**: The canonical prompt for ANTIGRAVITY agents during planning phases.

**Key features**:
- Mandatory session initialization requirements
- Operator input validation checklist
- Pre-planning analysis phase guidance
- Complete output plan structure with all 9 required sections
- Production-ready code requirements (REALITY LOCK)
- MCP tool usage patterns (read_file, write_file, read_prompt)
- Path resolution rules (workspace-relative only)
- Completeness checklist before plan submission

**When to use**: 
- When ANTIGRAVITY is called via `read_prompt("ANTIGRAVITY")`
- Provides all instructions needed to generate sealed, executable plans

**Key differences from old template**:
- ✅ Explicit MCP tool integration (begin_session, read_prompt, read_file, write_file)
- ✅ Clearer path resolution rules (workspace-relative, no absolute paths)
- ✅ Better session initialization requirements
- ✅ Simplified phase definition syntax
- ✅ Intent and role metadata requirements for all files

---

### 2. WINDSURF_EXECUTION_PROMPT_UPDATED.md

**Purpose**: The canonical prompt for WINDSURF agents during execution phases.

**Key features**:
- Mandatory session initialization and prompt fetching
- Operator input validation (Plan Path, Workspace Root, Plan Signature, Execution Mode)
- 6-step execution sequence (Session Ignition → Plan Verification → Implementation → Verification → Integrity Check)
- Post-operation self-audit (immediate audit log verification after each write)
- Plan hash validation (SHA256 integrity check)
- Fail-closed governance (HALT on any error)
- Rollback procedures with specific git commands
- Complete success criteria checklist

**When to use**:
- When WINDSURF is called via `read_prompt("WINDSURF_CANONICAL")`
- Provides all instructions needed to execute plans with full governance

**Key differences from old template**:
- ✅ MCP-first tool usage (read_file, write_file, read_audit_log only)
- ✅ Post-write audit verification (IMMEDIATE after each write_file call)
- ✅ Plan hash validation with clear SHA256 rules
- ✅ Explicit parameter formats for all MCP tool calls
- ✅ Performance and audit metadata requirements

---

### 3. EXAMPLE_PLAN.md

**Purpose**: A concrete, production-ready example plan showing what ANTIGRAVITY output should look like.

**Demonstrates**:
- Complete YAML frontmatter with all required fields
- All 9 required sections filled out properly
- Two realistic feature implementation files
- One test file with comprehensive test suite
- Complete, production-ready code (NO STUBS, NO TODOS)
- Proper intent descriptions (clear, specific, ≥20 characters)
- Role metadata for each file (EXECUTABLE, BOUNDARY, VERIFICATION)
- File dependencies documented
- Error handling specified
- Verification gates with concrete commands
- Path allowlist definition
- Forbidden actions list
- Rollback procedure
- Success criteria checklist

**Use this as**:
- Template for structuring your own plans
- Reference for code quality expectations
- Example of proper intent and role definitions
- Model for dependency documentation
- Template for test file specifications

---

### 4. TEMPLATE_INTEGRATION_GUIDE.md (partially created)

**Purpose**: Comprehensive guide to how templates work with atlas-gate-mcp (work in progress).

Will document:
- System architecture diagram
- Workflow phases
- MCP tool integration details
- Key patterns for ANTIGRAVITY and WINDSURF
- Common failure modes and recovery
- Best practices

---

## Quick Start

### For ANTIGRAVITY Agents (Planning)

1. **Receive operator input**:
   - Objective (what to build)
   - Target Files (what to modify/create)
   - Constraints (what's forbidden)
   - Success Criteria (how to know it worked)

2. **Initialize session** (if not already done):
   - Call `begin_session(workspace_root)`
   - Call `read_prompt("ANTIGRAVITY")`

3. **Analyze current state**:
   - Use `read_file` to read each target file
   - Understand dependencies and impact
   - Document baseline

4. **Design solution**:
   - Write COMPLETE, production-ready code (no gaps)
   - Specify all error handling
   - Define all integration points
   - Plan verification gates

5. **Generate plan**:
   - Follow PLANNING_PROMPT_UPDATED.md structure
   - Include all 9 required sections
   - Use EXAMPLE_PLAN.md as reference for formatting
   - Ensure every code block is complete

6. **Save plan**:
   - Call `write_file` with:
     - path: "docs/plans/PLAN_ID.md"
     - content: full plan content
     - intent: "Implementation plan for [objective]"
     - role: "VERIFICATION"

7. **Verify plan**:
   - Operator calls `lint_plan` to validate structure and compute hash
   - Plan is sealed with SHA256 hash in footer

---

### For WINDSURF Agents (Execution)

1. **Receive operator input**:
   - Plan Path (workspace-relative, e.g., "docs/plans/PLAN_ID.md")
   - Workspace Root (absolute path)
   - Plan Signature (SHA256 hash, 64-char hex)
   - Execution Mode (FULL or DRY_RUN)

2. **Initialize session**:
   - Call `begin_session(workspace_root)`
   - Call `read_prompt("WINDSURF_CANONICAL")`

3. **Read and validate plan**:
   - Call `read_file(plan_path)` to load plan
   - Compute SHA256 hash (exclude [SHA256_HASH: ...] footer)
   - Compare with Plan Signature (case-insensitive)
   - HALT if hash doesn't match

4. **Execute each file in order**:
   - For each file in plan:
     - Extract path, content, intent, role from plan
     - Call `write_file` with exact parameters
     - IMMEDIATELY call `read_audit_log` with limit=1
     - Verify audit entry has correct metadata
     - HALT if verification fails

5. **Run verification commands**:
   - Execute each command specified in plan (npm test, npm lint, etc.)
   - HALT if any command returns non-zero

6. **Verify workspace integrity**:
   - Call `verify_workspace_integrity`
   - Confirm no files outside allowlist modified

7. **Report results**:
   - Generate success or failure report
   - For failures: include step, error, current state, rollback status

---

## Key Governance Rules

### REALITY LOCK (Most Important)

Every code snippet in every plan MUST be:
- ✅ Production-ready
- ✅ Complete (no stubs, no TODOs, no FIXMEs)
- ✅ Error-handled (all error paths covered)
- ✅ Tested (test cases included)
- ✅ Documented (comments for non-obvious logic)

NO exceptions. NO placeholders. NO incomplete code.

### BINARY LANGUAGE ONLY

Use ONLY these words:
- MUST (required)
- MUST NOT (forbidden)
- SHALL (required)
- SHALL NOT (forbidden)

DO NOT use:
- "may", "might", "could"
- "should", "ought to"
- "try to", "attempt"
- "optional", "if possible"
- "perhaps", "maybe"

### DETERMINISTIC COMPLETENESS

Every plan MUST be:
- ✅ Fully specifiable (no guessing, no interpretation needed)
- ✅ Reproducible (same plan + same workspace = identical results)
- ✅ Verifiable (success criteria are measurable)
- ✅ Atomic (all steps execute or none do)

### MCP TOOL USAGE ONLY

Both agents MUST:
- ✅ Use ONLY atlas-gate-mcp tools for all file I/O
- ✅ Use read_file for all file reads
- ✅ Use write_file for all file creation/modification
- ✅ Use workspace-relative paths only (never absolute paths)
- ✅ Never access native filesystem directly
- ✅ Never emit file content in chat output

### AUDIT TRAIL INTEGRITY

WINDSURF MUST:
- ✅ Call read_audit_log IMMEDIATELY after each write_file
- ✅ Verify the audit entry has correct metadata
- ✅ Check plan_signature matches exactly (case-insensitive, 64-char hex)
- ✅ HALT if audit entry is missing or incorrect

---

## Common Issues and Solutions

### Issue: Plan Validation Fails

**Symptom**: `lint_plan` reports errors

**Check**:
- [ ] All 9 required sections present?
- [ ] YAML frontmatter valid (no syntax errors)?
- [ ] All paths workspace-relative (not absolute)?
- [ ] All code snippets complete (no stubs)?
- [ ] [SHA256_HASH: placeholder] footer present?
- [ ] No markdown formatting in field values (e.g., **bold**)?

**Fix**: Review EXAMPLE_PLAN.md for correct structure, update plan accordingly.

---

### Issue: Hash Mismatch During Execution

**Symptom**: "Hash mismatch: computed X, provided Y"

**Cause**: 
- Footer was modified
- Whitespace changed
- Content edited after sealing

**Fix**:
1. ANTIGRAVITY re-generates plan with new timestamp
2. Operator calls `lint_plan` to compute new hash
3. Operator provides new Plan Signature to WINDSURF
4. WINDSURF retries with new hash

---

### Issue: Audit Entry Incorrect

**Symptom**: "Audit entry has incorrect plan_signature"

**Cause**:
- Wrong planSignature parameter to write_file
- Wrong plan ID used
- Audit system failure

**Fix**:
1. Verify Plan Signature value (compare with original)
2. Verify plan file hash (run `lint_plan`)
3. If planSignature was wrong, WINDSURF corrects it
4. WINDSURF rolls back and retries with correct value

---

### Issue: Verification Command Fails

**Symptom**: "npm run test failed with exit code 1"

**Cause**:
- Plan implementation has bug
- Plan missed a dependency
- Tests incomplete

**Fix**:
1. WINDSURF halts and generates failure report
2. ANTIGRAVITY re-analyzes and fixes implementation
3. ANTIGRAVITY generates new plan with updated code
4. Operator provides new Plan Signature
5. WINDSURF retries execution

---

## Integration Checklist

Before using these templates in your workflow, verify:

- [ ] `begin_session` tool is working (locks workspace root)
- [ ] `read_prompt` tool is working (returns prompt content)
- [ ] `read_file` tool is working (reads workspace-relative paths)
- [ ] `write_file` tool is working (writes with metadata)
- [ ] `read_audit_log` tool is working (returns audit entries as JSON)
- [ ] `lint_plan` tool is working (validates plan structure)
- [ ] `verify_workspace_integrity` tool is working (checks files)
- [ ] audit-log.jsonl is writable and accessible
- [ ] Plans are stored in docs/plans/ directory
- [ ] All paths in tools use workspace-relative resolution

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-21 | MCP-integrated templates with full governance |
| 1.2 | 2026-02-14 | Original templates (basic structure) |

---

## Next Steps

1. **Test with simple plan**: Create a small test plan using EXAMPLE_PLAN.md as reference
2. **Execute test plan**: Have WINDSURF execute it following WINDSURF_EXECUTION_PROMPT_UPDATED.md
3. **Verify audit trail**: Confirm all operations recorded in audit-log.jsonl with correct metadata
4. **Iterate**: Use real plans with full governance enforcement

---

**Last Updated**: 2026-02-21  
**Governance**: ATLAS-GATE-v1  
**Status**: Production-Ready
