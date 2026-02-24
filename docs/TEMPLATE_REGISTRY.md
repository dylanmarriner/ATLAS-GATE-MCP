# Atlas-Gate Template Registry

**Status**: ✓ ALL TEMPLATES ALIGNED WITH MCP V2

**Last Updated**: 2026-02-24

**Registry Version**: 2.1

---

## Overview

This registry documents all Atlas-Gate templates, their purposes, and alignment with the ATLAS-GATE MCP.

All templates are designed for use with:

- `atlas-gate-antigravity` (Planning)
- `atlas-gate-windsurf` (Execution)

---

## Template 1: Antigravity Planning Prompt

**File**: `docs/templates/antigravity_planning_prompt_v2.md`

**Purpose**: Instructions for ANTIGRAVITY agents. Covers `lint_plan` (validation only, returns errors/warnings) and `save_plan` (signs + saves plan to `docs/plans/`).

**Verified**: ✓ YES (V2.1)

---

## Template 2: Windsurf Execution Prompt

**File**: `docs/templates/windsurf_execution_prompt_v2.md`

**Purpose**: Instructions for executing plans. Covers `begin_session`, `read_file`, and `write_file` with the correct intent gate schema.

**Verified**: ✓ YES (V2.1)

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
