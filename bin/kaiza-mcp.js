#!/usr/bin/env node

/**
 * KAIZA MCP SERVER - Global Entry Point
 * 
 * This shim allows the server to be run from any location.
 * It imports the main server module, which executes immediately.
 * 
 * The server automatically detects the context (repo root) 
 * via process.cwd().
 */

import "../server.js";
