# ATLAS-GATE-MCP Cloud Deployment Quick Start

## 5-Minute Local Setup (Testing)

### Prerequisites
- Docker & Docker Compose installed
- 4 GB RAM available
- Port 80, 443, 3000, 3001, 9090 available

### Launch

```bash
# Generate self-signed certificates for local testing
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -nodes -out certs/server.crt \
  -keyout certs/server.key -days 365 \
  -subj "/CN=localhost"

# Start all services
docker-compose up -d

# Wait for services to boot (30-60 seconds)
docker-compose ps

# Check health
curl http://localhost/health
curl https://localhost/health -k

# View logs
docker-compose logs -f mcp-server-1

# Access dashboards
# - Grafana: http://localhost:3001 (admin/atlas_admin_password)
# - Prometheus: http://localhost:9090
```

### Verify Everything Works

```bash
# List active sessions
curl http://localhost/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "begin_session", "args": {"workspace_root": "/workspace"}}'

# Check audit log
curl http://localhost/audit/export?limit=10 \
  -H "Authorization: Bearer test-token"

# Metrics
curl http://localhost/metrics
```

### Cleanup

```bash
docker-compose down -v  # Remove all volumes
```

---

## Production Deployment on AWS

### 1. Infrastructure Setup (15 minutes)

#### Create VPC
```bash
# 1. VPC with 3 availability zones
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1c

# 2. Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxx --vpc-id vpc-xxx

# 3. Route table
aws ec2 create-route-table --vpc-id vpc-xxx
aws ec2 create-route --route-table-id rtb-xxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxx
```

#### Create RDS PostgreSQL (Multi-AZ)
```bash
aws rds create-db-instance \
  --db-instance-identifier atlas-gate-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username atlas_user \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --backup-retention-period 30 \
  --enable-iam-database-authentication \
  --storage-encrypted \
  --vpc-security-group-ids sg-xxxxx
```

#### Create ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id atlas-gate-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx \
  --subnet-group-name atlas-subnet-group
```

#### Create Application Load Balancer
```bash
aws elbv2 create-load-balancer \
  --name atlas-gate-alb \
  --subnets subnet-1a subnet-1b subnet-1c \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name atlas-gate-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

### 2. Launch EC2 Instances (10 minutes)

```bash
# Create security group
aws ec2 create-security-group \
  --group-name atlas-gate-sg \
  --description "ATLAS-GATE-MCP Security Group" \
  --vpc-id vpc-xxxxx

# Allow inbound traffic
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp --port 3000 --cidr 10.0.0.0/16  # From ALB
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp --port 22 --cidr YOUR.IP.ADDRESS/32  # SSH from your IP

# Launch 2 t3.medium instances
for i in 1 2; do
  aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.medium \
    --key-name your-key \
    --security-group-ids sg-xxxxx \
    --subnet-id subnet-1a \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=atlas-gate-mcp-$i}]"
done
```

**user-data.sh:**
```bash
#!/bin/bash
set -e

# Update system
yum update -y
yum install -y docker git curl

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Clone repository
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git /app
cd /app

# Pull Docker image
docker pull node:18-alpine

# Set environment
export MCP_PORT=3000
export MCP_BIND=0.0.0.0
export DATABASE_URL=postgresql://atlas_user:PASSWORD@atlas-gate-db.REGION.rds.amazonaws.com:5432/atlas_gate
export REDIS_URL=redis://atlas-gate-redis.REGION.cache.amazonaws.com:6379

# Start server
docker run -d \
  -p 3000:3000 \
  -e MCP_PORT=3000 \
  -e MCP_BIND=0.0.0.0 \
  -e MCP_ROLE=ANTIGRAVITY \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -e AUDIT_BACKEND=postgres \
  -e SESSION_BACKEND=redis \
  --restart always \
  --name atlas-gate-mcp \
  node:18-alpine node /app/bin/server-network.js
```

### 3. Configure Load Balancer (5 minutes)

```bash
# Register instances with target group
INSTANCE_IDS=$(aws ec2 describe-instances --query 'Reservations[].Instances[?Tags[?Key==`Name` && Value==`atlas-gate*`]].InstanceId' --output text)

for id in $INSTANCE_IDS; do
  aws elbv2 register-targets \
    --target-group-arn arn:aws:elasticloadbalancing:... \
    --targets Id=$id,Port=3000
done

# Create listener for HTTP → HTTPS redirect
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

# Create listener for HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### 4. Setup Monitoring (5 minutes)

```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name atlas-gate-cpu-high \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

aws cloudwatch put-metric-alarm \
  --alarm-name atlas-gate-unhealthy-hosts \
  --alarm-description "Alert if targets become unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold

# Enable detailed CloudWatch Logs
aws logs create-log-group --log-group-name /atlas-gate/mcp
```

---

## Deployment on Azure

### 1. Create Resource Group
```bash
az group create --name atlas-gate-rg --location eastus
```

### 2. Deploy Container Instances (via template)
```bash
az container create \
  --resource-group atlas-gate-rg \
  --name atlas-gate-mcp-1 \
  --image mcr.microsoft.com/azure-app-service/node \
  --environment-variables \
    MCP_PORT=3000 \
    MCP_BIND=0.0.0.0 \
    DATABASE_URL="postgresql://..." \
    REDIS_URL="redis://..." \
  --ports 3000 \
  --protocol TCP \
  --restart-policy Always

