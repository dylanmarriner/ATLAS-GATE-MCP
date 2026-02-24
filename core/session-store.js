/**
 * Session Store Interface
 * 
 * Abstract base class for session state management.
 * Implementations: Memory, Redis, PostgreSQL
 * 
 * Session state is distributed across MCP servers for load balancing.
 */

export class SessionStore {
  /**
   * Initialize a new session
   * @param {string} sessionId - Unique session identifier
   * @param {string} workspaceRoot - Absolute path to workspace
   * @returns {Promise<void>}
   */
  async initSession(sessionId, workspaceRoot) {
    throw new Error('initSession() not implemented');
  }

  /**
   * Get session data
   * @param {string} sessionId - Session identifier
   * @returns {Promise<object|null>} Session data or null if not found
   */
  async getSession(sessionId) {
    throw new Error('getSession() not implemented');
  }

  /**
   * Update session data
   * @param {string} sessionId - Session identifier
   * @param {object} updates - Fields to merge
   * @returns {Promise<object>} Updated session data
   */
  async updateSession(sessionId, updates) {
    throw new Error('updateSession() not implemented');
  }

  /**
   * Delete session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteSession(sessionId) {
    throw new Error('deleteSession() not implemented');
  }

  /**
   * List active sessions (for monitoring)
   * @returns {Promise<Array<object>>} Array of session objects
   */
  async listSessions() {
    throw new Error('listSessions() not implemented');
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
