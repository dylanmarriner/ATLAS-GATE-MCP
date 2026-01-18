#!/usr/bin/env node

/**
 * KAIZA MCP SERVER - Windsurf (Mutation/Execution)
 */

import { startServer } from "../server.js";

startServer("WINDSURF").catch((error) => {
    console.error("Failed to start Windsurf MCP server:", error);
    process.exit(1);
});
