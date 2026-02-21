#!/usr/bin/env node

/**
 * ATLAS-GATE MCP SERVER - Antigravity (Read-Only/Analysis)
 */

import { startServer } from "../server.js";

const ROLE = "ANTIGRAVITY";

startServer(ROLE).catch((error) => {
    console.error(`Failed to start ${ROLE} MCP server:`, error);
    process.exit(1);
});
