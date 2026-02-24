# ANTIGRAVITY Planning Prompt - Updated for Cosign Signatures

**Date**: February 14, 2026  
**Version**: v2 (Updated)  
**Status**: ✅ COMPLETE

## What Changed

The planning prompt template (`docs/templates/antigravity_planning_prompt_v2.md`) has been fully updated to reflect the new **cosign signature-based plan addressing** system.

## Key Updates in the Planning Prompt

### 1. Header Format
**Old**:
```
<!--
ATLAS-GATE_PLAN_HASH: [placeholder - linter will compute]
COSIGN_SIGNATURE: [placeholder - linter will sign]
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->
```

**New**:
```
<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->
```

### 2. Linting Stage 7 (Cosign Signing)
The prompt now correctly documents:
- **Format**: URL-safe base64 (43 characters)
- **Key Storage**: `.atlas-gate/.cosign-keys/private.pem`
- **Return Format**: URL-safe signature, no `/`, `+`, or `=` characters
- **Filename**: Plans use signature as filename: `docs/plans/<signature>.md`

### 3. Signature Computation Section
Updated to explain:
- Strips HTML comment header (lines 1-5)
- Strips existing `ATLAS-GATE_PLAN_SIGNATURE: ...` line (not footer)
- Canonicalizes by removing comments (not just trimming lines)
- Uses EC P-256 private key from `.atlas-gate/.cosign-keys/`
- Returns URL-safe base64 (43 chars, exact example: `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`)

### 4. Save Location Section
**Why signature-based addressing**:
- Plans are looked up by their `ATLAS-GATE_PLAN_SIGNATURE` value
- Signature is cryptographically unique per plan content
- If plan is modified, signature verification fails and execution stops
- Prevents undetected tampering or version confusion

### 5. Workflow (Updated to 9 Steps)
```
1. Receive operator input (Objective, Target Files, Plan ID, Constraints)
2. Analyze target files and current code
3. Design complete solution
4. Generate plan following exact template
5. Write plan to TEMPORARY location (e.g., PLAN_AUTH_V1.md)
6. Lint the plan: lint_plan({ path: "PLAN_AUTH_V1.md" })
   - Runs 7 stages: Structure, Phases, Paths, Enforceability, Auditability, Spectral, Cosign signing
   - Returns: { passed: true, signature: "y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o" }
7. Save to canonical location: docs/plans/<signature>.md
   - Plan now includes: ATLAS-GATE_PLAN_SIGNATURE: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o
8. Fix any lint errors: Modify plan, re-lint, re-save with new signature
9. Deliver to operator:
   - Plan path: docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.md
   - Plan signature: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o (43 chars, URL-safe base64)
   - Public key path: .atlas-gate/.cosign-keys/public.pem
```

### 6. Plan Signature to Filename Mapping
Detailed explanation of how WINDSURF:
1. Receives plan signature from operator
2. Looks for file: `docs/plans/<signature>.md`
3. Loads plan and canonicalizes content
4. Verifies signature using cosign public key
5. If signature invalid: Plan rejected, execution stopped
6. If signature valid: Proceeds with plan execution

### 7. Signature Properties
Documents that signatures:
- Are 43 characters long (URL-safe base64)
- Contain no `/`, `+`, or `=` characters (safe for filenames)
- Use ECDSA P-256 cryptography
- Are unique per plan content (modification invalidates signature)
- Are deterministic (same content always produces same signature)

## Complete Plan Example

The complete plan example in the prompt now uses:
```
<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->
```

Instead of:
```
<!--
ATLAS-GATE_PLAN_HASH: placeholder
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->
```

## Linting Stages (All 7 Documented)

The prompt now clearly explains all 7 linting stages:

1. **Structure Validation**: All 7 required sections present and ordered
2. **Phase Validation**: Phase IDs are `UPPERCASE_WITH_UNDERSCORES`, all fields present
3. **Path Validation**: Workspace-relative paths, no escapes or variables
4. **Enforceability Validation**: No stubs, ambiguous language, or judgment clauses
5. **Auditability Validation**: Plain English objectives, no code symbols
6. **Spectral Linting**: Custom OpenAPI/Spectral rules for plan format
7. **Cosign Signing**: ECDSA P-256 signature generation and storage

## How ANTIGRAVITY Uses This Prompt

When you use this prompt to generate a plan, ANTIGRAVITY will:

1. Generate plan with `ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE` header
2. Create all 7 required sections in correct order
3. Use `UPPERCASE_WITH_UNDERSCORES` for Phase IDs
4. Avoid stub markers (TODO, FIXME, XXX, HACK)
5. Avoid ambiguous language (may, should, optional, try to)
6. Write plain English objectives (no code symbols)
7. List only workspace-relative paths in allowlist
8. Describe plan in binary language (MUST, MUST NOT)

Then when the plan is linted:
1. All 7 validation stages run
2. Plan is signed with cosign (ECDSA P-256)
3. Signature is returned (43 chars, URL-safe base64)
4. Plan is saved to `docs/plans/<signature>.md`
5. Plan now includes `ATLAS-GATE_PLAN_SIGNATURE: <signature>` in header

WINDSURF can then:
1. Load the plan by signature
2. Verify the cosign signature using public key
3. Execute the approved plan

## Testing

The planning prompt has been verified to:
- ✅ Match actual MCP implementation
- ✅ Explain signature-based addressing correctly
- ✅ Document all 7 linting stages accurately
- ✅ Provide correct examples of signatures and filenames
- ✅ Match updated core modules (cosign-hash-provider.js, plan-linter.js, governance.js)

## Related Files Updated

- `docs/templates/LINTING_AND_SIGNING_GUIDE.md` - Signature format and verification
- `docs/templates/README.md` - Plan structure and key storage
- `docs/templates/plan_scaffold.md` - Plan template with new header format
- `docs/templates/antigravity_output_plan_example.md` - Example with signature documentation
- `docs/templates/PLAN_EXAMPLE_JWT_AUTH.md` - JWT auth example with new header

All templates are now consistent in their use of:
- `ATLAS-GATE_PLAN_SIGNATURE` (not HASH)
- URL-safe base64 signatures (not hex hashes)
- Filename-based plan addressing by signature
- ECDSA P-256 cosign verification
- Key storage in `.atlas-gate/.cosign-keys/`

## How to Use This Prompt

When creating a new plan:

1. Copy the prompt from `docs/templates/antigravity_planning_prompt_v2.md`
2. Use it as instructions for plan generation
3. Follow the exact 7-section structure
4. Use the COMPLETE PLAN EXAMPLE as reference
5. Generate plan with `ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE` header
6. Run `lint_plan()` to validate and sign
7. Save to `docs/plans/<signature>.md` with returned signature
8. Deliver signature and public key path to WINDSURF for execution

**Key Rule**: Plans are identified and secured by their cosign signatures, not by plan IDs or hashes. The signature IS the plan identity and tamper-proof proof of authorization.
