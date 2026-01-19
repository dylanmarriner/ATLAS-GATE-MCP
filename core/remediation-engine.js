/**
 * ROLE: EXECUTABLE
 * PURPOSE: Propose-only remediation engine - generates evidence-bound proposals without mutations
 * AUTHORITY: KAIZA MCP REMEDIATION PROPOSAL SYSTEM (PROPOSE-ONLY)
 *
 * Consumes forensic/audit/error evidence and emits structured proposals for human review.
 * All proposals are evidence-bound: every change maps to cited forensic finding.
 * No automatic fixes. Proposals stay PENDING until explicit human approval.
 *
 * SPEC: PROMPT 08 - MCP REMEDIATION PROPOSALS (PROPOSE-ONLY)
 */

import crypto from "crypto";
import { SYSTEM_ERROR_CODES } from "./system-error.js";

/**
 * Proposal types (strict enum)
 */
export const PROPOSAL_TYPES = {
  PLAN_CORRECTION: "PLAN_CORRECTION",
  POLICY_EXCEPTION_REQUEST: "POLICY_EXCEPTION_REQUEST",
  INTENT_CORRECTION: "INTENT_CORRECTION",
  EXECUTION_RETRY: "EXECUTION_RETRY",
  INVESTIGATION_REQUIRED: "INVESTIGATION_REQUIRED",
};

/**
 * Proposal status (only human can transition from PENDING)
 */
export const PROPOSAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/**
 * Generate deterministic proposal ID from content
 */
function generateProposalId(evidence_hash, proposal_type) {
  const input = `${evidence_hash}-${proposal_type}-${Date.now()}`;
  return "PROP-" + crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
}

/**
 * REMEDIATION ENGINE: Main interface
 * 
 * Inputs:
 * - workspace_root: absolute path to workspace
 * - plan_hash: SHA256 plan hash (validates against stale proposals)
 * - evidence: array of evidence objects (forensic findings, audit entries, errors)
 * 
 * Output:
 * - Array of Proposal objects (PENDING status, no mutations)
 * 
 * Throws:
 * - REMEDIATION_EVIDENCE_INSUFFICIENT (missing required evidence)
 * - REMEDIATION_SCOPE_EXCEEDED (proposal exceeds bounds)
 */
export class RemediationEngine {
  constructor(workspace_root, plan_hash) {
    if (!workspace_root || typeof workspace_root !== "string") {
      throw new Error("REMEDIATION_INVALID_WORKSPACE: workspace_root required");
    }
    if (!plan_hash || typeof plan_hash !== "string") {
      throw new Error("REMEDIATION_INVALID_PLAN: plan_hash required");
    }

    this.workspace_root = workspace_root;
    this.plan_hash = plan_hash;
    this.proposals = [];
  }

  /**
   * Generate proposals from forensic replay findings
   * 
   * Evidence format:
   * {
   *   finding_code: string (TAMPER_*, DIVERGENCE_*, etc),
   *   phase_id: string,
   *   severity: "ERROR" | "WARNING",
   *   description: string,
   *   details: object,
   * }
   */
  proposalFromForensicFinding(finding) {
    if (!finding.finding_code) {
      throw new Error("REMEDIATION_EVIDENCE_INSUFFICIENT: finding_code required");
    }

    const evidence_hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(finding))
      .digest("hex");

    // Map finding codes to proposal types
    let proposal_type = null;
    let violations_addressed = [];
    let exact_changes_requested = [];
    let risk = "MEDIUM";

    // Forensic findings that can be remediated
    if (finding.finding_code === "POLICY_VIOLATION_UNSAFE_UNWRAP") {
      proposal_type = PROPOSAL_TYPES.POLICY_EXCEPTION_REQUEST;
      violations_addressed = ["RUST_POLICY_VIOLATION"];
      exact_changes_requested = [
        {
          file: finding.details?.file_path,
          section: "unwrap() call",
          action: "APPROVE_UNSAFE_IN_PLAN",
          scope: `phase:${finding.phase_id}`,
          justification: finding.details?.justification || "See forensic finding",
        },
      ];
      risk = "HIGH";
    } else if (finding.finding_code === "DIVERGENCE_DETECTED") {
      proposal_type = PROPOSAL_TYPES.EXECUTION_RETRY;
      violations_addressed = ["EXECUTION_DIVERGENCE"];
      exact_changes_requested = [
        {
          action: "RERUN_PHASE",
          phase_id: finding.phase_id,
          reason: "Results diverged from expected; rerun to verify determinism",
        },
      ];
      risk = "MEDIUM";
    } else if (finding.finding_code === "TAMPER_DETECTED_BROKEN_HASH_CHAIN") {
      // This is not remedial—requires investigation
      proposal_type = PROPOSAL_TYPES.INVESTIGATION_REQUIRED;
      violations_addressed = ["AUDIT_LOG_INTEGRITY"];
      exact_changes_requested = [
        {
          action: "AUDIT_INSPECTION",
          reason: "Hash chain broken; audit log may be compromised",
        },
      ];
      risk = "CRITICAL";
    } else if (finding.finding_code === "INTENT_SCHEMA_VIOLATION") {
      proposal_type = PROPOSAL_TYPES.INTENT_CORRECTION;
      violations_addressed = [SYSTEM_ERROR_CODES.INVALID_INPUT_FORMAT];
      exact_changes_requested = [
        {
          file: finding.details?.file_path,
          section: "intent_artifact",
          action: "FIX_SCHEMA",
          required_fields: finding.details?.missing_fields || [],
        },
      ];
      risk = "LOW";
    } else {
      // Unknown finding—request investigation
      proposal_type = PROPOSAL_TYPES.INVESTIGATION_REQUIRED;
      violations_addressed = ["UNKNOWN_FINDING"];
      exact_changes_requested = [];
    }

