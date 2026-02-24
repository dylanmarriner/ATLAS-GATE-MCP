# ATLAS-GATE-MCP Kubernetes Client Configuration

## Quick Start

### 1. Deploy to Hetzner

```bash
chmod +x deploy.sh
./deploy.sh 49.12.230.179 /home/kubuntux/Downloads/.ssh/id_rsa
```

This will:
- Install k3s (Kubernetes)
- Deploy PostgreSQL, Redis, nginx ingress
- Deploy MCP server
- Set up persistent volumes for data

### 2. Get Kubeconfig Locally

```bash
# SSH into server and get kubeconfig
ssh -i /home/kubuntux/Downloads/.ssh/id_rsa root@49.12.230.179
cat /etc/rancher/k3s/k3s.yaml

# Copy to your machine
scp -i /home/kubuntux/Downloads/.ssh/id_rsa \
  root@49.12.230.179:/etc/rancher/k3s/k3s.yaml \
  ~/.kube/config-atlas

# Fix server IP
sed -i 's/127.0.0.1/49.12.230.179/' ~/.kube/config-atlas

# Set it as active
export KUBECONFIG=~/.kube/config-atlas
kubectl get nodes  # Verify it works
```

### 3. Access Kubernetes Dashboard (Optional)

```bash
# Install dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create admin user
kubectl apply -f - << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# Get token
kubectl -n kubernetes-dashboard create token admin-user

# Port forward
kubectl proxy

# Access at: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

---

## Connect Windsurf to Cloud MCP

### Option A: Local Port Forward (Development)

```bash
# Terminal 1: Forward port
kubectl port-forward -n atlas-gate svc/mcp-server 3000:3000

# Terminal 2: Update Windsurf config
# Modify your Windsurf MCP configuration to point to:
# http://localhost:3000/mcp
```

### Option B: Direct Network Access (Production)

```bash
# Get the Kubernetes ClusterIP
kubectl get svc -n atlas-gate mcp-server

# Access via: http://49.12.230.179:3000
# (Requires NodePort or Ingress exposure)
```

### Option C: Expose via Ingress (Recommended)

```bash
# Create NodePort service
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-nodeport
  namespace: atlas-gate
spec:
  type: NodePort
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30000
  selector:
    app: mcp-server
EOF

# Access via: http://49.12.230.179:30000/mcp
```

---

## Windsurf Configuration

Update your Windsurf `.mcp.json` config file:

```json
{
  "mcpServers": {
    "atlas-gate": {
      "type": "http",
      "url": "http://49.12.230.179:30000",
      "retryPolicy": {
        "maxRetries": 3,
        "initialDelayMs": 1000,
        "maxDelayMs": 10000
      },
      "auth": {
        "type": "none"
      }
    }
  }
}
```

Or if using local port forward:

```json
{
  "mcpServers": {
    "atlas-gate": {
      "type": "http",
      "url": "http://localhost:3000",
      "retryPolicy": {
        "maxRetries": 3,
        "initialDelayMs": 1000,
        "maxDelayMs": 10000
      },
      "auth": {
        "type": "none"
      }
    }
  }
}
```

---

## Monitoring & Management

### Check Pod Status

```bash
# List all pods
kubectl get pods -n atlas-gate

# Describe a pod
kubectl describe pod <pod-name> -n atlas-gate

# View logs
kubectl logs -n atlas-gate -l app=mcp-server -f

# Watch real-time status
kubectl get pods -n atlas-gate -w
```

### Check Service Health

```bash
# Test health endpoint directly
kubectl port-forward -n atlas-gate svc/mcp-server 3000:3000 &
curl http://localhost:3000/health

# Check metrics
curl http://localhost:3000/metrics

# View service details
kubectl get svc -n atlas-gate -o wide
```

### Database Access

```bash
# Connect to PostgreSQL directly
kubectl exec -it -n atlas-gate deployment/postgres -- \
  psql -U atlas_user -d atlas_gate

# Run queries
SELECT COUNT(*) FROM audit_log;
SELECT * FROM sessions;
```

### Redis Access

```bash
# Connect to Redis directly
kubectl exec -it -n atlas-gate deployment/redis -- \
  redis-cli

# Check keys
DBSIZE
KEYS *
```

---

## Scaling & Updates

### Scale MCP Server Replicas

```bash
# Scale to 2 replicas
kubectl scale deployment mcp-server --replicas=2 -n atlas-gate

# Verify
kubectl get pods -n atlas-gate -l app=mcp-server
```

### Update MCP Server Image

```bash
# Build new image (locally or in CI/CD)
docker build -t atlas-gate-mcp:v2 .

# Push to registry
docker push your-registry/atlas-gate-mcp:v2

# Update deployment
kubectl set image deployment/mcp-server \
  mcp-server=your-registry/atlas-gate-mcp:v2 \
  -n atlas-gate

# Verify rollout
kubectl rollout status deployment/mcp-server -n atlas-gate
```

### Upgrade PostgreSQL

```bash
# Create backup
kubectl exec -n atlas-gate deployment/postgres -- \
  pg_dump -U atlas_user -d atlas_gate > backup.sql

