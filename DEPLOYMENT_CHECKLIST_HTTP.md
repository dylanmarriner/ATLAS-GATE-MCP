# HTTP Server Deployment Checklist

Use this checklist when deploying ATLAS-GATE as an HTTP server to production.

## Phase 1: Local Development ✓

- [ ] Clone repository: `git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git`
- [ ] Install dependencies: `npm install`
- [ ] Start HTTP server: `npm run start:http`
- [ ] Verify health: `curl http://localhost:3000/health`
- [ ] Save default API key from startup output
- [ ] Create a test session: See HTTP_QUICK_START.md
- [ ] Test tool calls: `read_file`, `list_plans`, etc.
- [ ] Test workspace switching: `PUT /sessions/{id}`
- [ ] Run examples: `npm run example:client`

## Phase 2: Tenant & Access Control

- [ ] Plan tenant structure (1 tenant per team/org)
- [ ] Generate secure API keys: `openssl rand -hex 32`
- [ ] Create tenants programmatically
- [ ] Document tenant IDs and API keys (in secure vault)
- [ ] Test tenant isolation (can't access other tenant's sessions)
- [ ] Implement API key rotation procedure
- [ ] Add rate limiting (if needed)

## Phase 3: Workspace Configuration

- [ ] Identify all repositories to be accessed
- [ ] Verify paths are absolute and accessible
- [ ] Test workspace switching with real repos
- [ ] Document workspace root for each team
- [ ] Create environment variables for workspace paths
- [ ] Test with repos of varying sizes/structures

## Phase 4: Security

- [ ] Use HTTPS in production (TLS certificates)
- [ ] Implement API key authentication validation
- [ ] Add request logging with request IDs
- [ ] Implement rate limiting by API key
- [ ] Restrict host binding (not 0.0.0.0 if not needed)
- [ ] Use firewall rules to limit API access
- [ ] Rotate API keys regularly
- [ ] Audit log retention policy

### HTTPS Setup

```bash
# Generate self-signed certificate (dev)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# OR use Let's Encrypt (prod)
certbot certonly --standalone -d your-domain.com

# Update HTTP server to use HTTPS
# (implementation needed in http-server.js)
```

## Phase 5: Persistence & Backup

- [ ] Choose storage backend (currently in-memory)
- [ ] Implement database for tenants/sessions:
  - [ ] PostgreSQL / MySQL / SQLite
  - [ ] Or simple file-based JSON store
- [ ] Backup strategy for audit logs
- [ ] Backup strategy for plan registry
- [ ] Document backup/restore procedures
- [ ] Test disaster recovery

### Optional: Add Database Layer

```javascript
// Extend TenantManager with database persistence
class PersistentTenantManager {
  static async createTenant(name, config) {
    // Save to database
    await db.tenants.create({ name, config });
  }
}
```

## Phase 6: Monitoring & Observability

- [ ] Add structured logging (JSON format)
- [ ] Implement health check endpoint
- [ ] Set up log aggregation (ELK, Splunk, etc.)
- [ ] Monitor disk space (audit logs)
- [ ] Monitor memory usage
- [ ] Monitor CPU usage
- [ ] Set up alerting for failures
- [ ] Create dashboard for key metrics

### Key Metrics

```
- Requests per second by tool
- Average response time
- Error rate by error code
- Active session count
- Audit log size
- Tenant count
```

## Phase 7: Docker Containerization

- [ ] Create Dockerfile (included)
- [ ] Create docker-compose.yml
- [ ] Build image: `docker build -t atlas-gate:latest .`
- [ ] Test locally: `docker run -p 3000:3000 atlas-gate:latest`
- [ ] Push to registry: `docker push your-registry/atlas-gate:latest`
- [ ] Document Docker commands
- [ ] Test image cleanup/updates

## Phase 8: Kubernetes Deployment (Optional)

- [ ] Create namespace: `kubectl create namespace atlas-gate`
- [ ] Create ConfigMap for environment variables
- [ ] Create Secret for API keys
- [ ] Create Deployment manifest
- [ ] Create Service (ClusterIP/LoadBalancer)
- [ ] Create Ingress for HTTPS
- [ ] Test deployment: `kubectl apply -f k8s-deployment.yaml`
- [ ] Verify pods running: `kubectl get pods -n atlas-gate`
- [ ] Test connectivity
- [ ] Set up auto-scaling if needed

## Phase 9: CI/CD Integration

- [ ] Update CI/CD pipeline to target HTTP server
- [ ] Migrate from stdio MCP to HTTP API
- [ ] Update all clients to use API key authentication
- [ ] Update all clients to create sessions
- [ ] Test CI/CD workflows with HTTP server
- [ ] Verify audit trail captures all CI/CD operations

### Example: GitHub Actions

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Connect to ATLAS-GATE
        env:
          ATLAS_GATE_URL: ${{ secrets.ATLAS_GATE_URL }}
          ATLAS_GATE_API_KEY: ${{ secrets.ATLAS_GATE_API_KEY }}
        run: |
          npm run example:client
```

## Phase 10: Load Testing

- [ ] Create load test scenario
- [ ] Test with 10 concurrent sessions
- [ ] Test with 100 concurrent sessions
- [ ] Test with 1000 concurrent sessions
- [ ] Monitor resource usage under load
- [ ] Identify bottlenecks
- [ ] Optimize if needed

### Load Test Script

```bash
#!/bin/bash
for i in {1..10}; do
  curl -X POST "http://localhost:3000/tools/read_file?sessionId=session_test" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"path": "package.json"}' &
done
wait
```

## Phase 11: Documentation & Handover

- [ ] Document API endpoints
- [ ] Document tenant management procedures
- [ ] Document workspace configuration
- [ ] Document security policies
- [ ] Document monitoring dashboards
- [ ] Document runbooks for common issues
- [ ] Document disaster recovery procedures
- [ ] Train team on new HTTP server
- [ ] Create troubleshooting guide

## Phase 12: Production Cutover

- [ ] Schedule maintenance window
- [ ] Perform final backup
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor for 24 hours
- [ ] Alert team of availability
- [ ] Decommission old stdio MCP if fully migrated
- [ ] Document lessons learned

## Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Review audit logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate API keys quarterly
- [ ] Review security logs monthly
- [ ] Capacity planning based on usage
- [ ] Plan for upgrades/scaling

## Rollback Plan

If issues arise:

1. **Immediate**: Use existing stdio MCP infrastructure (if still available)
2. **Short-term**: Roll back HTTP server version
3. **Investigation**: Analyze audit logs and error traces
4. **Fix**: Deploy patched version
5. **Re-test**: Smoke tests before re-enabling

## Success Criteria

- [ ] ✓ HTTP server listening and responding to requests
- [ ] ✓ Authentication working (API keys validated)
- [ ] ✓ Tenant isolation verified (no cross-tenant leakage)
- [ ] ✓ Workspace switching functional
- [ ] ✓ All tool calls working correctly
- [ ] ✓ Audit logs complete and accurate
- [ ] ✓ No data loss or corruption
- [ ] ✓ Performance acceptable (< 500ms p95)
- [ ] ✓ Monitoring in place and alerting
- [ ] ✓ Team trained on operations
- [ ] ✓ Documentation complete

## Sign-Off

- [ ] Dev Lead: _______________  Date: _______
- [ ] Ops/Infra: _______________  Date: _______
- [ ] Security: _______________  Date: _______
- [ ] Product: _______________  Date: _______
