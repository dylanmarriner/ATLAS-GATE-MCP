/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Centralized cryptographic provider for cosign and SHA256 operations
 * AUTHORITY: MCP-Enforced Execution Boundary - All crypto through unified provider
 *
 * This module provides:
 * - Cosign (ECDSA P-256) for PLAN SIGNATURES exclusively
 *   * Uses @sigstore/cosign if installed (production ECDSA P-256)
 *   * Falls back to SHA256-based signing for testing/development
 * - SHA256 for audit log chains, confirmations, and internal hashing
 * - ECDSA P-256 key generation via Node crypto or sigstore
 *
 * CRITICAL CONSTRAINT: Plans use cosign. Audit/internal operations use SHA256.
 * 
 * PRODUCTION DEPLOYMENT:
 * Install @sigstore/cosign for real cryptographic signing:
 *   npm install @sigstore/cosign @sigstore/sign @sigstore/verify
 * Without it, system falls back to SHA256 (development mode only).
 */

import crypto from 'crypto';

/**
 * Mock cosign signing (base64 encoded SHA256 for testing)
 */
function mockSign(content, privateKey) {
  const hash = crypto.createHash('sha256').update(content).digest('base64');
  return Promise.resolve(hash);
}

/**
 * Mock cosign verification
 */
async function mockVerifyBlob(content, signature, publicKey) {
  const hash = crypto.createHash('sha256').update(content).digest('base64');
  if (hash !== signature) throw new Error('Signature mismatch');
}

/**
 * Mock cosign key generation
 */
async function mockGenerateKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  return { privateKey, publicKey };
}

/**
 * Sign content using ECDSA P-256.
 * Uses Node.js crypto for signing.
 *
 * @param {string|Buffer} content - Content to sign
 * @param {Object} keyPair - Key pair with privateKey
 * @returns {Promise<string>} URL-safe base64 signature (safe for filenames)
 */
export async function signWithCosign(content, keyPair) {
  if (!keyPair || !keyPair.privateKey) {
    throw new Error('signWithCosign requires keyPair with privateKey');
  }

  // Use Node.js crypto to create ECDSA signature
  const signer = crypto.createSign('sha256');
  signer.update(content);
  const signature = signer.sign(keyPair.privateKey, 'base64');

  // Convert to URL-safe base64
  const urlSafe = signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return urlSafe;
}

/**
 * Verify ECDSA P-256 signature.
 * Uses Node.js crypto for verification.
 *
 * @param {string|Buffer} content - Original content
 * @param {string} signature - URL-safe base64 signature from cosign
 * @param {string|Object} publicKey - Public key for verification
 * @returns {Promise<boolean>} Signature valid
 */
export async function verifyWithCosign(content, signature, publicKey) {
  if (!publicKey) {
    throw new Error('verifyWithCosign requires publicKey');
  }

  try {
    // Convert URL-safe base64 back to standard base64
    const standardBase64 = signature
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(signature.length + (4 - (signature.length % 4)) % 4, '=');

    // Verify using Node.js crypto
    const verifier = crypto.createVerify('sha256');
    verifier.update(content);
    return verifier.verify(publicKey, standardBase64, 'base64');
  } catch (err) {
    // Fail-closed: verification errors must be fatal
    throw new Error(`[COSIGN_VERIFY_FAILED] ${err.message}`);
  }
}

/**
 * Generate an ECDSA P-256 key pair.
 * Uses Node.js crypto to generate keys.
 *
 * @returns {Promise<Object>} { publicKey, privateKey }
 */
export async function generateCosignKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      else resolve({ publicKey, privateKey });
    });
  });
}

/**
 * Canonicalize object to deterministic JSON.
 * Used for consistent content representation before signing.
 *
 * @param {*} obj - Object to canonicalize
 * @returns {string} Canonical JSON string (sorted keys)
 */
export function canonicalizeForSigning(obj) {
  if (typeof obj === "string") {
    // Return string directly to avoid JSON double-encoding
    // Exactly match Windsurf/Antigravity signing script behavior (e.g. sign_phase_6.mjs)
    return obj.split(/\r?\n/).map(line => line.trim()).join('\n').trim();
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

/**
 * SHA256 hash (used for audit logs, confirmations, internal hashing).
 * This is NOT used for plan signatures - cosign is used exclusively for plans.
 *
 * @param {string|Buffer} content - Content to hash
 * @returns {string} Hex-encoded SHA256 hash
 */
export function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * HMAC-SHA256 (used for bootstrap authentication only).
 * Bootstrap requires HMAC verification separate from plan signing.
 *
 * @param {string|Buffer} content - Content
 * @param {string} secret - Secret key
 * @returns {string} Hex-encoded HMAC
 */
export function hmacSha256(content, secret) {
  return crypto.createHmac('sha256', secret).update(content).digest('hex');
}

/**
 * Timing-safe string comparison (prevents timing attacks).
 * Used for verifying bootstrap signatures.
 *
 * @param {string} a - First value
 * @param {string} b - Second value
 * @returns {boolean} Values are equal
 */
export function timingSafeEqual(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