# Update image in deployment
kubectl set image deployment/postgres \
  postgres=postgres:16-alpine \
  -n atlas-gate

# Verify
kubectl get pods -n atlas-gate -l app=postgres
```

---

## Persistent Data

### Verify Data Persistence

```bash
# Check PVCs
kubectl get pvc -n atlas-gate

# Check PVs
kubectl get pv

# Check disk usage on server
ssh root@49.12.230.179 "du -sh /mnt/atlas-data/*"
```

### Manual Backups

```bash
# PostgreSQL backup
kubectl exec -n atlas-gate deployment/postgres -- \
  pg_dump -U atlas_user -d atlas_gate | \
  gzip > atlas-backup-$(date +%Y%m%d).sql.gz

# Copy from server
scp -i /path/to/ssh/key \
  root@49.12.230.179:/mnt/atlas-data/postgres \
  ./backups/postgres-backup/

# Redis backup
kubectl exec -n atlas-gate deployment/redis -- \
  redis-cli BGSAVE

scp -r -i /path/to/ssh/key \
  root@49.12.230.179:/mnt/atlas-data/redis \
  ./backups/redis-backup/
```

---

## Troubleshooting

### Pod Stuck in Pending

```bash
# Check events
kubectl describe pod <pod-name> -n atlas-gate

# Check node resources
kubectl top nodes

# Check available storage
kubectl get pv

# Common fix: increase node resources or reduce resource limits
```

### Connection Refused

```bash
# Verify service is running
kubectl get svc -n atlas-gate

# Check endpoints
kubectl get endpoints -n atlas-gate mcp-server

# Test connectivity within cluster
kubectl run -it --rm debug --image=busybox -- \
  wget http://mcp-server:3000/health
```

### Database Connection Issues

```bash
# Check postgres pod logs
kubectl logs -n atlas-gate deployment/postgres

# Verify service DNS
kubectl run -it --rm debug --image=busybox -- \
  nslookup postgres.atlas-gate.svc.cluster.local

# Check credentials in secret
kubectl get secret postgres-secret -n atlas-gate -o yaml
```

### Out of Disk Space

```bash
# Check usage
ssh root@49.12.230.179 "df -h"

# Check specific paths
ssh root@49.12.230.179 "du -sh /mnt/atlas-data/*"

# Clean up old audit logs
kubectl exec -n atlas-gate deployment/postgres -- \
  psql -U atlas_user -d atlas_gate \
  -c "DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '90 days';"
```

---

## Cleanup

### Delete All Resources

```bash
# Delete namespace (all resources inside)
kubectl delete namespace atlas-gate

# Delete PVs (persistent data)
kubectl delete pv postgres-pv redis-pv workspace-pv

# SSH and remove data directories
ssh root@49.12.230.179 "rm -rf /mnt/atlas-data"
```

### Uninstall k3s

```bash
ssh root@49.12.230.179 "/usr/local/bin/k3s-uninstall.sh"
```

---

## Network Diagram

```
Your Computer (Windsurf)
        |
        | HTTP request
        | http://49.12.230.179:30000/mcp
        |
        v
Hetzner Server (49.12.230.179)
        |
        +---> k3s Cluster
        |     |
        |     +---> MCP Server (Pod)
        |           |
        |           +---> PostgreSQL (Pod)
        |           |
        |           +---> Redis (Pod)
        |
        +---> Persistent Storage (/mnt/atlas-data)
              |
              +---> /postgres (20GB)
              |
              +---> /redis (5GB)
              |
              +---> /workspace (5GB)
```

---

## Performance Tips

### Resource Limits

The deployment includes:
- **MCP Server**: 512Mi request, 1Gi limit
- **PostgreSQL**: No limits set (adjust as needed)
- **Redis**: No limits set (adjust as needed)

To modify:

```bash
kubectl set resources deployment mcp-server \
  --requests=memory=1Gi,cpu=1 \
  --limits=memory=2Gi,cpu=2 \
  -n atlas-gate
```

### Database Optimization

```bash
# Analyze tables
kubectl exec -n atlas-gate deployment/postgres -- \
  psql -U atlas_user -d atlas_gate -c "ANALYZE;"

# Check table sizes
kubectl exec -n atlas-gate deployment/postgres -- \
  psql -U atlas_user -d atlas_gate \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Redis Optimization

```bash
# Check memory usage
kubectl exec -n atlas-gate deployment/redis -- \
  redis-cli INFO memory

# Monitor commands
kubectl exec -n atlas-gate deployment/redis -- \
  redis-cli MONITOR
```

---

## API Endpoints

Once deployed, access:

- **Health**: `http://49.12.230.179:30000/health`
- **MCP API**: `http://49.12.230.179:30000/mcp`
- **Metrics**: `http://49.12.230.179:30000/metrics` (Prometheus format)
- **Audit Export**: `http://49.12.230.179:30000/audit/export?limit=100`

---

## Support & Documentation

- **Kubernetes**: https://kubernetes.io/docs/
- **k3s**: https://docs.k3s.io/
- **kubectl**: https://kubernetes.io/docs/reference/kubectl/
- **Hetzner**: https://docs.hetzner.cloud/
