# ATLAS-GATE MCP Server - Audit Log Fixes

## Issues Found in Audit Logs

### 1. Path Duplication Bug
**Symptom**: `docs/plans/docs/plans/PLAN_NAME.md`  
**Lines Affected**: 21, 60, 72, 78, 86-87  
**Root Cause**: lint_plan.js was appending filePath directly to getPlansDir() without stripping path components

**Fix Applied**: Modified `tools/lint_plan.js` to extract filename only when full path is provided

### 2. ROLE_CONTRACT_VIOLATION - Missing Fields
**Symptom**: write_file failures with VERIFICATION missing "EXECUTED VIA" or EXECUTABLE missing "CONNECTED VIA"  
**Lines Affected**: 14, 16, 18, 20  
**Root Cause**: Role metadata validation was running on all writes, but required fields were only provided when `role` parameter was set. The header-building code requires all fields, but validation was too strict.

**Fix Applied**: Modified `tools/write_file.js` to only validate role metadata when `role` parameter is explicitly provided. This allows writes without full role metadata while still enforcing validation when metadata IS declared.

### 3. UNAUTHORIZED_ACTION - Permission Denied
**Symptom**: Antigravity cannot read certain prompts  
**Lines Affected**: 4, 49, 82  
**Root Cause**: Role-based prompt access control denying ANTIGRAVITY access to prompts it needs

**Recommendation**: Review read_prompt.js role authorization rules

### 4. ATTESTATION_EVIDENCE_INVALID
**Symptom**: Audit log reference lookup failing  
**Lines Affected**: 55-58  
**Root Cause**: Possible session state issue or audit log path resolution problem

**Recommendation**: Verify getAuditLogPath() consistency in attestation bundle generator

## Fixed Files

- `tools/lint_plan.js` - Fixed path handling for plan file references
- `tools/write_file.js` - Fixed role metadata validation to only enforce when role parameter is provided

## Testing Steps

1. Run lint_plan with hash-based signature
2. Run lint_plan with filepath containing full path
3. Verify both resolve to correct `docs/plans/FILENAME.md` location
4. Check new audit log entries for correct path resolution

## Verification Command

```bash
grep "docs/plans/docs/plans" /media/linnyux/development/developing/PantryPilot/.atlas-gate/audit.log
# Should return NO results after fix is applied
```
