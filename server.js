import crypto from "crypto";
import { z } from "zod";

// IMPORTANT: Standard package imports for portability
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { writeFileHandler } from "./tools/write_file.js";
import { listPlansHandler } from "./tools/list_plans.js";
import { readFileHandler } from "./tools/read_file.js";
import { readAuditLogHandler } from "./tools/read_audit_log.js";
import { readPromptHandler } from "./tools/read_prompt.js";

// CANONICAL PATH RESOLVER: Initialize first before any other operations
// CANONICAL PATH RESOLVER: Initialize first before any other operations
import { ensurePathResolver, getRepoRoot } from "./core/path-resolver.js";

// One session per server run
export const SESSION_ID = crypto.randomUUID();

// REMOVED: Eager initialization. We now initialize lazily on the first tool call
// to support correct repo detection when started from a generic location (e.g. global install).
// WORKSPACE_ROOT export removed as it depends on eager init.

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

  // LAZY INITIALIZATION:
  // If the path resolver hasn't been initialized yet, use the 'path' argument (if present)
  // as a hint to find the repository root. This ensures that if the server is started
  // in a generic directory (like ~), it locks onto the correct repo based on the first operation.
  if (args.path) {
    ensurePathResolver(args.path);
  } else {
    // If no path is provided in the first call (e.g. read_audit_log),
    // we assume CWD is the intention or we just init with CWD to be safe.
    ensurePathResolver(process.cwd());
  }

  return originalValidateToolInput(tool, args, toolName);
};

// Register all tools (AFTER all imports are complete)
async function registerAllTools() {
  // Import bootstrap last to avoid circular dependency issues
  const { bootstrapPlanHandler, bootstrapToolSchema } = await import("./tools/bootstrap_tool.js");

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

  server.registerTool(
    "bootstrap_create_foundation_plan",
    {
      description: "Create the first approved plan (bootstrap mode only)",
      inputSchema: bootstrapToolSchema,
    },
    bootstrapPlanHandler
  );

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
}

// Register tools and start server
await registerAllTools();

// Attach stdio transport (THIS is the "start")
const transport = new StdioServerTransport();
server.connect(transport);

// Human-safe confirmation
console.error(`[MCP] kaiza-mcp running | session=${SESSION_ID}`);
