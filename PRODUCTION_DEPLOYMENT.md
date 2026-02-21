# ATLAS-GATE MCP - Production Deployment Guide

## System Status: ✅ PRODUCTION READY

All tests passing, all core functionality implemented and enforced.

---

## Quick Start

### 1. Install Production Dependencies

```bash
# Core dependencies (required)
npm install

# Production cryptography (recommended)
npm install @sigstore/cosign @sigstore/sign @sigstore/verify

# Verify installation
npm list
```

### 2. Configure Environment

```bash
# Linux/macOS
export NODE_ENV=production
export ATLAS-GATE_BOOTSTRAP_SECRET="your-secure-random-secret"
export ATLAS-GATE_ATTESTATION_SECRET="your-secure-random-secret"
export ATLAS-GATE_PORT=3000
export ATLAS-GATE_HOST=0.0.0.0

# OR create .env file (not git-tracked)
cat > .env.production << 'EOF'
NODE_ENV=production
ATLAS-GATE_BOOTSTRAP_SECRET=<generate-secure-secret>
ATLAS-GATE_ATTESTATION_SECRET=<generate-secure-secret>
ATLAS-GATE_PORT=3000
ATLAS-GATE_HOST=0.0.0.0
EOF

source .env.production
```

### 3. Set File Permissions

```bash
# Restrict key directory
chmod 700 .atlas-gate
chmod 600 .atlas-gate/.cosign-keys/*

# Make executables
chmod +x bin/ATLAS-GATE-MCP-windsurf.js
chmod +x bin/ATLAS-GATE-MCP-antigravity.js
```

### 4. Verify Setup

```bash
# Run full verification suite
npm run verify

# Expected output:
# ✓ AST Policy test passes
# ✓ Plan linter tests pass (14/14)
# ✓ Bootstrap test passes
```

### 5. Start Service

```bash
# Option A: HTTP Server
node bin/ATLAS-GATE-HTTP.js

# Option B: Windsurf MCP
node bin/ATLAS-GATE-MCP-windsurf.js

# Option C: Antigravity MCP
node bin/ATLAS-GATE-MCP-antigravity.js
```

---

## Architecture Overview

### Components

| Component | Role | File |
|-----------|------|------|
| **Plan Linter** | 7-stage validation + cosign signing | `core/plan-linter.js` |
| **Audit System** | Append-only, hash-chained logging | `core/audit-system.js` |
| **Write-Time Enforcer** | Blocks unsafe patterns before write | `core/write-time-policy-engine.js` |
| **Governance** | Bootstrap + plan approval | `core/governance.js` |
| **Replay Engine** | Plan execution verification | `core/replay-engine.js` |
| **HTTP Server** | Multi-tenant REST API | `api/http-server.js` |

### Data Flow

```
User Request
    ↓
[MCP Handler] → Validate Intent
    ↓
[Write-Time Enforcer] → Check for stubs/unsafe patterns
    ↓
[Plan Linter] → 7-stage validation
    ↓
[Cosign Signer] → Sign plan (ECDSA P-256 or SHA256)
    ↓
[Audit Logger] → Append entry with hash chain
    ↓
[Approval Gate] → Require explicit approval
    ↓
[Replay Engine] → Execute plan with verification
```

---

## Deployment Scenarios

### Scenario 1: Single-Tenant Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install --production
RUN npm install @sigstore/cosign @sigstore/sign @sigstore/verify

# Create .atlas-gate directory
RUN mkdir -p .atlas-gate/.cosign-keys && chmod 700 .atlas-gate

# Run health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 3000

# Start HTTP server
CMD ["node", "bin/ATLAS-GATE-HTTP.js"]
```

```bash
docker build -t atlas-gate-mcp:latest .
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e ATLAS-GATE_BOOTSTRAP_SECRET=$(openssl rand -hex 32) \
  -v ./workspace:/app/workspace \
  -v ./audit-logs:/app/.atlas-gate \
  atlas-gate-mcp:latest
