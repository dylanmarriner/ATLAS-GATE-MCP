/**
 * Audit Storage Interface
 * 
 * Abstract base class for audit log persistence.
 * Implementations: File, PostgreSQL, S3
 * 
 * All audit logs are append-only and include hash chain for integrity.
 */

export class AuditStorage {
  /**
   * Append entry to audit log
   * @param {object} entry - Audit entry object
   * @returns {Promise<object>} Entry with hash and sequence number
   */
  async append(entry) {
    throw new Error('append() not implemented');
  }

  /**
   * Read audit log entries
   * @param {object} filters - Query filters { session_id, tool, role, plan_hash, limit, offset }
   * @returns {Promise<Array<object>>} Array of audit entries
   */
  async read(filters = {}) {
    throw new Error('read() not implemented');
  }

  /**
   * Get last entry (for hash chain)
   * @returns {Promise<object|null>} Last entry or null if empty
   */
  async getLastEntry() {
    throw new Error('getLastEntry() not implemented');
  }

  /**
   * Verify hash chain integrity
   * @param {string} sessionId - Optional: filter by session
   * @returns {Promise<object>} { valid: boolean, errors: Array }
   */
  async verify(sessionId) {
    throw new Error('verify() not implemented');
  }

  /**
   * Health check
   * @returns {Promise<boolean>} True if backend is operational
   */
  async health() {
    throw new Error('health() not implemented');
  }

  /**
   * Close backend connections
   * @returns {Promise<void>}
   */
  async close() {
    // Stub - override if needed
  }
}
