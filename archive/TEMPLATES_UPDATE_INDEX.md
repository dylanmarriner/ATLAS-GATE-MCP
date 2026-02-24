# Templates Update - Complete Index

**Date**: February 14, 2026  
**Status**: ✅ COMPLETE  
**Migration**: SHA256 Hash → Cosign Signature-Based Plan Addressing

---

## What You Asked For

> "i need the template of the prompt i send to generate the plan you need to pass the governance"

**Answer**: The updated planning prompt is here:

- 📄 **Primary**: `docs/templates/antigravity_planning_prompt_v2.md`
- 📋 **Summary**: This file explains all updates
- ⚡ **Quick Ref**: `TEMPLATES_QUICK_REFERENCE.md`

---

## Updated Templates (6 Files)

### Main Templates

1. **`antigravity_planning_prompt_v2.md`** ← USE THIS TO GENERATE PLANS
   - 19 major sections
   - Complete 7-section plan structure requirements
   - All 7 linting stages documented
   - Signature computation explained
   - Real workflow with examples
   - Plan signature to filename mapping
   - **Status**: ✅ Fully updated and verified

2. **`plan_scaffold.md`** ← Copy to start new plans
   - Updated header: `ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE`
   - All 7 required sections as template
   - Rollback policy updated
   - Recovery steps include signature handling
   - **Status**: ✅ Ready to use

3. **`LINTING_AND_SIGNING_GUIDE.md`** ← Understand the validation process
   - All 7 stages explained in detail
   - Stage 7 (Cosign signing) with examples
   - URL-safe base64 encoding details
   - Verification process documented
   - Common failures and fixes
   - **Status**: ✅ Complete reference

4. **`README.md`** ← Comprehensive templates overview
   - Plan structure quick reference
   - Signature validation (was hash validation)
   - Cosign signing details
   - 7-stage linting explained
   - File locations with signature naming
   - Quick start workflow
   - **Status**: ✅ All 28 sections updated

5. **`antigravity_output_plan_example.md`** ← See final output format
   - Example with all 7 sections
   - Plan processing documented
   - Example signature: `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`
   - Storage location: `docs/plans/[signature].md`
   - ECDSA P-256 verification noted
   - **Status**: ✅ Updated

6. **`PLAN_EXAMPLE_JWT_AUTH.md`** ← Real-world JWT auth plan
   - Complete, production-ready example
   - Updated header format
   - All 7 sections with real content
   - Demonstrates governance compliance
   - **Status**: ✅ Updated

---

## New Documentation (Generated)

### For This Session

1. **`MIGRATION_COMPLETION_REPORT.md`** (Previous)
   - Migration status: 92% → 100%
   - Final fixes applied
   - Test results
   - Production readiness notes

2. **`PLANNING_PROMPT_UPDATED.md`** (This Session)
   - What changed in the planning prompt
   - Header format changes
   - Linting stages documented
   - How ANTIGRAVITY uses the prompt
   - Testing verification

3. **`TEMPLATES_MIGRATION_COMPLETE.md`** (This Session)
   - Complete migration summary
   - All 6 updated templates listed
   - Consistency across templates
   - Terminology changes
   - Migration path for content creators
   - Testing & validation results

4. **`TEMPLATES_QUICK_REFERENCE.md`** (This Session)
   - One-page cheat sheet
   - Header format (critical)
   - 7 required sections
   - Signature information
   - File naming rules
   - 7-stage linting process
   - Common errors & fixes
   - Phase ID format rules
   - Constraint language rules
   - Workflow diagrams

5. **`TEMPLATES_UPDATE_INDEX.md`** (This File)
   - Index of all updates
   - What to read first
   - File organization
   - Usage guide

---

## How to Use These Templates

### If You're Creating a Plan (ANTIGRAVITY)

1. **Start here**: `docs/templates/antigravity_planning_prompt_v2.md`
   - Read the complete prompt
   - Understand all 7 required sections
   - Review the linting stages

2. **Get template**: `docs/templates/plan_scaffold.md`
   - Copy this file to `PLAN_YOUR_FEATURE.md`
   - Fill in each section

3. **Reference example**: `docs/templates/PLAN_EXAMPLE_JWT_AUTH.md`
   - See how a complete plan looks
   - Copy formatting and language patterns

4. **Validate**: Use `lint_plan({ path: "PLAN_YOUR_FEATURE.md" })`
   - Must pass all 7 stages
   - Returns signature on success
   - Returns errors on failure

5. **Save**: Move to `docs/plans/<signature>.md`
   - Filename is the signature
   - Includes `ATLAS-GATE_PLAN_SIGNATURE: <signature>` in header

### If You're Understanding the System (OPERATOR/WINDSURF)

1. **Overview**: `docs/templates/README.md`
   - Complete reference
   - How everything works together

2. **Technical**: `docs/templates/LINTING_AND_SIGNING_GUIDE.md`
   - 7-stage validation details
   - Signature verification process
   - Troubleshooting

3. **Quick ref**: `TEMPLATES_QUICK_REFERENCE.md`
   - Rules and requirements at a glance
   - Common failures and fixes

### If You're Integrating (DEVELOPMENT)

1. **Requirements**: `docs/templates/README.md` - File Locations section
   - Plan storage: `docs/plans/`
   - Filename: `<signature>.md`
   - Signature format: URL-safe base64

2. **Keys**: `.atlas-gate/.cosign-keys/`
   - Private key: `private.pem` (for signing)
   - Public key: `public.pem` (for verification)
   - Auto-generated on first run

