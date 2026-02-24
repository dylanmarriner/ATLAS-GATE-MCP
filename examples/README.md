# ATLAS-GATE Examples

Practical examples of using ATLAS-GATE in different scenarios.

## Files

- **multi-tenant-client.js** - Complete example of client SDK usage

## Running Examples

All examples require the HTTP server to be running:

```bash
# Terminal 1: Start server
npm run start:http

# Terminal 2: Run example
npm run example:client
```

## Example 1: Basic Client Usage

**File**: multi-tenant-client.js

**What it demonstrates:**

- Connecting to remote ATLAS-GATE server
- Creating a workspace session
- Reading files
- Listing plans
- Switching workspaces dynamically
- Querying audit logs
- Listing sessions

**Run:**

```bash
npm run example:client
```

**Expected output:**

```
[CLIENT] Connecting to ATLAS-GATE...
[OK] Server healthy: healthy
    Version: 2.0.0
    Tenants: 1

[SESSION] Creating workspace session...
[OK] Session created: session_abc123xyz789
    Workspace: /path/to/repo
    Role: WINDSURF

[TOOL] Reading package.json...
[OK] Package loaded: atlas-gate-mcp v2.0.0

[TOOL] Listing plans...
[OK] Found plans: 0

[WORKSPACE] Switching workspace...
[OK] Switched to: /path/to/parent
...
```

## Example 2: CI/CD Integration (Coming Soon)

Would demonstrate:

- Automated plan creation
- Multi-repo validation
- Audit trail verification
- Error handling and retries

## Example 3: Multi-Workspace Operations (Coming Soon)

Would demonstrate:

- Creating session once
- Switching between multiple repos
- Batch operations across repos
- Collecting results

## Example 4: Custom Tool Integration (Coming Soon)

Would demonstrate:

- Creating custom MCP tools
- Registering with HTTP server
- Calling via client SDK

## Environment Variables

Control example behavior:

```bash
# Server connection
ATLAS_GATE_URL=http://localhost:3000
ATLAS_GATE_API_KEY=your-api-key-here

# Project context
PROJECT_ROOT=/path/to/repo

# Debug output
DEBUG=true
```

## Creating Your Own Example

```javascript
import { AtlasGateClient } from '../api/client-sdk.js';

async function main() {
  const client = new AtlasGateClient({
    baseUrl: process.env.ATLAS_GATE_URL || 'http://localhost:3000',
    apiKey: process.env.ATLAS_GATE_API_KEY || 'demo-key'
  });

  try {
    // Your code here
    console.log('[OK] Example completed');
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  }
}

main();
```

## Best Practices

1. **Use environment variables** for API keys and server URLs
2. **Handle errors gracefully** with try-catch
3. **Close resources** when done (though HTTP client does this automatically)
4. **Log operations** for debugging
5. **Test locally** before running in CI/CD
6. **Use timeouts** to prevent hanging requests
7. **Validate paths** before workspace switching

## Troubleshooting

**Connection refused**

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

Solution: Start HTTP server with `npm run start:http`

**Invalid API key**

```
Error: [401] Invalid API key
```

Solution: Get the API key from server startup output

**Workspace root does not exist**

```
Error: [400] Workspace root does not exist: /invalid/path
```

Solution: Use a valid absolute path that exists on the server

## See Also

- [api/README.md](../api/README.md) - API documentation
- [HTTP_QUICK_START.md](../HTTP_QUICK_START.md) - Quick start guide
- [MULTI_TENANT_DEPLOYMENT.md](../MULTI_TENANT_DEPLOYMENT.md) - Full deployment guide
