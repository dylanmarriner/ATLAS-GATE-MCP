# Local Testing with Docker Compose

## Test Everything Before Cloud Deploy

### Prerequisites

```bash
# Install Docker & Docker Compose
sudo apt-get install docker.io docker-compose

# Verify
docker --version
docker-compose --version

# Add yourself to docker group (no sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### Quick Start (2 minutes)

```bash
cd /home/kubuntux/Documents/ATLAS-GATE-MCP

# Start everything
docker-compose up -d

# Wait for services to boot (30 seconds)
sleep 30

# Check status
docker-compose ps

# Test health
curl http://localhost:3000/health

# View logs
docker-compose logs -f mcp-server-1
```

### What's Running

```
nginx (port 80, 443)
  ├─ mcp-server-1 (port 3000)
  ├─ mcp-server-2 (port 3000)
  ├─ PostgreSQL (port 5432)
  ├─ Redis (port 6379)
  ├─ Prometheus (port 9090)
  └─ Grafana (port 3001)
```

### Test the API

```bash
# Health check
curl http://localhost:3000/health

# MCP API (test begin_session)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "begin_session", "args": {"workspace_root": "/workspace"}}'

# Metrics (Prometheus format)
curl http://localhost:3000/metrics

# Audit export
curl http://localhost:3000/audit/export?limit=10
```

### Access Dashboards

- **Grafana**: http://localhost:3001 (admin/atlas_admin_password)
- **Prometheus**: http://localhost:9090
- **Direct API**: http://localhost:3000

### Database Access

```bash
# PostgreSQL
docker exec -it atlas-gate-postgres psql -U atlas_user -d atlas_gate

# Inside psql:
SELECT COUNT(*) FROM audit_log;
SELECT * FROM sessions;
\q

# Redis
docker exec -it atlas-gate-redis redis-cli
DBSIZE
KEYS *
exit
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f mcp-server-1
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Load Test Locally

```bash
# Install k6 (performance testing tool)
sudo apt-get install -y apt-transport-https
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/grafana.gpg --import https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install k6

# Create load test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let response = http.get('http://localhost:3000/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run test
k6 run load-test.js
```

### Verify Audit Logging

```bash
# Check audit log grows
watch -n 1 'curl -s http://localhost:3000/audit/export?limit=1 | tail -5'

# Export audit logs
curl http://localhost:3000/audit/export?limit=100 > audit.jsonl

# View JSON
jq '.' audit.jsonl | head -50
```

### Test Failover (Kill a Server)

```bash
# Kill one MCP server
docker stop atlas-gate-mcp-1

# Nginx should route to server-2
curl http://localhost:3000/health  # Still works

# Verify through logs
docker logs atlas-gate-nginx

# Restart it
docker start atlas-gate-mcp-1

# Both now running
docker-compose ps
```

### Test Data Persistence

```bash
# Write some data
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "begin_session", "args": {"workspace_root": "/workspace"}}'

# Verify in database
docker exec atlas-gate-postgres psql -U atlas_user -d atlas_gate \
  -c "SELECT COUNT(*) FROM audit_log;"

# Stop everything
docker-compose down

# Start again
docker-compose up -d
sleep 10

# Data still there
docker exec atlas-gate-postgres psql -U atlas_user -d atlas_gate \
  -c "SELECT COUNT(*) FROM audit_log;"
```

### Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (cleanup data)
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

---

## Verify Before Cloud Deploy

Checklist before moving to production:

- [ ] All services start without errors
- [ ] Health check returns 200
- [ ] PostgreSQL accepts connections
- [ ] Redis is accessible
- [ ] Audit log writes entries
- [ ] Load test completes without errors
- [ ] Failover (kill server) still works
- [ ] Data persists after restart
- [ ] Metrics endpoint works
- [ ] No out-of-memory errors in logs

Once all pass → ready for cloud deployment

---

## Next Steps

1. Run locally: `docker-compose up -d`
2. Test everything above
3. If issues: check logs with `docker-compose logs`
4. Once working → proceed to cloud deploy
5. For cloud: use `./deploy.sh`
