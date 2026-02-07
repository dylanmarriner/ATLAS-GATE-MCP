/**
 * ROLE: EXECUTABLE
 * PURPOSE: Proposal persistence and retrieval (read-only queries, write-only for new proposals)
 * AUTHORITY: ATLAS-GATE MCP REMEDIATION PROPOSAL STORE
 *
 * Manages proposal lifecycle:
 * - Write new proposals to docs/proposals/PROPOSAL_*.md
 * - Read proposals by ID or filter
 * - Update approval status (human gate only)
 * 
 * INVARIANT: Proposals are immutable once created (only status transitions allowed)
 * INVARIANT: All proposal metadata tracked in .atlas-gate/proposals-index.jsonl
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Proposal store directory relative to workspace
 */
const PROPOSALS_DIR = "docs/proposals";
const PROPOSALS_INDEX = ".atlas-gate/proposals-index.jsonl";

/**
 * Write a new proposal to disk
 * 
 * Creates:
 * - docs/proposals/PROPOSAL_<proposal_id>.md (human-readable)
 * - Appends entry to .atlas-gate/proposals-index.jsonl
 * 
 * Returns: { file_path, index_entry }
 * Throws: PROPOSAL_WRITE_FAILED if I/O error
 */
export function writeProposal(workspace_root, proposal) {
  try {
    // Ensure proposals directory
    const proposalsDir = path.join(workspace_root, PROPOSALS_DIR);
    const atlas-gateDir = path.join(workspace_root, ".atlas-gate");

    fs.mkdirSync(proposalsDir, { recursive: true });
    fs.mkdirSync(atlas-gateDir, { recursive: true });

    // Write proposal markdown file
    const proposalFile = path.join(proposalsDir, `PROPOSAL_${proposal.proposal_id}.md`);
    const markdown = formatProposalMarkdown(proposal);
    fs.writeFileSync(proposalFile, markdown, "utf8");

    // Write index entry
    const indexEntry = {
      proposal_id: proposal.proposal_id,
      proposal_type: proposal.proposal_type,
      status: proposal.status,
      created_at: proposal.created_at,
      workspace_root,
      file_path: proposalFile,
    };

    const indexPath = path.join(atlas-gateDir, "proposals-index.jsonl");
    fs.appendFileSync(indexPath, JSON.stringify(indexEntry) + "\n", "utf8");

    return { file_path: proposalFile, index_entry: indexEntry };
  } catch (err) {
    throw new Error(
      `PROPOSAL_WRITE_FAILED: ${err.message} (workspace=${workspace_root})`
    );
  }
}

/**
 * Read proposal by ID
 * Returns proposal JSON (immutable snapshot)
 * Throws: PROPOSAL_NOT_FOUND if not on disk
 */
export function readProposal(workspace_root, proposal_id) {
  try {
    const proposalFile = path.join(
      workspace_root,
      PROPOSALS_DIR,
      `PROPOSAL_${proposal_id}.md`
    );

    if (!fs.existsSync(proposalFile)) {
      throw new Error(`PROPOSAL_NOT_FOUND: ${proposal_id}`);
    }

    const content = fs.readFileSync(proposalFile, "utf8");
    return parseProposalMarkdown(content);
  } catch (err) {
    if (err.message.includes("PROPOSAL_NOT_FOUND")) {
      throw err;
    }
    throw new Error(`PROPOSAL_READ_FAILED: ${err.message}`);
  }
}

/**
 * List all proposals (optionally filtered by status)
 * Returns: Array<{ proposal_id, proposal_type, status, created_at }>
 */
export function listProposals(workspace_root, filter = {}) {
  try {
    const indexPath = path.join(workspace_root, PROPOSALS_INDEX);

    if (!fs.existsSync(indexPath)) {
      return [];
    }

    const lines = fs
      .readFileSync(indexPath, "utf8")
      .split("\n")
      .filter((line) => line.trim());

    let entries = lines.map((line) => JSON.parse(line));

    // Apply filters
    if (filter.status) {
      entries = entries.filter((e) => e.status === filter.status);
    }
    if (filter.proposal_type) {
      entries = entries.filter((e) => e.proposal_type === filter.proposal_type);
    }

    return entries;
  } catch (err) {
    throw new Error(`PROPOSAL_LIST_FAILED: ${err.message}`);
  }
}

/**
 * Update proposal status (APPROVED or REJECTED)
 * 
 * Updates:
 * - In-memory proposal object
 * - Overwrites proposal markdown file
 * - Appends audit entry
 * 
 * Returns: Updated proposal JSON
 * Throws: PROPOSAL_NOT_FOUND, PROPOSAL_UPDATE_FAILED
 */
export function updateProposalStatus(
  workspace_root,
  proposal_id,
  decision, // "APPROVED" or "REJECTED"
  approver_identity,
  reason = ""
) {
  try {
    // Read current proposal
    const proposal = readProposal(workspace_root, proposal_id);

    // Update status
    if (decision === "APPROVED") {
      proposal.status = "APPROVED";
      proposal.approved_at = new Date().toISOString();
      proposal.approved_by = approver_identity;
    } else if (decision === "REJECTED") {
      proposal.status = "REJECTED";
      proposal.rejected_at = new Date().toISOString();
      proposal.rejection_reason = reason;
    } else {
      throw new Error(`INVALID_DECISION: ${decision}`);
    }

    // Write updated markdown
    const proposalFile = path.join(
      workspace_root,
      PROPOSALS_DIR,
      `PROPOSAL_${proposal_id}.md`
    );
    const markdown = formatProposalMarkdown(proposal);
    fs.writeFileSync(proposalFile, markdown, "utf8");

    // Append audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event: "PROPOSAL_STATUS_UPDATE",
      proposal_id,
      new_status: decision,
      approver: approver_identity,
      reason,
    };

    const atlas-gateDir = path.join(workspace_root, ".atlas-gate");
    const auditPath = path.join(atlas-gateDir, "proposal-approvals.jsonl");
    fs.appendFileSync(auditPath, JSON.stringify(auditEntry) + "\n", "utf8");

    return proposal;
  } catch (err) {
    if (err.message.includes("PROPOSAL_NOT_FOUND")) {
      throw err;
    }
    throw new Error(`PROPOSAL_UPDATE_FAILED: ${err.message}`);
  }
}

