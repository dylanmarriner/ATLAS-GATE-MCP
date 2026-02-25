import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getRepoRoot, getGovernancePath as getResolvedGovernancePath, getPlansDir } from "../infrastructure/path-resolver.js";
import { lintPlan } from "../application/plan-linter.js";
import { hmacSha256, timingSafeEqual, signWithCosign, generateCosignKeyPair } from "../infrastructure/cosign-hash-provider.js";

const GOVERNANCE_FILE = "governance.json";
const COSIGN_KEYS_DIR = ".cosign-keys";

// Delegate to path resolver for canonical governance path
function getGovernancePath(repoRoot = null) {
    // Path resolver already has the correct repoRoot cached
    return getResolvedGovernancePath();
}

/**
 * Load or generate ECDSA P-256 key pair for plan signing
 * Keys are stored in .atlas-gate/.cosign-keys/
 */
async function loadOrGenerateKeyPair(repoRoot) {
    const keyDir = path.join(repoRoot, ".atlas-gate", COSIGN_KEYS_DIR);
    const pubPath = path.join(keyDir, "public.pem");
    const privPath = path.join(keyDir, "private.pem");

    // Try to load existing keys
    if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
        return {
            publicKey: fs.readFileSync(pubPath, "utf8"),
            privateKey: fs.readFileSync(privPath, "utf8")
        };
    }

    // Generate new keys if missing
    try {
        fs.mkdirSync(keyDir, { recursive: true });
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        fs.writeFileSync(pubPath, publicKey, 'utf8');
        fs.writeFileSync(privPath, privateKey, 'utf8');
        return { publicKey, privateKey };
    } catch (err) {
        throw new Error(`COSIGN_KEYGEN_FAILED: ${err.message}`);
    }
}

export function readGovernanceState(repoRoot) {
    const govPath = getGovernancePath(repoRoot);
    if (!fs.existsSync(govPath)) {
        return {
            approved_plans_count: 0,
            auto_register_plans: true,
        };
    }
    return JSON.parse(fs.readFileSync(govPath, "utf8"));
}

export function writeGovernanceState(repoRoot, state) {
    const govPath = getGovernancePath(repoRoot);
    const dir = path.dirname(govPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(govPath, JSON.stringify(state, null, 2));
}

export function initializeGovernanceState(repoRoot) {
    const govPath = getGovernancePath(repoRoot);
    if (!fs.existsSync(govPath)) {
        writeGovernanceState(repoRoot, {
            approved_plans_count: 0,
            auto_register_plans: true,
        });
    }
}