    if (!proposal_type) {
      throw new Error(
        `REMEDIATION_UNKNOWN_FINDING_CODE: ${finding.finding_code}`
      );
    }

    const proposal = new Proposal({
      proposal_type,
      evidence_refs: [evidence_hash],
      violations_addressed,
      exact_changes_requested,
      files_affected: exact_changes_requested
        .map((c) => c.file)
        .filter(Boolean),
      scope: finding.phase_id ? `phase:${finding.phase_id}` : "plan",
      risk_assessment: {
        level: risk,
        description: finding.description,
        mitigation: this._mitigationForRisk(risk),
      },
      verification_after_apply: this._verificationStepsFor(proposal_type),
      workspace_root: this.workspace_root,
      plan_hash: this.plan_hash,
    });

    this.proposals.push(proposal);
    return proposal;
  }

  /**
   * Generate proposals from SystemError records
   * 
   * Evidence format:
   * {
   *   error_code: string,
   *   invariant_id: string (optional),
   *   human_message: string,
   *   tool_name: string,
   *   timestamp: ISO string,
   * }
   */
  proposalFromSystemError(error) {
    if (!error.error_code) {
      throw new Error("REMEDIATION_EVIDENCE_INSUFFICIENT: error_code required");
    }

    const evidence_hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(error))
      .digest("hex");

    let proposal_type = null;
    let violations_addressed = [error.error_code];
    let exact_changes_requested = [];

    // Map error codes to proposals
    if (error.error_code === SYSTEM_ERROR_CODES.INVARIANT_VIOLATION) {
      proposal_type = PROPOSAL_TYPES.PLAN_CORRECTION;
      exact_changes_requested = [
        {
          action: "CLARIFY_PLAN_PHASE",
          invariant: error.invariant_id,
          reason: `Invariant ${error.invariant_id} was violated during execution`,
          suggestion:
            "Add phase ordering constraint or prerequisite check to plan",
        },
      ];
    } else if (
      error.error_code === SYSTEM_ERROR_CODES.INVALID_INPUT_FORMAT
    ) {
      proposal_type = PROPOSAL_TYPES.INTENT_CORRECTION;
      exact_changes_requested = [
        {
          tool: error.tool_name,
          action: "FIX_INTENT_SCHEMA",
          reason: "Intent artifact did not match required schema",
        },
      ];
    } else if (error.error_code === SYSTEM_ERROR_CODES.POLICY_VIOLATION) {
      proposal_type = PROPOSAL_TYPES.POLICY_EXCEPTION_REQUEST;
      exact_changes_requested = [
        {
          action: "REQUEST_PLAN_EXCEPTION",
          policy: error.human_message,
          scope: "phase",
        },
      ];
    } else {
      // Generic error—investigate
      proposal_type = PROPOSAL_TYPES.INVESTIGATION_REQUIRED;
    }

    const proposal = new Proposal({
      proposal_type,
      evidence_refs: [evidence_hash],
      violations_addressed,
      exact_changes_requested,
      files_affected: [],
      scope: "plan",
      risk_assessment: {
        level: "MEDIUM",
        description: error.human_message,
        mitigation: `Review error context and adjust plan or intent accordingly`,
      },
      verification_after_apply: this._verificationStepsFor(proposal_type),
      workspace_root: this.workspace_root,
      plan_hash: this.plan_hash,
    });

    this.proposals.push(proposal);
    return proposal;
  }

  /**
   * Validate all proposals are evidence-bound
   * Throws if any proposal references missing evidence
   */
  validateEvidenceBound(evidence_map) {
    for (const proposal of this.proposals) {
      for (const ref of proposal.evidence_refs) {
        if (!evidence_map.has(ref)) {
          throw new Error(
            `REMEDIATION_NOT_EVIDENCE_BOUND: Proposal ${proposal.proposal_id} references missing evidence ${ref}`
          );
        }
      }
    }
  }

  /**
   * Return all proposals (PENDING)
   */
  getProposals() {
    return this.proposals.map((p) => p.toJSON());
  }

  // Helper: Risk mitigation strategies
  _mitigationForRisk(level) {
    const strategies = {
      CRITICAL:
        "Do not apply automatically. Requires manual security review. Escalate to owner.",
      HIGH: "Apply only after human validation. Verify no side effects.",
      MEDIUM:
        "Apply after human review. Standard testing recommended before merge.",
      LOW: "Can apply after review. Standard validation sufficient.",
    };
    return strategies[level] || strategies.MEDIUM;
  }

  // Helper: Verification steps by proposal type
  _verificationStepsFor(proposal_type) {
    const steps = {
      PLAN_CORRECTION: [
        "Re-run phase that failed with updated plan",
        "Verify execution matches expected behavior",
        "Check audit log has no divergence entries",
      ],
      POLICY_EXCEPTION_REQUEST: [
        "Run linter with plan exceptions applied",
        "Build/compile succeeds",
        "No new security warnings",
      ],
      INTENT_CORRECTION: [
        "Validate intent schema against tool requirements",
        "Dry-run tool with corrected intent",
        "Verify no downstream type errors",
      ],
      EXECUTION_RETRY: [
        "Run replay engine on re-executed phase",
        "Verify determinism (same args → same results)",
        "Compare audit entries with baseline",
      ],
      INVESTIGATION_REQUIRED: [
        "Manual review of evidence by security team",
        "Root cause analysis documented",
        "Escalation decision recorded",
      ],
    };
    return steps[proposal_type] || [];
  }
}

