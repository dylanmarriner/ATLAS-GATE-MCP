import assert from "assert";
import {
  bindOperatorIdentity,
  getBoundOperatorIdentity,
  verifyOperatorBound,
  resetOperatorIdentity
} from "./core/operator-identity.js";
import {
  RISK_LEVELS,
  createRiskAcknowledgement,
  validateRiskAcknowledgement,
  enforceRiskAcknowledgement
} from "./core/risk-acknowledgement.js";
import {
  initiateConfirmation,
  checkConfirmationDelay,
  completeConfirmation,
  resetPendingConfirmations
} from "./core/two-step-confirmation.js";
import {
  detectSocialEngineeringPatterns,
  sanitizeUrgencyLanguage,
  highlightHighRiskTerms,
  enforceLanguageSanitization
} from "./core/language-sanitization.js";
import {
  checkOperatorFatigue,
  enforceFatigueGuards,
  recordApproval,
  recordMandatoryPause,
  resetFatigueGuards,
  configureFatigueLimits
} from "./core/fatigue-guards.js";
import {
  inspectOperatorActions,
  inspectHighRiskApprovals,
  getOperatorStatistics
} from "./core/operator-inspection.js";
import { SESSION_STATE } from "./session.js";
import { lockWorkspaceRoot, resetWorkspaceRootForTesting } from "./core/path-resolver.js";

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    testsFailed++;
  }
}

// TEST 1: Operator identity cannot be bound twice
test("Operator identity binding: cannot rebind mid-session", () => {
  resetOperatorIdentity();
  const result1 = bindOperatorIdentity("alice@company.com", "OWNER", "github-oauth");
  assert.strictEqual(result1.status, "OPERATOR_IDENTITY_BOUND");

  try {
    bindOperatorIdentity("bob@company.com", "REVIEWER", "github-oauth");
    throw new Error("Should have thrown on rebind");
  } catch (err) {
    assert(err.message.includes("OPERATOR_IDENTITY_ALREADY_BOUND"));
  }
});

// TEST 2: Operator identity missing throws error
test("Operator identity validation: rejects missing operator_id", () => {
  resetOperatorIdentity();
  try {
    bindOperatorIdentity("", "OWNER", "github-oauth");
    throw new Error("Should have thrown");
  } catch (err) {
    assert(err.message.includes("INVALID_OPERATOR_ID"));
  }
});

// TEST 3: Invalid operator role rejected
test("Operator identity validation: rejects invalid role", () => {
  resetOperatorIdentity();
  try {
    bindOperatorIdentity("alice@company.com", "INVALID_ROLE", "github-oauth");
    throw new Error("Should have thrown");
  } catch (err) {
    assert(err.message.includes("INVALID_OPERATOR_ROLE"));
  }
});

// TEST 4: verifyOperatorBound throws if not bound
test("Operator identity: verifyOperatorBound throws when not bound", () => {
  resetOperatorIdentity();
  try {
    verifyOperatorBound();
    throw new Error("Should have thrown");
  } catch (err) {
    assert(err.message.includes("OPERATOR_IDENTITY_MISSING"));
  }
});

// TEST 5: High-risk action requires acknowledgement
test("Risk acknowledgement: HIGH-risk requires explicit confirmation", () => {
  const ack = createRiskAcknowledgement(
    "action-123",
    "HIGH",
    ["/core/auth.js", "/tools/write_file.js"],
    "NO"
  );

  assert.strictEqual(ack.risk_level, RISK_LEVELS.HIGH);
  assert(ack.explicit_consequences.length > 0);
  assert.strictEqual(ack.operator_confirmation, false);

  // Should fail without operator confirmation
  try {
    enforceRiskAcknowledgement(ack);
    throw new Error("Should have thrown");
  } catch (err) {
    assert(err.message.includes("RISK_ACK_INCOMPLETE"));
  }

  // Should pass with confirmation
  ack.operator_confirmation = true;
  enforceRiskAcknowledgement(ack); // Should not throw
});

// TEST 6: Two-step confirmation enforces delay
test("Two-step confirmation: minimum delay enforced", async () => {
  resetPendingConfirmations();
  
  const init = initiateConfirmation(
    "action-456",
    "Approve critical change",
    ["Consequence 1", "Consequence 2"],
    {}
  );

  assert(init.confirmation_token);
  assert.strictEqual(init.minimum_wait_ms, 30000);

  // Try to complete immediately (should fail)
  try {
    completeConfirmation(init.confirmation_token, ["Consequence 1", "Consequence 2"]);
    throw new Error("Should have required delay");
  } catch (err) {
    assert(err.message.includes("CONFIRMATION_SEQUENCE_VIOLATION"));
  }
});

