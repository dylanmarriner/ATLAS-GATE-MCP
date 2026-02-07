/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Generate non-coder forensic reports from replay results
 * AUTHORITY: PROMPT 07 - MCP Forensic Replay Spec Section 6
 *
 * This module generates markdown forensic reports suitable for:
 * - Incident investigation
 * - Compliance audits
 * - Non-technical stakeholders
 * - Post-execution analysis
 */

import path from "path";

/**
 * Generate a forensic report from replay result.
 *
 * @param {Object} replayResult - Result from replayExecution()
 * @param {string} planHash - SHA256 hash of the plan
 * @param {Date} generatedAt - Timestamp of report generation
 * @returns {string} Markdown-formatted forensic report
 */
export function generateForensicReport(replayResult, planHash, generatedAt = new Date()) {
  const sections = [];

  // HEADER
  sections.push(`# Forensic Replay Report`);
  sections.push(`**Plan Hash:** \`${planHash}\``);
  sections.push(`**Generated:** ${generatedAt.toISOString()}`);
  sections.push(`**Verdict:** \`${replayResult.verdict}\``);
  sections.push("");

  // EXECUTIVE SUMMARY
  sections.push(`## Executive Summary`);
  sections.push("");
  sections.push(generateExecutiveSummary(replayResult));
  sections.push("");

  // KEY FINDINGS
  sections.push(`## Key Findings`);
  sections.push("");

  if (replayResult.findings.length === 0) {
    sections.push("✓ No issues detected.");
  } else {
    const summary = replayResult.summary || {};

    if (summary.tamper_violations > 0) {
      sections.push(`**⚠️ Tampering Detected:** ${summary.tamper_violations} issue(s)`);
      sections.push("");
      sections.push(
        replayResult.findings
          .filter((f) => f.finding_code && f.finding_code.startsWith("TAMPER"))
          .map((f) => `- \`${f.finding_code}\`: ${f.message}`)
          .join("\n")
      );
      sections.push("");
    }

    if (summary.divergence_violations > 0) {
      sections.push(
        `**⚠️ Non-Determinism Detected:** ${summary.divergence_violations} case(s)`
      );
      sections.push("");
      sections.push(
        replayResult.findings
          .filter((f) => f.finding_code && f.finding_code.startsWith("DIVERGENCE"))
          .map((f) => `- \`${f.finding_code}\`: ${f.message}`)
          .join("\n")
      );
      sections.push("");
    }

    if (summary.authority_violations > 0) {
      sections.push(
        `**⚠️ Authorization Issues:** ${summary.authority_violations} violation(s)`
      );
      sections.push("");
      sections.push(
        replayResult.findings
          .filter((f) => f.finding_code && f.finding_code.startsWith("AUTHORITY"))
          .map((f) => `- \`${f.finding_code}\`: ${f.message}`)
          .join("\n")
      );
      sections.push("");
    }

    if (summary.policy_violations > 0) {
      sections.push(`**⚠️ Policy Violations:** ${summary.policy_violations} violation(s)`);
      sections.push("");
      sections.push(
        replayResult.findings
          .filter((f) => f.finding_code && f.finding_code.startsWith("POLICY"))
          .map((f) => `- \`${f.finding_code}\`: ${f.message}`)
          .join("\n")
      );
      sections.push("");
    }

    if (summary.evidence_gaps > 0) {
      sections.push(`**⚠️ Evidence Gaps:** ${summary.evidence_gaps} gap(s)`);
      sections.push("");
      sections.push(
        replayResult.findings
          .filter((f) => f.finding_code && f.finding_code.startsWith("EVIDENCE"))
          .map((f) => `- \`${f.finding_code}\`: ${f.message}`)
          .join("\n")
      );
      sections.push("");
    }
  }

  // EXECUTION TIMELINE
  sections.push(`## Execution Timeline`);
  sections.push("");

  if (!replayResult.timeline || replayResult.timeline.length === 0) {
    sections.push("No execution entries recorded.");
  } else {
    sections.push("| Seq | Timestamp | Tool | Role | Intent | Result |");
    sections.push("|-----|-----------|------|------|--------|--------|");

    replayResult.timeline.slice(0, 50).forEach((entry) => {
      const intent = entry.intent ? `\`${entry.intent.substring(0, 20)}\`` : "—";
      const result = entry.error_code ? `❌ ${entry.error_code}` : "✓ ok";
      sections.push(
        `| ${entry.seq} | ${entry.ts.substring(11, 19)} | \`${entry.tool}\` | ${entry.role} | ${intent} | ${result} |`
      );
    });

    if (replayResult.timeline.length > 50) {
      sections.push(`... and ${replayResult.timeline.length - 50} more entries`);
    }
  }
  sections.push("");

  // DETAILED VIOLATIONS (if any)
  if (replayResult.findings.length > 0) {
    sections.push(`## Detailed Findings`);
    sections.push("");

    replayResult.findings.forEach((finding, idx) => {
      sections.push(`### Finding ${idx + 1}`);
      sections.push(`**Code:** \`${finding.finding_code}\``);
      sections.push(`**Message:** ${finding.message}`);

      if (finding.affected_seqs) {
        sections.push(`**Affected Sequences:** ${finding.affected_seqs.join(", ")}`);
      }

      if (finding.seq) {
        sections.push(`**Sequence:** ${finding.seq}`);
      }

      sections.push("");
    });
  }

  // WHAT THIS MEANS (non-coder section)
  sections.push(`## What This Means`);
  sections.push("");
  sections.push(generateNonCoderExplanation(replayResult));
  sections.push("");

  // REMEDIATION STEPS
  if (replayResult.verdict === "FAIL") {
    sections.push(`## Recommended Actions`);
    sections.push("");
    sections.push(generateRemediationSteps(replayResult));
    sections.push("");
  }

  // TECHNICAL DETAILS
  sections.push(`## Technical Details`);
  sections.push(`- **Entries Analyzed:** ${replayResult.entries_analyzed}`);
  sections.push(`- **Total Findings:** ${replayResult.summary?.total_findings || 0}`);
  sections.push(`- **Tamper Violations:** ${replayResult.summary?.tamper_violations || 0}`);
  sections.push(
    `- **Divergence Violations:** ${replayResult.summary?.divergence_violations || 0}`
  );
  sections.push(`- **Authority Violations:** ${replayResult.summary?.authority_violations || 0}`);
  sections.push(`- **Policy Violations:** ${replayResult.summary?.policy_violations || 0}`);
  sections.push(`- **Evidence Gaps:** ${replayResult.summary?.evidence_gaps || 0}`);
  sections.push("");

  // FOOTER
  sections.push(`---`);
  sections.push(
    `*This report was generated by the ATLAS-GATE MCP Deterministic Replay system.*`
  );
  sections.push(
    `*For questions, consult your MCP administrator or security team.*`
  );

  return sections.join("\n");
}

