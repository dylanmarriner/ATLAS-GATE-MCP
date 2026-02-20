# ATLAS-GATE Deployment - Quick Start

Complete one-command deployment to your server with Windsurf & Antigravity integration.

## 🚀 One-Command Deployment

### To Docker (Recommended for Single Server)

```bash
cd /path/to/ATLAS-GATE-MCP
./deploy.sh docker --server 100.93.214.100
```

**What happens:**
1. Builds Docker image
2. Starts HTTP server (port 3000)
3. Generates API key
4. Shows credentials file

**Output:**
```
Deployment Complete!
═══════════════════════════════════════════════════════════════
Server URL:     http://100.93.214.100:3000
API Key:        5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c

Next steps:
  1. View logs: docker-compose logs -f atlas-gate
  2. Create session: curl -X POST http://100.93.214.100:3000/sessions/create ...
```

### To Kubernetes (Recommended for Production)

```bash
cd /path/to/ATLAS-GATE-MCP
./deploy.sh kubernetes --domain atlas-gate.example.com --registry your-registry.com
```

**What happens:**
1. Builds Docker image & pushes to registry
2. Creates Kubernetes namespace
3. Deploys 3 replicas with auto-scaling
4. Sets up HTTPS & ingress
5. Creates secrets

**Output:**
```
Kubernetes Deployment Complete!
═══════════════════════════════════════════════════════════════
Service URL: http://atlas-gate-service.atlas-gate.svc.cluster.local:3000
External:    https://atlas-gate.example.com
API Key:     5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c
```

## 📋 Deployment Options

### Option 1: Docker (Easiest)

```bash
./deploy.sh docker
```

**Pros:**
- Single command
- Works on any Linux server
- Fast startup
- Easy to manage

**Cons:**
- Requires Docker/Docker Compose
- Limited to single server
- No built-in auto-scaling

### Option 2: Kubernetes (Enterprise)

```bash
./deploy.sh kubernetes --registry gcr.io/my-project
```

**Pros:**
- Multi-server
- Auto-scaling
- Self-healing
- Industry standard

**Cons:**
- More complex
- Requires K8s cluster
- Higher resource overhead

### Option 3: Manual (Debug Only)

```bash
npm install
npm run start:http -- --host 0.0.0.0 --port 3000
```

## 📝 What Gets Deployed

### Files Created

```
Server Side:
├── Docker image built: atlas-gate:latest
├── Volumes created:
│   ├── atlas-gate-data (for API keys, plans, audit logs)
│   └── atlas-gate-logs (for server logs)
├── Configuration:
│   ├── .env (environment variables)
│   └── docker-compose.yml (Docker Compose setup)
└── Credentials saved:
    └── .atlas-gate-creds (API key & server URL)

On Kubernetes:
├── Namespace: atlas-gate
├── Deployment: atlas-gate (3 replicas)
├── Services:
│   ├── atlas-gate-service (internal)
│   └── atlas-gate-lb (external LoadBalancer)
├── Persistent Volume: atlas-gate-pv
├── Ingress: atlas-gate-ingress (HTTPS)
├── ConfigMap: atlas-gate-config
└── Secret: atlas-gate-secrets (API key)
```

## 🔑 Get Your API Key

After deployment, your API key is in the output. Save it:

```bash
# View credentials file
cat .atlas-gate-creds

# Or check logs
docker-compose logs atlas-gate 2>&1 | grep "API Key"
```

## ✅ Verify Deployment

Test that everything is working:

```bash
# Docker
curl http://100.93.214.100:3000/health

# Kubernetes (with port-forward)
kubectl port-forward -n atlas-gate svc/atlas-gate-service 3000:3000
curl http://localhost:3000/health
```

