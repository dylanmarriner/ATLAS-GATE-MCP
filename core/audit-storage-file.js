/**
 * File-Based Audit Storage
 * 
 * Append-only JSONL file for single-server deployments.
 * For cloud/HA: use PostgresAuditStorage instead.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AuditStorage } from './audit-storage.js';

export class FileAuditStorage extends AuditStorage {
  constructor(workspaceRoot) {
    super();
    this.workspaceRoot = workspaceRoot;
    this.logPath = path.join(workspaceRoot, 'audit-log.jsonl');
    this.lastHash = null;
    this.entryCount = 0;
  }

  /**
   * Calculate SHA256 hash of entry
   */
  _calculateHash(entry, previousHash = null) {
    const payload = JSON.stringify({
      ...entry,
      previous_hash: previousHash,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async append(entry) {
    try {
      // Get last hash for chain
      const lastEntry = await this.getLastEntry();
      const previousHash = lastEntry?.hash || null;

      // Calculate entry hash
      const hash = this._calculateHash(entry, previousHash);

      // Add metadata
      const enrichedEntry = {
        ...entry,
        hash,
        previous_hash: previousHash,
        seq: (lastEntry?.seq || 0) + 1,
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      // Append to file
      const line = JSON.stringify(enrichedEntry) + '\n';
      await fs.appendFile(this.logPath, line, 'utf8');

      this.lastHash = hash;
      this.entryCount++;

      return enrichedEntry;

    } catch (err) {
      throw new Error(`Failed to append audit log: ${err.message}`);
    }
  }

  async read(filters = {}) {
    try {
      const { session_id, tool, role, plan_hash, limit = 1000, offset = 0 } = filters;

      // Read file (may not exist initially)
      let content = '';
      try {
        content = await fs.readFile(this.logPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        return [];
      }

      // Parse JSONL
      const entries = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (err) {
            console.error(`[AUDIT] Failed to parse line: ${line}`);
            return null;
          }
        })
        .filter(e => e !== null);

      // Apply filters
      let filtered = entries;

      if (session_id) {
        filtered = filtered.filter(e => e.session_id === session_id);
      }

      if (tool) {
        filtered = filtered.filter(e => e.tool === tool);
      }

      if (role) {
        filtered = filtered.filter(e => e.role === role);
      }

      if (plan_hash) {
        filtered = filtered.filter(e => e.plan_hash === plan_hash);
      }

      // Pagination
      return filtered.slice(offset, offset + limit);

    } catch (err) {
      throw new Error(`Failed to read audit log: ${err.message}`);
    }
  }

  async getLastEntry() {
    try {
      let content = '';
      try {
        content = await fs.readFile(this.logPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        return null;
      }

      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return null;

      const lastLine = lines[lines.length - 1];
      return JSON.parse(lastLine);

    } catch (err) {
      throw new Error(`Failed to get last audit entry: ${err.message}`);
    }
  }

  async verify(sessionId) {
    try {
      const entries = sessionId
        ? await this.read({ session_id: sessionId })
        : await this.read({});

      const errors = [];

      // Verify hash chain
      let previousHash = null;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Check previous hash matches
        if (entry.previous_hash !== previousHash) {
          errors.push({
            seq: entry.seq,
            error: `Hash chain broken: expected ${previousHash}, got ${entry.previous_hash}`,
          });
        }

        // Recalculate hash
        const expected = this._calculateHash(entry, previousHash);
        if (entry.hash !== expected) {
          errors.push({
            seq: entry.seq,
            error: `Hash mismatch: expected ${expected}, got ${entry.hash}`,
          });
        }

        previousHash = entry.hash;
      }

      return {
        valid: errors.length === 0,
        errors,
        entriesChecked: entries.length,
      };

    } catch (err) {
      throw new Error(`Audit verification failed: ${err.message}`);
    }
  }

  async health() {
    try {
      // Try to read the audit log file
      try {
        await fs.access(this.logPath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist yet, but directory should be accessible
          await fs.access(this.workspaceRoot);
        } else {
          throw err;
        }
      }

      return true;

    } catch (err) {
      console.error(`[AUDIT] Health check failed: ${err.message}`);
      return false;
    }
  }
}
