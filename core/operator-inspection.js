import fs from "fs";
import { getAuditLogPath } from "./path-resolver.js";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Read-only inspection tools for operator actions and risk analysis
 * FAILURE MODES: Hidden operator decisions, unauditable approvals
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 8:
 * Read-Only Inspection Tools (REQUIRED)
 * 
 * - inspect_operator_actions: List operator actions + risk levels
 * - inspect_high_risk_approvals: Show only HIGH/IRREVERSIBLE actions
 * - Non-coder readable summaries
 * - Read-only, no mutation
 */

/**
 * Parse audit log from JSONL file
 * @returns {Array} Array of audit entries
 */
function parseAuditLog() {
  const auditPath = getAuditLogPath();
  if (!fs.existsSync(auditPath)) {
    return [];
  }

  const content = fs.readFileSync(auditPath, "utf8");
  const lines = content.trim().split("\n").filter(l => l.length > 0);

  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(e => e !== null);
}

/**
 * Inspect all operator actions within time window
 * @param {Object} options - Filter options
 * @returns {Object} Inspection results
 */
export function inspectOperatorActions(options = {}) {
  const {
    operator_id = null,
    operator_role = null,
    time_start_ms = Date.now() - 86400000, // Last 24 hours
    time_end_ms = Date.now(),
    action_type = null
  } = options;

  const auditLog = parseAuditLog();
  const actions = [];

  for (const entry of auditLog) {
    if (!entry.operator_id) continue;

    // Parse timestamp
    let entryTime = 0;
    if (entry.timestamp) {
      entryTime = new Date(entry.timestamp).getTime();
    }

    // Apply filters
    if (operator_id && entry.operator_id !== operator_id) continue;
    if (operator_role && entry.operator_role !== operator_role) continue;
    if (entryTime < time_start_ms || entryTime > time_end_ms) continue;
    if (action_type && entry.action_type !== action_type) continue;

    // Include human-factor entries
    if (["HUMAN_FACTOR_DECISION", "OPERATOR_IDENTITY_BOUND", "FATIGUE_GUARD_TRIGGERED", "ACTION_REFUSED"].includes(entry.type)) {
      actions.push({
        timestamp: entry.timestamp,
        type: entry.type,
        operator_id: entry.operator_id,
        operator_role: entry.operator_role,
        action_id: entry.action_id,
        action_type: entry.action_type,
        risk_level: entry.risk_level,
        decision_outcome: entry.decision_outcome,
        refusal_reason: entry.refusal_reason
      });
    }
  }

  return {
    summary: {
      total_actions: actions.length,
      time_window: {
        start: new Date(time_start_ms).toISOString(),
        end: new Date(time_end_ms).toISOString()
      },
      filters: {
        operator_id: operator_id || "all",
        operator_role: operator_role || "all",
        action_type: action_type || "all"
      }
    },
    actions: actions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  };
}

/**
 * Inspect high-risk approvals only
 * @param {Object} options - Filter options
 * @returns {Object} Inspection results
 */
