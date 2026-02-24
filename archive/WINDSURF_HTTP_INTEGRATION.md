# Windsurf IDE - ATLAS-GATE HTTP Integration Guide

Connect your Windsurf IDE to the remote ATLAS-GATE HTTP server for MCP tool access.

## Overview

Instead of using stdio MCP, Windsurf will now connect to the remote HTTP API:

```
Windsurf IDE → HTTP API Request → ATLAS-GATE Server → MCP Tools → Workspace
                (X-API-Key auth)
```

## Prerequisites

- Windsurf IDE installed
- ATLAS-GATE HTTP server running (see deploy.sh)
- Network access to server (IP + port 3000 or 443)
- API Key from server startup

## Step 1: Get Server Information

From your deployment:

```bash
# If Docker
docker-compose logs atlas-gate | grep "API Key"

# If Kubernetes
kubectl logs -n atlas-gate deployment/atlas-gate | grep "API Key"

# You'll see:
# [BOOTSTRAP] Default tenant created:
#   Tenant ID: tenant_a1b2c3d4
#   API Key: 5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c
```

Save:

- **API Key**: `5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c`
- **Server URL**: `http://100.93.214.100:3000` or `https://atlas-gate.example.com`

## Step 2: Create a Custom MCP Tool in Windsurf

In Windsurf, you can use the HTTP-based ATLAS-GATE as an MCP server.

### Option A: Using Custom MCP Server (Recommended)

1. **Open Windsurf Settings**
   - Command Palette: `Cmd+Shift+P` → "Settings"
   - Or: Windsurf → Preferences → Settings

2. **Find MCP Configuration**
   - Search for "MCP"
   - Look for "MCP Servers" or "Model Context Protocol"

3. **Add New Server**
   Click "Add" and configure:

   ```json
   {
     "name": "atlas-gate-http",
     "description": "ATLAS-GATE HTTP MCP Server",
     "type": "http",
     "baseUrl": "http://100.93.214.100:3000",
     "authentication": {
       "type": "bearer",
       "token": "5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"
     },
     "defaultSessionId": "session_create_first",
     "workspace": "/path/to/your/repo"
   }
   ```

### Option B: Using Environment Variable

Create a `.windsurf` config file in your project:

```json
{
  "mcp": {
    "servers": {
      "atlas-gate": {
        "url": "http://100.93.214.100:3000",
        "apiKey": "5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c",
        "sessionId": null
      }
    }
  }
}
```

## Step 3: Configure Windsurf for HTTP API Calls

Since Windsurf's native MCP client expects stdio protocol, you need an adapter.

### Install HTTP MCP Adapter

```bash
npm install -g atlas-gate-mcp-adapter
```

Or use the included adapter:

```bash
npm install ../ATLAS-GATE-MCP
```

### Update Windsurf settings.json

**Linux/Mac**: `~/.windsurf/settings.json`  
**Windows**: `%APPDATA%\Windsurf\settings.json`

```json
{
  "mcpServers": {
    "atlas-gate": {
      "command": "node",
      "args": [
        "/path/to/atlas-gate-mcp-adapter.js",
        "--server-url",
        "http://100.93.214.100:3000",
        "--api-key",
        "5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"
      ]
    }
  }
}
```

## Step 4: Create an HTTP Adapter Script

Create `atlas-gate-mcp-adapter.js`:

```javascript
#!/usr/bin/env node

/**
 * ATLAS-GATE HTTP → MCP Stdio Adapter for Windsurf
 * Converts HTTP API calls to MCP stdio protocol
 */

import { AtlasGateClient } from './api/client-sdk.js';
import { stdin, stdout } from 'process';
import { createInterface } from 'readline';

const args = process.argv.slice(2);
let serverUrl = 'http://localhost:3000';
let apiKey = process.env.ATLAS_GATE_API_KEY;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server-url') serverUrl = args[++i];
  if (args[i] === '--api-key') apiKey = args[++i];
}

if (!apiKey) {
  console.error('Error: API key required (--api-key or ATLAS_GATE_API_KEY)');
  process.exit(1);
}

// Initialize client
const client = new AtlasGateClient({
  baseUrl: serverUrl,
  apiKey: apiKey
});

let sessionId = null;

// Read JSON-RPC requests from stdin
const rl = createInterface({
  input: stdin,
  output: null
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    stdout.write(JSON.stringify(response) + '\n');
  } catch (err) {
    const error = {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: { error: err.message }
      }
    };
    stdout.write(JSON.stringify(error) + '\n');
  }
});

async function handleRequest(request) {
  const { method, params, id } = request;

  try {
    let result;

    switch (method) {
      case 'begin_session':
        const session = await client.createSession({
          workspaceRoot: params.workspace_root,
          role: params.role || 'WINDSURF'
        });
        sessionId = session.id;
        result = { sessionId };
        break;

      case 'read_file':
        result = await client.readFile(params.path, sessionId);
        break;

      case 'write_file':
        result = await client.writeFile(
          params.path,
          params.content,
          params.plan,
          sessionId
        );
        break;

      case 'list_plans':
        result = await client.listPlans(sessionId);
        break;

      case 'read_audit_log':
        result = await client.readAuditLog();
        break;

      case 'switch_workspace':
        await client.updateSessionWorkspace(params.workspace_root, sessionId);
        result = { ok: true };
        break;

      default:
        // Forward unknown methods to HTTP server
        result = await client.callTool(method, params, sessionId);
    }

    return {
      jsonrpc: '2.0',
      result,
      id
    };
  } catch (err) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: err.message,
        data: { error: err.stack }
      },
      id
    };
  }
}
```

