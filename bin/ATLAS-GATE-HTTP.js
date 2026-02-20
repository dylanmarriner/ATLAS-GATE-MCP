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

    // TODO: Wire up MCP tools to HTTP handlers
    // This would involve:
    // 1. Creating factory functions for each tool that work with tenantId/sessionId context
    // 2. Registering them with httpServer.registerTool()
    // 3. Passing context through the request lifecycle

    // Start HTTP server
    httpServer.start();

    console.error("[BOOTSTRAP] ATLAS-GATE HTTP Server started");
    console.error("[USAGE] Create a session with:");
    console.error(`curl -X POST http://localhost:${options.port || 3000}/sessions/create \\`);
    console.error(`  -H "X-API-Key: ${apiKey}" \\`);
    console.error(`  -H "Content-Type: application/json" \\`);
    console.error(`  -d '{"role": "WINDSURF", "workspaceRoot": "/path/to/repo"}'`);

  } catch (err) {
    console.error("[ERROR] Failed to start ATLAS-GATE HTTP Server:");
    console.error(err.message);
    process.exit(1);
  }
}

main();
