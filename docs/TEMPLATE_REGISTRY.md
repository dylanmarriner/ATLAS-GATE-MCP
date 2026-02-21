# Atlas-Gate Template Registry

**Status**: ✓ ALL TEMPLATES ALIGNED WITH MCP V2

**Last Updated**: 2026-02-22

**Registry Version**: 2.0

---

## Overview

This registry documents all Atlas-Gate templates, their purposes, and alignment with the ATLAS-GATE MCP.

All templates are designed for use with:
- `atlas-gate-antigravity` (Planning)
- `atlas-gate-windsurf` (Execution)

---

## Template 1: Antigravity Planning Prompt

**File**: `docs/templates/antigravity_planning_prompt_v2.md`

**Purpose**: Instructions for generating signed implementation plans using `lint_plan`.

**Verified**: ✓ YES (V2)

---

## Template 2: Windsurf Execution Prompt

**File**: `docs/templates/windsurf_execution_prompt_v2.md`

**Purpose**: Instructions for executing plans using `begin_session` and `read_prompt`.

**Verified**: ✓ YES (V2)

---

## Template 3: Plan Scaffold

**File**: `docs/templates/plan_scaffold.md`

**Purpose**: Starting point for new plans; follows the exact 7-section structure required by `lint_plan`.

**Verified**: ✓ YES

---

## Verification Methodology

Templates are verified by ensuring they accurately describe the current MCP tool parameters and enforcement logic.

### Commands
```bash
# Verify a plan scaffold
node tools/lint_plan.js --path docs/templates/plan_scaffold.md
```

---

**Registry Status**: ACTIVE
**Templates Status**: PRODUCTION-READY
**Governance**: ATLAS-GATE-v2