/**
 * Proposal: Immutable, evidence-bound remediation request
 * 
 * All fields set at construction; only status transitions after human approval.
 */
export class Proposal {
  constructor(config) {
    const {
      proposal_type,
      evidence_refs = [],
      violations_addressed = [],
      exact_changes_requested = [],
      files_affected = [],
      scope = "plan",
      risk_assessment = {},
      verification_after_apply = [],
      workspace_root,
      plan_hash,
    } = config;

    // Validate proposal type
    if (!Object.values(PROPOSAL_TYPES).includes(proposal_type)) {
      throw new Error(
        `REMEDIATION_INVALID_TYPE: ${proposal_type} not in PROPOSAL_TYPES`
      );
    }

    // Validate evidence_refs is non-empty
    if (!evidence_refs || evidence_refs.length === 0) {
      throw new Error(
        "REMEDIATION_NOT_EVIDENCE_BOUND: evidence_refs cannot be empty"
      );
    }

    this.proposal_id = generateProposalId(
      evidence_refs.join("|"),
      proposal_type
    );
    this.proposal_type = proposal_type;
    this.evidence_refs = evidence_refs;
    this.violations_addressed = violations_addressed;
    this.exact_changes_requested = exact_changes_requested;
    this.files_affected = files_affected;
    this.scope = scope;
    this.risk_assessment = risk_assessment;
    this.verification_after_apply = verification_after_apply;
    this.status = PROPOSAL_STATUS.PENDING;
    this.created_at = new Date().toISOString();
    this.approved_at = null;
    this.approved_by = null;
    this.workspace_root = workspace_root;
    this.plan_hash = plan_hash;
    this.expiration_condition = `proposal is valid if plan_hash matches ${plan_hash}`;
  }

  /**
   * Mark proposal as APPROVED (human-only)
   * Records approver and timestamp
   * Does NOT apply changes (read-only operation)
   */
  markApproved(approver_identity) {
    if (!approver_identity || typeof approver_identity !== "string") {
      throw new Error("REMEDIATION_INVALID_APPROVER: approver_identity required");
    }
    this.status = PROPOSAL_STATUS.APPROVED;
    this.approved_at = new Date().toISOString();
    this.approved_by = approver_identity;
  }

  /**
   * Mark proposal as REJECTED (human-only)
   */
  markRejected(reason) {
    this.status = PROPOSAL_STATUS.REJECTED;
    this.rejected_at = new Date().toISOString();
    this.rejection_reason = reason || "No reason provided";
  }

  /**
   * Serialize to JSON (immutable snapshot)
   */
  toJSON() {
    return {
      proposal_id: this.proposal_id,
      proposal_type: this.proposal_type,
      status: this.status,
      evidence_refs: this.evidence_refs,
      violations_addressed: this.violations_addressed,
      exact_changes_requested: this.exact_changes_requested,
      files_affected: this.files_affected,
      scope: this.scope,
      risk_assessment: this.risk_assessment,
      verification_after_apply: this.verification_after_apply,
      created_at: this.created_at,
      approved_at: this.approved_at,
      approved_by: this.approved_by,
      workspace_root: this.workspace_root,
      plan_hash: this.plan_hash,
      expiration_condition: this.expiration_condition,
    };
  }
}
