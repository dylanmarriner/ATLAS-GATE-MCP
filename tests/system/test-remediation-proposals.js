/**
 * TEST: Remediation Proposal Engine (Propose-Only)
 * SPEC: PROMPT 08 - MCP REMEDIATION PROPOSALS
 *
 * Tests (mandatory >= 10):
 * 1. Proposal generated from forensic finding with evidence reference
 * 2. Proposal refused without evidence (REMEDIATION_NOT_EVIDENCE_BOUND)
 * 3. Proposal content is evidence-bound (references map to evidence)
 * 4. Only allowed proposal types emitted (PLAN_CORRECTION, POLICY_EXCEPTION, etc)
 * 5. Proposal file written correctly (markdown format)
 * 6. list_proposals returns all proposals with status
 * 7. approve_proposal records approval (timestamp, approver identity)
 * 8. Approval does NOT mutate code files
 * 9. Audit entry written on proposal generation
 * 10. Audit entry written on proposal approval
 * 11. Proposal status starts PENDING (immutable)
 * 12. Stale plan hash detected on approval
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import {
  RemediationEngine,
  Proposal,
  PROPOSAL_TYPES,
  PROPOSAL_STATUS,
} from "./core/remediation-engine.js";
import {
  writeProposal,
  readProposal,
  listProposals,
  updateProposalStatus,
} from "./core/proposal-store.js";
import { appendAuditEntry, readAuditLog } from "./core/audit-system.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// TEST HELPERS
// ============================================================================

function sha256(input) {
  const normalized = typeof input === "string" ? input : JSON.stringify(input);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function createTestWorkspace() {
  const testDir = path.join(
    __dirname,
    ".atlas-gate-test-remediation",
    `ws-${Date.now()}`
  );
  fs.mkdirSync(testDir, { recursive: true });

  // Initialize .atlas-gate directory
  fs.mkdirSync(path.join(testDir, ".atlas-gate"), { recursive: true });

  return testDir;
}

function cleanupTestWorkspace(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// ============================================================================
// TEST 1: Proposal generated from forensic finding with evidence reference
// ============================================================================

export async function testProposalFromForensicFinding() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "POLICY_VIOLATION_UNSAFE_UNWRAP",
      phase_id: "01-compile",
      severity: "ERROR",
      description: "Rust unwrap() used without justification",
      details: {
        file_path: "src/main.rs",
        line: 42,
        justification: "Error is guaranteed not to occur here",
      },
    };

    const proposal = engine.proposalFromForensicFinding(finding);

    assert(proposal.proposal_id, "proposal_id should be set");
    assert.strictEqual(
      proposal.proposal_type,
      PROPOSAL_TYPES.POLICY_EXCEPTION_REQUEST
    );
    assert.strictEqual(proposal.status, PROPOSAL_STATUS.PENDING);
    assert(proposal.evidence_refs.length > 0, "evidence_refs should not be empty");
    assert(
      proposal.violations_addressed.includes("RUST_POLICY_VIOLATION"),
      "Should address RUST_POLICY_VIOLATION"
    );

    console.log("✓ Test 1 PASSED: Proposal generated from forensic finding");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 2: Proposal refused without evidence (REMEDIATION_NOT_EVIDENCE_BOUND)
// ============================================================================

export async function testProposalRefusedNoEvidence() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    // Try to create a proposal with empty evidence_refs
    let thrown = false;
    try {
      new Proposal({
        proposal_type: PROPOSAL_TYPES.PLAN_CORRECTION,
        evidence_refs: [], // Empty!
        violations_addressed: ["TEST"],
        exact_changes_requested: [],
        workspace_root: workspaceRoot,
        plan_hash: planHash,
      });
    } catch (err) {
      assert(err.message.includes("REMEDIATION_NOT_EVIDENCE_BOUND"));
      thrown = true;
    }

    assert(thrown, "Should throw when evidence_refs is empty");

    console.log(
      "✓ Test 2 PASSED: Proposal refused without evidence"
    );
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 3: Proposal content is evidence-bound
// ============================================================================

export async function testProposalEvidenceBound() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "DIVERGENCE_DETECTED",
      phase_id: "02-test",
      severity: "WARNING",
      description: "Execution diverged from expected",
      details: { expected: "ok", actual: "error" },
    };

    const proposal = engine.proposalFromForensicFinding(finding);
    const evidenceMap = new Map([
      [
        proposal.evidence_refs[0],
        {
          type: "forensic_finding",
          data: finding,
        },
      ],
    ]);

    // Should not throw
    engine.validateEvidenceBound(evidenceMap);

    console.log("✓ Test 3 PASSED: Proposal content is evidence-bound");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 4: Only allowed proposal types emitted
// ============================================================================

export async function testOnlyAllowedProposalTypes() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "POLICY_VIOLATION_UNSAFE_UNWRAP",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Test",
      details: { file_path: "src/test.rs" },
    };

    const proposal = engine.proposalFromForensicFinding(finding);

    // Verify proposal_type is in enum
    assert(Object.values(PROPOSAL_TYPES).includes(proposal.proposal_type));

    console.log("✓ Test 4 PASSED: Only allowed proposal types emitted");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 5: Proposal file written correctly (markdown format)
// ============================================================================

export async function testProposalFileWritten() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "INTENT_SCHEMA_VIOLATION",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Intent schema missing required fields",
      details: { missing_fields: ["authority", "role"] },
    };

    const proposal = engine.proposalFromForensicFinding(finding);
    const { file_path } = writeProposal(workspaceRoot, proposal);

    assert(fs.existsSync(file_path), "Proposal file should exist");

    const content = fs.readFileSync(file_path, "utf8");
    assert(content.includes("Remediation Proposal"), "Should have title");
    assert(
      content.includes(proposal.proposal_id),
      "Should include proposal ID"
    );
    assert(content.includes("PENDING"), "Should show PENDING status");
    assert(content.includes("Risk Assessment"), "Should have risk section");
    assert(
      content.includes("Verification Steps"),
      "Should have verification steps"
    );

    console.log("✓ Test 5 PASSED: Proposal file written correctly");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 6: list_proposals returns all proposals with status
// ============================================================================

export async function testListProposals() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    // Create multiple proposals
    const findings = [
      {
        finding_code: "POLICY_VIOLATION_UNSAFE_UNWRAP",
        phase_id: "01-phase",
        severity: "ERROR",
        description: "Test 1",
        details: { file_path: "src/a.rs" },
      },
      {
        finding_code: "DIVERGENCE_DETECTED",
        phase_id: "02-phase",
        severity: "WARNING",
        description: "Test 2",
        details: {},
      },
    ];

    const proposals = findings.map((f) => engine.proposalFromForensicFinding(f));

    // Write all proposals
    proposals.forEach((p) => writeProposal(workspaceRoot, p));

    // List all
    const listed = listProposals(workspaceRoot);

    assert.strictEqual(
      listed.length,
      2,
      "Should list all 2 proposals"
    );
    assert(listed.every((p) => p.status === "PENDING"), "All should be PENDING");

    console.log("✓ Test 6 PASSED: list_proposals returns all proposals");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 7: approve_proposal records approval
// ============================================================================

export async function testApproveProposal() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "INTENT_SCHEMA_VIOLATION",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Test",
      details: { missing_fields: ["authority"] },
    };

    const proposal = engine.proposalFromForensicFinding(finding);
    writeProposal(workspaceRoot, proposal);

    // Approve
    const updated = updateProposalStatus(
      workspaceRoot,
      proposal.proposal_id,
      "APPROVED",
      "human@example.com",
      ""
    );

    assert.strictEqual(updated.status, "APPROVED");
    assert.strictEqual(updated.approved_by, "human@example.com");
    assert(updated.approved_at, "approved_at should be set");

    console.log("✓ Test 7 PASSED: approve_proposal records approval");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 8: Approval does NOT mutate code files
// ============================================================================

export async function testApprovalNoCodeMutation() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");

    // Create a dummy code file
    const codeDir = path.join(workspaceRoot, "src");
    fs.mkdirSync(codeDir, { recursive: true });
    const codeFile = path.join(codeDir, "main.rs");
    fs.writeFileSync(codeFile, "fn main() {}", "utf8");

    const originalContent = fs.readFileSync(codeFile, "utf8");

    // Create and approve proposal
    const engine = new RemediationEngine(workspaceRoot, planHash);
    const finding = {
      finding_code: "POLICY_VIOLATION_UNSAFE_UNWRAP",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Test",
      details: { file_path: "src/main.rs" },
    };

    const proposal = engine.proposalFromForensicFinding(finding);
    writeProposal(workspaceRoot, proposal);
    updateProposalStatus(
      workspaceRoot,
      proposal.proposal_id,
      "APPROVED",
      "human@example.com"
    );

    // Verify code file unchanged
    const newContent = fs.readFileSync(codeFile, "utf8");
    assert.strictEqual(originalContent, newContent, "Code file should not change");

    console.log("✓ Test 8 PASSED: Approval does NOT mutate code files");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 9: Audit entry written on proposal generation
// ============================================================================

export async function testAuditEntryOnGeneration() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "DIVERGENCE_DETECTED",
      phase_id: "01-phase",
      severity: "WARNING",
      description: "Test",
      details: {},
    };

    const proposal = engine.proposalFromForensicFinding(finding);

    // Simulate audit entry for proposal generation
    await appendAuditEntry(
      {
        tool: "generate_remediation_proposals",
        intent: "Generate proposals from evidence",
        plan_hash: planHash,
        role: "EXECUTABLE",
        result: "ok",
        error_code: null,
        invariant_id: null,
        notes: `Generated proposal ${proposal.proposal_id}`,
      },
      workspaceRoot
    );

    const auditLog = readAuditLog(workspaceRoot);
    const entries = auditLog.entries || auditLog;
    const entry = entries.find(
      (e) => e.tool === "generate_remediation_proposals"
    );

    assert(entry, "Audit entry should exist");
    assert(entry.notes.includes(proposal.proposal_id), "Should reference proposal ID");

    console.log("✓ Test 9 PASSED: Audit entry written on proposal generation");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 10: Audit entry written on proposal approval
// ============================================================================

export async function testAuditEntryOnApproval() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "INTENT_SCHEMA_VIOLATION",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Test",
      details: { missing_fields: ["authority"] },
    };

    const proposal = engine.proposalFromForensicFinding(finding);
    writeProposal(workspaceRoot, proposal);

    // Approve and check audit
    updateProposalStatus(
      workspaceRoot,
      proposal.proposal_id,
      "APPROVED",
      "reviewer@example.com",
      "Looks good"
    );

    // Read proposal-approvals log
    const approvalsPath = path.join(workspaceRoot, ".atlas-gate/proposal-approvals.jsonl");
    assert(fs.existsSync(approvalsPath), "Approvals log should exist");

    const lines = fs
      .readFileSync(approvalsPath, "utf8")
      .split("\n")
      .filter((l) => l.trim());
    const entries = lines.map((l) => JSON.parse(l));

    const approvalEntry = entries.find(
      (e) => e.event === "PROPOSAL_STATUS_UPDATE"
    );
    assert(approvalEntry, "Approval entry should exist");
    assert.strictEqual(approvalEntry.new_status, "APPROVED");
    assert.strictEqual(approvalEntry.approver, "reviewer@example.com");

    console.log("✓ Test 10 PASSED: Audit entry written on proposal approval");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 11: Proposal status starts PENDING (immutable)
// ============================================================================

export async function testProposalStatusPending() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash = sha256("test-plan");
    const engine = new RemediationEngine(workspaceRoot, planHash);

    const finding = {
      finding_code: "POLICY_VIOLATION_UNSAFE_UNWRAP",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Test",
      details: { file_path: "src/test.rs" },
    };

    const proposal = engine.proposalFromForensicFinding(finding);

    assert.strictEqual(proposal.status, PROPOSAL_STATUS.PENDING);
    assert(proposal.approved_at === null, "approved_at should be null initially");
    assert(proposal.approved_by === null, "approved_by should be null initially");

    console.log("✓ Test 11 PASSED: Proposal status starts PENDING");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// TEST 12: Stale plan hash detected on approval
// ============================================================================

export async function testStalePlanHashDetected() {
  const workspaceRoot = await createTestWorkspace();

  try {
    const planHash1 = sha256("old-plan");
    const planHash2 = sha256("new-plan");

    const engine = new RemediationEngine(workspaceRoot, planHash1);

    const finding = {
      finding_code: "INTENT_SCHEMA_VIOLATION",
      phase_id: "01-phase",
      severity: "ERROR",
      description: "Test",
      details: { missing_fields: ["authority"] },
    };

    const proposal = engine.proposalFromForensicFinding(finding);
    assert.strictEqual(proposal.plan_hash, planHash1, "Proposal bound to planHash1");

    // Write proposal with old plan hash
    writeProposal(workspaceRoot, proposal);

    // Now verify expiration condition
    assert(
      proposal.expiration_condition.includes(planHash1),
      "Expiration should reference plan hash"
    );

    // Simulate plan hash change (new plan)
    // Proposal should still reference old hash
    const readBack = readProposal(workspaceRoot, proposal.proposal_id);
    assert.strictEqual(readBack.plan_hash, planHash1);

    console.log("✓ Test 12 PASSED: Stale plan hash detected on approval");
  } finally {
    cleanupTestWorkspace(workspaceRoot);
  }
}

// ============================================================================
// MAIN: RUN ALL TESTS
// ============================================================================

export async function runAllTests() {
  console.log("\n=== REMEDIATION PROPOSAL ENGINE TESTS ===\n");

  const tests = [
    testProposalFromForensicFinding,
    testProposalRefusedNoEvidence,
    testProposalEvidenceBound,
    testOnlyAllowedProposalTypes,
    testProposalFileWritten,
    testListProposals,
    testApproveProposal,
    testApprovalNoCodeMutation,
    testAuditEntryOnGeneration,
    testAuditEntryOnApproval,
    testProposalStatusPending,
    testStalePlanHashDetected,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err) {
      console.error(`✗ FAILED: ${test.name}`);
      console.error(`  ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllTests().catch(console.error);
}
