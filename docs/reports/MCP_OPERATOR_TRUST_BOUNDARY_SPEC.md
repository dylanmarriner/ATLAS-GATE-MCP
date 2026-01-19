# MCP Operator Trust Boundary Specification

**Status**: IMPLEMENTED  
**Version**: 1.0  
**Date**: January 19, 2026  
**Target**: KAIZA MCP Server (WINDSURF Execution Role)

---

## Executive Summary

This specification defines human-factor defenses and operator trust boundaries for the KAIZA MCP server. It implements mandatory safeguards against operator error, social engineering, fatigue, and accidental high-risk approvals.

The implementation uses fail-closed semantics: ambiguous or risky actions are refused until operators provide structured, verifiable acknowledgement.

---

## Threat Model

The system defends against:

### 1. Authority Confusion
**Threat**: Operator approves one action but system executes another  
**Defense**: Explicit action_id binding, consequence re-presentation, verbatim matching

### 2. Urgency Pressure
**Threat**: "Prod is down, just approve it" manipulation  
**Defense**: Language sanitization strips urgency keywords, mandatory delay before confirmation

### 3. Social Engineering
**Threat**: "Trust me, I know what I'm doing" or manipulation phrases  
**Defense**: Pattern detection, blocked approval phrases, required structured acknowledgement

### 4. Fatigue Errors
**Threat**: Late-night approvals without proper review  
**Defense**: Approval rate limiting, mandatory pauses, fatigue guard triggers

### 5. Overconfidence
**Threat**: Operator skips risk analysis  
**Defense**: Machine-generated consequences (not free-text), blast radius analysis, reversibility checks

### 6. Approval Sprawl
**Threat**: Repeated approvals without re-evaluation  
**Defense**: Session limits, hourly limits, fatigue tracking per operator

---

## Architecture

### Core Components

```
core/operator-identity.js
├─ bindOperatorIdentity(operator_id, operator_role, auth_context)
├─ getBoundOperatorIdentity()
└─ verifyOperatorBound()

core/risk-acknowledgement.js
├─ createRiskAcknowledgement(action_id, risk_level, files, reversibility)
├─ generateConsequences(action_id, risk_level, files, context)
├─ validateRiskAcknowledgement(ack)
└─ enforceRiskAcknowledgement(ack, threshold)

core/two-step-confirmation.js
├─ initiateConfirmation(action_id, summary, consequences, context)
├─ checkConfirmationDelay(token)
└─ completeConfirmation(token, operator_consequences)

core/language-sanitization.js
├─ detectSocialEngineeringPatterns(text)
├─ sanitizeUrgencyLanguage(text)
├─ highlightHighRiskTerms(text)
└─ enforceLanguageSanitization(text, allow_high_risk)

core/fatigue-guards.js
├─ checkOperatorFatigue()
├─ enforceFatigueGuards()
├─ recordApproval()
└─ recordMandatoryPause()

core/human-factor-audit.js
├─ logHumanFactorDecision(decision, sessionId)
├─ logOperatorBinding(binding, sessionId)
├─ logFatigueGuardTrigger(data, sessionId)
└─ logRefusal(data, sessionId)

core/operator-inspection.js
├─ inspectOperatorActions(options)
├─ inspectHighRiskApprovals(options)
└─ getOperatorStatistics(options)
```

---

## Requirements & Implementation

### Requirement 1: Operator Identity Binding (HARD)

**Specification**:
- Every human action includes: `operator_id`, `operator_role`, `authentication_context`
- Identity bound at session start, immutable for session
- No anonymous approvals
- Cannot change mid-session

**Implementation**:
- `operator-identity.js` module manages binding
- `SESSION_STATE` holds bound operator record
- Attempt to rebind throws `OPERATOR_IDENTITY_ALREADY_BOUND`

**Code**:
```javascript
const identity = bindOperatorIdentity("alice@company.com", "OWNER", "github-oauth");
// Returns: {status: "OPERATOR_IDENTITY_BOUND", operator_id, operator_role, bound_at}

// Mid-session rebind fails:
bindOperatorIdentity("bob@company.com", "REVIEWER", "github-oauth");
// Throws: OPERATOR_IDENTITY_ALREADY_BOUND
```

**Audit Trail**:
```json
{
  "type": "OPERATOR_IDENTITY_BOUND",
  "operator_id": "alice@company.com",
  "operator_role": "OWNER",
  "authentication_context": "github-oauth",
  "bound_at": "2026-01-19T10:00:00Z"
}
```

---

### Requirement 2: Explicit Risk Acknowledgement (CRITICAL)

**Specification**:
- Structured risk acknowledgement, NOT free text
- Machine-generated consequences (not human-written)
- Operator must confirm: `operator_confirmation = true`
- Blast radius, reversibility, risk level recorded

