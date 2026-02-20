/**
 * ATLAS-GATE Client SDK
 * 
 * Remote client for connecting to ATLAS-GATE HTTP server
 * Handles authentication, session management, and tool calls
 * 
 * Usage:
 *   const client = new AtlasGateClient({
 *     baseUrl: "http://localhost:3000",
 *     apiKey: "your-api-key-here"
 *   });
 *   
 *   const session = await client.createSession({
 *     workspaceRoot: "/path/to/repo"
 *   });
 *   
 *   const result = await client.callTool("read_file", {
 *     path: "package.json"
 *   }, session.sessionId);
 */

export class AtlasGateClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:3000";
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.sessionId = null;
    this.tenantId = null;

    if (!this.apiKey) {
      throw new Error("apiKey is required in AtlasGateClient config");
    }
  }

  /**
   * Make HTTP request with authentication
   */
  async request(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const options = {
      method,
      headers,
      timeout: this.timeout,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`[${response.status}] ${error.error || error.message || "Request failed"}`);
    }

    return response.json();
  }

  /**
   * Create a new session
   */
  async createSession(config = {}) {
    const result = await this.request("POST", "/sessions/create", {
      role: config.role || "WINDSURF",
      workspaceRoot: config.workspaceRoot,
      metadata: config.metadata || {},
    });

    this.sessionId = result.sessionId;
    return result.sessionState;
  }

  /**
   * Get session details
   */
  async getSession(sessionId = null) {
    const sid = sessionId || this.sessionId;
    if (!sid) {
      throw new Error("No sessionId set. Call createSession() first.");
    }

    const result = await this.request("GET", `/sessions/${sid}`);
    return result.session;
  }

  /**
   * List all sessions
   */
  async listSessions() {
    const result = await this.request("GET", "/sessions/list");
    return result.sessions;
  }

  /**
   * Update session workspace root (dynamic directory adjustment)
   */
  async updateSessionWorkspace(workspaceRoot, sessionId = null) {
    const sid = sessionId || this.sessionId;
    if (!sid) {
      throw new Error("No sessionId set. Call createSession() first.");
    }

    const result = await this.request("PUT", `/sessions/${sid}`, {
      workspaceRoot,
    });

    return result.session;
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName, args = {}, sessionId = null) {
    const sid = sessionId || this.sessionId;
    if (!sid) {
      throw new Error("No sessionId set. Call createSession() first.");
    }

    const result = await this.request(
      "POST",
      `/tools/${toolName}?sessionId=${encodeURIComponent(sid)}`,
      args
    );

    return result.result;
  }

  /**
   * Read a file (convenience method)
   */
  async readFile(path, sessionId = null) {
    return this.callTool("read_file", { path }, sessionId);
  }

  /**
   * Write a file (convenience method)
   */
  async writeFile(path, content, plan, sessionId = null) {
    return this.callTool("write_file", { path, content, plan }, sessionId);
  }

  /**
   * List plans (convenience method)
   */
  async listPlans(sessionId = null) {
    return this.callTool("list_plans", {}, sessionId);
  }

  /**
   * Read audit log
   */
  async readAuditLog(filter = {}) {
    const query = new URLSearchParams(filter).toString();
    const result = await this.request("GET", `/audit/log?${query}`);
    return result.logs;
  }

  /**
   * Get server health status
   */
  async health() {
    const result = await this.request("GET", "/health");
    return result;
  }
}

// Export for Node.js and browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AtlasGateClient };
}
