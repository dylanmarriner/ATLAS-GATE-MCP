# ATLAS-GATE-MCP Deployment Instructions

## TL;DR - Get Running in 5 Minutes

```bash
# 1. Make script executable
chmod +x deploy.sh

# 2. Run deployment (use your IP and SSH key path)
./deploy.sh 49.12.230.179 /home/kubuntux/Downloads/.ssh/id_rsa

# 3. Wait 2-3 minutes for everything to boot

# 4. Access at http://49.12.230.179:30000
# Health check: http://49.12.230.179:30000/health
```

Done. That's it.

---

## What the Script Does

```
./deploy.sh 49.12.230.179 /path/to/ssh/key
    |
    ├─ [1/6] SSH into server & install k3s
    |         (Kubernetes in 1 binary)
    |
    ├─ [2/6] Verify cluster is ready
    |
    ├─ [3/6] Install nginx ingress controller
    |
    ├─ [4/6] Create namespace + secrets
    |         (atlas-gate namespace)
    |
    ├─ [5/6] Deploy all services via kubectl
    |         - PostgreSQL (audit logs)
    |         - Redis (sessions)
    |         - MCP server
    |         - persistent volumes
    |
    └─ [6/6] Verify everything is running
             Print access info
```

---

## After Deployment

### Verify Everything Works

```bash
# SSH into server
ssh -i /path/to/key root@49.12.230.179

# Check pods
kubectl get pods -n atlas-gate

# Check services
kubectl get svc -n atlas-gate

# View logs
kubectl logs -n atlas-gate -l app=mcp-server -f

# Exit
exit
```

### Connect Your Client

#### Option 1: Port Forward (Local Testing)

```bash
# Terminal 1: SSH and forward
ssh -i /path/to/key -L 3000:localhost:3000 root@49.12.230.179

# Terminal 2: Use local connection
curl http://localhost:3000/health
```

#### Option 2: Direct Access (Production)

```bash
# Access directly from your computer
curl http://49.12.230.179:30000/health
```

#### Option 3: DNS + TLS (Advanced)

Point your domain to the server IP and configure ingress with SSL cert.

---

## File Structure

```
ATLAS-GATE-MCP/
├── deploy.sh                        ← Run this!
├── DEPLOY_INSTRUCTIONS.md           ← This file
├── KUBERNETES_CLIENT_CONFIG.md      ← Full k8s guide
├── bin/
│   └── server-network.js            ← HTTP server for cloud
├── docker-compose.yml               ← Local testing (optional)
└── ... other files
```

---

## Accessing Services

| Service | URL | Type |
|---------|-----|------|
| MCP API | http://49.12.230.179:30000/mcp | HTTP POST |
| Health | http://49.12.230.179:30000/health | HTTP GET |
| Metrics | http://49.12.230.179:30000/metrics | Prometheus |
| Audit | http://49.12.230.179:30000/audit/export | HTTP GET |

---

## Troubleshooting

### Script Fails at SSH

```bash
# Verify SSH key and IP
ssh -i /path/to/key root@49.12.230.179 "echo Connected"

# If it works, run deploy again
chmod +x deploy.sh
./deploy.sh 49.12.230.179 /path/to/key
```

### Pods Not Ready After 3 Minutes

```bash
ssh -i /path/to/key root@49.12.230.179

# Check what's stuck
kubectl get pods -n atlas-gate

# Describe stuck pod
kubectl describe pod <pod-name> -n atlas-gate

# Check logs
kubectl logs -n atlas-gate <pod-name>

exit
```

### Can't Connect After Deployment

```bash
# Verify service is exposed on NodePort
ssh -i /path/to/key root@49.12.230.179
kubectl get svc -n atlas-gate mcp-server-nodeport
exit

# Try direct HTTP
curl -v http://49.12.230.179:30000/health
```

### Out of Memory or Disk

```bash
ssh -i /path/to/key root@49.12.230.179

# Check resources
kubectl top nodes
kubectl top pods -n atlas-gate

# Check disk
df -h
du -sh /mnt/atlas-data/*

exit
```

