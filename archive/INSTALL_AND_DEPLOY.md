# ATLAS-GATE - One-Command Installation & Deployment

The updated `deploy.sh` now **automatically installs** Docker and Kubernetes if they're missing.

## 🚀 Quickest Path to Running Server (1 Command)

```bash
# SSH to your server
ssh root@100.93.214.100

# Clone the repo
cd /opt
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP

# Deploy everything (auto-installs Docker, creates server)
sudo ./deploy.sh docker
```

**That's it!** The script will:
1. ✓ Detect your OS (Ubuntu, Debian, CentOS, etc.)
2. ✓ Install Docker if missing
3. ✓ Install Docker Compose if missing
4. ✓ Build the container image
5. ✓ Start the server
6. ✓ Generate API key
7. ✓ Show you how to connect

Output will be:
```
Server URL:     http://100.93.214.100:3000
API Key:        5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c

Next steps:
  1. Create a session: curl -X POST http://100.93.214.100:3000/sessions/create ...
  2. View logs: docker-compose logs -f atlas-gate
  3. Stop server: docker-compose down
```

## 🎛️ Options

### Deploy with Docker (Single Server, Easiest)

```bash
sudo ./deploy.sh docker --server 100.93.214.100
```

**Auto-installs:**
- Docker
- Docker Compose
- Builds image
- Starts server at port 3000

### Deploy with Kubernetes (Production, Auto-Scaling)

```bash
sudo ./deploy.sh kubernetes --domain atlas-gate.example.com
```

**Auto-installs:**
- kubectl
- kind (Kubernetes in Docker)
- Creates 3-node cluster
- Installs Nginx Ingress
- Deploys with auto-scaling (3-10 replicas)

### Deploy to Existing Kubernetes Cluster

```bash
sudo ./deploy.sh kubernetes --domain atlas-gate.example.com --registry gcr.io/my-project
```

**Uses existing cluster and pushes to your registry**

## 📋 What Gets Auto-Installed

### For Docker Mode
- **Docker Engine** - Container runtime
- **Docker Compose** - Multi-container orchestration
- Detects and supports: Ubuntu, Debian, CentOS, RHEL, Fedora, Alpine

### For Kubernetes Mode
- **kubectl** - Kubernetes CLI
- **kind** - Kubernetes in Docker (creates local cluster)
- **nginx-ingress** - For HTTPS/routing
- Auto-creates 3-node cluster if needed

## ⚙️ System Requirements

- **OS**: Linux (Ubuntu, Debian, CentOS, RHEL, Fedora, Alpine)
- **User**: Must run as `root` or with `sudo`
- **RAM**: At least 2GB
- **Disk**: At least 5GB free
- **Internet**: To download packages

## ✅ Verify It Works

After deployment, test:

```bash
# Check health
curl http://100.93.214.100:3000/health

# Expected response
{
  "status": "healthy",
  "version": "2.0.0",
  "tenantCount": 1
}
```

## 🔧 Manage After Deployment

### Docker Commands

```bash
# View logs
docker-compose logs -f atlas-gate

# Stop server
docker-compose down

# Restart server
docker-compose up -d

# Check status
docker ps
docker stats
```

### Kubernetes Commands

```bash
# View pods
kubectl get pods -n atlas-gate

# View logs
kubectl logs -n atlas-gate -f deployment/atlas-gate

# Scale up
kubectl scale deployment atlas-gate -n atlas-gate --replicas=5

# Delete deployment
kubectl delete namespace atlas-gate
```

## 🔐 API Key Location

After deployment, find your credentials:

```bash
# View saved credentials
cat .atlas-gate-creds

# Or check logs (Docker)
docker logs atlas-gate-http 2>&1 | grep "API Key"

# Or check logs (Kubernetes)
kubectl logs -n atlas-gate deployment/atlas-gate | grep "API Key"
```

## 🆘 Troubleshooting

### Script Fails with Permission Denied

```bash
chmod +x deploy.sh
sudo ./deploy.sh docker
```

### Script Says Docker Not Found After Installation

```bash
# Restart your session or shell
exit
ssh root@100.93.214.100

# Try again
./deploy.sh docker
```

### Port Already in Use (3000)

```bash
# Stop existing container
docker-compose down

# Or change port
ATLAS_GATE_PORT=3001 ./deploy.sh docker
```

### Running Out of Disk Space

```bash
# Check disk
df -h

# Clean up Docker
docker system prune -a -f

# Then try again
./deploy.sh docker
```

## 📚 Next Steps

1. **Deploy**: `sudo ./deploy.sh docker`
2. **Verify**: `curl http://100.93.214.100:3000/health`
3. **Save credentials**: `cat .atlas-gate-creds`
4. **Connect Windsurf**: See [WINDSURF_HTTP_INTEGRATION.md](./WINDSURF_HTTP_INTEGRATION.md)
5. **Connect Antigravity**: See [ANTIGRAVITY_HTTP_INTEGRATION.md](./ANTIGRAVITY_HTTP_INTEGRATION.md)

## 🎯 Full Workflow

```bash
# 1. SSH to server
ssh root@100.93.214.100

# 2. Clone and deploy (auto-installs everything)
cd /opt
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
sudo ./deploy.sh docker

# 3. Save credentials
source .atlas-gate-creds
echo $ATLAS_GATE_API_KEY
echo $ATLAS_GATE_URL

# 4. Test
curl $ATLAS_GATE_URL/health

# 5. Create session
curl -X POST $ATLAS_GATE_URL/sessions/create \
  -H "X-API-Key: $ATLAS_GATE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspaceRoot": "/path/to/repo"}'

# Done! Server is running at http://100.93.214.100:3000
```

## 📊 What Gets Installed

### Docker Installation
```
- Docker Engine (~30MB)
- Docker Compose (~50MB)
- Plus dependencies
```

### Kubernetes Installation
```
- kubectl (~50MB)
- kind (~500MB)
- Kubernetes cluster (~2GB RAM when running)
```

## 🚨 Important Notes

- **API keys** are generated once and saved to `.atlas-gate-creds`
- **Credentials file** is git-ignored (safe)
- **Can be run multiple times** - safe to re-run
- **Idempotent** - won't reinstall if already present
- **Production-ready** - includes all security best practices

---

**Status**: Ready to deploy  
**Time to deploy**: ~5 minutes (Docker) or ~10 minutes (Kubernetes)  
**Difficulty**: Easy - one command!

Just run: `sudo ./deploy.sh docker`
