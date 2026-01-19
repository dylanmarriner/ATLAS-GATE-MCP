import crypto from "crypto";

// Minimal bundle content (what's used for bundle_id and signature)
const bundleContent = {
  bundle_schema_version: "1.0",
  workspace_root_hash: "abc123",
  workspace_root_label: "/tmp",
  time_window: { start: "2025-01-19T10:00:00.000Z", end: "2025-01-19T10:00:01.000Z" },
  audit_log_root_hash: "xyz789",
  plan_hashes: [],
  audit_metrics: { total_entries: 1, failure_count: 0, first_timestamp: "2025-01-19T10:00:00.000Z", last_timestamp: "2025-01-19T10:00:01.000Z" },
  policy_enforcement: { total_write_checks: 0, policy_passes: 0, policy_failures: 0, pass_rate: 0 },
  intent_coverage: { intent_artifacts_found: 0, write_operations_audited: 0, intent_coverage: 0 },
  replay_verdict: "UNAVAILABLE",
  replay_finding_count: 0,
  maturity_scores: { overall: 2, dimensions: {}, blocking_reasons: [] },
  verifier_checksums: { audit_metric_hash: "h1", policy_summary_hash: "h2", maturity_hash: "h3" }
};

const secret = "test-secret-key-32-bytes-long-!!";

// Compute bundle_id
const canonical1 = JSON.stringify(bundleContent, Object.keys(bundleContent).sort(), "");
console.log("Canonical for bundle_id:", canonical1.substring(0, 100) + "...");
const bundleId = crypto.createHash("sha256").update(canonical1).digest("hex");
console.log("Bundle ID:", bundleId);

// Compute signature
const hmac = crypto.createHmac("sha256", secret);
hmac.update(canonical1);
const sig = hmac.digest("hex");
console.log("Signature:", sig);

// Now create the full bundle (what gets returned)
const fullBundle = {
  bundle_id: bundleId,
  generated_timestamp: "2026-01-19T06:08:00.000Z",
  ...bundleContent,
  signature: sig
};

console.log("\nFull bundle keys:", Object.keys(fullBundle).slice(0, 5));

// Now verify - extract content WITHOUT bundle_id and signature
const bundleContentForVerify = { ...fullBundle };
delete bundleContentForVerify.signature;
delete bundleContentForVerify.bundle_id;
delete bundleContentForVerify.generated_timestamp;

const canonicalVerify = JSON.stringify(bundleContentForVerify, Object.keys(bundleContentForVerify).sort(), "");
console.log("\nCanonical for verify:", canonicalVerify.substring(0, 100) + "...");
console.log("Are canonicals equal?", canonical1 === canonicalVerify);

// Recompute bundle_id from verified content
const expectedBundleId = crypto.createHash("sha256").update(canonicalVerify).digest("hex");
console.log("Expected bundle_id:", expectedBundleId);
console.log("Original bundle_id:", bundleId);
console.log("Bundle IDs match?", expectedBundleId === bundleId);
