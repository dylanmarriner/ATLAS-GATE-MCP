# ATLAS-GATE MCP TEMPLATES INDEX

Complete reference guide to all template files for ANTIGRAVITY (planning) and WINDSURF (execution) agents, optimized for the ATLAS-GATE MCP v2 system.

---

## 📚 All Template Files

### Core Templates (v2.0 - Production-Ready)

#### 1. **antigravity_planning_prompt_v2.md**

**Purpose**: Canonical prompt for ANTIGRAVITY agents to generate sealed implementation plans.

**Key Features**:

- Mandatory `begin_session` initialization.
- Uses `lint_plan` for validation (returns errors/warnings — does not sign).
- Uses `save_plan` to sign and persist plans to `docs/plans/`.
- Complete ANTIGRAVITY tool list with accurate schemas.

---

#### 2. **windsurf_execution_prompt_v2.md**

**Purpose**: Canonical prompt for WINDSURF agents to execute signed plans with full governance.

**Key Features**:

- Mandatory `begin_session` (no `read_prompt` — that tool does not exist).
- Correct `write_file` schema with intent gate options.
- Signature-based plan verification enforced by MCP server on every write.

---

#### 3. **plan_scaffold.md**

**Purpose**: A clean scaffold for creating new implementation plans.

**Key Features**:

- Guaranteed to pass `lint_plan` structure validation.
- Includes placeholders for all 7 mandatory sections.
- Embedded header comment for signature injection.

---

### Supporting Documentation

#### 4. **TEMPLATE_REGISTRY.md**

**Purpose**: Tracks all active templates and their verification status.

#### 5. **PROMPT_TEMPLATES.md** (Docs Root)

**Purpose**: General guide for setting up AI agents with the ATLAS-GATE MCP.

---

## 📁 File Organization

```
docs/templates/
├── INDEX.md (this file)
├── antigravity_planning_prompt_v2.md
├── windsurf_execution_prompt_v2.md
├── plan_scaffold.md
├── [REFERENCE & EXAMPLES]
│   ├── EXAMPLE_PLAN.md
│   ├── TEMPLATES_README.md
│   └── QUICK_REFERENCE.md
└── [DEPRECATED]
    ├── PLANNING_PROMPT_UPDATED.md
    └── WINDSURF_EXECUTION_PROMPT_UPDATED.md
```

---

## 🚀 Quick Start

1. **For Planning**: Read `antigravity_planning_prompt_v2.md`, follow the workflow, and use `lint_plan` to seal your plan.
2. **For Execution**: Read `windsurf_execution_prompt_v2.md`, initialize your session, and use `write_file` referencing the plan signature.

---

**Index Version**: 2.1
**Last Updated**: 2026-02-24
**Status**: Production-Ready
