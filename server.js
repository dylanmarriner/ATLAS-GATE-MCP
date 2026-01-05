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

/**
 * OBJECTIVE 2 — INPUT NORMALIZATION
 * 
 * Normalize all tool inputs server-side before validation.
 * Accepts both string and object input formats.
 * Prevents client-side formatting assumptions.
 */
const originalValidateToolInput = server.validateToolInput.bind(server);
server.validateToolInput = async function (tool, args, toolName) {
  // NORMALIZATION: Handle string input (JSON-stringified or raw)
  if (typeof args === 'string') {
    try {
      // Try to parse as JSON object
      args = JSON.parse(args);
    } catch (parseError) {
      // If parse fails, wrap in object with 'path' property for common patterns
      // This handles cases like: call with "path/to/file.md" directly
      if (toolName === 'read_file' || toolName === 'list_plans') {
        args = { path: args };
      } else {
        // Re-throw for other tools if string parsing fails
        throw new Error(`INVALID_INPUT_FORMAT: ${toolName} requires object input, got unparseable string`);
      }
    }
  }

  // NORMALIZATION: Validate args is now an object
  if (typeof args !== 'object' || args === null) {
    throw new Error(`INVALID_INPUT_FORMAT: ${toolName} input must be an object, got ${typeof args}`);
  }

  return originalValidateToolInput(tool, args, toolName);
};

// Register tools (THIS SDK STYLE)
server.registerTool(
  "write_file",
  {
    description: "Authoritative audited file write",
    inputSchema: z.object({
      path: z.string(),
      content: z.string().optional(),
      patch: z.string().optional(),
      previousHash: z.string().optional(), // For concurrency/integrity check
      plan: z.string(), // Plan Name or Path
      planId: z.string().optional(), // Required for strict enforcement
      planHash: z.string().optional(), // Required for strict enforcement
      // Optional metadata for auto-header generation
      role: z.enum(["EXECUTABLE", "BOUNDARY", "INFRASTRUCTURE", "VERIFICATION"]).optional(),
      purpose: z.string().optional(),
      usedBy: z.string().optional(),
      connectedVia: z.string().optional(),
      registeredIn: z.string().optional(),
      executedVia: z.string().optional(),
      failureModes: z.string().optional(),
      authority: z.string().optional(),
    }),
  },
  writeFileHandler
);

server.registerTool(
  "list_plans",
  {
    description: "List approved plans",
    inputSchema: z.object({
      path: z.string(),
    }),
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

import { bootstrapPlanHandler, bootstrapToolSchema } from "./tools/bootstrap_tool.js";

server.registerTool(
  "bootstrap_create_foundation_plan",
  {
    description: "Create the first approved plan (bootstrap mode only)",
    inputSchema: bootstrapToolSchema,
  },
  bootstrapPlanHandler
);

import { readPromptHandler } from "./tools/read_prompt.js";

server.registerTool(
  "read_prompt",
  {
    description: "Read canonical prompt (required before writing)",
    inputSchema: z.object({
      name: z.string()
    })
  },
  readPromptHandler
);

// Attach stdio transport (THIS is the “start”)
const transport = new StdioServerTransport();
server.connect(transport);

// Human-safe confirmation
console.error(`[MCP] kaiza-mcp running | session=${SESSION_ID}`);
