# ATLAS-GATE Multi-Tenant HTTP Deployment Guide

This guide covers deploying ATLAS-GATE as a multi-tenant HTTP/REST API server instead of using the traditional stdio MCP protocol.

## Architecture Overview

### Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATLAS-GATE HTTP Server                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Tenant Manager (Multi-Tenant)               │   │
│  │  - Tenant registry with API keys                         │   │
│  │  - Per-tenant session management                         │   │
│  │  - Per-tenant audit logs                                 │   │
│  │  - Workspace isolation                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              HTTP API Router                              │   │
│  │  - Authentication via X-API-Key                          │   │
│  │  - Dynamic workspace routing                             │   │
│  │  - Tool call dispatching                                 │   │
│  │  - Audit logging                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MCP Tool Handlers                            │   │
│  │  - All existing tools registered                         │   │
│  │  - Context injected: tenantId, sessionId, workspaceRoot │   │
│  │  - Workspace-aware operations                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

        │                    │                    │
        ↓                    ↓                    ↓
    ┌────────┐          ┌────────┐          ┌────────┐
    │ Client │          │ Client │          │ Client │
    │ (Repo  │          │ (Repo  │          │ (Repo  │
    │  A)    │          │  B)    │          │  C)    │
    └────────┘          └────────┘          └────────┘
```

### Multi-Tenancy Model

Each tenant:
- Has a unique **API Key** for authentication
- Maintains separate **sessions** (multiple workspaces per tenant)
- Gets isolated **audit logs**
- Can dynamically adjust **workspace root** per session

## Quick Start

### 1. Start the HTTP Server

```bash
# Option A: Use default settings
node bin/ATLAS-GATE-HTTP.js

# Option B: Specify port and host
node bin/ATLAS-GATE-HTTP.js --port 3000 --host 0.0.0.0

# Option C: Use environment variables
ATLAS_GATE_PORT=3000 ATLAS_GATE_HOST=0.0.0.0 node bin/ATLAS-GATE-HTTP.js
```

**Output:**
```
[BOOTSTRAP] Starting ATLAS-GATE HTTP Server...
[BOOTSTRAP] Default tenant created:
  Tenant ID: tenant_a1b2c3d4
  API Key: 5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c
  Store this API key - it cannot be recovered

[HTTP] ATLAS-GATE listening on localhost:3000
[BOOTSTRAP] ATLAS-GATE HTTP Server started
```

### 2. Create a Tenant (Optional - default tenant included)

```bash
curl -X POST http://localhost:3000/tenants/create \
  -H "Content-Type: application/json" \
  -d '{"name": "my-team", "config": {"maxSessions": 20}}'
```

**Response:**
```json
{
  "tenantId": "tenant_abc123",
  "apiKey": "sk_live_abc123xyz789",
  "message": "Tenant created. Store apiKey securely."
}
```

### 3. Create a Session (Initialize Workspace)

```bash
API_KEY="5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"
WORKSPACE="/path/to/my/repo"

curl -X POST http://localhost:3000/sessions/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"WINDSURF\", \"workspaceRoot\": \"$WORKSPACE\"}"
```

**Response:**
```json
{
  "sessionId": "session_xyz789",
  "sessionState": {
    "id": "session_xyz789",
    "tenantId": "tenant_a1b2c3d4",
    "workspaceRoot": "/path/to/my/repo",
    "role": "WINDSURF",
    "created": "2024-02-14T10:00:00Z",
    "lastActivity": "2024-02-14T10:00:00Z",
    "activePlanId": null,
    "planRegistry": [],
    "metadata": {}
  }
}
```

### 4. Call MCP Tools

```bash
SESSION_ID="session_xyz789"
API_KEY="5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"

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
```

## Client SDK Usage (Node.js)

### Installation

```bash
npm install # Already included in package.json
```

### Basic Usage

```javascript
import { AtlasGateClient } from './api/client-sdk.js';

// Initialize client
const client = new AtlasGateClient({
  baseUrl: 'http://localhost:3000',
  apiKey: '5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c'
});

// Create session
const session = await client.createSession({
  workspaceRoot: '/path/to/repo',
  role: 'WINDSURF'
});

console.log('Session created:', session.id);

// Call tools
const content = await client.readFile('package.json');
console.log('File content:', content);

// Update workspace dynamically
await client.updateSessionWorkspace('/path/to/another/repo');

// List all sessions
const sessions = await client.listSessions();
console.log('Active sessions:', sessions.length);

// Read audit log
const logs = await client.readAuditLog({ tool: 'read_file' });
console.log('Audit entries:', logs.length);
```

## Dynamic Workspace Adjustment

### Change Workspace Root at Runtime

```javascript
// Initially created with one workspace
const session = await client.createSession({
  workspaceRoot: '/project/repo-a'
});

// Later, switch to another workspace
await client.updateSessionWorkspace('/project/repo-b');

// Tool calls now operate on repo-b
const files = await client.callTool('list_plans');
```

### Use Case: CI/CD Across Multiple Repos

```javascript
const repos = [
  '/repos/backend',
  '/repos/frontend',
  '/repos/infra'
];