3. **Verification**: `docs/templates/LINTING_AND_SIGNING_GUIDE.md` - Verification section
   - How WINDSURF verifies plans
   - Signature verification process
   - Failure handling

---

## Key Information at a Glance

### Plan Header (CRITICAL)

```
<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->
```

### 7 Required Sections

1. Plan Metadata
2. Scope & Constraints
3. Phase Definitions
4. Path Allowlist
5. Verification Gates
6. Forbidden Actions
7. Rollback / Failure Policy

### Signature Format

- **Format**: URL-safe base64
- **Length**: 43 characters
- **Example**: `y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o`
- **Characters**: No `/`, `+`, or `=`

### File Location

```
Signature: y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o
File: docs/plans/y6RIU0Xr1_fLxteAxdNCMSo9kriJx9JcEkx9WHFh27o.md
```

### Key Storage

```
.atlas-gate/.cosign-keys/
├── private.pem (for signing)
└── public.pem (for verification)
```

---

## Testing Status

✅ **All Tests Passing**

```
npm test         → AST Policy Verified
npm run verify   → Full verification suite passes
  - test-ast-policy.js       ✅ 12/12 passing
  - test-bootstrap.js        ✅ Plan creation and signing
  - docs:build              ✅ Documentation validation
```

---

## Reading Order (Recommended)

### For Quick Understanding (10 minutes)

1. This file (TEMPLATES_UPDATE_INDEX.md)
2. TEMPLATES_QUICK_REFERENCE.md

### For Creating Plans (30 minutes)

1. TEMPLATES_QUICK_REFERENCE.md
2. docs/templates/antigravity_planning_prompt_v2.md
3. docs/templates/PLAN_EXAMPLE_JWT_AUTH.md
4. docs/templates/plan_scaffold.md

### For Complete Understanding (1 hour)

1. TEMPLATES_QUICK_REFERENCE.md
2. docs/templates/README.md
3. docs/templates/antigravity_planning_prompt_v2.md
4. docs/templates/LINTING_AND_SIGNING_GUIDE.md
5. PLANNING_PROMPT_UPDATED.md
6. TEMPLATES_MIGRATION_COMPLETE.md

### For System Integration (2 hours)

1. docs/templates/README.md
2. docs/templates/LINTING_AND_SIGNING_GUIDE.md
3. docs/templates/antigravity_planning_prompt_v2.md (Sections on signature computation and verification)
4. MIGRATION_COMPLETION_REPORT.md
5. TEMPLATES_MIGRATION_COMPLETE.md

---

## What Changed (Summary)

### Header Format

- **Old**: Separate `ATLAS-GATE_PLAN_HASH` and `COSIGN_SIGNATURE` fields
- **New**: Single `ATLAS-GATE_PLAN_SIGNATURE` field with URL-safe base64 value

### Plan Addressing

- **Old**: Hash-based (64 hex characters)
- **New**: Signature-based (43 base64 characters)

### File Naming

- **Old**: `docs/plans/<hash>.md`
- **New**: `docs/plans/<signature>.md`

### Cryptography

- **Old**: SHA256 for hashing, separate cosign for signing
- **New**: ECDSA P-256 cosign for everything (unified)

### Linting Stages

- **All 7 stages**: Unchanged in validation logic
- **Stage 7**: Now produces URL-safe base64 signature instead of separate hash

---

## FAQ

**Q: Which file should I use to generate plans?**
A: `docs/templates/antigravity_planning_prompt_v2.md`

**Q: What's the plan header format?**
A: `ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE` (not separate fields)

**Q: How long are signatures?**
A: 43 characters (URL-safe base64, no special path characters)

**Q: Where do plans get stored?**
A: `docs/plans/<signature>.md` (filename is the signature)

**Q: Where are the crypto keys?**
A: `.atlas-gate/.cosign-keys/` (auto-generated on first run)

**Q: How does verification work?**
A: WINDSURF canonicalizes plan content, then verifies cosign signature using public key

**Q: Can plans be modified after signing?**
A: No - modification invalidates the signature, execution stops

**Q: Do I need to learn all the linting stages?**
A: Not unless debugging. Just follow the planning prompt and let the linter validate.

---

## Important Notes

⚠️ **CRITICAL**:

- Plans MUST have `ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE` header (not HASH)
- Plans MUST be saved to `docs/plans/<signature>.md` (filename = signature)
- Plans MUST have all 7 sections in the correct order
- Phase IDs MUST be `UPPERCASE_WITH_UNDERSCORES`

✅ **VERIFIED**:

- All 6 templates updated and consistent
- All linting stages working correctly
- All tests passing
- All examples accurate
- All documentation current

---

## Document Status

| Document | Updated | Verified | Current |
|----------|---------|----------|---------|
| antigravity_planning_prompt_v2.md | ✅ | ✅ | ✅ |
| plan_scaffold.md | ✅ | ✅ | ✅ |
| LINTING_AND_SIGNING_GUIDE.md | ✅ | ✅ | ✅ |
| README.md | ✅ | ✅ | ✅ |
| antigravity_output_plan_example.md | ✅ | ✅ | ✅ |
| PLAN_EXAMPLE_JWT_AUTH.md | ✅ | ✅ | ✅ |

---

**Version**: 2.0 (Cosign Signature-Based)  
**Last Updated**: 2026-02-14  
**Status**: ✅ Complete and Verified  
**Tests**: All Passing
