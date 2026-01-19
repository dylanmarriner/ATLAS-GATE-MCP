/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Define canonical intent artifact schema and validation rules
 * AUTHORITY: WINDSURF EXECUTION PROMPT — MCP Intent Artifact Law (Schema + Validation)
 *
 * This module enforces the canonical intent schema with strict structural validation.
 * Intents are non-negotiable for every file write (except failure reports).
 */

import crypto from "crypto";

/**
 * Canonical intent artifact schema (REQUIRED SECTIONS IN ORDER)
 * @type {Object}
 */
export const CANONICAL_INTENT_SCHEMA = {
  // Required sections in this exact order
  sections: [
    {
      id: "title",
      header: /^# Intent: /,
      required: true,
      validator: validateTitle,
      description: "File path reference"
    },
    {
      id: "purpose",
      header: /^## Purpose$/,
      required: true,
      validator: validatePurpose,
      description: "Plain English explanation"
    },
    {
      id: "authority",
      header: /^## Authority$/,
      required: true,
      validator: validateAuthority,
      description: "Plan hash and phase ID binding"
    },
    {
      id: "inputs",
      header: /^## Inputs$/,
      required: true,
      validator: validateInputs,
      description: "Input categories"
    },
    {
      id: "outputs",
      header: /^## Outputs$/,
      required: true,
      validator: validateOutputs,
      description: "External effects"
    },
    {
      id: "invariants",
      header: /^## Invariants$/,
      required: true,
      validator: validateInvariants,
      description: "Declarative rules"
    },
    {
      id: "failure_modes",
      header: /^## Failure Modes$/,
      required: true,
      validator: validateFailureModes,
      description: "Failure categories"
    },
    {
      id: "debug_signals",
      header: /^## Debug Signals$/,
      required: true,
      validator: validateDebugSignals,
      description: "Observability points"
    },
    {
      id: "out_of_scope",
      header: /^## Out-of-Scope$/,
      required: true,
      validator: validateOutOfScope,
      description: "Explicit constraints"
    }
  ],

  forbiddenPatterns: [
    {
      pattern: /```/,
      name: "Code block",
      reason: "Code blocks forbidden in intent"
    },
    {
      pattern: /^```/m,
      name: "Code fence",
      reason: "Code fences forbidden in intent"
    },
    {
      pattern: /\{|\}|;|=>|function|const |let |var /,
      name: "Code symbol",
      reason: "Code syntax forbidden in intent"
    },
    {
      pattern: /\d{4}-\d{2}-\d{2}|today|now|tomorrow|current|latest/i,
      name: "Timestamp/dynamic",
      reason: "Dynamic fields break determinism"
    },
    {
      pattern: /by \w+|@\w+|author|written by|created by/i,
      name: "Author attribution",
      reason: "Author names forbidden in intent"
    },
    {
      pattern: /TODO|FIXME|XXX|HACK/,
      name: "Work marker",
      reason: "Unfinished work markers forbidden"
    },
    {
      pattern: /might|should|could|ideally|perhaps|maybe/i,
      name: "Conditional language",
      reason: "Intent must be declarative, not conditional"
    },
    {
      pattern: /https?:\/\/.*(?!Authority section)/,
      name: "URL (non-authority)",
      reason: "URLs only allowed in Authority section"
    }
  ]
};

/**
 * Validate title section format and path binding
 * @param {string} titleLine - The title line (e.g., "# Intent: core/intent-validator.js")
 * @param {string} targetPath - The workspace-relative target file path
 * @returns {{valid: boolean, error?: string}}
 */