# For HA: Deploy 2 instances and use Azure Load Balancer
az network lb create \
  --resource-group atlas-gate-rg \
  --name atlas-gate-lb \
  --sku Standard \
  --public-ip-address atlas-gate-pip
```

### 3. Create Managed PostgreSQL
```bash
az postgres flexible-server create \
  --resource-group atlas-gate-rg \
  --name atlas-gate-db \
  --location eastus \
  --admin-user atlas_user \
  --admin-password YourPassword123! \
  --storage-size 32 \
  --tier Burstable \
  --sku-name Standard_B1ms \
  --ha-enabled
```

---

## GCP Deployment

### 1. Create Project & Enable APIs
```bash
gcloud projects create atlas-gate-prod
gcloud config set project atlas-gate-prod

gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com \
  redis.googleapis.com
```

### 2. Deploy with Cloud Run (Serverless)
```bash
gcloud run deploy atlas-gate-mcp \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars \
    MCP_PORT=3000,\
    DATABASE_URL="postgresql://...",\
    REDIS_URL="redis://..." \
  --min-instances 2 \
  --max-instances 10 \
  --memory 2Gi \
  --cpu 2
```

### 3. Setup Cloud SQL Proxy (For PostgreSQL)
```bash
gcloud sql instances create atlas-gate-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1 \
  --backup \
  --retained-backups-count 30
```

---

## Verification & Health Checks

### Check Cluster Health
```bash
# From any instance, verify connectivity
curl -i http://localhost:3000/health
curl -i https://YOUR_ALB_DNS/health -k

# Check database connectivity
psql -h postgres-host -U atlas_user -d atlas_gate -c "SELECT COUNT(*) FROM audit_log;"

# Check Redis connectivity
redis-cli -h redis-host PING
```

### Verify Replication
```bash
# PostgreSQL replication status
psql -h primary-db -U atlas_user -d atlas_gate -c "SELECT * FROM pg_stat_replication;"

# On standby:
psql -h standby-db -U atlas_user -d atlas_gate -c "SELECT * FROM pg_last_xact_replay_timestamp();"
```

### Check Metrics
```bash
# Prometheus queries
curl "http://localhost:9090/api/v1/query?query=up{job=%22mcp%22}"
curl "http://localhost:9090/api/v1/query?query=mcp_uptime_seconds"

# Grafana dashboards
# Login: admin/atlas_admin_password
```

---

## Monitoring Dashboard Setup

### Prometheus Targets

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mcp-servers'
    static_configs:
      - targets: ['localhost:3000', 'localhost:3001']
        labels:
          instance: 'mcp-server-1'
      - targets: ['localhost:3002']
        labels:
          instance: 'mcp-server-2'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']  # postgres_exporter

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']  # redis_exporter
```

### Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| `mcp_uptime_seconds` | Falls to 0 | Server crash → failover |
| `mcp_memory_heapused_bytes` | > 80% | Memory leak investigation |
| `http_requests_total{result="error"}` | > 1% | Review error logs |
| `database_connections_used` | > 80% | Scale database |
| `redis_connected_clients` | > 100 | Session leak investigation |

---

## Backup & Disaster Recovery

### Automated Backups

```bash
# PostgreSQL
aws rds create-db-snapshot \
  --db-instance-identifier atlas-gate-db \
  --db-snapshot-identifier atlas-gate-backup-$(date +%Y%m%d)

# Redis
aws elasticache create-snapshot \
  --cache-cluster-id atlas-gate-redis \
  --snapshot-name atlas-gate-redis-backup-$(date +%Y%m%d)

# Audit log export to S3
aws s3 cp s3://atlas-gate-backups/audit-logs/ . \
  --recursive --exclude "*" --include "*.jsonl"
```

### Restore from Backup

```bash
# PostgreSQL restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier atlas-gate-db-restored \
  --db-snapshot-identifier atlas-gate-backup-20240201

# Redis restore
aws elasticache create-cache-cluster \
  --cache-cluster-id atlas-gate-redis-restored \
  --snapshot-name atlas-gate-redis-backup-20240201
```

---

## Cost Optimization

### Recommended Settings

| Component | Size | Cost/Month |
|-----------|------|-----------|
| 2x EC2 t3.medium | Compute | $60 |
| RDS db.t3.micro Multi-AZ | Database | $80 |
| ElastiCache t3.micro | Cache | $30 |
| ALB | Load balancer | $20 |
| Data transfer | 100 GB/month | $10 |
| **Total** | | **$200/month** |

### Cost Reduction
- Use reserved instances (40% discount for 1-year)
- Enable CloudWatch autoscaling
- Use spot instances for test environments
- Archive audit logs to S3 Glacier after 90 days

---

## Troubleshooting

### Server Won't Start
```bash
# Check logs
docker-compose logs mcp-server-1

# Verify database connection
psql -h postgres -U atlas_user -d atlas_gate -c "SELECT 1;"

# Check port binding
netstat -tlnp | grep 3000
```

### High Memory Usage
```bash
# Check Node process
ps aux | grep node

# Force garbage collection
curl -X POST http://localhost:3000/gc

# Review heap dump
node --expose-gc bin/server-network.js
```

### Database Connection Errors
```bash
# Verify credentials
psql -h postgres-host -U atlas_user -d atlas_gate

# Check connection pool
psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Next Steps

1. Deploy to staging first (3-5 days)
2. Run load tests (1000 concurrent clients)
3. Verify 99.9% uptime for 2 weeks
4. Deploy to production with gradual traffic shift
5. Set up on-call rotation and runbooks
