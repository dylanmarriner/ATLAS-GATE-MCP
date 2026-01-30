#!/usr/bin/env node

/**
 * KAIZA MCP SERVER - Windsurf (Mutation/Execution)
 * 
 * SECURITY: Windsurf runs in MCP-ONLY SANDBOX MODE
 * - Cannot access filesystem directly (only via MCP tools)
 * - Cannot execute shell commands
 * - Cannot import dangerous modules
 * - Cannot access environment variables
 * - FORCED to use MCP tools for all operations
 */

import { 
  lockdownProcess, 
  verifySandboxIntegrity, 
  freezeGlobalObjects,
  installAuditHook 
} from "../core/mcp-sandbox.js";
import { startServer } from "../server.js";

const ROLE = "WINDSURF";

// STEP 1: Apply sandbox lockdown before anything else
lockdownProcess(ROLE);

// STEP 2: Freeze global objects to prevent modification
freezeGlobalObjects();

// STEP 3: Install audit hooks for attempt tracking
installAuditHook(ROLE);

// STEP 4: Verify sandbox integrity before starting MCP
try {
  verifySandboxIntegrity(ROLE);
} catch (err) {
  console.error(`[CRITICAL] Sandbox integrity check failed for ${ROLE}: ${err.message}`);
  process.exit(1);
}

console.error(`[SANDBOX] ${ROLE} entrypoint: MCP-only mode ENFORCED`);
console.error(`[SANDBOX] No filesystem access, shell execution, or direct module imports allowed`);

// STEP 5: Start MCP server in sandboxed environment
startServer(ROLE).catch((error) => {
    console.error(`Failed to start ${ROLE} MCP server:`, error);
    process.exit(1);
});
