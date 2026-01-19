import fs from "fs";
import crypto from "crypto";

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const lines = fs.readFileSync("audit-log.jsonl", "utf8").trim().split("\n");

let expectedPrev = "GENESIS";

for (const [i, line] of lines.entries()) {
  const entry = JSON.parse(line);
  const { hash, prevHash, ...rest } = entry;

  if (prevHash !== expectedPrev) {
    throw new Error(`AUDIT_TAMPERED at line ${i + 1}`);
  }

  const recomputed = sha256(JSON.stringify({ ...rest, prevHash }));
  if (recomputed !== hash) {
    throw new Error(`AUDIT_HASH_MISMATCH at line ${i + 1}`);
  }

  expectedPrev = hash;
}

console.log("AUDIT LOG VALID");
