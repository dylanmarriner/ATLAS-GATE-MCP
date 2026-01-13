import fs from "fs";
import path from "path";

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Provide portable, atomic file locking primitive for multi-process coordination.
 * 
 * Uses directory creation (mkdir) as the atomic operation, which is supported 
 * and atomic on all major OSs (POSIX, Windows).
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Acquire a lock at the specified path.
 * Retries with exponential backoff until success or timeout.
 * 
 * @param {string} lockPath - Absolute path to the lock directory
 * @param {object} options - Configuration options
 * @param {number} options.retryInterval - Initial retry interval in ms
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.staleTimeout - Time in ms after which a lock is considered stale (optional/dangerous)
 * @returns {Promise<void>} Resolves when lock is acquired
 * @throws {Error} If lock cannot be acquired after maxRetries
 */
export async function acquireLock(lockPath, { retryInterval = 50, maxRetries = 20 } = {}) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            // ATOMIC: fs.mkdir is atomic
            fs.mkdirSync(lockPath);
            return; // Success
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err; // Unexpected error
            }

            // Lock exists, wait and retry
            attempts++;

            // Basic jitter to prevent thundering herd
            const jitter = Math.random() * 20;
            await sleep(retryInterval + jitter);
        }
    }

    throw new Error(`LOCK_ACQUISITION_FAILED: Could not acquire lock at ${lockPath} after ${maxRetries} attempts`);
}

/**
 * Release a lock at the specified path.
 * 
 * @param {string} lockPath - Absolute path to the lock directory
 */
export async function releaseLock(lockPath) {
    try {
        // ATOMIC: fs.rmdir is atomic
        fs.rmdirSync(lockPath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Lock already gone, acceptable idempotent behavior
            return;
        }
        console.error(`[FILE_LOCK] Warning: Failed to release lock at ${lockPath}: ${err.message}`);
        // We don't throw here to avoid crashing the main flow during cleanup,
        // but this might leave a stale lock.
    }
}
