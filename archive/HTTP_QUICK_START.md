# ATLAS-GATE HTTP Server - Quick Start (5 minutes)

Get ATLAS-GATE running as a multi-tenant HTTP server and start making API calls.

## Prerequisites

- Node.js 18+
- Git (for cloning)

## Step 1: Start the Server

```bash
cd /path/to/ATLAS-GATE-MCP
npm install  # If not done already
npm run start:http
```

**Expected output:**

```
[BOOTSTRAP] Starting ATLAS-GATE HTTP Server...
[BOOTSTRAP] Default tenant created:
  Tenant ID: tenant_a1b2c3d4
  API Key: 5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c
[HTTP] ATLAS-GATE listening on localhost:3000
```

**Save the API Key** - you'll need it for all requests.

## Step 2: Create a Session (In another terminal)

```bash
export API_KEY="5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"
export WORKSPACE="/path/to/any/repo"

curl -X POST http://localhost:3000/sessions/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"workspaceRoot\": \"$WORKSPACE\", \"role\": \"WINDSURF\"}"
```

**Copy the `sessionId` from response:**

```json
{
  "sessionId": "session_abc123xyz789",
  "sessionState": { ... }
}
```

## Step 3: Make API Calls

```bash
export API_KEY="5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"
export SESSION_ID="session_abc123xyz789"

# Read a file
curl -X POST "http://localhost:3000/tools/read_file?sessionId=$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"path": "package.json"}'

# List plans
curl -X POST "http://localhost:3000/tools/list_plans?sessionId=$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Switch to a different repository
curl -X PUT "http://localhost:3000/sessions/$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspaceRoot": "/path/to/another/repo"}'
```

## Step 4: Use the Client SDK (Node.js)

```javascript
import { AtlasGateClient } from './api/client-sdk.js';

const client = new AtlasGateClient({
  baseUrl: 'http://localhost:3000',
  apiKey: '5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c'
});

// Create session
const session = await client.createSession({
  workspaceRoot: '/path/to/repo'
});

// Read file
const content = await client.readFile('package.json');
console.log(content);

// Switch repo dynamically
await client.updateSessionWorkspace('/path/to/another/repo');

// List plans
const plans = await client.listPlans();
console.log('Plans:', plans);
```

Or run the example:

```bash
npm run example:client
```

## Key Features Demonstrated

✓ **Multi-tenant**: Each API key is a separate tenant with isolated sessions  
✓ **Dynamic routing**: Change workspace root at runtime  
✓ **Audit trail**: All operations logged per tenant  
✓ **RESTful API**: Standard HTTP verbs (GET/POST/PUT)  
✓ **Client SDK**: Convenient JavaScript library  

## Architecture

```
Client → HTTP API (port 3000)
         ↓
      [Tenant Manager]
         ↓
      [Session Store]
         ↓
      [MCP Tool Handlers] → [Workspace Root]
         ↓
      [Audit Log (per-tenant)]
```

## Next Steps

- Read [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md) for full docs
- Deploy to Docker: `docker-compose up`
- Deploy to Kubernetes: `kubectl apply -f k8s-deployment.yaml`
- Create additional tenants via `/tenants/create`
- Integrate with CI/CD pipelines
- Monitor via audit logs: `/audit/log`

## Troubleshooting

**"Address already in use"** → Change port: `node bin/ATLAS-GATE-HTTP.js --port 3001`

**"Session not found"** → Create a session first with `/sessions/create`

**"Invalid API key"** → Copy the key from server startup output

**"Workspace root does not exist"** → Use absolute path that exists on server

## Support

See [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md) for:

- Complete API reference
- Docker & Kubernetes deployment
- Security best practices
- Monitoring & observability
- Migration from stdio MCP