// TEST 7: Two-step confirmation requires verbatim consequences
test("Two-step confirmation: consequences must match verbatim", () => {
  resetPendingConfirmations();
  
  const consequences = ["Delete all backups", "Commit irreversible change"];
  const init = initiateConfirmation(
    "action-789",
    "Critical action",
    consequences,
    {}
  );

  // Manipulate confirmation (should fail)
  try {
    completeConfirmation(init.confirmation_token, [
      "Delete all backups",
      "Commit change" // Mismatch - no "irreversible"
    ]);
    throw new Error("Should have detected mismatch");
  } catch (err) {
    assert(err.message.includes("CONFIRMATION_SEQUENCE_VIOLATION"));
  }
});

// TEST 8: Language sanitization detects urgency patterns
test("Language sanitization: detects urgency keywords", () => {
  const analysis = detectSocialEngineeringPatterns("urgent: please approve immediately");
  assert(analysis.detected);
  assert(analysis.patterns.length > 0);
  assert(analysis.severity === "HIGH");
});

// TEST 9: Language sanitization strips urgency
test("Language sanitization: strips urgency language", () => {
  const original = "This is urgent and we need it immediately";
  const sanitized = sanitizeUrgencyLanguage(original);
  assert(!sanitized.toLowerCase().includes("urgent"));
  assert(!sanitized.toLowerCase().includes("immediately"));
});

// TEST 10: Language sanitization highlights high-risk terms
test("Language sanitization: highlights high-risk terms", () => {
  const text = "This action is irreversible and cannot be undone";
  const analysis = highlightHighRiskTerms(text);
  assert(analysis.has_high_risk);
  assert(analysis.highlighted_terms.length > 0);
});

// TEST 11: Social engineering phrases blocked
test("Language sanitization: detects manipulation phrases", () => {
  const analysis = detectSocialEngineeringPatterns("trust me, i know what i'm doing");
  assert(analysis.detected);
  assert(analysis.patterns.some(p => p.type === "MANIPULATION_PHRASE"));
});

// TEST 12: Fatigue guard triggers on max approvals
test("Fatigue guards: blocks on session limit exceeded", () => {
  resetFatigueGuards();
  configureFatigueLimits({ MAX_APPROVALS_PER_SESSION: 3 });

  recordApproval();
  recordApproval();
  recordApproval();

  // Fourth approval should trigger fatigue guard
  try {
    enforceFatigueGuards();
    throw new Error("Should have triggered fatigue guard");
  } catch (err) {
    assert(err.message.includes("OPERATOR_FATIGUE_GUARD_TRIGGERED"));
  }
});

// TEST 13: Fatigue guard allows pause recovery
test("Fatigue guards: resets after mandatory pause", () => {
  resetFatigueGuards();
  configureFatigueLimits({ APPROVALS_BEFORE_MANDATORY_PAUSE: 2 });

  recordApproval();
  recordApproval();

  const status1 = checkOperatorFatigue();
  assert.strictEqual(status1.consecutive_approvals, 2);

  recordMandatoryPause();
  const status2 = checkOperatorFatigue();
  assert.strictEqual(status2.consecutive_approvals, 0);
});

// TEST 14: Inspection tools work without mutation
test("Inspection tools: operator actions readable", () => {
  resetWorkspaceRootForTesting();
  lockWorkspaceRoot("/media/linnyux/development3/developing/KAIZA-MCP-server");
  try {
    const inspection = inspectOperatorActions({
      time_start_ms: Date.now() - 86400000,
      time_end_ms: Date.now()
    });

    assert(inspection.summary);
    assert(Array.isArray(inspection.actions));
    // Should not throw and should return valid structure
  } finally {
    resetWorkspaceRootForTesting();
  }
});

// TEST 15: High-risk approval inspection
test("Inspection tools: high-risk approvals isolated", () => {
  resetWorkspaceRootForTesting();
  lockWorkspaceRoot("/media/linnyux/development3/developing/KAIZA-MCP-server");
  try {
    const inspection = inspectHighRiskApprovals({
      time_start_ms: Date.now() - 604800000,
      time_end_ms: Date.now()
    });

    assert(inspection.summary);
    assert(Array.isArray(inspection.approvals));
    assert(inspection.non_coder_summary);
  } finally {
    resetWorkspaceRootForTesting();
  }
});

// TEST 16: Refusal is deterministic
test("Error handling: refusal is deterministic and logged", () => {
  resetOperatorIdentity();
  
  // Missing operator should consistently fail
  for (let i = 0; i < 3; i++) {
    try {
      verifyOperatorBound();
      throw new Error("Should have thrown");
    } catch (err) {
      assert(err.message.includes("OPERATOR_IDENTITY_MISSING"));
    }
  }
});

// Print summary
console.log("\n" + "=".repeat(50));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log("=".repeat(50));

if (testsFailed > 0) {
  process.exit(1);
}