const client = new AtlasGateClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Single session, multiple workspaces
const session = await client.createSession({
  workspaceRoot: repos[0]
});

for (const repo of repos) {
  await client.updateSessionWorkspace(repo);
  
  // Perform operations
  const plans = await client.listPlans();
  console.log(`Plans in ${repo}:`, plans.length);
}
```

## API Endpoints Reference

### Authentication

All endpoints except `/health` and `/tenants/create` require:
```
X-API-Key: your-api-key-here
```

### Health & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server status |
| POST | `/tenants/create` | Create new tenant (admin) |
| GET | `/tenants` | List all tenants (admin) |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions/create` | Create new session |
| GET | `/sessions/{sessionId}` | Get session details |
| PUT | `/sessions/{sessionId}` | Update workspace root |
| GET | `/sessions/list` | List all tenant sessions |

### Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tools/{toolName}?sessionId={id}` | Call MCP tool |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit/log` | Read audit log (filters: `?tool=X&role=Y&sessionId=Z`) |

## Security Considerations

### API Key Management

```bash
# Generate secure API key
openssl rand -hex 32

# Store in environment
export ATLAS_GATE_API_KEY="your-api-key-here"

# Or use .env file (git-ignored)
echo "ATLAS_GATE_API_KEY=your-api-key-here" > .env.local
```

### HTTPS in Production

```bash
# Use a reverse proxy (nginx) with SSL
# Or use environment variable for cert paths
ATLAS_GATE_CERT=/etc/ssl/certs/server.crt \
ATLAS_GATE_KEY=/etc/ssl/private/server.key \
node bin/ATLAS-GATE-HTTP.js --port 443
```

### Tenant Isolation

- Each tenant's audit logs are separate
- Workspace roots are validated before use
- No cross-tenant data leakage possible
- Sessions are tied to specific tenants

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV ATLAS_GATE_HOST=0.0.0.0
ENV ATLAS_GATE_PORT=3000

EXPOSE 3000

CMD ["node", "bin/ATLAS-GATE-HTTP.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  atlas-gate:
    build: .
    ports:
      - "3000:3000"
    environment:
      ATLAS_GATE_HOST: 0.0.0.0
      ATLAS_GATE_PORT: 3000
      ATLAS_GATE_ENV: production
    volumes:
      - /var/repos:/repositories:ro  # Mount repos for access
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### Run

```bash
docker-compose up -d
```

## Kubernetes Deployment

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlas-gate
spec:
  replicas: 3
  selector:
    matchLabels:
      app: atlas-gate
  template:
    metadata:
      labels:
        app: atlas-gate
    spec:
      containers:
      - name: atlas-gate
        image: atlas-gate:latest
        ports:
        - containerPort: 3000
        env:
        - name: ATLAS_GATE_HOST
          value: "0.0.0.0"
        - name: ATLAS_GATE_PORT
          value: "3000"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: atlas-gate-service
spec:
  type: ClusterIP
  selector:
    app: atlas-gate
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
```

### Deploy

```bash
kubectl apply -f k8s-deployment.yaml
kubectl port-forward service/atlas-gate-service 3000:3000
```

## Monitoring & Observability

### Health Checks

```bash
curl http://localhost:3000/health
```

### Audit Log Analysis

```bash
# Get all failed operations
curl -X GET "http://localhost:3000/audit/log?result=error" \
  -H "X-API-Key: your-api-key"

# Get operations by tool
curl -X GET "http://localhost:3000/audit/log?tool=write_file" \
  -H "X-API-Key: your-api-key"

# Get operations by role
curl -X GET "http://localhost:3000/audit/log?role=WINDSURF" \
  -H "X-API-Key: your-api-key"
```

### Metrics (Future)

The server can be extended to expose Prometheus metrics:
- Tenant count
- Active sessions
- Tool call counts
- Error rates
- Audit log size

## Troubleshooting

### Session Not Found

```
[ERROR] Session abc123 not found for tenant tenant_xyz
```

**Solution:** Create a session first with `/sessions/create`

### Invalid API Key

```
[ERROR] Invalid API key
```

**Solution:** Check that X-API-Key header matches tenant's API key

### Workspace Root Does Not Exist

```
[ERROR] Workspace root does not exist: /path/to/repo
```

**Solution:** Use an absolute path that exists on the server filesystem

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Use different port: `--port 3001` or kill existing process

## Migration from Stdio MCP

If migrating from stdio-based MCP connections:

1. **Keep existing MCP infrastructure** - stdio mode still works
2. **Run HTTP server alongside** - no conflicts
3. **Gradually migrate clients** - use Client SDK instead of stdio
4. **Decommission stdio** - once all clients migrated

## Next Steps

- [ ] Wire up MCP tool handlers to HTTP API
- [ ] Add persistent database for tenant/session storage
- [ ] Implement WebSocket support for real-time updates
- [ ] Add rate limiting and quota management
- [ ] Implement API key rotation mechanism
- [ ] Add detailed metrics/monitoring endpoints
- [ ] Create Admin dashboard for tenant management

## See Also

- [Architecture: AGENTS.md](./AGENTS.md)
- [MCP Sandbox Enforcement: MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md)
- [Security: SECURITY.md](./SECURITY.md)
