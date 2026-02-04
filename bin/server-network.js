#!/usr/bin/env node

/**
 * ATLAS-GATE-MCP Network Server
 * 
 * Adds HTTP/TCP transport to MCP server for cloud deployment.
 * Replaces stdio-only transport with bidirectional network communication.
 * 
 * Supports:
 * - Load balancing (multiple servers behind reverse proxy)
 * - Session state distribution (Redis or database)
 * - Audit log persistence (PostgreSQL or S3)
 * - Health checks for automated failover
 */

import express from 'express';
import { startServer } from '../server.js';
import { SessionStore } from '../core/session-store.js';
import { AuditStorage } from '../core/audit-storage.js';
import crypto from 'crypto';

const app = express();
const PORT = process.env.MCP_PORT || 3000;
const BIND_ADDRESS = process.env.MCP_BIND || '0.0.0.0';
const ROLE = process.env.MCP_ROLE || 'ANTIGRAVITY';

// Middleware
app.use(express.json({ limit: '10mb' }));

// Global stores (initialized on startup)
let sessionStore = null;
let auditStorage = null;
let mcpServer = null;

/**
 * Initialize backend stores based on environment
 */
async function initializeBackends() {
  const auditBackend = process.env.AUDIT_BACKEND || 'file';
  const sessionBackend = process.env.SESSION_BACKEND || 'memory';

  console.error(`[INIT] Audit backend: ${auditBackend}`);
  console.error(`[INIT] Session backend: ${sessionBackend}`);

  // Initialize session store
  if (sessionBackend === 'redis') {
    const { RedisSessionStore } = await import('../core/session-store-redis.js');
    sessionStore = new RedisSessionStore(process.env.REDIS_URL);
  } else {
    const { MemorySessionStore } = await import('../core/session-store-memory.js');
    sessionStore = new MemorySessionStore();
  }

  // Initialize audit storage
  if (auditBackend === 'postgres') {
    const { PostgresAuditStorage } = await import('../core/audit-storage-postgres.js');
    auditStorage = new PostgresAuditStorage(process.env.DATABASE_URL);
  } else if (auditBackend === 's3') {
    const { S3AuditStorage } = await import('../core/audit-storage-s3.js');
    auditStorage = new S3AuditStorage(process.env.AWS_BUCKET);
  } else {
    const { FileAuditStorage } = await import('../core/audit-storage-file.js');
    auditStorage = new FileAuditStorage(process.env.WORKSPACE_ROOT || process.cwd());
  }

  // Initialize MCP server
  mcpServer = await startServer(ROLE);
  
  console.error(`[INIT] Backend initialization complete`);
}

/**
 * Health check endpoint
 * Verify server is operational and backends are reachable
 */
app.get('/health', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const timestamp = new Date().toISOString();

    // Quick health status
    const health = {
      status: 'healthy',
      timestamp,
      uptime,
      role: ROLE,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      backends: {
        session: sessionStore ? 'ready' : 'not-initialized',
        audit: auditStorage ? 'ready' : 'not-initialized',
      }
    };

    // Check if backends are responsive
    if (sessionStore && typeof sessionStore.health === 'function') {
      const sessionHealth = await sessionStore.health();
      health.backends.session = sessionHealth ? 'ready' : 'degraded';
    }

    if (auditStorage && typeof auditStorage.health === 'function') {
      const auditHealth = await auditStorage.health();
      health.backends.audit = auditHealth ? 'ready' : 'degraded';
    }

    // Return 200 if all systems operational, 503 if degraded
    const statusCode = 
      health.backends.session === 'ready' && health.backends.audit === 'ready' 
        ? 200 
        : 503;

    res.status(statusCode).json(health);
  } catch (err) {
    console.error(`[HEALTH] Check failed: ${err.message}`);
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * MCP Tool Request Handler
 * 
 * Expects: POST /mcp
 * Body: { tool: string, args: object }
 * Response: { result: any } or { error: string }
 */
app.post('/mcp', async (req, res) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const clientIp = req.ip;

  try {
    const { tool, args, workspace_root } = req.body;

    if (!tool) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Missing required field: tool',
      });
    }

    console.error(`[MCP] ${requestId} tool=${tool} client=${clientIp}`);

    // Validate authentication (if enabled)
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (process.env.REQUIRE_AUTH === 'true' && !authToken) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing authorization header',
      });
    }

    // Validate token (stub - implement your auth logic)
    if (authToken && process.env.VALID_TOKENS) {
      const validTokens = process.env.VALID_TOKENS.split(',');
      if (!validTokens.includes(authToken)) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Invalid authorization token',
        });
      }
    }

    // Route to appropriate handler
    let result;
    
    if (tool === 'begin_session') {
      // Special handling for session initialization
      if (!workspace_root) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'begin_session requires workspace_root',
        });
      }

      const sessionId = crypto.randomUUID();
      await sessionStore.initSession(sessionId, workspace_root);

      result = {
        session_id: sessionId,
        workspace_root,
        timestamp: new Date().toISOString(),
      };
    } else {
      // All other tools go through MCP server
      // This is a stub - actual implementation depends on MCP SDK version
      result = {
        tool,
        status: 'pending',
        message: 'Tool execution routed to MCP handler',
      };
    }

    const duration = Date.now() - startTime;
    console.error(`[MCP] ${requestId} completed in ${duration}ms`);

    res.json({
      success: true,
      tool,
      result,
      requestId,
      duration,
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[MCP] ${requestId} ERROR: ${err.message} (${duration}ms)`);

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message,
      requestId,
      tool: req.body.tool,
    });
  }
});

/**
 * Metrics Endpoint (Prometheus format)
 * Used by monitoring systems to scrape health metrics
 */
app.get('/metrics', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Calculate request rate (stub - implement actual tracking)
    const requestRate = 0; // Would need request counter

    const metricsText = `
# HELP mcp_uptime_seconds Server uptime
# TYPE mcp_uptime_seconds gauge
mcp_uptime_seconds ${uptime}

# HELP mcp_memory_heapused_bytes Heap memory used
# TYPE mcp_memory_heapused_bytes gauge
mcp_memory_heapused_bytes ${memUsage.heapUsed}

# HELP mcp_memory_heaptotal_bytes Total heap memory
# TYPE mcp_memory_heaptotal_bytes gauge
mcp_memory_heaptotal_bytes ${memUsage.heapTotal}

# HELP mcp_role Server role
# TYPE mcp_role gauge
mcp_role{role="${ROLE}"} 1

# HELP mcp_pid Process ID
# TYPE mcp_pid gauge
mcp_pid ${process.pid}
`;

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metricsText.trim());

  } catch (err) {
    res.status(500).send(`# ERROR: ${err.message}`);
  }
});