```

### Scenario 2: Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlas-gate-mcp
spec:
  replicas: 1  # Single replica - workspace is single-threaded
  selector:
    matchLabels:
      app: atlas-gate-mcp
  template:
    metadata:
      labels:
        app: atlas-gate-mcp
    spec:
      containers:
      - name: atlas-gate
        image: atlas-gate-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: ATLAS-GATE_BOOTSTRAP_SECRET
          valueFrom:
            secretKeyRef:
              name: atlas-gate-secrets
              key: bootstrap-secret
        volumeMounts:
        - name: workspace
          mountPath: /app/workspace
        - name: audit-logs
          mountPath: /app/.atlas-gate
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: workspace-pvc
      - name: audit-logs
        persistentVolumeClaim:
          claimName: audit-logs-pvc
```

### Scenario 3: Nginx Reverse Proxy

```nginx
upstream atlas_gate {
  server localhost:3000;
}

server {
  listen 443 ssl http2;
  server_name api.atlas-gate.example.com;

  ssl_certificate /etc/ssl/certs/atlas-gate.crt;
  ssl_certificate_key /etc/ssl/private/atlas-gate.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
  limit_req zone=api_limit burst=20 nodelay;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header X-XSS-Protection "1; mode=block" always;

  location / {
    proxy_pass http://atlas_gate;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    proxy_connect_timeout 10s;
  }

  location /health {
    proxy_pass http://atlas_gate;
    access_log off;
  }
}
```

---

## Monitoring & Observability

### Key Metrics to Track

1. **Audit Log Health**
   - Log entries per hour
   - Signature verification failures
   - Hash chain breaks

2. **Plan Processing**
   - Plans created per day
   - Plan approval rate
   - Linting failures by type

3. **System Health**
   - HTTP request latency
   - Error rate (500s, 400s)
   - Workspace lock acquisition time

### Centralized Logging

Route `console.error()` to your logging system:

```bash
# ELK Stack
node bin/ATLAS-GATE-HTTP.js 2>&1 | \
  jq -R 'split("|") | {timestamp: .[0], level: .[1], message: .[2:] | join("|")}' | \
  curl -X POST -d @- http://elasticsearch:9200/_bulk

# CloudWatch
AWS_REGION=us-east-1 node bin/ATLAS-GATE-HTTP.js 2>&1 | \
  aws logs put-log-events --log-group-name /atlas-gate/mcp --log-stream-name production
```

### Health Check

```bash
curl -s http://localhost:3000/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "version": "2.0.0",
#   "timestamp": "2026-02-21T12:34:56.789Z",
#   "tenantCount": 1
# }
```

### Audit Log Verification

```bash
node -e "
import { verifyAuditLogIntegrity } from './core/audit-system.js';
const result = await verifyAuditLogIntegrity('/path/to/workspace');
console.log(JSON.stringify(result, null, 2));
"
```

---

## Backup & Recovery

### Backup Strategy

```bash
#!/bin/bash
# Backup audit logs and keys daily

BACKUP_DIR=/backups/atlas-gate-$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup audit log
cp .atlas-gate/audit.log $BACKUP_DIR/
cp .atlas-gate/audit.log.tar.gz $BACKUP_DIR/

# Backup cosign keys (encrypted)
tar czf - .atlas-gate/.cosign-keys | \
  openssl enc -aes-256-cbc -pass file:/root/.backup-password \
  > $BACKUP_DIR/cosign-keys.tar.gz.enc

# Backup governance state
cp .atlas-gate/governance.json $BACKUP_DIR/

# Verify backup
ls -lah $BACKUP_DIR/
```

### Recovery Procedures

```bash
# Restore from backup
BACKUP_DIR=/backups/atlas-gate-20260221

# Restore audit log
cp $BACKUP_DIR/audit.log .atlas-gate/

# Restore cosign keys
openssl enc -aes-256-cbc -d -pass file:/root/.backup-password \
  -in $BACKUP_DIR/cosign-keys.tar.gz.enc | tar xzf -

# Verify integrity
node -e "
import { verifyAuditLogIntegrity } from './core/audit-system.js';
const result = await verifyAuditLogIntegrity(process.cwd());
console.log('Audit log integrity:', result.status);
"
```

