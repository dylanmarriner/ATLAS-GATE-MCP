/**
 * ATLAS-GATE HTTP Server
 * 
 * RESTful API wrapper for multi-tenant MCP server
 * Handles authentication, tenant isolation, and workspace routing
 */

import http from "http";
import url from "url";
import TenantManager from "../core/multi-tenant-manager.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";

const PORT = process.env.ATLAS_GATE_PORT || 3000;
const HOST = process.env.ATLAS_GATE_HOST || "localhost";

export class AtlasGateHttpServer {
  constructor(options = {}) {
    this.port = options.port || PORT;
    this.host = options.host || HOST;
    this.server = null;
    this.tools = new Map(); // Registered MCP tools
    this.wsConnections = new Map(); // WebSocket connections per session
  }

  /**
   * Register an MCP tool handler
   */
  registerTool(toolName, handler) {
    this.tools.set(toolName, handler);
    console.error(`[API] Registered tool: ${toolName}`);
  }

  /**
   * Start HTTP server
   */
  start() {
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    
    this.server.listen(this.port, this.host, () => {
      console.error(`[HTTP] ATLAS-GATE listening on ${this.host}:${this.port}`);
    });

    return this.server;
  }

  /**
   * Main request handler
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // Route requests
      if (pathname === "/health") {
        this.handleHealth(req, res);
      } else if (pathname === "/tenants/create") {
        this.handleCreateTenant(req, res);
      } else if (pathname.startsWith("/sessions/")) {
        this.handleSessions(req, res, pathname, query);
      } else if (pathname.startsWith("/tools/")) {
        this.handleToolCall(req, res, pathname, query);
      } else if (pathname.startsWith("/audit/")) {
        this.handleAuditLog(req, res, pathname, query);
      } else if (pathname === "/tenants") {
        this.handleListTenants(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found", path: pathname }));
      }
    } catch (err) {
      const systemErr = err instanceof SystemError ? err : SystemError.fromUnknown(err);
      res.writeHead(systemErr.httpStatus || 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify(systemErr.toEnvelope()));
    }
  }

  /**
   * Health check endpoint
   */
  handleHealth(req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      tenantCount: TenantManager.listTenants().length,
    }));
  }

  /**
   * Create tenant endpoint
   */
  async handleCreateTenant(req, res) {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const body = await this.readBody(req);
    const { name, config } = JSON.parse(body);

    const { tenantId, apiKey } = TenantManager.createTenant(name, config);

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      tenantId,
      apiKey,
      message: "Tenant created. Store apiKey securely.",
    }));
  }

  /**
   * List tenants (admin endpoint, would need auth in production)
   */
  async handleListTenants(req, res) {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const tenants = TenantManager.listTenants();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ tenants, count: tenants.length }));
  }

  /**
   * Handle session operations (create, get, update)
   */
  async handleSessions(req, res, pathname, query) {
    const { tenantId, tenant } = TenantManager.extractTenantContext(req);

    const parts = pathname.split("/");
    const action = parts[3];
    const sessionId = parts[4];

    if (req.method === "POST" && action === "create") {
      const body = await this.readBody(req);
      const config = JSON.parse(body);

      const { sessionId: newSessionId, sessionState } = TenantManager.createTenantSession(
        tenantId,
        config
      );

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        sessionId: newSessionId,
        sessionState,
      }));

    } else if (req.method === "GET" && sessionId) {
      const session = TenantManager.getTenantSession(tenantId, sessionId);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ session }));

    } else if (req.method === "PUT" && sessionId) {
      const body = await this.readBody(req);
      const { workspaceRoot } = JSON.parse(body);

      const session = TenantManager.updateSessionWorkspace(tenantId, sessionId, workspaceRoot);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ session }));

    } else if (req.method === "GET" && action === "list") {
      const sessions = TenantManager.getTenantSessions(tenantId);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        sessions,
        count: sessions.length,
      }));

    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid session request" }));
    }
  }

  /**
   * Handle MCP tool calls
   */
  async handleToolCall(req, res, pathname, query) {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const { tenantId } = TenantManager.extractTenantContext(req);
    const parts = pathname.split("/");
    const toolName = parts[2];
    const sessionId = query.sessionId;

    if (!sessionId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing sessionId query parameter" }));
      return;
    }

    if (!this.tools.has(toolName)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Tool not found: ${toolName}` }));
      return;
    }

    try {
      const session = TenantManager.getTenantSession(tenantId, sessionId);
      const body = await this.readBody(req);
      const args = JSON.parse(body);

      // Inject session/workspace context
      const handler = this.tools.get(toolName);
      const result = await handler(args, {
        tenantId,
        sessionId,
        session,
        workspaceRoot: session.workspaceRoot,
      });

      // Append audit entry
      TenantManager.appendTenantAuditEntry(tenantId, {
        sessionId,
        role: session.role,
        tool: toolName,
        args,
        result: "ok",
        errorCode: null,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        tool: toolName,
        result,
      }));

    } catch (err) {
      const systemErr = err instanceof SystemError ? err : SystemError.fromUnknown(err);

      TenantManager.appendTenantAuditEntry(tenantId, {
        sessionId,
        tool: toolName,
        result: "error",
        errorCode: systemErr.error_code,
        error: systemErr.message,
      });

      res.writeHead(systemErr.httpStatus || 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify(systemErr.toEnvelope()));
    }
  }

  /**
   * Handle audit log queries
   */
  async handleAuditLog(req, res, pathname, query) {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const { tenantId } = TenantManager.extractTenantContext(req);

    const logs = TenantManager.getTenantAuditLog(tenantId, {
      sessionId: query.sessionId,
      tool: query.tool,
      role: query.role,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      count: logs.length,
      logs,
    }));
  }

  /**
   * Utility: Read request body
   */
  readBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", chunk => (body += chunk.toString()));
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }

  /**
   * Stop server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.error("[HTTP] Server stopped");
    }
  }
}

export default AtlasGateHttpServer;
