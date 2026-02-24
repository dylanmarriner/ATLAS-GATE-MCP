# Deployment Checklist

## Phase 1: Local Testing (Day 1)

### Setup
- [ ] Install Docker & Docker Compose
- [ ] Clone repo: `git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git`
- [ ] Navigate to directory: `cd ATLAS-GATE-MCP`
- [ ] Read LOCAL_TESTING.md

### Verify Docker Environment
- [ ] `docker --version` (≥ 20.10)
- [ ] `docker-compose --version` (≥ 1.29)
- [ ] Docker daemon running
- [ ] No permission errors (user in docker group)

### Start Local Stack
- [ ] Run: `docker-compose up -d`
- [ ] Wait 30 seconds for services to boot
- [ ] Run: `docker-compose ps` (all services RUNNING)
- [ ] No error logs

### Verify Services
- [ ] Health: `curl http://localhost:3000/health` (200 OK)
- [ ] PostgreSQL accessible: `docker exec atlas-gate-postgres psql ...`
- [ ] Redis accessible: `docker exec atlas-gate-redis redis-cli PING`
- [ ] Audit log writable: check PostgreSQL `audit_log` table exists
- [ ] Sessions work: Redis `DBSIZE` > 0

### Test API
- [ ] POST to `/mcp` with begin_session works
- [ ] GET `/audit/export` returns data
- [ ] GET `/metrics` returns Prometheus format
- [ ] Failover works (kill one server, health still 200)

### Load Testing
- [ ] Install k6: `apt-get install k6`
- [ ] Run load test: `k6 run load-test.js`
- [ ] No errors under load
- [ ] Response times < 500ms average
- [ ] Error rate < 1%

### Data Persistence
- [ ] Stop everything: `docker-compose down`
- [ ] Start again: `docker-compose up -d`
- [ ] Data still present in database
- [ ] Audit logs intact

### Cleanup (Optional)
- [ ] `docker-compose down -v` (removes data)

**Status: ✅ READY FOR CLOUD**

---

## Phase 2: Cloud Preparation (Day 2)

### SSH Key Setup
- [ ] SSH key exists: `/home/kubuntux/Downloads/.ssh/id_rsa`
- [ ] SSH key is 600 permissions: `chmod 600 ~/.ssh/id_rsa`
- [ ] Can SSH to server: `ssh -i key root@49.12.230.179 "echo ok"`
- [ ] SSH key is not in git

### Server Access
- [ ] Hetzner server provisioned: 49.12.230.179
- [ ] Server is Ubuntu 22.04+
- [ ] Can SSH without password (key-based auth)
- [ ] Root access available
- [ ] Ports 22, 80, 443, 30000 accessible

### SSH Tunnel Setup
- [ ] Read SSH_TUNNEL_SETUP.md
- [ ] Create tunnel script: `~/.ssh/atlas-tunnel.sh`
- [ ] Make executable: `chmod +x ~/.ssh/atlas-tunnel.sh`
- [ ] Test tunnel: `ssh -L 3000:localhost:3000 root@49.12.230.179`
- [ ] Verify access: `curl http://localhost:3000/health` through tunnel

### Deployment Script
- [ ] deploy.sh exists and is readable
- [ ] Make executable: `chmod +x deploy.sh`
- [ ] Review deploy.sh for custom settings
- [ ] Update PostgreSQL password (line ~100) if needed
- [ ] Test script dry-run: `bash -x deploy.sh ...` (check for errors)

**Status: ✅ READY FOR DEPLOYMENT**

---

## Phase 3: Cloud Deployment (Day 2-3)

### Pre-Deployment
- [ ] SSH tunnel not already running
- [ ] Disk space on server: `ssh root@server "df -h"` (>10GB free)
- [ ] Internet connection stable
- [ ] At least 30 minutes available (deployment takes 3-5 min + pod startup 2-3 min)

### Run Deployment
- [ ] Execute: `./deploy.sh 49.12.230.179 /home/kubuntux/Downloads/.ssh/id_rsa`
- [ ] No SSH errors in output
- [ ] k3s installation completes successfully
- [ ] Kubernetes cluster initialized
- [ ] nginx ingress deployed
- [ ] PostgreSQL pod starts (wait 1-2 min)
- [ ] Redis pod starts (wait 30s)
- [ ] MCP server pod starts (wait 1-2 min)