/**
 * Generate executive summary text.
 */
function generateExecutiveSummary(replayResult) {
  const summary = replayResult.summary || {};

  if (replayResult.verdict === "PASS") {
    return (
      `The forensic analysis examined ${replayResult.entries_analyzed} execution ` +
      `entries and found no violations or inconsistencies. ` +
      `The execution was deterministic and fully compliant with policy. ` +
      `The audit log hash chain is intact, and no evidence of tampering exists.`
    );
  }

  const issues = [];
  if (summary.tamper_violations > 0)
    issues.push(`tampering (${summary.tamper_violations})`);
  if (summary.divergence_violations > 0)
    issues.push(`non-determinism (${summary.divergence_violations})`);
  if (summary.authority_violations > 0)
    issues.push(`authorization issues (${summary.authority_violations})`);
  if (summary.policy_violations > 0)
    issues.push(`policy violations (${summary.policy_violations})`);
  if (summary.evidence_gaps > 0)
    issues.push(`evidence gaps (${summary.evidence_gaps})`);

  return (
    `The forensic analysis examined ${replayResult.entries_analyzed} execution entries. ` +
    `**${issues.length} issue(s) detected:** ${issues.join(", ")}. ` +
    `See detailed findings below for investigation.`
  );
}

/**
 * Generate non-coder friendly explanation.
 */
function generateNonCoderExplanation(replayResult) {
  const parts = [];

  parts.push(`### What Did We Check?`);
  parts.push(
    `We reviewed the audit log (a record of all system actions) and verified:` +
      `\n- The log has not been tampered with\n` +
      `- All recorded actions were properly authorized\n` +
      `- The same action with the same inputs always produced the same result\n` +
      `- All required security policies were followed`
  );
  parts.push("");

  if (replayResult.verdict === "PASS") {
    parts.push(`### Summary`);
    parts.push(
      `✓ Everything looks good. The system operated as intended with no violations detected.`
    );
  } else {
    parts.push(`### Summary`);

    const summary = replayResult.summary || {};

    if (summary.tamper_violations > 0) {
      parts.push(
        `⚠️ **Tampering Evidence:** The audit log shows signs of tampering ` +
          `(missing entries, broken hash chain, or corrupted data). ` +
          `This suggests someone may have tried to hide what the system did.`
      );
      parts.push("");
    }

    if (summary.divergence_violations > 0) {
      parts.push(
        `⚠️ **Non-Deterministic Behavior:** The same action produced different results ` +
          `at different times. This suggests a bug in the system that needs investigation.`
      );
      parts.push("");
    }

    if (summary.authority_violations > 0) {
      parts.push(
        `⚠️ **Authorization Issues:** Some actions were performed by users or roles ` +
          `that were not authorized to do so. This may indicate a security breach.`
      );
      parts.push("");
    }

    if (summary.policy_violations > 0) {
      parts.push(
        `⚠️ **Policy Violations:** Some actions violated security policies or ` +
          `were blocked by security gates. This suggests attempted unauthorized access.`
      );
      parts.push("");
    }

    if (summary.evidence_gaps > 0) {
      parts.push(
        `⚠️ **Missing Evidence:** Some audit entries are missing or incomplete. ` +
          `We cannot fully verify what happened.`
      );
      parts.push("");
    }
  }

  return parts.join("\n");
}

/**
 * Generate remediation steps for non-coders.
 */
function generateRemediationSteps(replayResult) {
  const summary = replayResult.summary || {};
  const steps = [];

  steps.push(`1. **Review the findings** listed above with your IT or security team.`);
  steps.push("");

  if (summary.tamper_violations > 0) {
    steps.push(`2. **Investigate tampering:** Contact your administrator to review ` +
      `access logs and determine who may have modified the audit log.`);
    steps.push("");
  }

  if (summary.authority_violations > 0) {
    steps.push(`2. **Review access controls:** Verify that user roles and permissions ` +
      `are correctly configured. Revoke unauthorized access if necessary.`);
    steps.push("");
  }

  if (summary.divergence_violations > 0) {
    steps.push(`2. **Report non-determinism:** This is a bug. Open a ticket with ` +
      `the development team and include the sequence numbers from the findings.`);
    steps.push("");
  }

  if (summary.policy_violations > 0) {
    steps.push(`2. **Enforce policies:** Ensure security gates are active and ` +
      `retest the system to verify the policy is working.`);
    steps.push("");
  }

  steps.push(`3. **Document the incident** for compliance purposes.`);

  return steps.join("\n");
}
