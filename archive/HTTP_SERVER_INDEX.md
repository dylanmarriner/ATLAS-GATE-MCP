# ATLAS-GATE HTTP Server - Documentation Index

All documentation for the multi-tenant HTTP/REST API deployment.

## Quick Navigation

**I want to...**

- **Get started in 5 minutes** → [HTTP_QUICK_START.md](./HTTP_QUICK_START.md)
- **Understand the architecture** → [HTTP_SERVER_SUMMARY.md](./HTTP_SERVER_SUMMARY.md)
- **Deploy to production** → [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md)
- **Check deployment readiness** → [DEPLOYMENT_CHECKLIST_HTTP.md](./DEPLOYMENT_CHECKLIST_HTTP.md)
- **Learn the API** → [api/README.md](./api/README.md)
- **See code examples** → [examples/README.md](./examples/README.md)

## Documentation Map

### Getting Started

| Document | Purpose | Audience | Time |
|----------|---------|----------|------|
| [HTTP_QUICK_START.md](./HTTP_QUICK_START.md) | 5-minute quickstart | Developers | 5 min |
| [HTTP_SERVER_SUMMARY.md](./HTTP_SERVER_SUMMARY.md) | Complete overview | Everyone | 10 min |
| [api/README.md](./api/README.md) | API architecture | Developers | 5 min |
| [examples/README.md](./examples/README.md) | Example usage | Developers | 5 min |

### Deployment

| Document | Purpose | Audience | Time |
|----------|---------|----------|------|
| [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md) | Full deployment guide | DevOps/Engineers | 30 min |
| [DEPLOYMENT_CHECKLIST_HTTP.md](./DEPLOYMENT_CHECKLIST_HTTP.md) | Production readiness | DevOps/QA | 20 min |

### Code & Examples

| File | Purpose | LOC |
|------|---------|-----|
| [core/multi-tenant-manager.js](./core/multi-tenant-manager.js) | Tenant isolation | 300 |
| [api/http-server.js](./api/http-server.js) | HTTP API router | 400 |
| [api/client-sdk.js](./api/client-sdk.js) | JavaScript client | 280 |
| [bin/ATLAS-GATE-HTTP.js](./bin/ATLAS-GATE-HTTP.js) | Server entrypoint | 80 |
| [examples/multi-tenant-client.js](./examples/multi-tenant-client.js) | Usage demo | 150 |

## Common Tasks

### Task: Run ATLAS-GATE Locally

**Time:** 2 minutes

1. `npm install`
2. `npm run start:http`
3. Copy API key from output
4. Test: `curl http://localhost:3000/health`

