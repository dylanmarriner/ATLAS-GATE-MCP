# ATLAS-GATE API

HTTP/REST API for remote multi-tenant access to ATLAS-GATE.

## Files

- **http-server.js** - Main HTTP server implementation with routing, auth, and tool dispatch
- **client-sdk.js** - JavaScript client library for making remote calls
- **README.md** - This file

## Quick Usage

### Start Server

```bash
node ../bin/ATLAS-GATE-HTTP.js --port 3000
```

### Use Client SDK

```javascript
import { AtlasGateClient } from './client-sdk.js';

const client = new AtlasGateClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

const session = await client.createSession({
  workspaceRoot: '/path/to/repo'
});

const files = await client.listPlans();
```

## Architecture

```
HTTP Request
    ↓
[Router] → Extracts tenant/session from URL & headers
    ↓
[Auth] → Validates X-API-Key header
    ↓
[Dispatcher] → Routes to appropriate tool handler
    ↓
[Tool Handler] → Executes with workspace context
    ↓
[Audit Logger] → Records operation
    ↓
JSON Response
```

## Authentication

All endpoints (except `/health` and `/tenants/create`) require:

```
X-API-Key: your-api-key-here
```

## Key Design Decisions

1. **Stateless requests** - Each request includes sessionId, prevents session affinity issues
2. **Tenant-aware routing** - API key determines which tenant's data is accessed
3. **Workspace injection** - Each session has a workspace root that's passed to tools
4. **Audit on every call** - All operations logged for compliance
5. **REST conventions** - Standard HTTP methods and status codes

## Extending the API

### Add a New Endpoint

```javascript
// In http-server.js handleRequest()
else if (pathname === "/my-endpoint") {
  this.handleMyEndpoint(req, res);
}

handleMyEndpoint(req, res) {
  // Implementation
}
```

### Add a New Tool

The HTTP server automatically dispatches to registered tools:

```javascript
// In the entrypoint (bin/ATLAS-GATE-HTTP.js)
httpServer.registerTool('my_tool', async (args, context) => {
  const { tenantId, sessionId, workspaceRoot } = context;
  // Implementation
  return result;
});
```

## Security Considerations

- API keys should be 32+ bytes of cryptographic random data
- Use HTTPS in production (TLS)
- Rotate API keys regularly
- Implement rate limiting by API key
- Use tight firewall rules
- Monitor audit logs for suspicious activity
- Never log sensitive data (paths, content) in production

## Performance Notes

- In-memory tenant/session storage (ok for < 1000 concurrent sessions)
- Audit logs stored in-memory (ok for < 100k entries)
- For production, implement persistent storage (database)
- Consider caching for read-heavy workloads

## Monitoring

Check `/health` endpoint periodically:

```bash
curl http://localhost:3000/health
```

Response includes:

- Server status
- Version
- Tenant count (useful for tracking growth)

## Integration Points

The API integrates with existing ATLAS-GATE systems:

- **MCP Tools**: All tools from `server.js` are available via HTTP
- **Audit System**: Uses `core/audit-system.js` for logging
- **Tenant Manager**: `core/multi-tenant-manager.js` for isolation
- **Path Resolver**: `core/path-resolver.js` for workspace access

## Limitations & Future

### Current Limitations

- In-memory storage (no persistence across restarts)
- No WebSocket support (HTTP request/response only)
- Limited concurrency for tool execution

### Future Enhancements

- [ ] Database persistence for tenants/sessions
- [ ] WebSocket support for long-running operations
- [ ] Server-sent events for real-time updates
- [ ] Metrics/Prometheus endpoint
- [ ] gRPC support for higher performance
- [ ] GraphQL API variant
- [ ] SDK for Python, Go, Rust

## See Also

- [HTTP_QUICK_START.md](../HTTP_QUICK_START.md) - 5-minute setup
- [MULTI_TENANT_DEPLOYMENT.md](../MULTI_TENANT_DEPLOYMENT.md) - Full documentation
- [DEPLOYMENT_CHECKLIST_HTTP.md](../DEPLOYMENT_CHECKLIST_HTTP.md) - Production readiness
