import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import {
  generateAttestationBundle,
  verifyAttestationBundle,
} from "./core/attestation-engine.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "attestation-test-"));
const kaizaDir = path.join(tmpDir, ".kaiza");
fs.mkdirSync(kaizaDir, { recursive: true });

const auditLogPath = path.join(kaizaDir, "audit-log.jsonl");
const entry1 = {
  timestamp: "2025-01-19T10:00:00.000Z",
  sessionId: "test-session-1",
  tool: "begin_session",
  result: "ok",
  prevHash: "GENESIS",
};
const hash1 = crypto.createHash("sha256").update(JSON.stringify(entry1)).digest("hex");
entry1.hash = hash1;

fs.writeFileSync(auditLogPath, JSON.stringify(entry1) + "\n");

process.env.KAIZA_ATTESTATION_SECRET = "test-secret-key-32-bytes-long-!!";

const bundle = generateAttestationBundle(tmpDir);
console.log("Generated bundle_id:", bundle.bundle_id);
console.log("Generated timestamp:", bundle.generated_timestamp);

const result = verifyAttestationBundle(bundle, tmpDir);
console.log("Verification result:", JSON.stringify(result, null, 2));

fs.rmSync(tmpDir, { recursive: true, force: true });