See: [HTTP_QUICK_START.md](./HTTP_QUICK_START.md#step-1-start-the-server)

### Task: Create a Session & Call Tools

**Time:** 5 minutes

1. Create session: `POST /sessions/create`
2. Read file: `POST /tools/read_file?sessionId=...`
3. List plans: `POST /tools/list_plans?sessionId=...`
4. Switch workspace: `PUT /sessions/{id}`

See: [HTTP_QUICK_START.md](./HTTP_QUICK_START.md#step-2-create-a-session-in-another-terminal)

### Task: Use the Client SDK

**Time:** 5 minutes

```javascript
const client = new AtlasGateClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-key'
});

const session = await client.createSession({
  workspaceRoot: '/path/to/repo'
});

const content = await client.readFile('package.json');
```

See: [examples/multi-tenant-client.js](./examples/multi-tenant-client.js)

### Task: Deploy to Docker

**Time:** 10 minutes

1. `docker build -t atlas-gate:latest .`
2. `docker run -p 3000:3000 atlas-gate:latest`
3. Or: `docker-compose up -d`

See: [MULTI_TENANT_DEPLOYMENT.md - Docker Deployment](./MULTI_TENANT_DEPLOYMENT.md#docker-deployment)

### Task: Deploy to Kubernetes

**Time:** 20 minutes

1. `kubectl apply -f k8s-deployment.yaml`
2. `kubectl port-forward service/atlas-gate-service 3000:3000`
3. Verify: `curl http://localhost:3000/health`

See: [MULTI_TENANT_DEPLOYMENT.md - Kubernetes Deployment](./MULTI_TENANT_DEPLOYMENT.md#kubernetes-deployment)

### Task: Understand Multi-Tenancy

**Time:** 10 minutes

The HTTP server isolates tenants by API key:

```
API Key A (Tenant A)          API Key B (Tenant B)
    ↓                              ↓
[Session A1] [Session A2]    [Session B1] [Session B2]
    ↓                              ↓
[Audit Log A]                 [Audit Log B]
    ↓                              ↓
[Repos]                       [Repos]
```

See: [MULTI_TENANT_DEPLOYMENT.md - Multi-Tenancy Model](./MULTI_TENANT_DEPLOYMENT.md#multi-tenancy-model)

### Task: Switch Workspaces Dynamically

**Time:** 5 minutes

Create one session, use it for multiple repos:

```javascript
// Create session for Repo A
await client.createSession({ workspaceRoot: '/repos/a' });

// Later, switch to Repo B
await client.updateSessionWorkspace('/repos/b');

// Tool calls now operate on Repo B
```

See: [MULTI_TENANT_DEPLOYMENT.md - Dynamic Workspace Adjustment](./MULTI_TENANT_DEPLOYMENT.md#dynamic-workspace-adjustment)

### Task: Query Audit Logs

**Time:** 5 minutes

```bash
# All entries
curl http://localhost:3000/audit/log?sessionId=...

# By tool
curl "http://localhost:3000/audit/log?tool=read_file"

# By role
curl "http://localhost:3000/audit/log?role=WINDSURF"
```

See: [MULTI_TENANT_DEPLOYMENT.md - API Endpoints Reference](./MULTI_TENANT_DEPLOYMENT.md#api-endpoints-reference)

### Task: Prepare for Production

**Time:** 2-3 hours

Follow the deployment checklist step by step.

See: [DEPLOYMENT_CHECKLIST_HTTP.md](./DEPLOYMENT_CHECKLIST_HTTP.md)

## Architecture Diagram

```
┌────────────────────────────────────────┐
│     Client Applications                 │
│  (CLI, CI/CD, Dashboards, etc.)        │
└────────────────────────────────────────┘
                    │
                    │ HTTP Requests
                    │ X-API-Key header
                    ↓
    ┌───────────────────────────────┐
    │   ATLAS-GATE HTTP Server      │
    │   (Port 3000)                 │
    │                               │
    │  ┌─────────────────────────┐  │
    │  │ Authentication          │  │
    │  │ (Verify API Key)        │  │
    │  └─────────────────────────┘  │
    │           ↓                    │
    │  ┌─────────────────────────┐  │
    │  │ Tenant Manager          │  │
    │  │ (Isolate by API Key)    │  │
    │  └─────────────────────────┘  │
    │           ↓                    │
    │  ┌─────────────────────────┐  │
    │  │ Session Manager         │  │
    │  │ (Route to workspace)    │  │
    │  └─────────────────────────┘  │
    │           ↓                    │
    │  ┌─────────────────────────┐  │
    │  │ Tool Dispatcher         │  │
    │  │ (Call MCP Tools)        │  │
    │  └─────────────────────────┘  │
    │           ↓                    │
    │  ┌─────────────────────────┐  │
    │  │ Audit Logger            │  │
    │  │ (Record operation)      │  │
    │  └─────────────────────────┘  │
    └───────────────────────────────┘
                    │
                    ↓
    ┌───────────────────────────────┐
    │ Workspace Filesystem          │
    │ (Repos on Server)             │
    └───────────────────────────────┘
```

## Key Concepts

### Tenant

- Identified by API key
- Has isolated sessions & audit logs
- Can create & manage multiple sessions
- Examples: Team A, Team B, CI/CD system

### Session

- Created per workspace/repo
- Isolated within tenant
- Has workspace root path
- Can switch workspace at runtime
- Multiple sessions per tenant

### Tool Call

- Request to run an MCP tool
- Routed through tenant/session context
- Automatically audited
- Returns result or error

### Workspace Root

- Absolute path to repository
- Set when creating session
- Can be changed with `PUT /sessions/{id}`
- Used for all file operations

### Audit Trail

- Per-tenant append-only log
- Records every operation
- Includes tool, result, timestamp
- Queryable by session/tool/role

## API Quick Reference

### Endpoints (All Authenticated)

```
POST   /sessions/create              Create new session
GET    /sessions/{id}                Get session details
PUT    /sessions/{id}                Update workspace
GET    /sessions/list                List sessions
POST   /tools/{tool}                 Call MCP tool
GET    /audit/log                    Read audit log
GET    /health                       Server health
POST   /tenants/create               Create tenant (admin)
GET    /tenants                      List tenants (admin)
```

### Headers

```
X-API-Key: your-32-byte-api-key    (Required, except /health)
Content-Type: application/json      (For POST/PUT requests)
```

### Response Format

Success:

```json
{
  "sessionId": "session_...",
  "result": { ... }
}
```

Error:

```json
{
  "error_code": "INVALID_PATH",
  "message": "Workspace root does not exist",
  "details": { ... }
}
```

## Environment Variables

```bash
ATLAS_GATE_PORT=3000          # Server port
ATLAS_GATE_HOST=localhost     # Server host
ATLAS_GATE_URL=...            # Client: server URL
ATLAS_GATE_API_KEY=...        # Client: API key
PROJECT_ROOT=...              # Client: workspace path
DEBUG=true                     # Verbose logging
```

## Files Organization

```
ATLAS-GATE-MCP/
├── api/                           # HTTP API layer
│   ├── http-server.js             # Router & dispatcher
│   ├── client-sdk.js              # JavaScript client
│   └── README.md                  # API docs
├── core/
│   └── multi-tenant-manager.js    # Tenant isolation
├── bin/
│   └── ATLAS-GATE-HTTP.js         # Server entrypoint
├── examples/
│   ├── multi-tenant-client.js     # Usage examples
│   └── README.md                  # Examples guide
├── HTTP_QUICK_START.md            # 5-min quickstart
├── MULTI_TENANT_DEPLOYMENT.md     # Full deployment
├── DEPLOYMENT_CHECKLIST_HTTP.md   # Production checklist
├── HTTP_SERVER_SUMMARY.md         # Complete overview
├── HTTP_SERVER_INDEX.md           # This file
├── package.json                   # Updated with npm scripts
└── ... (existing ATLAS-GATE files)
```

## External Resources

- [Node.js HTTP API Best Practices](https://nodejs.org/en/docs/guides/nodejs-web-app/)
- [REST API Design Guidelines](https://restfulapi.net/)
- [Multi-Tenant SaaS Architecture](https://www.okta.com/blog/2017/08/multi-tenant-vs-single-tenant/)
- [Docker Deployment](https://docs.docker.com/engine/containers/start-containers/)
- [Kubernetes Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

## Support Channels

1. **Quick questions?** → Check HTTP_QUICK_START.md
2. **How do I...?** → Search this index
3. **Deployment issues?** → See DEPLOYMENT_CHECKLIST_HTTP.md
4. **API details?** → See api/README.md
5. **Code examples?** → See examples/README.md

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Feb 2024 | Initial HTTP server implementation |

## Next Steps

1. ✓ Read [HTTP_QUICK_START.md](./HTTP_QUICK_START.md) (5 min)
2. ✓ Run `npm run start:http` and test locally
3. ✓ Review [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md)
4. ✓ Plan production deployment
5. ✓ Follow [DEPLOYMENT_CHECKLIST_HTTP.md](./DEPLOYMENT_CHECKLIST_HTTP.md)

---

**Last Updated:** February 14, 2024  
**Status:** Ready for Development & Testing  
**Maintainer:** Dylan Marriner