**Implementation**:
- `risk-acknowledgement.js` creates templates
- `generateConsequences()` creates deterministic consequences
- Validation rejects incomplete acknowledgements

**Code**:
```javascript
const ack = createRiskAcknowledgement(
  "action-123",      // action_id
  "HIGH",            // risk_level
  ["/core/auth.js"], // affected_files
  "NO"               // reversibility
);

// Returns: {action_id, risk_level, explicit_consequences, blast_radius, ...}
// operator_confirmation = false (operator must set to true)

// Enforce:
enforceRiskAcknowledgement(ack, RISK_LEVELS.HIGH);
// Throws: RISK_ACK_INCOMPLETE if operator_confirmation !== true
```

**Risk Levels**:
- `LOW` (0): File modifications, non-critical
- `MEDIUM` (1): Config changes, audit log impact
- `HIGH` (2): Infrastructure changes, multiple files
- `IRREVERSIBLE` (3): Cannot be undone, permanent impact

**Consequences (Machine-Generated)**:
```
- "File modification: 2 file(s) will be changed"
- "Audit log entry will be created"
- "Change is recorded in governance history"
- "This action affects core infrastructure"
- "Rollback may require manual intervention"
```

---

### Requirement 3: Two-Step Confirmation (CRITICAL)

**Specification**:
- Step 1: Intent declaration ("I intend to approve X")
- Step 2: Delayed confirmation (>= 30s minimum)
- Re-present consequences verbatim, no copy-paste
- Mismatch → refuse

**Implementation**:
- `two-step-confirmation.js` manages state
- `initiateConfirmation()` starts step 1
- `checkConfirmationDelay()` verifies delay elapsed
- `completeConfirmation()` validates step 2 with exact string matching

**Code**:
```javascript
// Step 1: Initiate
const init = initiateConfirmation(
  "action-123",
  "Approve critical change",
  ["Consequence 1", "Consequence 2"],
  {}
);
// Returns: {confirmation_token, minimum_wait_ms: 30000, ...}

// Step 2: After 30+ seconds, re-confirm
const result = completeConfirmation(init.confirmation_token, [
  "Consequence 1",  // MUST match exactly
  "Consequence 2"   // Character-by-character
]);
// Returns: {confirmed: true, consequences_verified: true, ...}
// Throws: CONFIRMATION_SEQUENCE_VIOLATION if:
//   - Less than 30s elapsed
//   - Consequences don't match exactly
//   - Token invalid or expired
```

**Flow Diagram**:
```
Step 1: Initiate Confirmation
  ├─ Check token doesn't exist
  ├─ Record initiation time + consequences
  └─ Return confirmation_token + minimum_wait_ms

Step 2a: Check Delay (optional)
  └─ Verify elapsed >= 30000ms

Step 2b: Complete Confirmation
  ├─ Verify token exists
  ├─ Verify delay elapsed
  ├─ Verify consequences match character-for-character
  └─ Mark confirmed + return hash
```

---

### Requirement 4: Language Sanitization (ANTI-SOCIAL-ENGINEERING)

**Specification**:
- Strip urgency keywords: urgent, immediately, emergency, asap, etc.
- Highlight irreversible actions, policy exceptions, scope expansion
- Detect manipulation phrases: "trust me", "I know what I'm doing", "just approve"
- Enforce on proposals, approval prompts, remediation summaries

**Implementation**:
- `language-sanitization.js` provides detection and sanitization
- `detectSocialEngineeringPatterns()` flags dangerous text
- `enforceLanguageSanitization()` blocks action if patterns found
- Sanitization applies to all human-facing text

**Urgency Keywords** (stripped):
```
urgent, immediately, emergency, asap, right now, just approve,
just do it, system requires, system demands, critical issue,
production down, prod is down, we need this now
```

**Manipulation Phrases** (detected):
```
trust me, i understand the risk, i know what i'm doing,
just this once, make an exception, this time only
```

**High-Risk Terms** (highlighted):
```
irreversible, cannot be undone, cannot be reverted, permanent,
policy exception, bypass, override, disable security,
allow unsupervised, scope expansion, expand permissions
```

**Code**:
```javascript
// Detect patterns
const analysis = detectSocialEngineeringPatterns(
  "urgent: please approve immediately"
);
// Returns: {detected: true, patterns: [...], severity: "HIGH"}

// Sanitize
const sanitized = sanitizeUrgencyLanguage(
  "This is urgent and needs it immediately"
);
// Returns: "This is important and needs it as soon as possible"

// Highlight high-risk
const highlighted = highlightHighRiskTerms(
  "This is irreversible"
);
// Returns: {has_high_risk: true, highlighted_terms: [...]}

// Enforce (blocks on pattern detection)
enforceLanguageSanitization(userText, false);
// Throws: SOCIAL_ENGINEERING_PATTERN_DETECTED if patterns found
```

