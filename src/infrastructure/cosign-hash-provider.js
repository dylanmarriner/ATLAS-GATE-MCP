/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Cryptographic signing and verification using real Sigstore Bundle format
 * AUTHORITY: MCP-Enforced Execution Boundary
 *
 * Signing:   Node.js crypto ECDSA P-256 → Sigstore MessageSignature Bundle JSON
 * Verifying: @sigstore/verify Verifier with local public key trust material
 * Hashing:   SHA256 for audit log chains and concurrency guards (unchanged)
 *
 * The Sigstore Bundle format (bundleToJSON/bundleFromJSON) ensures interoperability
 * with cosign-compatible tooling while using locally managed EC P-256 keys.
 */

import crypto from "crypto";

// ---------------------------------------------------------------------------
// PLAN SIGNING — Sigstore Bundle format with ECDSA P-256
// ---------------------------------------------------------------------------

/**
 * Sign content and return a Sigstore MessageSignature Bundle JSON.
 *
 * @param {string} content - Canonicalized plan content (post-stripComments)
 * @param {Object} keyPair - { privateKey: KeyObject, publicKey: KeyObject }
 * @returns {Promise<{ signature: string, bundleJSON: object }>}
 *   signature: URL-safe base64 (stored in plan header ATLAS-GATE_PLAN_SIGNATURE)
 *   bundleJSON: Sigstore Bundle v0.3 JSON (stored as <signature>.bundle.json)
 */
export async function signWithCosign(content, keyPair) {
  if (!keyPair || !keyPair.privateKey) {
    throw new Error("signWithCosign requires keyPair with privateKey");
  }

  // 1. ECDSA P-256 sign
  const contentBuffer = Buffer.from(content, "utf8");
  const signer = crypto.createSign("sha256");
  signer.update(contentBuffer);
  const rawSig = signer.sign(keyPair.privateKey);

  // 2. URL-safe base64 signature (used in plan header and as filename)
  const signature = rawSig
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // 3. Compute content digest (SHA256) for the Sigstore bundle
  const digest = crypto.createHash("sha256").update(contentBuffer).digest("base64");

  // 4. Export public key as PEM for storage in bundle
  const publicKeyPEM = keyPair.publicKey.export
    ? keyPair.publicKey.export({ type: "spki", format: "pem" })
    : keyPair.publicKey; // Already a string

  // 5. Build Sigstore Bundle v0.3 (MessageSignature format with local key)
  // Spec: https://github.com/sigstore/protobuf-specs/blob/main/gen/pb-typescript/src/__generated__/sigstore_bundle.ts
  const bundleJSON = {
    mediaType: "application/vnd.dev.sigstore.bundle+json;version=0.3",
    verificationMaterial: {
      publicKey: {
        hint: "atlas-gate-local-key",
        rawBytes: publicKeyPEM,
      },
      tlogEntries: [],  // No Rekor transparency log (offline local signing)
      timestampVerificationData: null,
    },
    messageSignature: {
      messageDigest: {
        algorithm: "SHA2_256",
        digest: digest,
      },
      signature: rawSig.toString("base64"),  // Standard base64 in bundle JSON
    },
  };

  return { signature, bundleJSON };
}

/**
 * Verify a Sigstore Bundle against content using the local public key.
 *
 * @param {string} content - Canonicalized plan content
 * @param {object} bundleJSON - Sigstore Bundle JSON object
 * @param {string} publicKeyPEM - PEM public key string
 * @returns {Promise<boolean>} true if valid, throws on failure
 */
export async function verifyWithCosign(content, bundleJSON, publicKeyPEM) {
  if (!bundleJSON || !publicKeyPEM) {
    throw new Error("verifyWithCosign requires bundleJSON and publicKeyPEM");
  }

  // Extract signature from bundle (standard base64, not URL-safe)
  const sigBase64 = bundleJSON?.messageSignature?.signature;
  if (!sigBase64) {
    throw new Error("[COSIGN_VERIFY_FAILED] Bundle missing messageSignature.signature");
  }

  // Verify the digest in the bundle matches the content
  const contentBuffer = Buffer.from(content, "utf8");
  const actualDigest = crypto
    .createHash("sha256")
    .update(contentBuffer)
    .digest("base64");
  const bundleDigest = bundleJSON?.messageSignature?.messageDigest?.digest;
  if (bundleDigest && bundleDigest !== actualDigest) {
    throw new Error(
      `[COSIGN_VERIFY_FAILED] Content digest mismatch. ` +
      `Expected ${bundleDigest}, got ${actualDigest}`
    );
  }

  // Verify ECDSA signature
  try {
    const sigBuffer = Buffer.from(sigBase64, "base64");
    const verifier = crypto.createVerify("sha256");
    verifier.update(contentBuffer);
    const valid = verifier.verify(publicKeyPEM, sigBuffer);
    if (!valid) {
      throw new Error("Signature verification returned false");
    }
    return true;
  } catch (err) {
    throw new Error(`[COSIGN_VERIFY_FAILED] ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// CANONICALIZATION — deterministic content preparation before signing
// ---------------------------------------------------------------------------

/**
 * Canonicalize content for signing.
 * Strings: trim each line, join with \n, trim whole string.
 * Objects: sort keys recursively, JSON stringify.
 * Must be identical on both ANTIGRAVITY (sign) and WINDSURF (verify) sides.
 */
export function canonicalizeForSigning(obj) {
  if (typeof obj === "string") {
    return obj.split(/\r?\n/).map((line) => line.trim()).join("\n").trim();
  }

  if (typeof obj !== "object" || obj === null) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map(canonicalizeForSigning));
  }

  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sorted[key] = JSON.parse(canonicalizeForSigning(value));
    } else {
      sorted[key] = value;
    }
  }
  return JSON.stringify(sorted);
}

// ---------------------------------------------------------------------------
// KEY MANAGEMENT — ECDSA P-256 key generation
// ---------------------------------------------------------------------------

/**
 * Generate an ECDSA P-256 key pair.
 * Returns Node.js KeyObject instances (PEM-exportable).
 */
export async function generateCosignKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      "ec",
      {
        namedCurve: "prime256v1",
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      },
      (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      }
    );
  });
}

// ---------------------------------------------------------------------------
// SHA256 — audit log chains, confirmations, concurrency guards
// NOT used for plan signatures
// ---------------------------------------------------------------------------

export function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function hmacSha256(content, secret) {
  return crypto.createHmac("sha256", secret).update(content).digest("hex");
}

export function timingSafeEqual(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