---

## Environment Variables (Pre-configured)

The deployment script sets these automatically. To change them, edit the manifests in `deploy.sh`:

```
MCP_PORT=3000
MCP_BIND=0.0.0.0
MCP_ROLE=ANTIGRAVITY
DATABASE_URL=postgresql://atlas_user:atlas_password_secure_change_me@postgres:5432/atlas_gate
REDIS_URL=redis://redis:6379
WORKSPACE_ROOT=/workspace
NODE_ENV=production
AUDIT_BACKEND=postgres
SESSION_BACKEND=redis
```

**Note**: Change `atlas_password_secure_change_me` in production!

---

## Persistent Data Location

On the Hetzner server:

```
/mnt/atlas-data/
├── postgres/    (20GB - audit logs, plans, sessions)
├── redis/       (5GB - session cache)
└── workspace/   (5GB - workspace files)
```

These are mounted as Kubernetes PersistentVolumes and survive container restarts.

---

## Monitoring & Logs

### View MCP Logs

```bash
ssh -i /path/to/key root@49.12.230.179

# Follow logs in real-time
kubectl logs -n atlas-gate -l app=mcp-server -f

# View PostgreSQL logs
kubectl logs -n atlas-gate -l app=postgres -f

# View Redis logs
kubectl logs -n atlas-gate -l app=redis -f

exit
```

### Check Service Health

```bash
# From your computer
curl -v http://49.12.230.179:30000/health

# Response should be 200 OK with JSON:
# {
#   "status": "healthy",
#   "timestamp": "2024-02-04T...",
#   "uptime": 123.45,
#   "role": "ANTIGRAVITY",
#   "memory": {...},
#   "backends": {...}
# }
```

### Export Metrics

```bash
curl http://49.12.230.179:30000/metrics

# Prometheus-format output:
# mcp_uptime_seconds 3600
# mcp_memory_heapused_bytes 52428800
# ...
```

---

## Scaling Up

### Add More MCP Server Replicas

```bash
ssh -i /path/to/key root@49.12.230.179

# Scale to 2 replicas
kubectl scale deployment mcp-server --replicas=2 -n atlas-gate

# Verify
kubectl get pods -n atlas-gate

exit
```

### Increase Database Storage

The default is 20GB for PostgreSQL. To increase:

```bash
ssh -i /path/to/key root@49.12.230.179

# Edit the PVC
kubectl edit pvc postgres-pvc -n atlas-gate

# Change: storage: 20Gi → 50Gi

exit
```

---

## Uninstall

### Remove All Services

```bash
ssh -i /path/to/key root@49.12.230.179

# Delete the namespace (all services removed)
kubectl delete namespace atlas-gate

# Remove persistent volumes
kubectl delete pv postgres-pv redis-pv workspace-pv

# Remove data
rm -rf /mnt/atlas-data

# Optional: Uninstall k3s completely
/usr/local/bin/k3s-uninstall.sh

exit
```

---

## Next Steps

1. ✅ Run `./deploy.sh 49.12.230.179 /path/to/ssh/key`
2. Wait 2-3 minutes for pods to be ready
3. Test: `curl http://49.12.230.179:30000/health`
4. Read KUBERNETES_CLIENT_CONFIG.md for full options
5. Configure your Windsurf/Antigravity client to connect

---

## Quick Commands Reference

```bash
# Deploy
./deploy.sh 49.12.230.179 /path/to/key

# Check status
ssh root@49.12.230.179 'kubectl get pods -n atlas-gate'

# View logs
ssh root@49.12.230.179 'kubectl logs -n atlas-gate -l app=mcp-server -f'

# Test connection
curl http://49.12.230.179:30000/health

# Scale replicas
ssh root@49.12.230.179 'kubectl scale deployment mcp-server --replicas=2 -n atlas-gate'

# Uninstall
ssh root@49.12.230.179 'kubectl delete namespace atlas-gate'
```

---

Done. Run the script and you're up.
