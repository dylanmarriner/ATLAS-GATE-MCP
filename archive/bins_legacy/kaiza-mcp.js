#!/usr/bin/env node

/**
 * ATLAS-GATE MCP SERVER - Global Entry Point
 * 
 * This shim allows the server to be run from any location.
 * It imports the main server module, which executes immediately.
 * 
 * The server automatically detects the context (repo root) 
 * via process.cwd().
 */

import { startServer } from "../server.js";

startServer("ANTIGRAVITY").catch((error) => {
    console.error("Failed to start atlas-gate-mcp server:", error);
    process.exit(1);
});