Save as: `api/atlas-gate-mcp-adapter.js`

## Step 5: Test the Connection

In Windsurf, open the Command Palette and run:

```
MCP: Reload MCP Servers
```

Then test a tool:

```
@atlas-gate read_file package.json
```

## Step 6: Use ATLAS-GATE Tools in Windsurf

Now you can use tools in chat:

```
@atlas-gate read_file src/index.js

@atlas-gate list_plans

@atlas-gate write_file src/new-feature.js "// New feature code"
```

The `@atlas-gate` prefix tells Windsurf to use the ATLAS-GATE MCP server.

## Dynamic Workspace Switching

To switch workspaces during a session:

```
@atlas-gate switch_workspace /path/to/different/repo
```

All subsequent calls will operate on the new workspace.

## Configuration Examples

### Example 1: Development Environment

```json
{
  "mcpServers": {
    "atlas-gate-dev": {
      "command": "node",
      "args": [
        "/home/user/atlas-gate-mcp-adapter.js",
        "--server-url",
        "http://localhost:3000",
        "--api-key",
        "dev-api-key-here"
      ],
      "disabled": false
    }
  }
}
```

### Example 2: Production Environment

```json
{
  "mcpServers": {
    "atlas-gate-prod": {
      "command": "node",
      "args": [
        "/home/user/atlas-gate-mcp-adapter.js",
        "--server-url",
        "https://atlas-gate.company.com",
        "--api-key",
        "${ATLAS_GATE_API_KEY}"
      ],
      "disabled": false
    }
  }
}
```

### Example 3: Multiple Workspaces

```json
{
  "mcpServers": {
    "atlas-gate-backend": {
      "command": "node",
      "args": [
        "/home/user/atlas-gate-mcp-adapter.js",
        "--server-url",
        "http://atlas-gate-server:3000",
        "--api-key",
        "backend-team-key"
      ]
    },
    "atlas-gate-frontend": {
      "command": "node",
      "args": [
        "/home/user/atlas-gate-mcp-adapter.js",
        "--server-url",
        "http://atlas-gate-server:3000",
        "--api-key",
        "frontend-team-key"
      ]
    }
  }
}
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 100.93.214.100:3000
```

**Solutions:**

1. Verify server is running: `curl http://100.93.214.100:3000/health`
2. Check firewall rules: `sudo ufw allow 3000`
3. Verify IP/port in configuration

### Invalid API Key

```
Error: Invalid API key
```

**Solutions:**

1. Verify key from server logs
2. Regenerate new tenant: `POST /tenants/create`
3. Check for typos in configuration

### Session Not Found

```
Error: Session not found
```

**Solutions:**

1. Create new session first: `begin_session` with workspace_root
2. Check sessionId is correct
3. Verify session hasn't expired

### Network Timeout

```
Error: timeout after 30s
```

**Solutions:**

1. Increase timeout in adapter config
2. Check network connectivity: `ping 100.93.214.100`
3. Verify server is responding: `curl -v http://100.93.214.100:3000/health`

## Advanced Usage

### SSH Tunnel (for secure remote access)

```bash
ssh -N -L 3000:localhost:3000 root@100.93.214.100 &
```

Then configure Windsurf with:

```json
"--server-url", "http://localhost:3000"
```

### API Key Rotation

```bash
# Create new tenant on server
curl -X POST http://100.93.214.100:3000/tenants/create \
  -H "Content-Type: application/json" \
  -d '{"name": "windsurf-new"}'

# Update Windsurf config with new key
```

### Monitoring API Usage

View all Windsurf operations in audit log:

```bash
curl http://100.93.214.100:3000/audit/log \
  -H "X-API-Key: your-api-key" \
  | jq '.'
```

## Integration with Antigravity

See: [ANTIGRAVITY_HTTP_INTEGRATION.md](./ANTIGRAVITY_HTTP_INTEGRATION.md)

## See Also

- [HTTP_QUICK_START.md](./HTTP_QUICK_START.md)
- [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md)
- [api/client-sdk.js](./api/client-sdk.js)

---

**Status:** Ready for integration  
**Version:** 2.0.0 (HTTP)
