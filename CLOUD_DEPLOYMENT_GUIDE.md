# ATLAS-GATE-MCP Cloud Deployment Guide

## Server Sizing

### Resource Requirements

**Minimum (Development/Testing)**
- CPU: 1 core (2 GHz minimum)
- RAM: 512 MB
- Disk: 10 GB (for audit logs and plans)
- Network: Stable internet connection

**Recommended (Production 99.9% Uptime)**
- CPU: 2-4 cores (3+ GHz)
- RAM: 2-4 GB
- Disk: 50+ GB SSD (fast I/O for audit logging)
- Network: Redundant connectivity (failover)

**Enterprise Scale (High Concurrency)**
- CPU: 8+ cores
- RAM: 8-16 GB
- Disk: 100+ GB SSD with backup replication
- Network: CDN/Load balancing

### Recommended Cloud Providers

#### AWS (EC2)
- **t3.small** (~$0.02/hr): 2 vCPU, 2 GB RAM, 50 GB disk — Development
- **t3.medium** (~$0.04/hr): 2 vCPU, 4 GB RAM, 100 GB disk — Production 99.9%
- **t3.large** (~$0.08/hr): 2 vCPU, 8 GB RAM, 200 GB disk — Enterprise

#### Azure
- **B1s**: 1 vCPU, 1 GB RAM — Development
- **B2s**: 2 vCPU, 4 GB RAM — Production 99.9%
- **D2s_v3**: 2 vCPU, 8 GB RAM, SSD — Enterprise

#### GCP
- **e2-medium**: 2 vCPU, 4 GB RAM — Production 99.9%
- **e2-standard-2**: 2 vCPU, 8 GB RAM — Enterprise
- **e2-highmem-2**: 2 vCPU, 16 GB RAM — High volume

### Disk I/O Considerations

ATLAS-GATE-MCP writes **one audit log entry per tool invocation** (JSON Line format). With 2+ clients making 10+ calls/minute:
- **Write throughput**: ~100 KB/min (minimal)
- **Disk needs**: ~5 MB/day, ~150 MB/month
- **Recommendation**: SSD for consistent latency (<5ms)

---

## Architecture for 99.9% Uptime

### High-Availability Setup

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (SSL/TLS)              │
│              (AWS ELB, Azure LB, nginx reverse proxy)    │
└──────────┬──────────────────────────────────────────────┘
           │
    ┌──────┴──────────┐
    │                 │
┌───▼────┐       ┌───▼────┐
│Server-1│       │Server-2│  (Active-Active or Active-Passive)
│  MCP   │       │  MCP   │
└───┬────┘       └───┬────┘
    │                │
    └────────┬───────┘
             │
      ┌──────▼──────┐
      │Shared Storage│  (RDS PostgreSQL or S3 with replication)
      │ Audit Log   │
      │ Plans DB    │
      └─────────────┘
```

### Required Changes to Code

#### 1. Network Binding Configuration

**Current:** Server binds to `stdio` transport only (local child process).

**Required Change:** Add HTTP/TCP transport layer and bind to network interface.

**File:** `server-network.js` (new)

```javascript
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startServer as createMcpServer } from './server.js';

