# ATLAS-GATE MCP TEMPLATES INDEX

Complete reference guide to all template files for ANTIGRAVITY (planning) and WINDSURF (execution) agents, optimized for the ATLAS-GATE MCP v2 system.

---

## 📚 All Template Files

### Core Templates (v2.0 - Production-Ready)

#### 1. **antigravity_planning_prompt_v2.md**
**Purpose**: Canonical prompt for ANTIGRAVITY agents to generate sealed implementation plans.

**Key Features**:
- Mandatory `begin_session` initialization.
- Uses `lint_plan` for multi-stage validation and automated signing.
- Defines signature-based save locations in `docs/plans/`.

---

#### 2. **windsurf_execution_prompt_v2.md**
**Purpose**: Canonical prompt for WINDSURF agents to execute signed plans with full governance.

**Key Features**:
- Mandatory `begin_session` and `read_prompt` sequence.
- Signature-based plan discovery and internal verification.
- Precise `write_file` parameter alignment with audit logging.

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

**Index Version**: 2.0  
**Last Updated**: 2026-02-22  
**Status**: Production-Ready
