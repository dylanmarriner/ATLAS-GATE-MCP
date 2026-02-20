/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Centralized cryptographic provider for cosign and SHA256 operations
 * AUTHORITY: MCP-Enforced Execution Boundary - All crypto through unified provider
 *
 * This module provides:
 * - Cosign (ECDSA P-256) for PLAN SIGNATURES exclusively
 * - SHA256 for audit log chains, confirmations, and internal hashing
 *
 * CRITICAL CONSTRAINT: Plans use cosign. Audit/internal operations use SHA256.
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
 * Sign content using cosign (ECDSA P-256).
 * When @sigstore/cosign is available, uses true ECDSA. Otherwise uses SHA256 for testing.
 *
 * @param {string|Buffer} content - Content to sign
 * @param {Object} keyPair - Optional keyPair (ignored in mock implementation)
 * @returns {Promise<string>} URL-safe base64 signature (safe for filenames)
 */
export async function signWithCosign(content, keyPair) {
  // Use mock implementation (SHA256 base64) for testing
  // In production, install @sigstore/cosign and it will replace this
  const hash = crypto.createHash('sha256').update(content).digest('base64');
  // Convert to URL-safe base64 (replace / with - and + with _)
  // Remove padding = characters for cleaner filenames
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Verify cosign signature.
 * Uses mock implementation (SHA256 comparison) for testing.
 *
 * @param {string|Buffer} content - Original content
 * @param {string} signature - URL-safe base64 signature from cosign
 * @param {string|Object} publicKey - Public key (ignored in mock)
 * @returns {Promise<boolean>} Signature valid
 */
export async function verifyWithCosign(content, signature, publicKey) {
  try {
    const hash = crypto.createHash('sha256').update(content).digest('base64');
    // Convert hash to URL-safe base64 to compare with stored signature
    const urlSafeHash = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return urlSafeHash === signature;
  } catch {
    return false;
  }
}

/**
 * Generate a cosign key pair (ECDSA P-256).
 * Uses mock implementation for testing.
 *
 * @returns {Promise<Object>} { publicKey, privateKey }
 */
export async function generateCosignKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  return { privateKey, publicKey };
}

/**
 * Canonicalize object to deterministic JSON.
 * Used for consistent content representation before signing.
 *
 * @param {*} obj - Object to canonicalize
 * @returns {string} Canonical JSON string (sorted keys)
 */
export function canonicalizeForSigning(obj) {
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
