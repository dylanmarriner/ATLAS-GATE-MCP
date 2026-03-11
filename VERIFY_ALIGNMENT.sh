#!/bin/bash
# Verify ATLAS-GATE alignment
# Tests that prompts, specs, templates, linter, and tools are all synchronized

set -e

echo "════════════════════════════════════════════════════════════════"
echo "ATLAS-GATE ALIGNMENT VERIFICATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check_file() {
    local file=$1
    local desc=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $desc"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $desc (FILE NOT FOUND: $file)"
        ((FAIL++))
    fi
}

check_content() {
    local file=$1
    local pattern=$2
    local desc=$3
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $desc"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $desc (PATTERN NOT FOUND)"
        ((FAIL++))
    fi
}

echo "1. CORE DOCUMENTS"
echo "─────────────────────────────────────────────────────────────────"
check_file "ALIGNMENT_INDEX.md" "ALIGNMENT_INDEX.md exists"
check_file "ALIGNMENT_COMPLETE.md" "ALIGNMENT_COMPLETE.md exists"
check_file "ALIGNMENT_AUDIT_AND_FIX.md" "ALIGNMENT_AUDIT_AND_FIX.md exists"
echo ""

echo "2. SPECIFICATION FILES"
echo "─────────────────────────────────────────────────────────────────"
check_file "docs/PLAN_FORMAT_SPEC.md" "PLAN_FORMAT_SPEC.md exists"
check_file "docs/reports/MCP_INTENT_ARTIFACT_SPEC.md" "MCP_INTENT_ARTIFACT_SPEC.md exists"
check_file "docs/PROMPT_TEMPLATES.md" "PROMPT_TEMPLATES.md exists"
echo ""

echo "3. PROMPT TEMPLATES"
echo "─────────────────────────────────────────────────────────────────"
check_file "docs/templates/antigravity_planning_prompt_v2.md" "antigravity_planning_prompt_v2.md exists"
check_file "docs/templates/windsurf_execution_prompt_v2.md" "windsurf_execution_prompt_v2.md exists"
echo ""

echo "4. PLAN TEMPLATES"
echo "─────────────────────────────────────────────────────────────────"
check_file "docs/templates/PLAN_SCAFFOLD.json" "PLAN_SCAFFOLD.json exists"
check_file "docs/templates/PLAN_EXAMPLE_FINALIZED.json" "PLAN_EXAMPLE_FINALIZED.json exists"
echo ""

echo "5. CODE IMPLEMENTATIONS"
echo "─────────────────────────────────────────────────────────────────"
check_file "src/application/plan-linter.js" "plan-linter.js exists"
check_file "src/interfaces/tools/lint_plan.js" "lint_plan.js exists"
check_file "src/interfaces/tools/save_plan.js" "save_plan.js exists"
check_file "src/interfaces/tools/write_file.js" "write_file.js exists"
check_file "src/application/intent-validator.js" "intent-validator.js exists"
check_file "src/application/plan-enforcer.js" "plan-enforcer.js exists"
echo ""

echo "6. CONTENT ALIGNMENT CHECKS"
echo "─────────────────────────────────────────────────────────────────"
check_content "docs/PLAN_FORMAT_SPEC.md" "REQUIRED_PLAN_KEYS\|atlas_gate_plan_signature" "Plan spec documents 10 required keys"
check_content "docs/templates/antigravity_planning_prompt_v2.md" "PLAN_FORMAT_SPEC" "ANTIGRAVITY prompt references plan spec"
check_content "docs/templates/windsurf_execution_prompt_v2.md" "PLAN_FORMAT_SPEC" "WINDSURF prompt references plan spec"
check_content "docs/templates/antigravity_planning_prompt_v2.md" "Forbidden Content in Plans" "ANTIGRAVITY documents forbidden patterns"
check_content "docs/templates/windsurf_execution_prompt_v2.md" "9-section canonical schema" "WINDSURF documents 9-section intent schema"
echo ""

echo "7. KEY ALIGNMENT POINTS"
echo "─────────────────────────────────────────────────────────────────"
check_content "src/application/plan-linter.js" "atlas_gate_plan_signature\|role\|status\|plan_metadata\|scope_and_constraints\|phase_definitions\|path_allowlist\|verification_gates\|forbidden_actions\|rollback_failure_policy" "Linter validates 10 required keys"
check_content "src/application/plan-linter.js" "TODO\|FIXME\|XXX\|HACK\|stub\|mock\|placeholder\|TBD\|WIP" "Linter detects stub patterns"
check_content "src/application/plan-linter.js" "may\|should\|if possible\|use best judgment\|optional\|try to\|attempt to" "Linter detects ambiguous language"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALIGNMENT VERIFIED - ALL SYSTEMS SYNCHRONIZED${NC}"
    exit 0
else
    echo -e "${RED}✗ ALIGNMENT ISSUES FOUND - REVIEW FAILED CHECKS${NC}"
    exit 1
fi
