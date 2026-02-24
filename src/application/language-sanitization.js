/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Language sanitization and social engineering detection
 * FAILURE MODES: Urgency-based overrides, manipulation, fatigue attacks
 * 
 * Implements WINDSURF MCP Operator Trust Boundary Requirement 5:
 * Language Sanitization (Anti-Social-Engineering)
 * 
 * - Strip urgency keywords: urgent, immediately, emergency, just approve, system requires
 * - Highlight: irreversible actions, policy exceptions, scope expansion
 * - Apply to proposals, approval prompts, remediation summaries
 */

/**
 * Urgency keywords to strip/flag
 */
const URGENCY_KEYWORDS = [
  "urgent",
  "immediately",
  "emergency",
  "asap",
  "right now",
  "just approve",
  "just do it",
  "system requires",
  "system demands",
  "critical issue",
  "production down",
  "prod is down",
  "we need this now"
];

/**
 * High-risk terms to highlight
 */
const HIGH_RISK_TERMS = [
  "irreversible",
  "cannot be undone",
  "cannot be reverted",
  "permanent",
  "policy exception",
  "bypass",
  "override",
  "disable security",
  "allow unsupervised",
  "scope expansion",
  "expand permissions"
];

/**
 * Detect social engineering patterns in text
 * @param {string} text - Text to analyze
 * @returns {Object} {detected, patterns, severity}
 */
export function detectSocialEngineeringPatterns(text) {
  if (!text || typeof text !== "string") {
    return {
      detected: false,
      patterns: [],
      severity: "NONE"
    };
  }

  const lowerText = text.toLowerCase();
  const patterns = [];
  let severity = "NONE";

  // Check urgency keywords
  for (const keyword of URGENCY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      patterns.push({
        type: "URGENCY",
        keyword,
        severity: "HIGH"
      });
      severity = "HIGH";
    }
  }

  // Check for manipulation phrases
  const manipulationPhrases = [
    "trust me",
    "i understand the risk",
    "i know what i'm doing",
    "just this once",
    "make an exception",
    "this time only"
  ];

  for (const phrase of manipulationPhrases) {
    if (lowerText.includes(phrase)) {
      patterns.push({
        type: "MANIPULATION_PHRASE",
        phrase,
        severity: "HIGH"
      });
      severity = "HIGH";
    }
  }

  // Check for vague approval patterns
  const vaguePhrases = [
    "i approve",
    "sounds good",
    "ok",
    "sure",
    "yep"
  ];

  for (const phrase of vaguePhrases) {
    if (lowerText === phrase || lowerText === phrase.trim()) {
      patterns.push({
        type: "VAGUE_APPROVAL",
        phrase,
        severity: "MEDIUM"
      });
      if (severity !== "HIGH") severity = "MEDIUM";
    }
  }

  return {
    detected: patterns.length > 0,
    patterns,
    severity,
    recommendation: patterns.length > 0
      ? "BLOCK_ACTION: Social engineering pattern detected. Require structured acknowledgement."
      : null
  };
}

/**
 * Sanitize text by removing urgency keywords
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeUrgencyLanguage(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let sanitized = text;

  // Replace urgency keywords with neutral versions
  const replacements = {
    "urgent": "important",
    "immediately": "as soon as possible",
    "emergency": "high priority situation",
    "asap": "as soon as possible",
    "right now": "soon",
    "just approve": "please review and approve",
    "just do it": "please proceed with the action",
    "system requires": "the system recommends",
    "system demands": "the system indicates",
    "critical issue": "significant issue",
    "production down": "production system affected",
    "prod is down": "production system affected",
    "we need this now": "this is needed"
  };

  for (const [keyword, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(keyword, "gi");
    sanitized = sanitized.replace(regex, replacement);
  }

  return sanitized;
}

/**
 * Highlight high-risk terms in text
 * @param {string} text - Text to analyze
 * @returns {Object} {original, highlighted_terms, has_high_risk}
 */
export function highlightHighRiskTerms(text) {
  if (!text || typeof text !== "string") {
    return {
      original: text,
      highlighted_terms: [],
      has_high_risk: false
    };
  }

  const lowerText = text.toLowerCase();
  const highlighted = [];

  for (const term of HIGH_RISK_TERMS) {
    if (lowerText.includes(term)) {
      highlighted.push({
        term,
        type: "HIGH_RISK_TERM"
      });
    }
  }

  return {
    original: text,
    highlighted_terms: highlighted,
    has_high_risk: highlighted.length > 0,
    warning: highlighted.length > 0
      ? `ALERT: Text contains ${highlighted.length} high-risk term(s). Operator must acknowledge consequences.`
      : null
  };
}

/**
 * Comprehensive language analysis
 * Combines social engineering detection, sanitization, and risk highlighting
 * 
 * @param {string} text - Text to analyze
 * @param {Object} context - Optional context {action_type, risk_level}
 * @returns {Object} Comprehensive analysis
 */
export function analyzeLanguage(text, context = {}) {
  const sePatterns = detectSocialEngineeringPatterns(text);
  const sanitized = sanitizeUrgencyLanguage(text);
  const riskTerms = highlightHighRiskTerms(text);

  return {
    original_text: text,
    social_engineering: sePatterns,
    sanitized_text: sanitized,
    text_changed: sanitized !== text,
    high_risk_terms: riskTerms,
    overall_risk: (sePatterns.severity === "HIGH" || riskTerms.has_high_risk) ? "HIGH" : "NORMAL",
    recommendation: sePatterns.detected || riskTerms.has_high_risk
      ? "REQUIRE_STRUCTURED_ACK: Text contains social engineering patterns or high-risk terms"
      : null
  };
}

/**
 * Enforce sanitization on approval prompts
 * Blocks actions if social engineering detected without explicit override
 * 
 * @param {string} text - Text to validate
 * @param {boolean} allow_high_risk - Whether to allow high-risk language
 * @throws {Error} If dangerous patterns detected
 */
export function enforceLanguageSanitization(text, allow_high_risk = false) {
  const analysis = analyzeLanguage(text);

  if (analysis.social_engineering.detected && !allow_high_risk) {
    throw new Error(
      `SOCIAL_ENGINEERING_PATTERN_DETECTED: ${analysis.social_engineering.patterns
        .map(p => `${p.type}(${p.keyword || p.phrase})`)
        .join(", ")}. Provide structured acknowledgement instead.`
    );
  }
}