**Success response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2024-02-14T10:00:00Z",
  "tenantCount": 1
}
```

## 🔌 Connect Windsurf

### Quick Setup (2 minutes)

1. **Get credentials**
   ```bash
   source .atlas-gate-creds
   echo $ATLAS_GATE_API_KEY
   echo $ATLAS_GATE_URL
   ```

2. **Update Windsurf config**
   
   Edit: `~/.windsurf/settings.json`
   
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

3. **Test in Windsurf**
   
   Command Palette: `MCP: Reload MCP Servers`
   
   Then: `@atlas-gate read_file package.json`

See: [WINDSURF_HTTP_INTEGRATION.md](./WINDSURF_HTTP_INTEGRATION.md)

## 🎯 Connect Antigravity

### Quick Setup (2 minutes)

1. **Set environment variables**
   ```bash
   source .atlas-gate-creds
   
   export ATLAS_GATE_URL
   export ATLAS_GATE_API_KEY
   export ATLAS_GATE_WORKSPACE="/path/to/repo"
   export ATLAS_GATE_ROLE="ANTIGRAVITY"
   ```

2. **Create session**
   ```bash
   antigravity session create --name my-project
   ```

3. **Create plan**
   ```bash
   antigravity plan bootstrap --intent "Set up governance"
   ```

4. **Monitor execution**
   ```bash
   antigravity audit view
   ```

See: [ANTIGRAVITY_HTTP_INTEGRATION.md](./ANTIGRAVITY_HTTP_INTEGRATION.md)

## 🚢 After Deployment

### 1. Secure the Server

```bash
# Docker
docker-compose logs atlas-gate  # Check for errors

# Kubernetes
kubectl get pods -n atlas-gate  # Check all pods running
kubectl logs -n atlas-gate -f deployment/atlas-gate  # Stream logs
```

### 2. Create Production Tenant

Instead of using default tenant, create a production one:

```bash
curl -X POST http://100.93.214.100:3000/tenants/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "config": {
      "maxSessions": 100,
      "allowedRoles": ["WINDSURF", "ANTIGRAVITY"]
    }
  }'
```

### 3. Setup HTTPS (Production Only)

```bash
# For Docker, use Nginx reverse proxy (included in compose)
# Edit docker-compose.yml to enable nginx service
# Provide SSL certificates in ./certs/

# For Kubernetes
# Install cert-manager and configure Let's Encrypt
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 4. Enable Monitoring

```bash
# Docker - check logs
docker-compose logs -f

# Kubernetes - setup Prometheus (optional)
kubectl apply -f https://prometheus-operator-helmchart...
```

## 🐛 Troubleshooting

### Docker Won't Start

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs atlas-gate

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Can't Connect to Server

```bash
# Check server is listening
netstat -tlnp | grep 3000

# Check firewall
sudo ufw allow 3000

# Test connection
curl -v http://100.93.214.100:3000/health
```

### API Key Not Working

```bash
# View logs to get key
docker logs atlas-gate-http 2>&1 | grep -i "api key"

# Create new tenant
curl -X POST http://100.93.214.100:3000/tenants/create \
  -H "Content-Type: application/json" \
  -d '{"name": "new-tenant"}'
```

## 📚 Full Documentation

- **HTTP Server Setup:** [HTTP_QUICK_START.md](./HTTP_QUICK_START.md)
- **Windsurf Integration:** [WINDSURF_HTTP_INTEGRATION.md](./WINDSURF_HTTP_INTEGRATION.md)
- **Antigravity Integration:** [ANTIGRAVITY_HTTP_INTEGRATION.md](./ANTIGRAVITY_HTTP_INTEGRATION.md)
- **Production Deployment:** [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md)
- **Production Checklist:** [DEPLOYMENT_CHECKLIST_HTTP.md](./DEPLOYMENT_CHECKLIST_HTTP.md)

## 💡 Common Commands

```bash
# View server status
docker-compose ps              # Docker
kubectl get pods -n atlas-gate # Kubernetes

# View logs
docker-compose logs -f atlas-gate
kubectl logs -n atlas-gate -f deployment/atlas-gate

# Create session
curl -X POST http://100.93.214.100:3000/sessions/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspaceRoot": "/path/to/repo"}'

# List plans
curl -X POST "http://100.93.214.100:3000/tools/list_plans?sessionId=$SESSION_ID" \
  -H "X-API-Key: $API_KEY" \
  -d '{}'

# View audit log
curl http://100.93.214.100:3000/audit/log \
  -H "X-API-Key: $API_KEY" | jq .

# Stop server
docker-compose down             # Docker
kubectl delete namespace atlas-gate # Kubernetes
```

## 🎉 You're Done!

Your ATLAS-GATE HTTP server is now running and connected to Windsurf & Antigravity.

**Next:**
1. Create some plans in Antigravity
2. Use Windsurf to implement them
3. Monitor with audit logs
4. Iterate!

---

**Version:** 2.0.0 (HTTP)  
**Deployment Date:** [Auto-filled at deployment]  
**API Key Saved:** `.atlas-gate-creds`
