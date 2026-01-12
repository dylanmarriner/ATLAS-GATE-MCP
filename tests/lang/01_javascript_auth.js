/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: CommonJS module export
 * PURPOSE: User authentication and session management
 * FAILURE MODES: Duplicate registration throws error, invalid credentials throw error, expired sessions throw error
 *
 * Authority: 01-javascript-strings.md
 */

// JavaScript User Authentication Service
const crypto = require('crypto');

class AuthenticationService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
  }

  registerUser(email, password) {
    if (this.users.has(email)) {
      throw new Error('User already exists');
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const user = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      createdAt: new Date(),
      isActive: true
    };
    
    this.users.set(email, user);
    return user;
  }

  authenticateUser(email, password) {
    const user = this.users.get(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password !== hashedPassword) {
      throw new Error('Invalid password');
    }
    
    return user;
  }

  createSession(user) {
    const sessionId = crypto.randomUUID();
    const session = {
      userId: user.id,
      email: user.email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isValid: true
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (!session.isValid || session.expiresAt < new Date()) {
      throw new Error('Session expired or invalid');
    }
    return session;
  }

  logout(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    session.isValid = false;
    return true;
  }
}

module.exports = AuthenticationService;
