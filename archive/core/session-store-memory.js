/**
 * In-Memory Session Store
 * 
 * For development and testing. Single-server only (no distribution).
 * Sessions expire after configurable TTL.
 */

import { SessionStore } from './session-store.js';

export class MemorySessionStore extends SessionStore {
  constructor(ttlSeconds = 3600) {
    super();
    this.sessions = new Map();
    this.ttlSeconds = ttlSeconds;
  }

  async initSession(sessionId, workspaceRoot) {
    const session = {
      sessionId,
      workspaceRoot,
      activePlanId: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000).toISOString(),
    };

    this.sessions.set(sessionId, session);

    // Auto-cleanup on expiry
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, this.ttlSeconds * 1000);

    return session;
  }

  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const merged = { ...session, ...updates };
    this.sessions.set(sessionId, merged);

    return merged;
  }

  async deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  async listSessions() {
    const now = new Date();
    const active = Array.from(this.sessions.values()).filter(
      s => new Date(s.expiresAt) > now
    );

    return active;
  }

  async health() {
    return true;
  }
}
