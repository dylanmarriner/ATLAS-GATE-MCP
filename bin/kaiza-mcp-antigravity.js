#!/usr/bin/env node

/**
 * ATLAS-GATE MCP SERVER - Antigravity (Read-Only/Analysis)
 */

import { startServer } from "../server.js";

startServer("ANTIGRAVITY").catch((error) => {
    console.error("Failed to start Antigravity MCP server:", error);
    process.exit(1);
});