/**
 * Format proposal as markdown (human-readable, structured for parsing)
 */
function formatProposalMarkdown(proposal) {
  const header = `# Remediation Proposal: ${proposal.proposal_id}

**Status**: ${proposal.status}  
**Type**: ${proposal.proposal_type}  
**Created**: ${proposal.created_at}  
**Workspace**: \`${proposal.workspace_root}\`  
**Plan Hash**: \`${proposal.plan_hash}\`  

`;

  const approvalSection =
    proposal.status === "APPROVED"
      ? `## Approval

**Approved By**: ${proposal.approved_by}  
**Approved At**: ${proposal.approved_at}  

`
      : proposal.status === "REJECTED"
        ? `## Rejection

**Reason**: ${proposal.rejection_reason}  
**Rejected At**: ${proposal.rejected_at}  

`
        : "";

  const evidenceSection = `## Evidence

References:
${proposal.evidence_refs.map((ref) => `- ${ref}`).join("\n")}

Violations Addressed:
${proposal.violations_addressed.map((v) => `- ${v}`).join("\n")}

`;

  const changesSection = `## Proposed Changes

Scope: \`${proposal.scope}\`

Files Affected:
${proposal.files_affected.length > 0 ? proposal.files_affected.map((f) => `- ${f}`).join("\n") : "- (none)"}

Changes Requested:
\`\`\`json
${JSON.stringify(proposal.exact_changes_requested, null, 2)}
\`\`\`

`;

  const riskSection = `## Risk Assessment

**Level**: ${proposal.risk_assessment.level}

**Description**: ${proposal.risk_assessment.description}

**Mitigation**: ${proposal.risk_assessment.mitigation}

`;

  const verificationSection = `## Verification Steps (Post-Apply)

${proposal.verification_after_apply.map((step) => `- [ ] ${step}`).join("\n")}

`;

  const expirationSection = `## Validity

${proposal.expiration_condition}

`;

  return (
    header +
    approvalSection +
    evidenceSection +
    changesSection +
    riskSection +
    verificationSection +
    expirationSection
  );
}

/**
 * Parse proposal markdown back to JSON
 * (Reverse of formatProposalMarkdown)
 */
function parseProposalMarkdown(content) {
  // Extract proposal_id from filename embedded in content or frontmatter
  const idMatch = content.match(/# Remediation Proposal: (PROP-\w+)/);
  const proposal_id = idMatch ? idMatch[1] : null;

  const statusMatch = content.match(/\*\*Status\*\*: (\w+)/);
  const status = statusMatch ? statusMatch[1] : "PENDING";

  const typeMatch = content.match(/\*\*Type\*\*: ([\w_]+)/);
  const proposal_type = typeMatch ? typeMatch[1] : null;

  const createdMatch = content.match(/\*\*Created\*\*: ([\w\-T:.Z]+)/);
  const created_at = createdMatch ? createdMatch[1] : null;

  const planHashMatch = content.match(/\*\*Plan Hash\*\*: `([a-f0-9]+)`/);
  const plan_hash = planHashMatch ? planHashMatch[1] : null;

  const workspaceMatch = content.match(/\*\*Workspace\*\*: `([^`]+)`/);
  const workspace_root = workspaceMatch ? workspaceMatch[1] : null;

  // Extract evidence refs (parse bullet list)
  const evidenceMatch = content.match(
    /References:\n([\s\S]*?)(?=\n\nViolations)/
  );
  const evidence_refs = [];
  if (evidenceMatch) {
    const lines = evidenceMatch[1].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        evidence_refs.push(trimmed.substring(2));
      }
    }
  }

  // Extract violations addressed
  const violationsMatch = content.match(
    /Violations Addressed:\n([\s\S]*?)(?=\n\n##)/
  );
  const violations_addressed = [];
  if (violationsMatch) {
    const lines = violationsMatch[1].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        violations_addressed.push(trimmed.substring(2));
      }
    }
  }

  // Parse JSON blob for changes
  const changesMatch = content.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
  const exact_changes_requested = [];
  if (changesMatch) {
    try {
      const parsed = JSON.parse(changesMatch[1]);
      if (Array.isArray(parsed)) {
        exact_changes_requested.push(...parsed);
      }
    } catch (e) {
      // JSON parse failed in proposal metadata - re-throw for governance
      throw new Error(`PROPOSAL_METADATA_PARSE_ERROR: Failed to parse changes from proposal: ${e.message}`);
    }
  }

  const approvedByMatch = content.match(/\*\*Approved By\*\*: (.+)/);
  const approved_by = approvedByMatch ? approvedByMatch[1].trim() : null;

  const approvedAtMatch = content.match(/\*\*Approved At\*\*: ([\w\-T:.Z]+)/);
  const approved_at = approvedAtMatch ? approvedAtMatch[1] : null;

  return {
    proposal_id,
    proposal_type,
    status,
    created_at,
    workspace_root,
    plan_hash,
    evidence_refs,
    violations_addressed,
    exact_changes_requested,
    files_affected: [],
    scope: "plan",
    risk_assessment: { level: "MEDIUM", description: "", mitigation: "" },
    verification_after_apply: [],
    approved_by,
    approved_at,
    expiration_condition: "",
  };
}
