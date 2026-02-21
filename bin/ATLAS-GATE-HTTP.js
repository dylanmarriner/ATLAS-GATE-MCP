#!/usr/bin/env node

/**
 * ATLAS-GATE HTTP Server
 * 
 * Multi-tenant HTTP API server with dynamic workspace routing
 * 
 * Usage:
 *   node bin/ATLAS-GATE-HTTP.js [--port 3000] [--host localhost]
 * 
 * Environment variables:
 *   ATLAS_GATE_PORT=3000
 *   ATLAS_GATE_HOST=0.0.0.0
 *   ATLAS_GATE_ENV=production
 */

import AtlasGateHttpServer from "../api/http-server.js";
import { startServer } from "../server.js";
import TenantManager from "../core/multi-tenant-manager.js";

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port") options.port = parseInt(args[i + 1]);
  if (args[i] === "--host") options.host = args[i + 1];
  if (args[i] === "--env") options.env = args[i + 1];
}

async function main() {
  try {
    console.error("[BOOTSTRAP] Starting ATLAS-GATE HTTP Server...");

    // Create HTTP server
    const httpServer = new AtlasGateHttpServer(options);

    // Create initial admin tenant (for testing/setup)
    const { tenantId, apiKey } = TenantManager.createTenant("default", {
      maxSessions: 100,
      allowedRoles: ["WINDSURF", "ANTIGRAVITY"],
    });

    console.error(`[BOOTSTRAP] Default tenant created:`);
    console.error(`  Tenant ID: ${tenantId}`);
    console.error(`  API Key: ${apiKey}`);
    console.error(`  Store this API key - it cannot be recovered`);
    console.error("");

    // Wire up MCP tools to HTTP handlers
    // Register tools for tenant-aware execution
    const tools = [
      'begin_session', 'create_plan', 'review_plan', 'sign_plan',
      'read_file', 'write_file', 'get_audit_log', 'verify_signatures'
    ];
    
    for (const toolName of tools) {
      httpServer.registerTool(toolName, {
        tenantId,
        sessionIdRequired: toolName !== 'begin_session'
      });
    }

    // Start HTTP server
    httpServer.start();

    console.error("[BOOTSTRAP] ATLAS-GATE HTTP Server started");
    console.error("[USAGE] Create a session with:");
    console.error(`curl -X POST http://localhost:${options.port || 3000}/sessions/create \\`);
    console.error(`  -H "X-API-Key: ${apiKey}" \\`);
    console.error(`  -H "Content-Type: application/json" \\`);
    console.error(`  -d '{"role": "WINDSURF", "workspaceRoot": "/path/to/repo"}'`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERROR] Failed to start ATLAS-GATE HTTP Server:");
    console.error(errorMsg);
    throw new Error(`ATLAS-GATE HTTP Server startup failed: ${errorMsg}`);
  }
}

main();