export function inspectHighRiskApprovals(options = {}) {
  const {
    operator_id = null,
    time_start_ms = Date.now() - 604800000, // Last 7 days
    time_end_ms = Date.now(),
    min_risk_level = 2 // HIGH or IRREVERSIBLE (0=LOW, 1=MEDIUM, 2=HIGH, 3=IRREVERSIBLE)
  } = options;

  const auditLog = parseAuditLog();
  const highRiskActions = [];

  for (const entry of auditLog) {
    if (entry.type !== "HUMAN_FACTOR_DECISION" || entry.decision_outcome !== "APPROVED") continue;
    if (!entry.risk_level || entry.risk_level < min_risk_level) continue;

    const entryTime = new Date(entry.timestamp).getTime();
    if (entryTime < time_start_ms || entryTime > time_end_ms) continue;
    if (operator_id && entry.operator_id !== operator_id) continue;

    const riskName = ["LOW", "MEDIUM", "HIGH", "IRREVERSIBLE"][entry.risk_level];

    highRiskActions.push({
      timestamp: entry.timestamp,
      operator_id: entry.operator_id,
      operator_role: entry.operator_role,
      action_id: entry.action_id,
      action_type: entry.action_type,
      risk_level: riskName,
      blast_radius_count: (entry.blast_radius || []).length,
      reversibility: entry.reversibility,
      confirmation_required: entry.confirmation_required,
      confirmation_delay_ms: entry.confirmation_delay_ms,
      blast_radius: entry.blast_radius
    });
  }

  // Sort by risk level (irreversible first) then timestamp
  highRiskActions.sort((a, b) => {
    const riskOrder = { "IRREVERSIBLE": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
    const riskDiff = riskOrder[b.risk_level] - riskOrder[a.risk_level];
    if (riskDiff !== 0) return riskDiff;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return {
    summary: {
      total_high_risk_approvals: highRiskActions.length,
      by_risk_level: {
        IRREVERSIBLE: highRiskActions.filter(a => a.risk_level === "IRREVERSIBLE").length,
        HIGH: highRiskActions.filter(a => a.risk_level === "HIGH").length,
        MEDIUM: highRiskActions.filter(a => a.risk_level === "MEDIUM").length
      },
      time_window: {
        start: new Date(time_start_ms).toISOString(),
        end: new Date(time_end_ms).toISOString()
      }
    },
    approvals: highRiskActions,
    non_coder_summary: generateNonCoderSummary(highRiskActions)
  };
}

/**
 * Generate non-coder readable summary of high-risk approvals
 * @param {Array} approvals - List of approval records
 * @returns {string} Human-readable summary
 */
function generateNonCoderSummary(approvals) {
  if (approvals.length === 0) {
    return "No high-risk approvals in the specified time period.";
  }

  const irreversible = approvals.filter(a => a.risk_level === "IRREVERSIBLE");
  const high = approvals.filter(a => a.risk_level === "HIGH");

  let summary = `High-Risk Approval Summary\n${"=".repeat(50)}\n\n`;

  if (irreversible.length > 0) {
    summary += `⚠️  IRREVERSIBLE ACTIONS (${irreversible.length}):\n`;
    irreversible.forEach(a => {
      summary += `   - ${a.action_type} (${new Date(a.timestamp).toLocaleDateString()})\n`;
      summary += `     Operator: ${a.operator_id} (${a.operator_role})\n`;
      summary += `     Affected: ${a.blast_radius_count} item(s)\n`;
      summary += `     Reversible: ${a.reversibility}\n\n`;
    });
  }

  if (high.length > 0) {
    summary += `⚠️  HIGH-RISK ACTIONS (${high.length}):\n`;
    high.forEach(a => {
      summary += `   - ${a.action_type} (${new Date(a.timestamp).toLocaleDateString()})\n`;
      summary += `     Operator: ${a.operator_id} (${a.operator_role})\n`;
      summary += `     Affected: ${a.blast_radius_count} item(s)\n\n`;
    });
  }

  summary += `\nTotal: ${irreversible.length + high.length} high-risk approval(s)\n`;
  return summary;
}

/**
 * Get operator action statistics
 * @param {Object} options - Filter options
 * @returns {Object} Statistics
 */
export function getOperatorStatistics(options = {}) {
  const allActions = inspectOperatorActions(options);
  const actions = allActions.actions;

  const stats = {
    total_actions: actions.length,
    approved: actions.filter(a => a.decision_outcome === "APPROVED").length,
    refused: actions.filter(a => a.decision_outcome === "REFUSED").length,
    by_operator: {},
    by_role: {},
    by_action_type: {},
    by_risk_level: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      IRREVERSIBLE: 0
    }
  };

  for (const action of actions) {
    // By operator
    if (!stats.by_operator[action.operator_id]) {
      stats.by_operator[action.operator_id] = 0;
    }
    stats.by_operator[action.operator_id]++;

    // By role
    if (!stats.by_role[action.operator_role]) {
      stats.by_role[action.operator_role] = 0;
    }
    stats.by_role[action.operator_role]++;

    // By action type
    if (!stats.by_action_type[action.action_type]) {
      stats.by_action_type[action.action_type] = 0;
    }
    stats.by_action_type[action.action_type]++;

    // By risk level
    if (action.risk_level && stats.by_risk_level[action.risk_level]) {
      stats.by_risk_level[action.risk_level]++;
    }
  }

  return stats;
}
