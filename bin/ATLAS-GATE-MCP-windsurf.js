#!/usr/bin/env node

/**
 * ATLAS-GATE MCP SERVER - Windsurf (Mutation/Execution)
 */

import { startServer } from "../src/interfaces/server.js";

const ROLE = "WINDSURF";

startServer(ROLE).catch((error) => {
    console.error(`Failed to start ${ROLE} MCP server:`, error);
    process.exit(1);
});