### Verify Deployment
- [ ] SSH into server: `ssh -i key root@49.12.230.179`
- [ ] Kubernetes cluster ready: `kubectl get nodes` (STATUS: Ready)
- [ ] Pods running: `kubectl get pods -n atlas-gate` (all Running)
- [ ] Services exposed: `kubectl get svc -n atlas-gate`
  - postgres (ClusterIP:5432)
  - redis (ClusterIP:6379)
  - mcp-server (ClusterIP:3000)
  - mcp-server-nodeport (NodePort:30000)
- [ ] No crash loops in pods

### Verify Services
From server:
- [ ] PostgreSQL healthy: `kubectl logs deployment/postgres -n atlas-gate` (no errors)
- [ ] Redis healthy: `kubectl logs deployment/redis -n atlas-gate` (no errors)
- [ ] MCP healthy: `kubectl logs deployment/mcp-server -n atlas-gate` (no errors)
- [ ] Database schema created: `kubectl exec deployment/postgres ... psql -c "SELECT * FROM audit_log LIMIT 1;"`

### SSH Tunnel & Local Access
- [ ] Start tunnel: `ssh -L 3000:localhost:3000 root@49.12.230.179`
- [ ] Test through tunnel: `curl http://localhost:3000/health` (200 OK)
- [ ] Response JSON includes uptime, memory, backend status
- [ ] All backends show "ready"

### First API Calls
Through tunnel:
- [ ] POST begin_session: `curl -X POST http://localhost:3000/mcp ...`
- [ ] Verify response includes session_id
- [ ] GET /audit/export: returns audit entries (JSONL format)
- [ ] GET /metrics: returns Prometheus metrics
- [ ] Health endpoint consistent

### Data Verification
- [ ] Audit log has entries from deployment
- [ ] Sessions table has recent entries
- [ ] Plans table created (even if empty)
- [ ] No database errors in logs

**Status: ✅ DEPLOYMENT SUCCESSFUL**

---

## Phase 4: Client Integration (Day 3)

### Configure Windsurf
- [ ] Read KUBERNETES_CLIENT_CONFIG.md section "Windsurf Configuration"
- [ ] Get .mcp.json config location
- [ ] Create/update config with:
  ```json
  {
    "mcpServers": {
      "atlas-gate": {
        "type": "http",
        "url": "http://localhost:3000",
        "retryPolicy": {
          "maxRetries": 3,
          "initialDelayMs": 1000
        }
      }
    }
  }
  ```
- [ ] SSH tunnel running: `ssh -L 3000:localhost:3000 root@49.12.230.179`
- [ ] Windsurf can see MCP server
- [ ] Can list plans
- [ ] Can call tools

### Configure Antigravity
- [ ] Same as Windsurf above
- [ ] URL: http://localhost:3000
- [ ] Can create bootstrap plan
- [ ] Can lint plans

### Test Workflow
- [ ] Begin session from Windsurf
- [ ] Create plan from Antigravity
- [ ] List plans from Windsurf
- [ ] Execute write operations
- [ ] Verify audit log in PostgreSQL
- [ ] Check metrics after operations

**Status: ✅ CLIENTS CONNECTED**

---

## Phase 5: TLS/HTTPS Setup (Optional, for Production)

### Self-Signed Cert (Testing)
- [ ] Generate cert on server: `openssl req -x509 ...`
- [ ] Place in: `/etc/nginx/certs/`
- [ ] Update nginx.conf with cert paths
- [ ] Restart nginx
- [ ] Test: `curl -k https://localhost:443/health`

### Let's Encrypt (Production)
- [ ] Domain registered and points to server IP
- [ ] SSH into server
- [ ] Install certbot: `apt-get install certbot`
- [ ] Create certificate: `certbot certonly --standalone ...`
- [ ] Update nginx.conf with certificate paths
- [ ] Enable auto-renewal: `systemctl enable certbot.timer`
- [ ] Reload nginx: `kubectl rollout restart deployment nginx-ingress -n ingress-nginx`
- [ ] Test: `curl https://your-domain.com/health`

### Update Client Config (HTTPS)
- [ ] Change URL to: `https://your-domain.com` or `https://localhost:443`
- [ ] Set `"tlsVerify": true` (if valid cert)
- [ ] Verify connection works
- [ ] Monitor for cert renewal warnings

**Status: ✅ HTTPS CONFIGURED**

---

## Phase 6: Monitoring & Backups (Ongoing)

