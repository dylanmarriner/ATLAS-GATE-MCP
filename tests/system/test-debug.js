import crypto from "crypto";

// Minimal bundle
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
const canonical = JSON.stringify(bundleContent, Object.keys(bundleContent).sort(), "");
console.log("Canonical:", canonical);

const hmac = crypto.createHmac("sha256", secret);
hmac.update(canonical);
const sig = hmac.digest("hex");
console.log("Signature:", sig);

// Now verify
const bundleToVerify = {
  ...bundleContent,
  bundle_id: "test",
  generated_timestamp: "2026-01-19T06:08:00.000Z",
  signature: sig
};

const bundleContentForVerify = { ...bundleToVerify };
delete bundleContentForVerify.signature;
delete bundleContentForVerify.generated_timestamp;

const canonicalVerify = JSON.stringify(bundleContentForVerify, Object.keys(bundleContentForVerify).sort(), "");
console.log("Canonical for verify:", canonicalVerify);

const hmacVerify = crypto.createHmac("sha256", secret);
hmacVerify.update(canonicalVerify);
const sigVerify = hmacVerify.digest("hex");
console.log("Signature verify:", sigVerify);
console.log("Match?", sig === sigVerify);
