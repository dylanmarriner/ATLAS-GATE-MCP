import crypto from "crypto";
import { z } from "zod";

// IMPORTANT: direct imports from the SDK you ACTUALLY have
import { McpServer } from "./node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js";
import { StdioServerTransport } from "./node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js";

import { writeFileHandler } from "./tools/write_file.js";
import { listPlansHandler } from "./tools/list_plans.js";
import { readFileHandler } from "./tools/read_file.js";
import { readAuditLogHandler } from "./tools/read_audit_log.js";

// One session per server run
export const SESSION_ID = crypto.randomUUID();

// Create server
const server = new McpServer({
  name: "kaiza-mcp",
  version: "1.0.0",
});

// Register tools (THIS SDK STYLE)
server.registerTool(
  "write_file",
  {
    description: "Authoritative audited file write",
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
      plan: z.string(),
    }),
  },
  writeFileHandler
);

server.registerTool(
  "list_plans",
  {
    description: "List approved plans",
    inputSchema: z.object({}),
  },
  listPlansHandler
);

server.registerTool(
  "read_file",
  {
    description: "Read repository file (read-only)",
    inputSchema: z.object({
      path: z.string(),
    }),
  },
  readFileHandler
);

server.registerTool(
  "read_audit_log",
  {
    description: "Read append-only audit log",
    inputSchema: z.object({}),
  },
  readAuditLogHandler
);

// Attach stdio transport (THIS is the “start”)
const transport = new StdioServerTransport();
server.connect(transport);

// Human-safe confirmation
console.error(`[MCP] kaiza-mcp running | session=${SESSION_ID}`);