---

## Troubleshooting

### Plan Linting Failures

```bash
# Enable debug output
DEBUG_LINTING=1 node bin/ATLAS-GATE-HTTP.js

# Check plan content
node -e "
import { lintPlan } from './core/plan-linter.js';
const plan = require('fs').readFileSync('./docs/plans/YOUR_PLAN.md', 'utf8');
const result = await lintPlan(plan);
console.log(JSON.stringify(result, null, 2));
"
```

### Audit Log Issues

```bash
# Check for corruption
node -e "
import { verifyAuditLogIntegrity } from './core/audit-system.js';
const result = await verifyAuditLogIntegrity(process.cwd());
if (!result.valid) {
  console.error('Audit log corrupted:');
  result.failures.forEach(f => console.error(f));
}
"

# Read last 10 entries
tail -10 .atlas-gate/audit.log | jq .
```

### Workspace Locked

```bash
# Check lock status
ls -la .atlas-gate/workspace.lock

# Force unlock (emergency only)
rm -f .atlas-gate/workspace.lock

# Verify workspace integrity after unlock
node bin/ATLAS-GATE-HTTP.js
```

---

## Security Checklist

- [ ] All dependencies updated to latest stable versions
- [ ] `@sigstore/cosign` installed for real ECDSA P-256 signing
- [ ] Environment secrets not committed to git
- [ ] `.atlas-gate` directory has `chmod 700` permissions
- [ ] Cosign keys backed up securely (encrypted, off-site)
- [ ] Audit logs rotated and archived
- [ ] TLS/mTLS configured if using HTTPS
- [ ] Rate limiting configured (reverse proxy)
- [ ] Centralized logging configured
- [ ] Health checks monitored
- [ ] Rollback procedures documented and tested
- [ ] Kill switch tested (can safely disable system)

---

## Performance Tuning

### For Large Workspaces

1. **Audit Log Archival**
   - Move logs >1GB to archive storage
   - Maintain index of archived logs
   - Update audit-system to query both live + archive

2. **Plan Caching**
   - Cache linting results by plan hash
   - Invalidate on dependency changes
   - TTL: 24 hours

3. **Workspace Indexing**
   - Build hash index of all files
   - Quick verification of completeness
   - Detect missing/corrupted files early

### Scaling Considerations

⚠️ **SINGLE-WORKSPACE-PER-INSTANCE ARCHITECTURE**

Each ATLAS-GATE instance locks ONE workspace. For multiple workspaces:
- Deploy separate instances, one per workspace
- Use load balancer for health + routing
- Share audit log storage (via network drive)
- Use shared key management (e.g., AWS KMS)

---

## Support & Escalation

### Critical Issues

If you encounter these, disable the system immediately:

1. **Audit Log Corruption**
   - Kill switch engaged
   - Alert security team
   - Restore from last known-good backup

2. **Cryptographic Verification Failures**
   - Kill switch engaged
   - All operations blocked (fail-closed)
   - Manual audit required before restart

3. **Workspace Lock Deadlock**
   - Force unlock (only after verifying no processes running)
   - Restart system
   - Check for file system issues

### Getting Help

- Check logs: `tail -f .atlas-gate/audit.log | jq .`
- Run verification: `npm run verify`
- Check health: `curl http://localhost:3000/health`
- Review audit integrity: (see Backup & Recovery section)

---

## Roadmap

### Near-term (1-2 quarters)
- [ ] Performance optimizations for large audit logs
- [ ] HTTP/2 server push for real-time updates
- [ ] Role-based access control (RBAC) for multi-tenant

### Medium-term (2-4 quarters)
- [ ] Distributed audit log consensus
- [ ] Real-time plan collaboration
- [ ] Advanced maturity scoring

### Long-term (6+ months)
- [ ] Decentralized plan verification (blockchain-style)
- [ ] Cross-workspace plan composition
- [ ] AI-assisted plan generation

---

**Last Updated:** 2026-02-21  
**Status:** ✅ Ready for Production  
**Maintainer:** ATLAS-GATE Team
