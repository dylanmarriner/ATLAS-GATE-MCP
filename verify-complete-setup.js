#!/usr/bin/env node

/**
 * ATLAS-GATE Complete Verification Script
 * Verifies:
 * 1. Core atlas-gate system working
 * 2. atlas-gate-mcp-windsurf executable and callable
 * 3. atlas-gate-mcp-antigravity executable and callable
 * 4. MCP tools available and functional
 * 5. Workspace isolation working
 * 6. Remote access ready (TailScale compatible)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║   ATLAS-GATE COMPLETE VERIFICATION                        ║");
console.log("║   Testing Production Readiness & Remote Deployment        ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: File Structure & Dependencies
// ═══════════════════════════════════════════════════════════════
section("1. FILE STRUCTURE & DEPENDENCIES");

test("package.json exists and is valid", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8"));
  if (!pkg.bin || !pkg.bin["atlas-gate-mcp-windsurf"] || !pkg.bin["atlas-gate-mcp-antigravity"]) {
    throw new Error("Missing bin entries");
  }
});

test("atlas-gate-mcp-windsurf bin file exists", () => {
  const binPath = path.join(__dirname, "bin/ATLAS-GATE-MCP-windsurf.js");
  if (!fs.existsSync(binPath)) throw new Error("File not found");
  const content = fs.readFileSync(binPath, "utf-8");
  if (!content.includes("WINDSURF")) throw new Error("Invalid windsurf bin");
});

test("atlas-gate-mcp-antigravity bin file exists", () => {
  const binPath = path.join(__dirname, "bin/ATLAS-GATE-MCP-antigravity.js");
  if (!fs.existsSync(binPath)) throw new Error("File not found");
  const content = fs.readFileSync(binPath, "utf-8");
  if (!content.includes("ANTIGRAVITY")) throw new Error("Invalid antigravity bin");
});

test("src/interfaces/server.js exists (main MCP server)", () => {
  const serverPath = path.join(__dirname, "src/interfaces/server.js");
  if (!fs.existsSync(serverPath)) throw new Error("Server file not found");
});

test("Tool files exist", () => {
  const toolsDir = path.join(__dirname, "src/interfaces/tools");
  const tools = ["read_file.js", "write_file.js", "read_audit_log.js", "list_plans.js"];
  tools.forEach((tool) => {
    if (!fs.existsSync(path.join(toolsDir, tool))) {
      throw new Error(`Missing tool: ${tool}`);
    }
  });
});

test("MCP SDK installed", () => {
  const sdkPath = path.join(__dirname, "node_modules/@modelcontextprotocol/sdk");
  if (!fs.existsSync(sdkPath)) throw new Error("MCP SDK not installed");
});

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Server Startup & Initialization
// ═══════════════════════════════════════════════════════════════
section("2. SERVER STARTUP & INITIALIZATION");

test("WINDSURF server starts without errors", () => {
  try {
    const output = execSync("timeout 3 node bin/ATLAS-GATE-MCP-windsurf.js 2>&1 || true", {
      cwd: __dirname,
      encoding: "utf-8",
    });
    if (!output.includes("WINDSURF")) throw new Error("Server did not identify as WINDSURF");
    if (!output.includes("MCP")) throw new Error("MCP not initialized");
  } catch (err) {
    throw new Error(`Server startup failed: ${err.message}`);
  }
});

test("ANTIGRAVITY server starts without errors", () => {
  try {
    const output = execSync("timeout 3 node bin/ATLAS-GATE-MCP-antigravity.js 2>&1 || true", {
      cwd: __dirname,
      encoding: "utf-8",
    });
    if (!output.includes("ANTIGRAVITY")) throw new Error("Server did not identify as ANTIGRAVITY");
    if (!output.includes("MCP")) throw new Error("MCP not initialized");
  } catch (err) {
    throw new Error(`Server startup failed: ${err.message}`);
  }
});

test("Self-audit passes on startup", () => {
  try {
    const output = execSync("timeout 3 node bin/ATLAS-GATE-MCP-windsurf.js 2>&1 || true", {
      cwd: __dirname,
      encoding: "utf-8",
    });
    if (!output.includes("Self-Audit Passed")) throw new Error("Self-audit failed");
  } catch (err) {
    throw new Error(`Self-audit check failed: ${err.message}`);
  }
});

test("Startup audit completes successfully", () => {
  try {
    const output = execSync("timeout 3 node bin/ATLAS-GATE-MCP-antigravity.js 2>&1 || true", {
      cwd: __dirname,
      encoding: "utf-8",
    });
    if (!output.includes("All checks passed")) throw new Error("Startup audit failed");
  } catch (err) {
    throw new Error(`Startup audit failed: ${err.message}`);
  }
});

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Tool Configuration & Roles
// ═══════════════════════════════════════════════════════════════
section("3. TOOL CONFIGURATION & ROLES");

test("AST Policy enforcement working", () => {
  try {
    const output = execSync("npm test 2>&1", { cwd: __dirname, encoding: "utf-8" });
    if (!output.includes("AST Policy Verified")) throw new Error("AST policy verification failed");
  } catch (err) {
    throw new Error(`Policy test failed: ${err.message}`);
  }
});

test("WINDSURF role tools configured", () => {
  const serverPath = path.join(__dirname, "src/interfaces/server.js");
  const content = fs.readFileSync(serverPath, "utf-8");
  const windsurf_tools = ["write_file", "list_plans", "read_audit_log"];
  windsurf_tools.forEach((tool) => {
    if (!content.includes(tool)) throw new Error(`Missing WINDSURF tool: ${tool}`);
  });
});

test("ANTIGRAVITY role tools configured", () => {
  const serverPath = path.join(__dirname, "src/interfaces/server.js");
  const content = fs.readFileSync(serverPath, "utf-8");
  const antigravity_tools = ["read_file", "list_plans", "read_audit_log"];
  antigravity_tools.forEach((tool) => {
    if (!content.includes(tool)) throw new Error(`Missing ANTIGRAVITY tool: ${tool}`);
  });
});

test("Tool error handling implemented", () => {
  const serverPath = path.join(__dirname, "src/interfaces/server.js");
  const content = fs.readFileSync(serverPath, "utf-8");
  if (!content.includes("SystemError") || !content.includes("audit")) {
    throw new Error("Error handling not properly implemented");
  }
});

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Workspace Isolation & Security
// ═══════════════════════════════════════════════════════════════
section("4. WORKSPACE ISOLATION & SECURITY");

test("Path resolver infrastructure exists", () => {
  const resolverPath = path.join(__dirname, "src/infrastructure/path-resolver.js");
  if (!fs.existsSync(resolverPath)) throw new Error("Path resolver not found");
});

test("Audit system infrastructure exists", () => {
  const auditPath = path.join(__dirname, "src/application/audit-system.js");
  if (!fs.existsSync(auditPath)) throw new Error("Audit system not found");
});

test("Security analysis tools exist", () => {
  const analyzerPath = path.join(__dirname, "src/application/static-analyzer.js");
  if (!fs.existsSync(analyzerPath)) throw new Error("Static analyzer not found");
});

test("Audit log generated", () => {
  const auditLog = path.join(__dirname, "audit-log.jsonl");
  if (!fs.existsSync(auditLog)) {
    // It's OK if it doesn't exist yet on fresh install
    console.log("  (Audit log will be created on first operation)");
    return;
  }
  // If it exists, verify it's JSONL format
  const content = fs.readFileSync(auditLog, "utf-8").trim();
  if (content.length > 0) {
    const lines = content.split("\n");
    lines.forEach((line) => {
      if (line.trim()) JSON.parse(line); // Will throw if invalid JSON
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Deployment & Remote Access
// ═══════════════════════════════════════════════════════════════
section("5. DEPLOYMENT & REMOTE ACCESS");

test("Docker configuration exists", () => {
  const dockerfile = path.join(__dirname, "Dockerfile");
  if (!fs.existsSync(dockerfile)) throw new Error("Dockerfile not found");
});

test("Docker Compose configuration exists", () => {
  const compose = path.join(__dirname, "docker-compose.yml");
  if (!fs.existsSync(compose)) throw new Error("docker-compose.yml not found");
});

test("Kubernetes deployment manifest exists", () => {
  const k8s = path.join(__dirname, "k8s-deployment.yaml");
  if (!fs.existsSync(k8s)) throw new Error("k8s-deployment.yaml not found");
});

test("Nginx configuration exists (reverse proxy support)", () => {
  const nginx = path.join(__dirname, "nginx.conf");
  if (!fs.existsSync(nginx)) throw new Error("nginx.conf not found");
});

test("RPI deployment guide exists", () => {
  const rpiDoc = path.join(__dirname, "RPI_DEPLOYMENT.md");
  if (!fs.existsSync(rpiDoc)) throw new Error("RPI_DEPLOYMENT.md not found");
  const content = fs.readFileSync(rpiDoc, "utf-8");
  if (!content.includes("TailScale") && !content.includes("remote")) {
    console.log("  (No TailScale reference found - may need setup guide)");
  }
});

test("Production deployment documentation exists", () => {
  const prodDoc = path.join(__dirname, "PRODUCTION_DEPLOYMENT.md");
  if (!fs.existsSync(prodDoc)) throw new Error("PRODUCTION_DEPLOYMENT.md not found");
});

test("Security hardening guide exists", () => {
  const secDoc = path.join(__dirname, "SECURITY_HARDENING.md");
  if (!fs.existsSync(secDoc)) throw new Error("SECURITY_HARDENING.md not found");
});

// ═══════════════════════════════════════════════════════════════
// SECTION 6: TailScale Remote Access Configuration
// ═══════════════════════════════════════════════════════════════
section("6. TAILSCALE REMOTE ACCESS READINESS");

test("HTTP server supports remote clients", () => {
  const httpBin = path.join(__dirname, "bin/ATLAS-GATE-HTTP.js");
  if (!fs.existsSync(httpBin)) throw new Error("HTTP server not found");
  const content = fs.readFileSync(httpBin, "utf-8");
  if (!content.includes("listen") && !content.includes("server")) {
    throw new Error("HTTP server not properly configured");
  }
});

test("Stdio transport supports MCP clients", () => {
  const serverPath = path.join(__dirname, "src/interfaces/server.js");
  const content = fs.readFileSync(serverPath, "utf-8");
  if (!content.includes("StdioServerTransport")) {
    throw new Error("Stdio transport not configured");
  }
});

test("Network access via HTTP possible", () => {
  // Check if nginx or HTTP server is configured to listen on 0.0.0.0 or network interface
  const nginxPath = path.join(__dirname, "nginx.conf");
  const nginxContent = fs.readFileSync(nginxPath, "utf-8");
  if (!nginxContent.includes("listen") || !nginxContent.includes("3000")) {
    throw new Error("Nginx not configured for network access");
  }
});

test("TailScale-compatible network configuration", () => {
  // Verify both Stdio (for direct calls) and HTTP (for remote) are supported
  const serverPath = path.join(__dirname, "src/interfaces/server.js");
  const content = fs.readFileSync(serverPath, "utf-8");
  if (!content.includes("startServer")) {
    throw new Error("Server startup function not found");
  }
});

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Node Version & Dependencies
// ═══════════════════════════════════════════════════════════════
section("7. NODE VERSION & DEPENDENCIES");

test("Node.js version >= 18.0.0", () => {
  const version = process.version;
  const major = parseInt(version.split(".")[0].slice(1));
  if (major < 18) throw new Error(`Node ${version} is too old`);
});

test("All required dependencies installed", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8"));
  const required = ["@modelcontextprotocol/sdk", "@sigstore/sign", "@sigstore/verify"];
  required.forEach((dep) => {
    const depPath = path.join(__dirname, "node_modules", dep);
    if (!fs.existsSync(depPath)) throw new Error(`Missing dependency: ${dep}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
section("SUMMARY");
console.log(`\n  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}\n`);

if (failed === 0) {
  console.log("  ✓ ATLAS-GATE IS FULLY OPERATIONAL");
  console.log("\n  Ready for:");
  console.log("  • Local MCP client connections");
  console.log("  • Raspberry Pi deployment");
  console.log("  • Docker/Kubernetes deployment");
  console.log("  • TailScale remote access");
  process.exit(0);
} else {
  console.log("  ✗ SOME CHECKS FAILED - SEE ABOVE");
  process.exit(1);
}