---

### Requirement 5: Fatigue Guards (APPROVAL RATE LIMITING)

**Specification**:
- Max 10 approvals per session
- Max 20 approvals per hour
- Mandatory 1-minute pause after 5 consecutive approvals
- Triggers `OPERATOR_FATIGUE_GUARD_TRIGGERED` on violation

**Implementation**:
- `fatigue-guards.js` tracks approval counts and timestamps
- `enforceFatigueGuards()` checks all limits before approval
- `recordApproval()` increments counters
- `recordMandatoryPause()` resets consecutive counter

**Code**:
```javascript
// Before approval, check fatigue
enforceFatigueGuards();
// Throws: OPERATOR_FATIGUE_GUARD_TRIGGERED if any limit exceeded

// Record approval
recordApproval();
// Returns: {approval_recorded: true, session_approvals: N, consecutive_approvals: M}

// Record mandatory pause
recordMandatoryPause();
// Resets consecutive_approvals to 0

// Check status
const status = checkOperatorFatigue();
// Returns: {is_fatigued, reasons, session_approvals, remaining_approvals, ...}
```

**Limits** (configurable):
- `MAX_APPROVALS_PER_SESSION`: 10
- `MAX_APPROVALS_PER_HOUR`: 20
- `APPROVALS_BEFORE_MANDATORY_PAUSE`: 5
- `MANDATORY_PAUSE_MS`: 60000 (1 minute)

---

### Requirement 6: Human-Factor Audit Trail

**Specification**:
- Audit entries include: `operator_id`, `operator_role`, `action_type`, `risk_level`
- Confirmation timestamps and delay durations recorded
- Refusal reasons documented
- Integrated with existing audit-log.js

**Implementation**:
- `human-factor-audit.js` logs decisions with operator context
- Appends to audit-log.jsonl with human-factor metadata
- Queryable by forensic replay and attestation

**Audit Entry Types**:
- `HUMAN_FACTOR_DECISION`: Approval/refusal with risk metadata
- `OPERATOR_IDENTITY_BOUND`: Session operator binding
- `FATIGUE_GUARD_TRIGGERED`: Rate limit violation
- `ACTION_REFUSED`: Blocked action with reason
- `CONFIRMATION_INITIATED`: Two-step started
- `CONFIRMATION_COMPLETED`: Two-step finished
- `RISK_ACKNOWLEDGED`: Risk ack recorded
- `MANDATORY_PAUSE_RECORDED`: Pause taken

**Example Entry**:
```json
{
  "type": "HUMAN_FACTOR_DECISION",
  "operator_id": "alice@company.com",
  "operator_role": "OWNER",
  "action_id": "action-123",
  "action_type": "PLAN_APPROVAL",
  "risk_level": "HIGH",
  "blast_radius": ["/core/auth.js"],
  "reversibility": "NO",
  "confirmation_required": true,
  "confirmation_delay_ms": 35000,
  "decision_outcome": "APPROVED",
  "timestamp": "2026-01-19T10:15:30Z"
}
```

---

### Requirement 7: Read-Only Inspection Tools

**Specification**:
- `inspect_operator_actions()`: List operator actions with filters
- `inspect_high_risk_approvals()`: Show HIGH/IRREVERSIBLE actions only
- Non-coder readable summaries
- Read-only, no mutation

**Implementation**:
- `operator-inspection.js` parses audit-log.jsonl
- No state changes, purely analytical
- Returns structured data + human-readable summaries

**Code**:
```javascript
// All actions by operator in time window
const actions = inspectOperatorActions({
  operator_id: "alice@company.com",
  time_start_ms: Date.now() - 86400000, // Last 24h
  time_end_ms: Date.now()
});
// Returns: {summary, actions: []}

// High-risk approvals only
const highRisk = inspectHighRiskApprovals({
  min_risk_level: 2, // HIGH or IRREVERSIBLE
  time_start_ms: Date.now() - 604800000 // Last 7d
});
// Returns: {summary, approvals: [], non_coder_summary: "..."}

// Statistics
const stats = getOperatorStatistics({operator_id: "alice@company.com"});
// Returns: {total_actions, approved, refused, by_operator, ...}
```

**Non-Coder Summary Example**:
```
High-Risk Approval Summary
==================================================

⚠️  IRREVERSIBLE ACTIONS (1):
   - PLAN_APPROVAL (01/15/2026)
     Operator: alice@company.com (OWNER)
     Affected: 2 item(s)
     Reversible: NO

⚠️  HIGH-RISK ACTIONS (3):
   - CONFIG_CHANGE (01/14/2026)
     Operator: alice@company.com (OWNER)
     Affected: 5 item(s)
   ...

Total: 4 high-risk approval(s)
```

---

### Requirement 8: Fail-Closed Semantics