/**
 * Audit Log Export Endpoint
 * Export audit logs in various formats
 */
app.get('/audit/export', async (req, res) => {
  try {
    const format = req.query.format || 'jsonl'; // jsonl, json, csv
    const limit = parseInt(req.query.limit, 10) || 1000;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!auditStorage) {
      return res.status(503).json({ error: 'Audit storage not initialized' });
    }

    const entries = await auditStorage.read({ limit, offset });

    if (format === 'json') {
      res.json(entries);
    } else if (format === 'csv') {
      // Convert to CSV
      const headers = ['timestamp', 'session_id', 'role', 'tool', 'result', 'error_code'];
      const csv = [
        headers.join(','),
        ...entries.map(e => [
          e.timestamp,
          e.session_id,
          e.role,
          e.tool,
          e.result,
          e.error_code || '',
        ].join(','))
      ].join('\n');

      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="audit.csv"');
      res.send(csv);
    } else {
      // Default: JSONL
      res.set('Content-Type', 'application/x-ndjson');
      res.send(entries.map(e => JSON.stringify(e)).join('\n'));
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Graceful Shutdown Handler
 */
async function gracefulShutdown() {
  console.error(`[SHUTDOWN] Received shutdown signal`);
  
  try {
    // Close backend connections
    if (sessionStore && typeof sessionStore.close === 'function') {
      console.error(`[SHUTDOWN] Closing session store...`);
      await sessionStore.close();
    }

    if (auditStorage && typeof auditStorage.close === 'function') {
      console.error(`[SHUTDOWN] Closing audit storage...`);
      await auditStorage.close();
    }

    // Close HTTP server
    if (server) {
      console.error(`[SHUTDOWN] Closing HTTP server...`);
      server.close(() => {
        console.error(`[SHUTDOWN] HTTP server closed`);
        process.exit(0);
      });
    }

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error(`[SHUTDOWN] Force exit after 30s timeout`);
      process.exit(1);
    }, 30000);

  } catch (err) {
    console.error(`[SHUTDOWN] Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Start Server
 */
let server;

initializeBackends()
  .then(() => {
    server = app.listen(PORT, BIND_ADDRESS, () => {
      console.error(`[STARTUP] ATLAS-GATE-MCP Server Started`);
      console.error(`[STARTUP] Role: ${ROLE}`);
      console.error(`[STARTUP] Listening on ${BIND_ADDRESS}:${PORT}`);
      console.error(`[STARTUP] Health check: http://${BIND_ADDRESS}:${PORT}/health`);
      console.error(`[STARTUP] MCP endpoint: http://${BIND_ADDRESS}:${PORT}/mcp`);
      console.error(`[STARTUP] Metrics: http://${BIND_ADDRESS}:${PORT}/metrics`);
      console.error(`[STARTUP] PID: ${process.pid}`);
    });
  })
  .catch((err) => {
    console.error(`[STARTUP] Failed to initialize backends: ${err.message}`);
    process.exit(1);
  });
