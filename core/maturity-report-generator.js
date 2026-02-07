/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Generate non-coder readable maturity reports
 * AUTHORITY: ATLAS-GATE MCP Maturity Scoring Specification v1.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate human-readable maturity report (Markdown)
 * 
 * @param {Object} scoreResult - Result from computeMaturityScore
 * @param {Object} prevResult - Previous result (for trend delta)
 * @returns {string} Markdown report
 */
export function generateMaturityReport(scoreResult, prevResult = null) {
  const timestamp = scoreResult.timestamp;
  const overall = scoreResult.overall;
  const dimensions = scoreResult.dimensions;
  const blockingReasons = scoreResult.blockingReasons || [];

  let report = '';

  // Header
  report += `# MCP Maturity Assessment Report\n\n`;
  report += `**Generated**: ${new Date(timestamp).toLocaleString()}\n\n`;

  // Executive Summary
  report += `## Executive Summary\n\n`;
  report += `**Overall Maturity Level**: ${overall.toFixed(1)} / 5.0\n\n`;
  
  if (overall >= 4.5) {
    report += `The MCP server demonstrates **excellent** maturity across all dimensions. `;
    report += `Governance, policy enforcement, and audit infrastructure are robust.\n\n`;
  } else if (overall >= 3.5) {
    report += `The MCP server demonstrates **good** maturity with consistent execution. `;
    report += `Some dimensions need improvement to reach Level 5.\n\n`;
  } else if (overall >= 2.5) {
    report += `The MCP server demonstrates **moderate** maturity with areas requiring focused improvement. `;
    report += `Multiple dimensions below target.\n\n`;
  } else {
    report += `The MCP server demonstrates **nascent** maturity. `;
    report += `Significant work required across multiple dimensions.\n\n`;
  }

  // Trend
  if (prevResult) {
    const delta = overall - (prevResult.overall || 0);
    const trend = delta > 0 ? '📈 Improving' : delta < 0 ? '📉 Declining' : '➡️ Stable';
    report += `**Trend**: ${trend} (${delta >= 0 ? '+' : ''}${delta.toFixed(2)})\n\n`;
  }

  // Radar Table (Dimensions × Scores)
  report += `## Dimension Scores\n\n`;
  report += `| Dimension | Score | Status |\n`;
  report += `|-----------|-------|--------|\n`;
  
  Object.entries(dimensions).forEach(([dim, score]) => {
    let status = '';
    if (score >= 4.5) status = '✅ Excellent';
    else if (score >= 3.5) status = '✓ Good';
    else if (score >= 2.5) status = '⚠️ Fair';
    else status = '❌ Poor';
    
    report += `| ${dim} | ${score.toFixed(1)} | ${status} |\n`;
  });
  report += '\n';

  // Why Not Level-5
  report += `## Why Not Level 5?\n\n`;
  
  if (blockingReasons.length === 0) {
    report += `✅ No blocking reasons detected. All evidence gates pass.\n\n`;
  } else {
    report += `The following gaps prevent Level-5 claim:\n\n`;
    blockingReasons.forEach(reason => {
      const severity = reason.blockedBy === 'MAJOR_VIOLATION' ? '🔴' : '🟡';
      report += `- ${severity} **${reason.dimension}**: Score ${reason.score.toFixed(1)} `;
      report += `(${reason.blockedBy})\n`;
    });
    report += '\n';
  }

  // Evidence Checklist
  report += `## Evidence Checklist\n\n`;
  report += `### Reliability\n`;
  report += `- [ ] ≥99% tool invocations audited\n`;
  report += `- [ ] 0 uncaught exceptions\n`;
  report += `- [ ] No hash chain breaks\n`;
  report += `- [ ] Replay pass rate ≥99%\n\n`;

  report += `### Security\n`;
  report += `- [ ] 100% writes pass policy validation\n`;
  report += `- [ ] 0 policy bypasses\n`;
  report += `- [ ] Audit integrity verified\n`;
  report += `- [ ] Human gate on remediation\n\n`;

  report += `### Documentation\n`;
  report += `- [ ] Intent coverage ≥95%\n`;
  report += `- [ ] 0 intent schema violations\n`;
  report += `- [ ] Non-coder documentation present\n\n`;

  report += `### Governance\n`;
  report += `- [ ] 100% executions tied to approved plan\n`;
  report += `- [ ] 0 plan hash mismatches\n`;
  report += `- [ ] All writes path-authorized\n\n`;

  report += `### Integration\n`;
  report += `- [ ] Tool ecosystem configured (≥5 tools)\n`;
  report += `- [ ] Verification gates automated\n`;
  report += `- [ ] Configuration deterministic\n\n`;

  report += `### Performance\n`;
  report += `- [ ] Policy latency bounded\n`;
  report += `- [ ] Audit latency bounded\n`;
  report += `- [ ] No regressions detected\n\n`;

  // Detailed Findings
  report += `## Detailed Findings\n\n`;
  report += `### Audit Metrics\n`;
  const evidence = scoreResult.evidence || {};
  const auditMetrics = evidence.auditMetrics || {};
  
  report += `- Total audit entries: ${auditMetrics.totalEntries || 0}\n`;
  report += `- Failure rate: ${((auditMetrics.failureRate || 0) * 100).toFixed(1)}%\n`;
  report += `- Hash chain breaks: ${auditMetrics.hashChainBreaks || 0}\n`;
  report += `- Role distribution: ${JSON.stringify(auditMetrics.roleDistribution || {})}\n\n`;

  report += `### Policy Metrics\n`;
  const policyMetrics = evidence.policyMetrics || {};
  report += `- Total policy checks: ${policyMetrics.totalChecks || 0}\n`;
  report += `- Pass rate: ${policyMetrics.totalChecks > 0 ? ((policyMetrics.passCount / policyMetrics.totalChecks) * 100).toFixed(1) : '0'}%\n`;
  report += `- Bypasses detected: ${policyMetrics.bypassCount || 0}\n\n`;

  report += `### Intent Metrics\n`;
  const intentMetrics = evidence.intentMetrics || {};
  report += `- Files written: ${intentMetrics.totalFiles || 0}\n`;
  report += `- With intent docs: ${intentMetrics.documentsWithIntent || 0}\n`;
  report += `- Schema violations: ${intentMetrics.schemaViolations || 0}\n\n`;

  // Recommendations
  report += `## Recommendations\n\n`;
  if (overall >= 4.5) {
    report += `1. **Maintain Excellence**: Continue current enforcement practices.\n`;
    report += `2. **Monitor Regressions**: Watch for any degradation in audit coverage or policy compliance.\n`;
    report += `3. **Document Lessons**: Capture best practices for new team members.\n`;
  } else if (overall >= 3.5) {
    report += `1. **Target Gaps**: Focus on dimensions below 4.0.\n`;
    report += `2. **Improve Coverage**: Increase audit and intent documentation coverage.\n`;
    report += `3. **Automate Verification**: Add integration gates to policy validation.\n`;
  } else {
    report += `1. **Emergency Response**: Investigate and remediate policy/governance gaps immediately.\n`;
    report += `2. **Audit Full System**: Review recent executions for unauthorized or unaudited changes.\n`;
    report += `3. **Establish Gates**: Implement missing verification gates before proceeding.\n`;
  }
  report += '\n';

  // Footer
  report += `---\n\n`;
  report += `**Report Hash**: ${hashReport(scoreResult)}\n`;
  report += `This report was generated by the ATLAS-GATE MCP Maturity Scoring Engine.\n`;

  return report;
}

/**
 * Compute hash of report content
 * @param {Object} scoreResult - Score result object
 * @returns {string} SHA256 hash (first 8 chars)
 */
function hashReport(scoreResult) {
  const content = JSON.stringify(scoreResult, null, 0);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/**
 * Write maturity report to file
 * @param {string} workspaceRoot - Workspace root
 * @param {string} reportContent - Generated report markdown
 * @returns {string} Path to written report
 */
export function writeMaturityReport(workspaceRoot, reportContent) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportPath = path.join(
    workspaceRoot,
    'docs',
    'reports',
    `MATURITY_REPORT_${timestamp}.md`
  );

  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  return reportPath;
}