**Error Codes**:
```
OPERATOR_IDENTITY_MISSING
OPERATOR_IDENTITY_ALREADY_BOUND
INVALID_OPERATOR_ID
INVALID_OPERATOR_ROLE
INVALID_AUTH_CONTEXT

RISK_ACK_INCOMPLETE
CONFIRMATION_SEQUENCE_VIOLATION
CONFIRMATION_TOKEN_INVALID

SOCIAL_ENGINEERING_PATTERN_DETECTED

OPERATOR_FATIGUE_GUARD_TRIGGERED
```

**Policy**:
- Missing operator identity → REFUSE
- Incomplete acknowledgement → REFUSE
- Delay bypass attempted → REFUSE
- Language manipulation detected → REFUSE
- Fatigue guard triggered → REFUSE

---

## Non-Coder Explanation

### For Operators

**What is Operator Trust Boundary?**

This is a set of safeguards to prevent mistakes when approving important changes. It's like a "verify what you're doing" system for high-risk decisions.

**The Four Key Safeguards**:

1. **Identity** - The system tracks who you are and prevents identity swapping
2. **Consequences** - Before you approve, the system shows you exactly what will change
3. **Time to Think** - The system makes you wait 30 seconds before final approval, then re-confirm the consequences
4. **Fatigue Protection** - After 5 approvals, you get a mandatory 1-minute break to prevent tired mistakes

**What Happens When You Approve**:

1. System binds your identity (one per session)
2. You request to approve an action
3. System shows you the risk level and what will change
4. System shows machine-generated consequences (not your words)
5. You confirm you understand the consequences
6. System shows you a confirmation link with a 30-second delay
7. You wait 30 seconds, then confirm again by re-stating the consequences
8. Action approved, all recorded in audit trail

**When System Says No**:

- If you try urgent language ("urgent", "immediately") → System blocks and asks for structured acknowledgement
- If you're making too many changes → Mandatory break required
- If you skip steps → Action refused
- If consequences don't match → System thinks you weren't paying attention → Action refused

---

## Testing

**Test Coverage** (16 tests):

1. ✓ Operator identity binding: cannot rebind mid-session
2. ✓ Operator identity validation: rejects missing operator_id
3. ✓ Operator identity validation: rejects invalid role
4. ✓ Operator identity: verifyOperatorBound throws when not bound
5. ✓ Risk acknowledgement: HIGH-risk requires explicit confirmation
6. ✓ Two-step confirmation: minimum delay enforced
7. ✓ Two-step confirmation: consequences must match verbatim
8. ✓ Language sanitization: detects urgency keywords
9. ✓ Language sanitization: strips urgency language
10. ✓ Language sanitization: highlights high-risk terms
11. ✓ Language sanitization: detects manipulation phrases
12. ✓ Fatigue guards: blocks on session limit exceeded
13. ✓ Fatigue guards: resets after mandatory pause
14. ✓ Inspection tools: operator actions readable
15. ✓ Inspection tools: high-risk approvals isolated
16. ✓ Error handling: refusal is deterministic and logged

**Run Tests**:
```bash
npm test test-operator-trust-boundary.js
# OR
node test-operator-trust-boundary.js
```

---

## Operator Responsibilities

1. **Bind Identity at Session Start**: Call with your ID, role, and auth context
2. **Review Consequences**: Read machine-generated consequences carefully
3. **Respect Delays**: Don't rush through the 30-second wait
4. **Take Mandatory Pauses**: After 5 approvals, take a 1-minute break
5. **Avoid Urgent Language**: Let the system block urgency-based language
6. **Verify Changes**: Use inspection tools to audit high-risk approvals
7. **Maintain Audit Trail**: All decisions are recorded for compliance

---

## Known Limitations

1. **Time-Based Delays**: Relies on system clock; no distributed consensus
2. **Stateful Tracking**: Fatigue guards reset on process restart
3. **Audit Log Parsing**: Inspection tools are slow for large audit logs (>10k entries)
4. **Language Detection**: Simple keyword-based; sophisticated English evasion possible
5. **Pattern Detection**: Not ML-based; requires manual rule updates

---

## Future Enhancements

1. Distributed fatigue tracking (across multiple servers)
2. ML-based social engineering detection
3. Operator behavior profiling (detect anomalies)
4. Integration with external identity providers (OIDC, LDAP)
5. Graphical audit trail viewer
6. Approval delegation policies
7. Operator session timeouts

---

## References

- Requirement Document: WINDSURF EXECUTION PROMPT - KAIZA MCP OPERATOR TRUST BOUNDARY
- Audit Log: `audit-log.jsonl`
- Session State: `session.js`
- Path Resolution: `core/path-resolver.js`

---

**Document Status**: COMPLETE  
**Last Updated**: January 19, 2026