const app = express();
const PORT = process.env.MCP_PORT || 3000;
const BIND_ADDRESS = process.env.MCP_BIND || '0.0.0.0';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// MCP endpoint (HTTP POST)
app.post('/mcp', express.json(), async (req, res) => {
  try {
    // Delegate to MCP handler
    const result = await mcpServer.handleRequest(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, BIND_ADDRESS, () => {
  console.error(`[MCP-SERVER] Listening on ${BIND_ADDRESS}:${PORT}`);
});
```

#### 2. Shared Audit Log Storage

**Current:** Append-only JSONL file in workspace directory (`audit-log.jsonl`).

**Required Change:** Support external audit log backend (PostgreSQL, MongoDB, or S3).

**File:** `core/audit-storage.js` (new)

```javascript
// Abstraction layer for audit storage backends
export class AuditStorage {
  constructor(backend) {
    this.backend = backend; // 'file', 'postgres', 's3', etc.
  }

  async append(entry) {
    if (this.backend === 'postgres') {
      return await this.appendToDatabase(entry);
    } else if (this.backend === 's3') {
      return await this.appendToS3(entry);
    } else {
      return await this.appendToFile(entry);
    }
  }

  async read(filters = {}) {
    if (this.backend === 'postgres') {
      return await this.readFromDatabase(filters);
    }
    // ... other backends
  }
}
```

#### 3. Session State Management

**Current:** In-memory session state in `session.js`.

**Required Change:** Distribute session state across servers via Redis or database.

**File:** `core/session-store.js` (new)

```javascript
import redis from 'redis';

export class SessionStore {
  constructor(redisUrl = process.env.REDIS_URL) {
    this.client = redis.createClient({ url: redisUrl });
  }

  async initSession(sessionId, workspaceRoot) {
    return await this.client.set(
      `session:${sessionId}`,
      JSON.stringify({ workspaceRoot, activePlanId: null }),
      { EX: 3600 } // 1 hour expiry
    );
  }

  async getSession(sessionId) {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async updateSession(sessionId, updates) {
    const current = await this.getSession(sessionId);
    const merged = { ...current, ...updates };
    return await this.client.set(
      `session:${sessionId}`,
      JSON.stringify(merged),
      { EX: 3600 }
    );
  }
}
```

#### 4. Client Connection Configuration

**New File:** `client-config.js`

```javascript
// Clients point to cloud server instead of stdio
export const MCP_ENDPOINTS = {
  cloud_primary: process.env.MCP_CLOUD_URL || 'https://mcp.company.com:3000',
  cloud_failover: process.env.MCP_CLOUD_FAILOVER_URL || 'https://mcp-backup.company.com:3000',
  local_fallback: 'http://localhost:3000' // Local for development
};

export const getActiveEndpoint = async () => {
  // Try primary, fallback to secondary, then local
  for (const url of [
    MCP_ENDPOINTS.cloud_primary,
    MCP_ENDPOINTS.cloud_failover,
    MCP_ENDPOINTS.local_fallback
  ]) {
    try {
      const response = await fetch(`${url}/health`, { timeout: 5000 });
      if (response.ok) return url;
    } catch (err) {
      console.warn(`Endpoint ${url} unavailable, trying next...`);
    }
  }
  throw new Error('All MCP endpoints unavailable');
};
```

---

## Implementation Steps for 99.9% Uptime

### Phase 1: Containerization & Infrastructure

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

CMD ["node", "server-network.js"]
```

**Docker Compose (Local Testing):**

```yaml
version: '3.8'
services:
  mcp-server-1:
    build: .
    environment:
      - MCP_PORT=3000
      - MCP_BIND=0.0.0.0
      - REDIS_URL=redis://redis:6379
      - AUDIT_BACKEND=redis
    ports:
      - "3001:3000"
    depends_on:
      - redis
      - postgres

  mcp-server-2:
    build: .
    environment:
      - MCP_PORT=3000
      - MCP_BIND=0.0.0.0
      - REDIS_URL=redis://redis:6379
      - AUDIT_BACKEND=postgres
    ports:
      - "3002:3000"
    depends_on:
      - redis
      - postgres

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - mcp-server-1
      - mcp-server-2

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=atlas_gate
      - POSTGRES_PASSWORD=secure_password_here
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
  postgres_data:
```

### Phase 2: Database Schema for Audit Logs

**PostgreSQL Schema:**

```sql
-- audit_log table
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) NOT NULL,
  tool VARCHAR(255) NOT NULL,
  workspace_root VARCHAR(1024),
  plan_hash VARCHAR(64),
  result VARCHAR(20) NOT NULL, -- 'ok' or 'error'
  error_code VARCHAR(50),
  args JSONB,
  notes TEXT,
  hash_chain VARCHAR(64) NOT NULL, -- for integrity
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_session_id (session_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_tool (tool),
  UNIQUE (hash_chain) -- Prevent duplicate entries
);

-- Create backup table for replication
CREATE TABLE audit_log_archive AS SELECT * FROM audit_log WHERE FALSE;

-- Indexes for common queries
CREATE INDEX idx_audit_plan_hash ON audit_log(plan_hash) WHERE plan_hash IS NOT NULL;
CREATE INDEX idx_audit_workspace ON audit_log(workspace_root);
```

**Replication Setup (for failover):**

```sql
-- Primary server
CREATE PUBLICATION audit_log_pub FOR TABLE audit_log;

-- Standby server
CREATE SUBSCRIPTION audit_log_sub 
  CONNECTION 'postgresql://user:pass@primary:5432/atlas_gate'
  PUBLICATION audit_log_pub;
```

### Phase 3: Load Balancer Configuration

**Nginx Configuration:**

```nginx
upstream mcp_backend {
    least_conn;
    server mcp-server-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server mcp-server-2:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name mcp.company.com;

    ssl_certificate /etc/letsencrypt/live/mcp.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.company.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Health check endpoint (no auth required)
    location /health {
        access_log off;
        proxy_pass http://mcp_backend/health;
        proxy_read_timeout 5s;
        proxy_connect_timeout 5s;
    }

    # MCP endpoint (auth required)
    location /mcp {
        proxy_pass http://mcp_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Auth header check (mTLS or API key)
        if ($http_authorization = "") {
            return 401;
        }

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Redirect HTTP to HTTPS
    error_page 497 https://$host$request_uri;
}

# HTTP redirect
server {
    listen 80;
    server_name mcp.company.com;
    return 301 https://$server_name$request_uri;
}
```

### Phase 4: Monitoring & Alerting

**Prometheus Metrics Endpoint:**

```javascript
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP mcp_requests_total Total MCP requests
# TYPE mcp_requests_total counter
mcp_requests_total{role="windsurf"} ${windsurf_requests}
mcp_requests_total{role="antigravity"} ${antigravity_requests}

# HELP mcp_audit_entries_total Total audit log entries
# TYPE mcp_audit_entries_total counter
mcp_audit_entries_total ${audit_count}

# HELP mcp_session_active Active sessions
# TYPE mcp_session_active gauge
mcp_session_active ${active_sessions}

# HELP mcp_uptime_seconds Server uptime
# TYPE mcp_uptime_seconds gauge
mcp_uptime_seconds ${process.uptime()}
  `);
});
```

**Docker Health Check (Built-in):**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

---

## Deployment Checklist for 99.9% Uptime

- [ ] **Infrastructure**
  - [ ] 2+ cloud servers (minimum t3.medium on AWS)
  - [ ] PostgreSQL database with replication
  - [ ] Redis cluster for session state
  - [ ] Load balancer with health checks (30s interval)
  - [ ] SSL/TLS certificates (Let's Encrypt or paid CA)
  - [ ] CloudWatch/Datadog monitoring
  - [ ] Automated backup strategy (daily, 30-day retention)

- [ ] **Code Changes**
  - [ ] `server-network.js` — HTTP endpoint + load balancer support
  - [ ] `core/audit-storage.js` — PostgreSQL backend
  - [ ] `core/session-store.js` — Redis backend
  - [ ] Client failover logic in `client-config.js`
  - [ ] Metrics endpoint for Prometheus/Datadog

- [ ] **Testing**
  - [ ] Load test: 10+ concurrent clients
  - [ ] Failover test: Kill one server, verify clients reconnect
  - [ ] Data integrity: Verify audit log consistency across replicas
  - [ ] Latency: Ensure <500ms response time under load

- [ ] **Operations**
  - [ ] Automated alerts: CPU >80%, disk >85%, error rate >1%
  - [ ] Log aggregation (ELK stack, Splunk, or Datadog)
  - [ ] On-call runbook for incidents
  - [ ] Regular disaster recovery drills (monthly)

---

## Estimated Uptime

| Configuration | Availability |
|---------------|-------------|
| Single server | 99.0% (87.6 hours downtime/year) |
| Active-Active (2 servers) | 99.9% (8.8 hours downtime/year) |
| Active-Active + DB failover | 99.99% (52 minutes downtime/year) |
| Multi-region (3+ regions) | 99.999% (5.3 minutes downtime/year) |

**To achieve 99.9%:**
- 2 MCP servers (load balanced)
- PostgreSQL with synchronous replication
- Automated failover (Patroni or RDS Multi-AZ)
- Monitoring + alerting with <5 min detection/response

---

## Cost Estimates (AWS)

| Component | Cost/Month |
|-----------|-----------|
| 2x t3.medium EC2 (on-demand) | ~$60 |
| RDS PostgreSQL (db.t3.micro, Multi-AZ) | ~$80 |
| ElastiCache Redis (cache.t3.micro) | ~$30 |
| ELB + data transfer | ~$20 |
| CloudWatch monitoring | ~$10 |
| **Total** | **~$200/month** |

For reserved instances (1-year): ~$120/month (40% discount)

---

## Security Hardening

1. **Network Security**
   - Restrict inbound to load balancer IP only
   - Use VPC security groups / NSGs
   - Enable VPC Flow Logs

2. **Authentication**
   - Require mTLS (mutual TLS) between clients and server
   - API key rotation (30-day expiry)
   - IP whitelisting for known clients

3. **Encryption**
   - TLS 1.2+ for all network traffic
   - At-rest encryption for PostgreSQL (AWS KMS)
   - Encrypted backups

4. **Audit Compliance**
   - Log all connections (IP, timestamp, auth failure)
   - Immutable audit log (hash chain verification)
   - Export audit log to S3 with object lock (WORM)

---

## Runbooks

### Server Outage Response

1. **Detection** (automated): Health check fails 3x (90 seconds)
2. **Isolation** (automated): Load balancer removes failed server
3. **Alert**: PagerDuty/Slack notification
4. **Investigation**: SSH into standby server, check logs
5. **Recovery**: Restart container via Docker Compose or Kubernetes
6. **Validation**: Verify audit log integrity post-recovery
7. **Restoration**: If data loss, replicate from standby

### Database Failover

1. **Detection**: PostgreSQL connection timeout or replication lag >30s
2. **Isolation**: Failover to standby (Patroni handles automatically)
3. **Clients**: Reconnect via updated DNS record
4. **Validation**: Run `verify_workspace_integrity` on all clients
5. **Backup**: Snapshot new primary immediately

---

## Next Steps

1. **Implement Phase 1** (`server-network.js` + Docker)
2. **Test locally** with docker-compose setup
3. **Deploy to staging** on cloud provider
4. **Load test** with JMeter or k6
5. **Promote to production** with gradual traffic shift
6. **Monitor** for 2 weeks before declaring 99.9% ready
