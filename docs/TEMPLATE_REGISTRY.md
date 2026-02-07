# Atlas-Gate Template Registry

**Status**: ✓ ALL TEMPLATES VERIFIED AND PRODUCTION-READY

**Last Updated**: 2026-02-08

**Registry Version**: 1.0

---

## Overview

This registry documents all Atlas-Gate templates, their purposes, hashes, and verification status.

All templates are:
- ✓ Deterministically hashed using SHA256
- ✓ Hash-verified at each use
- ✓ Immutable by design (content changes produce different hash)
- ✓ Production-ready for immediate use

---

## Template 1: Output Plan Example

**File**: `docs/templates/antigravity_output_plan_example.md`

**Type**: Example Implementation Plan

**Purpose**: Demonstrates the exact format and structure that actual implementation plans must follow to pass linting.

**Hash**: `169ec4c03f6a20adfe8b846a38298b38706585e8111a2c4e8306baae75657d88`

**Verified**: ✓ YES

**Use Cases**:
- Reference for plan structure
- Template for generating new plans
- Validation example for linting tests
- Documentation of plan format requirements

**Key Sections**:
- Plan Metadata (with ID, version, governance)
- Scope & Constraints (affected files, out of scope, constraints)
- Phase Definitions (single phase with all required fields)
- Path Allowlist (workspace-relative paths)
- Verification Gates (multiple gates with clear success criteria)
- Forbidden Actions (binary language constraints)
- Rollback / Failure Policy (comprehensive rollback procedure)

**Requirements Met**:
- ✓ All 7 required sections present
- ✓ Phase ID in correct format (PHASE_CORE_IMPLEMENTATION)
- ✓ All phase fields present and plain text
- ✓ No ambiguous language
- ✓ Passes linting validation
- ✓ Hash footer embedded and verified

---

## Template 2: Planning Prompt for ANTIGRAVITY

**File**: `docs/templates/antigravity_planning_prompt_template.md`

**Type**: Prompt Template for Plan Generation

**Purpose**: Provides ANTIGRAVITY with comprehensive instructions for generating valid Atlas-Gate implementation plans.

**Hash**: `aeb41114559a6c480b2750d5c8df73806b5bcfc9627a66b3e9f67a0cd1ba4ff2`

**Verified**: ✓ YES

**Use Cases**:
- Prompting ANTIGRAVITY to generate plans
- Training material for plan structure
- Reference for plan generation requirements
- Constraint specification document

**Key Content**:
- Template instructions (how to use the template)
- Operator input requirements
- Global hard constraints
- Output plan structure with examples
- All 8 required sections with descriptions
- Phase definition format with field explanations
- Path allowlist requirements
- Completeness checklist for verification

**Important Notes**:
- This is a TEMPLATE for generating plans, not itself a plan
- Contains inline examples of plan structure
- Emphasizes "NO AMBIGUOUS LANGUAGE" requirement
- Specifies binary language requirement (MUST, MUST NOT)
- Includes determinism requirement for operations
- Documents hash footer requirement

---

## Template 3: Execution Prompt for Windsurf

**File**: `docs/templates/windsurf_implementation_prompt_template.md`

**Type**: Prompt Template for Plan Execution

**Purpose**: Provides Windsurf with comprehensive instructions for executing Atlas-Gate implementation plans.

**Hash**: `7f7cc7a8293bd2cc36556f528ea4a42f9d2522f764f22ae3c53287117906b30c`

**Verified**: ✓ YES

**Use Cases**:
- Prompting Windsurf to execute plans
- Training material for plan execution
- Reference for execution sequence requirements
- Audit trail specification document

**Key Content**:
- Role and responsibilities
- Mandatory 10 engineering skills to load
- Operator input specification
- Global hard enforcements
- 7-step execution sequence (mandatory order)
- Failure handling procedures
- Success criteria
- Audit trail requirements
- Execution checklist

**Execution Sequence**:
1. Governance Ignition (begin_session, read_prompt)
2. Load All Skills
3. Read and Verify Plan
4. Validate Plan Integrity (hash check)
5. Execute Implementation Sequence (write_file with audit)
6. Execute Verification Commands
7. Final Integrity Check

**Important Notes**:
- Specifies MANDATORY ORDER of steps
- Emphasizes HALT CONDITION at each step
- Requires immediate post-operation audit verification
- Documents complete failure handling with rollback
- Specifies audit trail requirements

---

## Template Compatibility Matrix

| Component | Output Example | Planning Prompt | Execution Template |
|-----------|---|---|---|
| Contains implementation code | ✓ | ✗ | ✗ |
| Passes linting validation | ✓ | ✗ | ✗ |
| Self-referential hash | ✓ | ✓ | ✓ |
| Deterministic hash | ✓ | ✓ | ✓ |
| For plan generation | ✗ | ✓ | ✗ |
| For plan execution | ✗ | ✗ | ✓ |
| For reference/docs | ✓ | ✓ | ✓ |

---

## Hash Verification Commands

To verify any template hash:

```bash
# Compute template hash
node -e "
import { computePlanHash } from './core/plan-linter.js';
import fs from 'fs';
const content = fs.readFileSync('./docs/templates/[TEMPLATE_NAME].md', 'utf8');
console.log(computePlanHash(content));
"

# Lint a template (if it's an actual plan)
node -e "
import { lintPlanHandler } from './tools/lint_plan.js';
import fs from 'fs';
import { computePlanHash } from './core/plan-linter.js';
const content = fs.readFileSync('./docs/templates/[TEMPLATE_NAME].md', 'utf8');
const hash = computePlanHash(content);
const result = await lintPlanHandler({ content, hash });
console.log(JSON.parse(result.content[0].text));
"
```

---

## Using Templates Effectively

### For Plan Generation (Use Template 2)

1. Load `antigravity_planning_prompt_template.md`
2. Fill in operator inputs (objective, files, plan ID, timestamp)
3. Follow template instructions to generate plan
4. Ensure output matches structure in Template 1
5. Run generated plan through linter
6. Obtain hash from linter
7. Inject hash into plan footer

### For Plan Execution (Use Template 3)

1. Load `windsurf_implementation_prompt_template.md`
2. Receive plan path, workspace root, and plan hash from operator
3. Follow 7-step execution sequence
4. HALT at any failure
5. Execute rollback if needed
6. Maintain complete audit trail

### For Reference (Use Template 1)

1. Examine actual plan structure and content
2. Reference when generating new plans
3. Compare generated plans against example
4. Verify all sections match example format

---

## Verification History

| Date | Action | Result |
|------|--------|--------|
| 2026-02-08 | Created Template 1 (Output Example) | ✓ PASSED |
| 2026-02-08 | Updated Template 2 (Planning Prompt) | ✓ VERIFIED |
| 2026-02-08 | Updated Template 3 (Execution Template) | ✓ VERIFIED |
| 2026-02-08 | Final hash computation | ✓ COMPLETE |
| 2026-02-08 | System verification | ✓ ALL PASS |

---

## Template Integrity

All templates are immutable. Any modification to a template will produce a different hash and must be re-registered.

Current Status:
- ✓ All templates hashed
- ✓ All hashes deterministic
- ✓ No modifications in progress
- ✓ Registry locked for reference

---

## Support and Updates

To use these templates:

1. Reference this registry for latest hashes
2. Verify template hash before use
3. Report any discrepancies to the governance team
4. Request new templates through formal change process

Any changes to templates require:
- Re-computation of hash
- Update to this registry
- Audit log entry
- Governance approval

---

**Registry Status**: ACTIVE
**Templates Status**: PRODUCTION-READY
**Governance**: ATLAS-GATE-v1
