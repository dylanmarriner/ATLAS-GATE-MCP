import fs from "fs";
import { lintPlanHandler } from "./tools/lint_plan.js";

const VALID_PLAN = `<!--
ATLAS-GATE_PLAN_SIGNATURE: PENDING_SIGNATURE
ROLE: ANTIGRAVITY
STATUS: APPROVED
-->

# Plan Metadata
Plan ID: PLAN_TEST_01
Version: 1.0.0
Author: ANTIGRAVITY
Status: APPROVED
Timestamp: 2026-02-24T12:00:00Z
Governance: ATLAS-GATE-v2

# Scope & Constraints
Scope: /**
Constraints: Testing

# Phase Definitions
## Phase: SETUP
Phase ID: SETUP
Objective: Test the things
Allowed operations: read
Forbidden operations: write
Required intent artifacts: none
Verification commands: echo "done"
Expected outcomes: Success
Failure stop conditions: Error

# Path Allowlist
- test.txt

# Verification Gates
1. Run tests

# Forbidden Actions
- Delete database

# Rollback / Failure Policy
- Stop
`;

async function main() {
  process.argv.push("--role=ANTIGRAVITY");

  console.log("\n2. LINT PLAN (Testing Spectral)");
  const lintRes = await lintPlanHandler({ content: VALID_PLAN });
  console.log(lintRes.content[0].text);
}
main().catch(console.error);
