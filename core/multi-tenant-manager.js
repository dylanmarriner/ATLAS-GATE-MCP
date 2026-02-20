/**
 * Multi-Tenant Manager
 * 
 * Manages isolated tenant contexts, routing, and workspace isolation.
 * Each tenant has:
 * - Unique ID and API key
 * - Isolated audit logs and plan registries
 * - Separate session stores
 * - Per-tenant workspace roots
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import { SystemError, SYSTEM_ERROR_CODES } from "./system-error.js";

// In-memory tenant registry (can be persisted to database)
const TENANT_REGISTRY = new Map();

// Active tenant sessions: tenantId -> sessionId -> SESSION_STATE
const TENANT_SESSIONS = new Map();

// Audit log per tenant
const TENANT_AUDIT_LOGS = new Map();

export class TenantManager {
  /**
   * Create a new tenant with API key
   */
  static createTenant(tenantName, config = {}) {
    const tenantId = `tenant_${crypto.randomBytes(8).toString("hex")}`;
    const apiKey = crypto.randomBytes(32).toString("hex");

    const tenant = {
      id: tenantId,
      name: tenantName,
      apiKey,
      created: new Date(),
      config: {
        workspaceRoot: config.workspaceRoot || null,
        maxSessions: config.maxSessions || 10,
        allowedRoles: config.allowedRoles || ["WINDSURF", "ANTIGRAVITY"],
        ...config,
      },
      metadata: {
        sessionCount: 0,
        totalAuditEntries: 0,
        lastActivity: null,
      },
    };

    TENANT_REGISTRY.set(tenantId, tenant);
    TENANT_SESSIONS.set(tenantId, new Map());
    TENANT_AUDIT_LOGS.set(tenantId, []);

    console.error(`[TENANT] Created tenant ${tenantId} (${tenantName})`);
    return { tenantId, apiKey, tenant };
  }

  /**
   * Verify API key and return tenant
   */
  static verifyTenant(apiKey) {
    for (const [tenantId, tenant] of TENANT_REGISTRY.entries()) {
      if (crypto.timingSafeEqual(
        Buffer.from(tenant.apiKey),
        Buffer.from(apiKey)
      )) {
        return { tenantId, tenant };
      }
    }
    throw SystemError.authenticationFailure(
      SYSTEM_ERROR_CODES.AUTH_FAILED,
      { human_message: "Invalid API key" }
    );
  }

  /**
   * Get tenant by ID
   */
  static getTenant(tenantId) {
    const tenant = TENANT_REGISTRY.get(tenantId);
    if (!tenant) {
      throw SystemError.notFound(
        SYSTEM_ERROR_CODES.TENANT_NOT_FOUND,
        { human_message: `Tenant ${tenantId} not found` }
      );
    }
    return tenant;
  }

  /**
   * Create session for tenant
   */
  static createTenantSession(tenantId, sessionConfig = {}) {
    const tenant = this.getTenant(tenantId);

    // Check session limit
    const sessions = TENANT_SESSIONS.get(tenantId);
    if (sessions.size >= tenant.config.maxSessions) {
      throw SystemError.quotaExceeded(
        SYSTEM_ERROR_CODES.QUOTA_EXCEEDED,
        {
          human_message: `Tenant ${tenantId} has reached max sessions (${tenant.config.maxSessions})`,
        }
      );
    }

    const sessionId = `session_${crypto.randomBytes(8).toString("hex")}`;
    const sessionState = {
      id: sessionId,
      tenantId,
      workspaceRoot: sessionConfig.workspaceRoot || tenant.config.workspaceRoot,
      role: sessionConfig.role || "ANTIGRAVITY",
      created: new Date(),
      lastActivity: new Date(),
      activePlanId: null,
      planRegistry: [],
      metadata: sessionConfig.metadata || {},
    };

    sessions.set(sessionId, sessionState);
    tenant.metadata.sessionCount += 1;
    tenant.metadata.lastActivity = new Date();

    return { sessionId, sessionState };
  }

  /**
   * Get tenant session
   */
  static getTenantSession(tenantId, sessionId) {
    const sessions = TENANT_SESSIONS.get(tenantId);
    if (!sessions) {
      throw SystemError.notFound(
        SYSTEM_ERROR_CODES.SESSION_NOT_FOUND,
        { human_message: `Session ${sessionId} not found for tenant ${tenantId}` }
      );
    }

    const session = sessions.get(sessionId);
    if (!session) {
      throw SystemError.notFound(
        SYSTEM_ERROR_CODES.SESSION_NOT_FOUND,
        { human_message: `Session ${sessionId} not found` }
      );
    }

    session.lastActivity = new Date();
    return session;
  }

  /**
   * Update session workspace root (dynamic directory adjustment)
   */
  static updateSessionWorkspace(tenantId, sessionId, workspaceRoot) {
    const session = this.getTenantSession(tenantId, sessionId);

    // Validate path exists and is accessible
    if (!fs.existsSync(workspaceRoot)) {
      throw SystemError.validation(
        SYSTEM_ERROR_CODES.INVALID_PATH,
        { human_message: `Workspace root does not exist: ${workspaceRoot}` }
      );
    }

    const stat = fs.statSync(workspaceRoot);
    if (!stat.isDirectory()) {
      throw SystemError.validation(
        SYSTEM_ERROR_CODES.INVALID_PATH,
        { human_message: `Workspace root is not a directory: ${workspaceRoot}` }
      );
    }

    session.workspaceRoot = workspaceRoot;
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Append audit entry for tenant
   */
  static appendTenantAuditEntry(tenantId, entry) {
    const logs = TENANT_AUDIT_LOGS.get(tenantId);
    if (!logs) {
      throw SystemError.validation(
        SYSTEM_ERROR_CODES.TENANT_NOT_FOUND,
        { human_message: `Tenant ${tenantId} audit log not found` }
      );
    }

    const auditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      sequence: logs.length + 1,
      tenantId,
    };

    logs.push(auditEntry);

    const tenant = this.getTenant(tenantId);
    tenant.metadata.totalAuditEntries += 1;

    return auditEntry;
  }

  /**
   * Get tenant audit log
   */
  static getTenantAuditLog(tenantId, filter = {}) {
    const logs = TENANT_AUDIT_LOGS.get(tenantId);
    if (!logs) {
      throw SystemError.validation(
        SYSTEM_ERROR_CODES.TENANT_NOT_FOUND,
        { human_message: `Tenant ${tenantId} audit log not found` }
      );
    }

    let filtered = [...logs];

    if (filter.sessionId) {
      filtered = filtered.filter(e => e.sessionId === filter.sessionId);
    }
    if (filter.tool) {
      filtered = filtered.filter(e => e.tool === filter.tool);
    }
    if (filter.role) {
      filtered = filtered.filter(e => e.role === filter.role);
    }

    return filtered;
  }

  /**
   * Delete tenant (purge data)
   */
  static deleteTenant(tenantId) {
    TENANT_REGISTRY.delete(tenantId);
    TENANT_SESSIONS.delete(tenantId);
    TENANT_AUDIT_LOGS.delete(tenantId);
    console.error(`[TENANT] Deleted tenant ${tenantId}`);
  }

  /**
   * List all tenants (admin only)
   */
  static listTenants() {
    const tenants = [];
    for (const [tenantId, tenant] of TENANT_REGISTRY.entries()) {
      tenants.push({
        id: tenantId,
        name: tenant.name,
        created: tenant.created,
        config: tenant.config,
        metadata: tenant.metadata,
      });
    }
    return tenants;
  }

  /**
   * Get tenant sessions
   */
  static getTenantSessions(tenantId) {
    const sessions = TENANT_SESSIONS.get(tenantId);
    if (!sessions) {
      return [];
    }
    return Array.from(sessions.values());
  }

  /**
   * Middleware: Extract and validate tenant from request
   */
  static extractTenantContext(req) {
    const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.split(" ")[1];
    if (!apiKey) {
      throw SystemError.authenticationFailure(
        SYSTEM_ERROR_CODES.AUTH_FAILED,
        { human_message: "Missing X-API-Key header" }
      );
    }

    return this.verifyTenant(apiKey);
  }
}

export default TenantManager;
