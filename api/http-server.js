/**
 * ATLAS-GATE Unified HTTP Server
 * 
 * Integrated RESTful API and Web Dashboard
 * Handles authentication, multi-tenancy, and real-time monitoring
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import TenantManager from "../src/application/multi-tenant-manager.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../src/domain/system-error.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const auditLogPath = path.join(repoRoot, ".atlas-gate", "audit.log");

export class AtlasGateHttpServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || "localhost";
    this.tools = new Map();
    this.app = new Hono();
    this.setupRoutes();
  }

  setupRoutes() {
    // Middleware: Logging (Restored from original)
    this.app.use("*", async (c, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.error(`[HTTP] ${new Date().toISOString()} ${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
    });

    // Middleware: CORS
    this.app.use("*", async (c, next) => {
      c.header("Access-Control-Allow-Origin", "*");
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
      if (c.req.method === "OPTIONS") return c.text("", 200);
      await next();
    });

    // --- DASHBOARD ENDPOINTS ---

    // Serve Dashboard Static Files
    this.app.use("/*", serveStatic({ root: "./dashboard" }));

    // SSE Endpoint for real-time audit log streaming
    this.app.get("/api/stream", (c) => {
      return c.streamText(async (stream) => {
        c.header("Content-Type", "text/event-stream");
        c.header("Cache-Control", "no-cache");
        c.header("Connection", "keep-alive");

        console.error("[DASHBOARD] Client connected to unified stream");

        // 1. Initial burst: Read last 50 entries
        if (fs.existsSync(auditLogPath)) {
          try {
            const stats = fs.statSync(auditLogPath);
            const bufferSize = Math.min(stats.size, 1024 * 64);
            const fd = fs.openSync(auditLogPath, "r");
            const buffer = Buffer.alloc(bufferSize);
            fs.readSync(fd, buffer, 0, bufferSize, Math.max(0, stats.size - bufferSize));
            fs.closeSync(fd);

            const lines = buffer.toString().split("\n").filter(l => l.trim());
            const lastEntries = lines.slice(-50);
            for (const entry of lastEntries) {
              await stream.write(`data: ${entry}\n\n`);
            }
          } catch (err) {
            console.error("[STREAM] Failed to read initial logs:", err.message);
          }
        }

        // 2. Watch for file changes
        const watcher = fs.watch(auditLogPath, (eventType) => {
          if (eventType === "change") {
            try {
              const stats = fs.statSync(auditLogPath);
              const fd = fs.openSync(auditLogPath, "r");
              const buffer = Buffer.alloc(4096);
              fs.readSync(fd, buffer, 0, 4096, Math.max(0, stats.size - 4096));
              fs.closeSync(fd);
              
              const lines = buffer.toString().split("\n").filter(l => l.trim());
              const lastLine = lines[lines.length - 1];
              if (lastLine) {
                stream.write(`data: ${lastLine}\n\n`);
              }
            } catch (err) {
              console.error("[STREAM] Watcher failed to read line:", err.message);
            }
          }
        });

        // 3. Heartbeat (10s)
        const heartbeat = setInterval(() => {
          stream.write("event: heartbeat\ndata: keep-alive\n\n");
        }, 10000);

        c.req.raw.signal.addEventListener("abort", () => {
          console.error("[DASHBOARD] Client disconnected");
          watcher.close();
          clearInterval(heartbeat);
        });

        while (!c.req.raw.signal.aborted) {
          await new Promise(r => setTimeout(r, 1000));
        }
      });
    });

    this.app.get("/api/doctor", async (c) => {
      const issues = [];
      const checks = [
        { name: "Audit Log Excellence", path: auditLogPath, type: "file" },
        { name: "Antigravity Server", path: path.join(repoRoot, "bin/ATLAS-GATE-MCP-antigravity.js"), type: "file" },
        { name: "Windsurf Server", path: path.join(repoRoot, "bin/ATLAS-GATE-MCP-windsurf.js"), type: "file" },
        { name: "Session Directory", path: path.join(os.homedir(), ".gemini/antigravity/sessions"), type: "dir" }
      ];

      for (const check of checks) {
        if (!fs.existsSync(check.path)) {
          issues.push(`CRITICAL: ${check.name} missing at ${check.path}`);
        } else {
          try {
            fs.accessSync(check.path, fs.constants.R_OK | fs.constants.W_OK);
          } catch (e) {
            issues.push(`WARNING: ${check.name} exists but has permission issues`);
          }
        }
      }

      if (fs.existsSync(auditLogPath)) {
        try {
          const content = fs.readFileSync(auditLogPath, 'utf8').split('\n').filter(l => l.trim());
          if (content.length > 0) {
            JSON.parse(content[content.length - 1]);
          }
        } catch (e) {
          issues.push("ERROR: Audit log formatting issue detected in last entry");
        }
      }

      return c.json({
        status: issues.length === 0 ? "healthy" : "issues_found",
        timestamp: new Date().toISOString(),
        issues,
        summary: issues.length === 0 ? "System is functioning correctly." : `${issues.length} issue(s) detected.`
      });
    });

    this.app.post("/api/doctor-fix", async (c) => {
      const fixes_applied = [];
      const atlasGateDir = path.join(repoRoot, ".atlas-gate");

      if (!fs.existsSync(atlasGateDir)) {
        try {
          fs.mkdirSync(atlasGateDir, { recursive: true });
          fixes_applied.push({
            action: "Create .atlas-gate directory",
            message: "Created missing .atlas-gate directory",
            success: true
          });
        } catch (e) {
          fixes_applied.push({
            action: "Create .atlas-gate directory",
            message: `Failed: ${e.message}`,
            success: false
          });
        }
      }

      if (!fs.existsSync(auditLogPath)) {
        try {
          fs.writeFileSync(auditLogPath, "");
          fixes_applied.push({
            action: "Create audit log",
            message: "Created missing audit.log file",
            success: true
          });
        } catch (e) {
          fixes_applied.push({
            action: "Create audit log",
            message: `Failed: ${e.message}`,
            success: false
          });
        }
      }

      const sessionDir = path.join(os.homedir(), ".gemini/antigravity/sessions");
      if (!fs.existsSync(sessionDir)) {
        try {
          fs.mkdirSync(sessionDir, { recursive: true });
          fixes_applied.push({
            action: "Create session directory",
            message: `Created missing session directory at ${sessionDir}`,
            success: true
          });
        } catch (e) {
          fixes_applied.push({
            action: "Create session directory",
            message: `Failed: ${e.message}`,
            success: false
          });
        }
      }

      if (fs.existsSync(auditLogPath)) {
        try {
          const content = fs.readFileSync(auditLogPath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          let hasInvalidJson = false;
          
          for (let i = 0; i < lines.length; i++) {
            try {
              JSON.parse(lines[i]);
            } catch (e) {
              hasInvalidJson = true;
              break;
            }
          }

          if (hasInvalidJson) {
            const validLines = lines.filter(l => {
              try {
                JSON.parse(l);
                return true;
              } catch {
                return false;
              }
            });
            fs.writeFileSync(auditLogPath, validLines.join('\n'));
            fixes_applied.push({
              action: "Repair audit log",
              message: "Removed invalid JSON entries from audit log",
              success: true
            });
          }
        } catch (e) {
          fixes_applied.push({
            action: "Repair audit log",
            message: `Failed: ${e.message}`,
            success: false
          });
        }
      }

      try {
        const cosignKeysDir = path.join(atlasGateDir, ".cosign-keys");
        if (!fs.existsSync(cosignKeysDir)) {
          fs.mkdirSync(cosignKeysDir, { recursive: true });
          fixes_applied.push({
            action: "Create cosign keys directory",
            message: "Created .cosign-keys directory for cryptographic keys",
            success: true
          });
        }
      } catch (e) {
        fixes_applied.push({
          action: "Create cosign keys directory",
          message: `Failed: ${e.message}`,
          success: false
        });
      }

      const govPath = path.join(atlasGateDir, "governance.json");
      if (!fs.existsSync(govPath)) {
        try {
          const govState = {
            approved_plans_count: 0,
            auto_register_plans: true,
            bootstrap_enabled: true
          };
          fs.writeFileSync(govPath, JSON.stringify(govState, null, 2));
          fixes_applied.push({
            action: "Initialize governance state",
            message: "Created governance.json with default settings",
            success: true
          });
        } catch (e) {
          fixes_applied.push({
            action: "Initialize governance state",
            message: `Failed: ${e.message}`,
            success: false
          });
        }
      }

      return c.json({
        status: fixes_applied.every(f => f.success) ? "all_fixed" : "partial",
        fixes_applied,
        timestamp: new Date().toISOString()
      });
    });

    // --- CORE API ENDPOINTS ---

    this.app.get("/health", (c) => {
      const tenants = TenantManager.listTenants();
      return c.json({
        status: "healthy",
        version: "2.1.0-unified",
        timestamp: new Date().toISOString(),
        tenantCount: tenants.length,
      });
    });

    this.app.post("/tenants/create", async (c) => {
      const { name, config } = await c.req.json();
      if (!name) throw new SystemError("VALIDATION_FAILED", "Tenant name is required", 400);
      
      const { tenantId, apiKey } = TenantManager.createTenant(name, config || {});
      return c.json({ tenantId, apiKey, message: "Tenant created." }, 201);
    });

    this.app.get("/tenants", (c) => {
      // Admin only typically, but implemented for completeness
      const tenants = TenantManager.listTenants();
      return c.json({ tenants, count: tenants.length });
    });

    // Sessions
    this.app.post("/sessions/create", async (c) => {
      const { tenantId } = this.getAuthContext(c);
      const config = await c.req.json();
      
      // Explicit Dynamic Path Validation (Restored)
      if (config.workspaceRoot) {
        const fullPath = path.resolve(config.workspaceRoot);
        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
          throw new SystemError("INVALID_PATH", `Workspace root does not exist or is not a directory: ${config.workspaceRoot}`, 400);
        }
      }

      const { sessionId, sessionState } = TenantManager.createTenantSession(tenantId, config);
      return c.json({ sessionId, sessionState }, 201);
    });

    this.app.get("/sessions/list", (c) => {
      const { tenantId } = this.getAuthContext(c);
      const sessions = TenantManager.getTenantSessions(tenantId);
      return c.json({ sessions, count: sessions.length });
    });

    this.app.get("/sessions/:sessionId", (c) => {
      const { tenantId } = this.getAuthContext(c);
      const sessionId = c.req.param("sessionId");
      const session = TenantManager.getTenantSession(tenantId, sessionId);
      if (!session) throw new SystemError("NOT_FOUND", "Session not found", 404);
      return c.json({ session });
    });

    this.app.put("/sessions/:sessionId", async (c) => {
      const { tenantId } = this.getAuthContext(c);
      const sessionId = c.req.param("sessionId");
      const { workspaceRoot } = await c.req.json();
      
      if (!workspaceRoot) throw new SystemError("VALIDATION_FAILED", "workspaceRoot is required", 400);
      
      // Explicit Dynamic Path Validation (Restored)
      const fullPath = path.resolve(workspaceRoot);
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
        throw new SystemError("INVALID_PATH", `Workspace root does not exist or is not a directory: ${workspaceRoot}`, 400);
      }

      const session = TenantManager.updateSessionWorkspace(tenantId, sessionId, fullPath);
      return c.json({ session });
    });

    // Tools
    this.app.post("/tools/:toolName", async (c) => {
      const { tenantId } = this.getAuthContext(c);
      const toolName = c.req.param("toolName");
      const sessionId = c.req.query("sessionId");
      
      if (!sessionId) throw new SystemError("VALIDATION_FAILED", "Missing sessionId query parameter", 400);
      if (!this.tools.has(toolName)) throw new SystemError("NOT_FOUND", `Tool not registered: ${toolName}`, 404);

      const session = TenantManager.getTenantSession(tenantId, sessionId);
      if (!session) throw new SystemError("NOT_FOUND", "Session not found", 404);

      const args = await c.req.json();
      const handler = this.tools.get(toolName);

      try {
        const result = await handler(args, {
          tenantId,
          sessionId,
          session,
          workspaceRoot: session.workspaceRoot,
        });

        TenantManager.appendTenantAuditEntry(tenantId, {
          sessionId,
          role: session.role,
          tool: toolName,
          args,
          result: "ok",
          errorCode: null,
        });

        return c.json({ tool: toolName, result });
      } catch (err) {
        const systemErr = err instanceof SystemError ? err : SystemError.fromUnknown(err);
        TenantManager.appendTenantAuditEntry(tenantId, {
          sessionId,
          tool: toolName,
          result: "error",
          errorCode: systemErr.error_code,
          error: systemErr.message,
        });
        return c.json(systemErr.toEnvelope(), systemErr.httpStatus || 500);
      }
    });

    this.app.get("/audit", (c) => {
      const { tenantId } = this.getAuthContext(c);
      const query = c.req.query();
      const logs = TenantManager.getTenantAuditLog(tenantId, {
        sessionId: query.sessionId,
        tool: query.tool,
        role: query.role,
      });
      return c.json({ count: logs.length, logs });
    });

    this.app.get("/api/governance", async (c) => {
      try {
        const govPath = path.join(repoRoot, ".atlas-gate", "governance.json");
        if (fs.existsSync(govPath)) {
          const content = JSON.parse(fs.readFileSync(govPath, 'utf8'));
          return c.json(content);
        }
        return c.json({
          approved_plans_count: 0,
          bootstrap_enabled: false,
          auto_register_plans: false
        });
      } catch (e) {
        return c.json({
          approved_plans_count: 0,
          bootstrap_enabled: false,
          auto_register_plans: false,
          error: e.message
        });
      }
    });

    this.app.get("/api/sessions", async (c) => {
      const sessions = Array.from(TenantManager.activeSessions?.values() || []).map(session => ({
        session_id: session.sessionId,
        role: session.role,
        workspace_root: session.workspaceRoot,
        active: true,
        last_activity: new Date().toISOString()
      }));
      return c.json({ sessions, count: sessions.length });
    });

    this.app.get("/api/remediation-proposals", async (c) => {
      try {
        const proposalsPath = path.join(repoRoot, ".atlas-gate", "proposal-approvals.jsonl");
        const proposals = [];
        if (fs.existsSync(proposalsPath)) {
          const content = fs.readFileSync(proposalsPath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          lines.forEach(line => {
            try {
              proposals.push(JSON.parse(line));
            } catch (e) {}
          });
        }
        return c.json({ proposals, count: proposals.length });
      } catch (e) {
        return c.json({ proposals: [], count: 0, error: e.message });
      }
    });

    this.app.get("/api/audit-full", async (c) => {
      try {
        const events = [];
        if (fs.existsSync(auditLogPath)) {
          const content = fs.readFileSync(auditLogPath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          lines.forEach(line => {
            try {
              events.push(JSON.parse(line));
            } catch (e) {}
          });
        }
        return c.json({ events, count: events.length });
      } catch (e) {
        return c.json({ events: [], count: 0, error: e.message });
      }
    });

    this.app.onError((err, c) => {
      console.error("[APP_ERROR]", err);
      if (err instanceof SystemError) {
        return c.json(err.toEnvelope(), err.httpStatus || 500);
      }
      // Wrap unknown errors
      const systemErr = SystemError.fromUnknown(err);
      return c.json(systemErr.toEnvelope(), 500);
    });
  }

  getAuthContext(c) {
    const apiKey = c.req.header("X-API-Key") || c.req.header("Authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      throw new SystemError("AUTH_FAILED", "Missing authentication key (X-API-Key)", 401);
    }
    
    // Use TenantManager to verify
    try {
      const { tenantId, tenant } = TenantManager.verifyTenant(apiKey);
      return { tenantId, tenant };
    } catch (err) {
      throw new SystemError("INVALID_API_KEY", "Access denied: Invalid API key", 403);
    }
  }

  registerTool(toolName, handler) {
    this.tools.set(toolName, handler);
    console.error(`[API] Registered tool: ${toolName}`);
  }

  start() {
    console.error(`[HTTP] ATLAS-GATE Unified Backend starting on ${this.host}:${this.port}`);
    serve({
      fetch: this.app.fetch,
      port: this.port,
    });
  }

  stop() {
    console.error("[HTTP] Server stop requested (not implemented for node-server yet)");
  }
}

export default AtlasGateHttpServer;