function validateTitle(titleLine, targetPath) {
  const match = titleLine.match(/^# Intent: (.+)$/);

  if (!match) {
    return {
      valid: false,
      error: "Title must be '# Intent: <path>'."
    };
  }

  const declaredPath = match[1].trim();

  // Case-sensitive exact match (required by spec)
  if (declaredPath !== targetPath) {
    return {
      valid: false,
      error: `Path mismatch: title declares "${declaredPath}" but target is "${targetPath}"`
    };
  }

  return { valid: true };
}

/**
 * Validate purpose section (plain English, no code)
 * @param {string} content - Content between Purpose header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validatePurpose(content) {
  const lines = content.trim().split("\n");

  if (lines.length === 0) {
    return {
      valid: false,
      error: "Purpose must contain at least one paragraph"
    };
  }

  const text = lines.join(" ");

  // Check for code symbols
  if (/\{|\}|;|=>/.test(text)) {
    return {
      valid: false,
      error: "Purpose must not contain code symbols"
    };
  }

  if (text.length < 30) {
    return {
      valid: false,
      error: "Purpose must be at least 30 characters"
    };
  }

  return { valid: true };
}

/**
 * Validate authority section (Plan Hash + Phase ID)
 * @param {string} content - Content between Authority header and next section
 * @param {string} executingPlanHash - Current plan hash (optional, for drift checking)
 * @param {string} executingPhaseId - Current phase ID (optional, for drift checking)
 * @returns {{valid: boolean, error?: string, planHash?: string, phaseId?: string}}
 */
function validateAuthority(content, executingPlanHash, executingPhaseId) {
  const lines = content.trim().split("\n");

  let planHash = null;
  let phaseId = null;

  for (const line of lines) {
    const planMatch = line.match(/Plan Hash:\s*([a-fA-F0-9]{64})/);
    const phaseMatch = line.match(/Phase ID:\s*(PHASE_\w+)/);

    if (planMatch) {
      planHash = planMatch[1].toLowerCase();
    }
    if (phaseMatch) {
      phaseId = phaseMatch[1];
    }
  }

  if (!planHash) {
    return {
      valid: false,
      error: "Authority must include 'Plan Hash: <sha256>'"
    };
  }

  if (!phaseId) {
    return {
      valid: false,
      error: "Authority must include 'Phase ID: PHASE_*'"
    };
  }

  // Check drift if executing context available
  if (executingPlanHash && planHash !== executingPlanHash.toLowerCase()) {
    return {
      valid: false,
      error: `Plan hash drift: intent references ${planHash} but executing ${executingPlanHash}`
    };
  }

  if (executingPhaseId && phaseId !== executingPhaseId) {
    return {
      valid: false,
      error: `Phase ID drift: intent references ${phaseId} but executing ${executingPhaseId}`
    };
  }

  return { valid: true, planHash, phaseId };
}

/**
 * Validate inputs section (bulleted list)
 * @param {string} content - Content between Inputs header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validateInputs(content) {
  return validateBulletedSection(content, "Inputs", 1);
}

/**
 * Validate outputs section (bulleted list)
 * @param {string} content - Content between Outputs header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validateOutputs(content) {
  return validateBulletedSection(content, "Outputs", 1);
}

/**
 * Validate invariants section (bulleted list of declarative rules)
 * @param {string} content - Content between Invariants header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validateInvariants(content) {
  const result = validateBulletedSection(content, "Invariants", 1);

  if (!result.valid) {
    return result;
  }

  // Check for conditional language in invariants
  const items = extractBulletItems(content);
  for (const item of items) {
    if (/\bmight\b|\bshould\b|\bcould\b|\bideal/i.test(item)) {
      return {
        valid: false,
        error: "Invariants must be declarative (no 'might', 'should', 'could')"
      };
    }
  }

  return { valid: true };
}

/**
 * Validate failure modes section (bulleted list)
 * @param {string} content - Content between Failure Modes header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validateFailureModes(content) {
  return validateBulletedSection(content, "Failure Modes", 1);
}

/**
 * Validate debug signals section (bulleted list)
 * @param {string} content - Content between Debug Signals header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validateDebugSignals(content) {
  return validateBulletedSection(content, "Debug Signals", 1);
}

/**
 * Validate out-of-scope section (bulleted list)
 * @param {string} content - Content between Out-of-Scope header and next section
 * @returns {{valid: boolean, error?: string}}
 */
function validateOutOfScope(content) {
  return validateBulletedSection(content, "Out-of-Scope", 1);
}

/**
 * Generic validator for bulleted sections
 * @param {string} content - Section content
 * @param {string} sectionName - Section name (for error messages)
 * @param {number} minItems - Minimum bullet items required
 * @returns {{valid: boolean, error?: string}}
 */
function validateBulletedSection(content, sectionName, minItems) {
  const items = extractBulletItems(content);

  if (items.length < minItems) {
    return {
      valid: false,
      error: `${sectionName} must have at least ${minItems} bullet item(s)`
    };
  }

  return { valid: true };
}

/**
 * Extract bullet items from section content
 * @param {string} content - Raw section content
 * @returns {string[]} Array of bullet item texts
 */
function extractBulletItems(content) {
  const lines = content.trim().split("\n");
  const items = [];

  for (const line of lines) {
    const match = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (match) {
      items.push(match[1]);
    }
  }

  return items;
}

/**
 * Check for forbidden patterns in entire intent document
 * @param {string} content - Full intent document
 * @returns {{valid: boolean, violations?: Array<{pattern: string, reason: string}>}}
 */
export function checkForbiddenPatterns(content) {
  const violations = [];

  for (const forbidden of CANONICAL_INTENT_SCHEMA.forbiddenPatterns) {
    if (forbidden.pattern.test(content)) {
      violations.push({
        pattern: forbidden.name,
        reason: forbidden.reason
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Split intent document into sections by header
 * @param {string} content - Full intent document
 * @returns {Object} Map of section ID to content
 */
export function parseSections(content) {
  const sections = {};
  const lines = content.split("\n");
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    let matched = false;

    for (const schemaSection of CANONICAL_INTENT_SCHEMA.sections) {
      if (schemaSection.header.test(line)) {
        // Save previous section
        if (currentSection) {
          sections[currentSection.id] = currentContent.join("\n");
        }

        currentSection = schemaSection;
        currentContent = [line]; // Include the header
        matched = true;
        break;
      }
    }

    if (!matched && currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection.id] = currentContent.join("\n");
  }

  return sections;
}

/**
 * Compute deterministic hash of intent document
 * (Hash is stable across identical intent content)
 * @param {string} content - Intent document content
 * @returns {string} SHA256 hex digest
 */
export function hashIntent(content) {
  const normalized = content.trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