### Health Checks
- [ ] Set up script to monitor: `watch -n 60 'curl -s http://localhost:3000/health'`
- [ ] Check logs daily: `kubectl logs -n atlas-gate -l app=mcp-server -f`
- [ ] Monitor disk usage: `ssh root@server "du -sh /mnt/atlas-data/*"`
- [ ] Check database size growing: `psql -c "SELECT pg_database_size('atlas_gate');"`

### Backups
- [ ] Manual PostgreSQL backup: `kubectl exec deployment/postgres ... pg_dump ... | gzip > backup.sql.gz`
- [ ] Manual Redis backup: `kubectl exec deployment/redis ... redis-cli BGSAVE`
- [ ] Copy to local machine: `scp -r root@server:/mnt/atlas-data/postgres ./backups/`
- [ ] Schedule backups (cron or cloud provider)

### Scaling
- [ ] Monitor CPU usage: `kubectl top pods -n atlas-gate`
- [ ] Monitor memory: `kubectl top pods -n atlas-gate`
- [ ] If >80% usage, scale up or optimize
- [ ] Scale replicas: `kubectl scale deployment mcp-server --replicas=2`

### Security
- [ ] Check SSH key permissions: `ls -la ~/.ssh/id_rsa` (should be 600)
- [ ] Verify firewall allows only needed ports
- [ ] Rotate PostgreSQL password every 90 days
- [ ] Check for unauthorized SSH login attempts: `ssh root@server "grep Failed /var/log/auth.log | tail -10"`

**Status: ✅ MONITORING IN PLACE**

---

## Phase 7: Documentation & Handoff

- [ ] Document access instructions for team
- [ ] Keep SSH key secure (password manager)
- [ ] Document PostgreSQL password location (secure storage)
- [ ] Create runbook for common tasks:
  - [ ] How to view logs
  - [ ] How to restart services
  - [ ] How to scale up
  - [ ] How to backup data
  - [ ] How to debug issues
- [ ] Archive deployment notes
- [ ] Share KUBERNETES_CLIENT_CONFIG.md with team

**Status: ✅ READY FOR PRODUCTION**

---

## Troubleshooting Quick Reference

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Pod stuck in Pending | `kubectl describe pod <name>` | Check disk/memory/PVC |
| Can't connect | `curl -v http://localhost:3000` | Check tunnel, firewall |
| Database error | `kubectl logs deployment/postgres` | Check credentials, PVC |
| Out of memory | `kubectl top pods` | Reduce replicas or scale up |
| Cert expired | Check logs | Renew with certbot |

---

## Final Checklist (Before Going Live)

- [ ] Local testing complete and documented
- [ ] Cloud deployment successful
- [ ] SSH tunnel working
- [ ] Clients (Windsurf/Antigravity) connected
- [ ] Full workflow tested (begin_session → create plan → execute)
- [ ] Data persists across restarts
- [ ] Backups in place
- [ ] Monitoring/alerting configured
- [ ] HTTPS setup (if required)
- [ ] Documentation complete
- [ ] Runbooks created
- [ ] Team trained

**✅ READY FOR PRODUCTION USE**

---

## Estimated Timeline

| Phase | Time | Status |
|-------|------|--------|
| 1. Local Testing | 2-3 hours | Setup, test, verify |
| 2. Cloud Prep | 30 min | SSH keys, tunnel |
| 3. Cloud Deploy | 10-15 min | Script + pod startup |
| 4. Client Integration | 30 min | Configure, test |
| 5. TLS Setup | 30 min (optional) | Certs, nginx, test |
| 6. Monitoring | 1 hour | Setup, backups, alerts |
| 7. Documentation | 1 hour | Write runbooks |
| **Total** | **6-8 hours** | **Ready for production** |

---

## After Deployment - Daily Tasks

```bash
# Health check
ssh -L 3000:localhost:3000 root@49.12.230.179 &
curl http://localhost:3000/health

# View recent logs
ssh root@49.12.230.179 "kubectl logs -n atlas-gate --all-containers=true --timestamps=true -n atlas-gate -f"

# Check metrics
curl http://localhost:3000/metrics | grep mcp_

# Database size
ssh root@49.12.230.179 "kubectl exec deployment/postgres -n atlas-gate -- psql -U atlas_user -d atlas_gate -c 'SELECT pg_size_pretty(pg_database_size(current_database()));'"
```

---

Remember: **Test locally first, deploy to cloud with confidence.**
