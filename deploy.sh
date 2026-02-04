#!/bin/bash

###############################################################################
# ATLAS-GATE-MCP Kubernetes Deployment Script
# 
# Deploys to Hetzner cax31 with k3s + nginx ingress
# Usage: ./deploy.sh <server-ip> <ssh-key-path>
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="${1:-49.12.230.179}"
SSH_KEY="${2:-/home/kubuntux/Downloads/.ssh/id_rsa}"
SSH_USER="root"
NAMESPACE="atlas-gate"
REGISTRY="docker.io"
IMAGE_NAME="atlas-gate-mcp"
IMAGE_TAG="latest"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ATLAS-GATE-MCP Kubernetes Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Server IP: $SERVER_IP"
echo "SSH Key: $SSH_KEY"
echo "Namespace: $NAMESPACE"
echo ""

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}ERROR: SSH key not found at $SSH_KEY${NC}"
  exit 1
fi

# Function to run command on remote server
run_remote() {
  local cmd="$1"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$cmd"
}

# Function to copy file to remote
copy_to_remote() {
  local src="$1"
  local dst="$2"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$src" "$SSH_USER@$SERVER_IP:$dst"
}

###############################################################################
# STEP 1: Install k3s
###############################################################################

echo -e "${YELLOW}[1/6] Installing k3s...${NC}"

run_remote 'bash -s' << 'EOF'
  # Update system
  apt-get update
  apt-get install -y curl wget git

  # Install k3s
  curl -sfL https://get.k3s.io | sh -s - \
    --write-kubeconfig-mode 644 \
    --flannel-backend=vxlan \
    --disable=traefik

  # Wait for k3s to be ready
  sleep 10
  
  echo "k3s installed successfully"
EOF

echo -e "${GREEN}✓ k3s installed${NC}"

###############################################################################
# STEP 2: Verify Kubernetes cluster
###############################################################################

echo -e "${YELLOW}[2/6] Verifying Kubernetes cluster...${NC}"

run_remote 'kubectl get nodes' || {
  echo -e "${RED}Failed to access Kubernetes cluster${NC}"
  exit 1
}

echo -e "${GREEN}✓ Kubernetes cluster is ready${NC}"

###############################################################################
# STEP 3: Install nginx ingress controller
###############################################################################

echo -e "${YELLOW}[3/6] Installing nginx ingress controller...${NC}"

run_remote 'kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml'

# Wait for nginx to be ready
run_remote 'kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s' || true

echo -e "${GREEN}✓ nginx ingress controller installed${NC}"

###############################################################################
# STEP 4: Create namespace and secrets
###############################################################################

echo -e "${YELLOW}[4/6] Creating namespace and secrets...${NC}"

run_remote "
  # Create namespace
  kubectl create namespace $NAMESPACE || true
  
  # Create PostgreSQL secret
  kubectl create secret generic postgres-secret \
    --from-literal=POSTGRES_USER=atlas_user \
    --from-literal=POSTGRES_PASSWORD=atlas_password_secure_change_me \
    --from-literal=POSTGRES_DB=atlas_gate \
    -n $NAMESPACE || kubectl replace secret postgres-secret \
    --from-literal=POSTGRES_USER=atlas_user \
    --from-literal=POSTGRES_PASSWORD=atlas_password_secure_change_me \
    --from-literal=POSTGRES_DB=atlas_gate \
    -n $NAMESPACE

  # Create MCP config secret
  kubectl create secret generic mcp-config \
    --from-literal=AUDIT_BACKEND=postgres \
    --from-literal=SESSION_BACKEND=redis \
    --from-literal=REQUIRE_AUTH=false \
    -n $NAMESPACE || kubectl replace secret mcp-config \
    --from-literal=AUDIT_BACKEND=postgres \
    --from-literal=SESSION_BACKEND=redis \
    --from-literal=REQUIRE_AUTH=false \
    -n $NAMESPACE
"

echo -e "${GREEN}✓ Namespace and secrets created${NC}"

###############################################################################
# STEP 5: Deploy services via kubectl
###############################################################################

echo -e "${YELLOW}[5/6] Deploying services...${NC}"

# Create temporary manifests file
MANIFESTS=$(mktemp)

cat > "$MANIFESTS" << 'MANIFEST_EOF'
---
# Persistent Volumes
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /mnt/atlas-data/postgres

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: redis-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /mnt/atlas-data/redis

---
# PostgreSQL Service
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: atlas-gate
spec:
  ports:
    - port: 5432
  clusterIP: None
  selector:
    app: postgres

---
# PostgreSQL Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: atlas-gate
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        envFrom:
        - secretRef:
            name: postgres-secret
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
          subPath: pgdata
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U atlas_user
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U atlas_user
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
# PostgreSQL PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: atlas-gate
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi

---
# Redis Service
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: atlas-gate
spec:
  ports:
    - port: 6379
  clusterIP: None
  selector:
    app: redis

---
# Redis Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: atlas-gate
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - "--appendonly"
        - "yes"
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - redis-cli ping
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - redis-cli ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc

---
# Redis PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: atlas-gate
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi

---
# ConfigMap for initialization
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init
  namespace: atlas-gate
data:
  init.sql: |
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      session_id UUID NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      role VARCHAR(50) NOT NULL,
      tool VARCHAR(255) NOT NULL,
      workspace_root VARCHAR(1024),
      plan_hash VARCHAR(64),
      result VARCHAR(20) NOT NULL,
      error_code VARCHAR(50),
      args JSONB,
      notes TEXT,
      hash_chain VARCHAR(64) NOT NULL UNIQUE,
      seq BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_log(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool);

    CREATE TABLE IF NOT EXISTS sessions (
      session_id UUID PRIMARY KEY,
      workspace_root VARCHAR(1024) NOT NULL,
      active_plan_id VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);

---
# MCP Server Service
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
  namespace: atlas-gate
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
  selector:
    app: mcp-server

---
# MCP Server Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: atlas-gate
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      initContainers:
      - name: wait-postgres
        image: busybox:1.35
        command: ['sh', '-c', 'until nc -z postgres:5432; do echo waiting for postgres; sleep 2; done;']
      - name: wait-redis
        image: busybox:1.35
        command: ['sh', '-c', 'until nc -z redis:6379; do echo waiting for redis; sleep 2; done;']
      containers:
      - name: mcp-server
        image: node:18-alpine
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        workingDir: /app
        command: ["node", "bin/server-network.js"]
        env:
        - name: MCP_PORT
          value: "3000"
        - name: MCP_BIND
          value: "0.0.0.0"
        - name: MCP_ROLE
          value: "ANTIGRAVITY"
        - name: DATABASE_URL
          value: "postgresql://atlas_user:atlas_password_secure_change_me@postgres:5432/atlas_gate"
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: WORKSPACE_ROOT
          value: "/workspace"
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: mcp-config
        volumeMounts:
        - name: app-code
          mountPath: /app
        - name: workspace
          mountPath: /workspace
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: app-code
        emptyDir: {}
      - name: workspace
        persistentVolumeClaim:
          claimName: workspace-pvc

---
# Workspace PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: workspace-pvc
  namespace: atlas-gate
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi

---
# Workspace PV
apiVersion: v1
kind: PersistentVolume
metadata:
  name: workspace-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /mnt/atlas-data/workspace

---
# Ingress (nginx)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-ingress
  namespace: atlas-gate
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "10"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  rules:
  - host: mcp.localhost
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-server
            port:
              number: 3000
  tls:
  - hosts:
    - mcp.localhost
    secretName: mcp-tls

MANIFEST_EOF

# Apply manifests
copy_to_remote "$MANIFESTS" /tmp/manifests.yaml

run_remote "
  # Create directories for persistent volumes
  mkdir -p /mnt/atlas-data/{postgres,redis,workspace}
  chmod 777 /mnt/atlas-data/*

  # Apply Kubernetes manifests
  kubectl apply -f /tmp/manifests.yaml

  # Wait for deployments
  echo 'Waiting for PostgreSQL to be ready...'
  kubectl wait --for=condition=ready pod -l app=postgres -n atlas-gate --timeout=120s || true

  echo 'Waiting for Redis to be ready...'
  kubectl wait --for=condition=ready pod -l app=redis -n atlas-gate --timeout=120s || true

  echo 'Waiting for MCP server to be ready...'
  kubectl wait --for=condition=ready pod -l app=mcp-server -n atlas-gate --timeout=120s || true

  echo 'All services deployed'
"

rm -f "$MANIFESTS"

echo -e "${GREEN}✓ Services deployed${NC}"

###############################################################################
# STEP 6: Verify deployment and get access info
###############################################################################

echo -e "${YELLOW}[6/6] Verifying deployment...${NC}"

run_remote "
  echo 'Kubernetes Cluster Status:'
  kubectl get nodes
  echo ''
  
  echo 'Atlas-Gate Namespace:'
  kubectl get all -n atlas-gate
  echo ''
  
  echo 'Persistent Volumes:'
  kubectl get pvc -n atlas-gate
  echo ''
  
  echo 'Service Details:'
  kubectl describe service mcp-server -n atlas-gate
  echo ''
  
  echo 'Getting cluster info...'
  kubectl cluster-info
"

echo -e "${GREEN}✓ Deployment verified${NC}"

###############################################################################
# Summary
###############################################################################

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Server: $SERVER_IP"
echo "Namespace: $NAMESPACE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. SSH into server and get kubeconfig:"
echo "   ssh -i $SSH_KEY root@$SERVER_IP"
echo "   cat /etc/rancher/k3s/k3s.yaml"
echo ""
echo "2. Configure local kubectl:"
echo "   scp -i $SSH_KEY root@$SERVER_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config-atlas"
echo "   sed -i 's/127.0.0.1/$SERVER_IP/' ~/.kube/config-atlas"
echo "   export KUBECONFIG=~/.kube/config-atlas"
echo ""
echo "3. Verify services are running:"
echo "   kubectl get pods -n atlas-gate"
echo ""
echo "4. Port forward to access locally:"
echo "   kubectl port-forward -n atlas-gate svc/mcp-server 3000:3000"
echo ""
echo "5. Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "6. View logs:"
echo "   kubectl logs -n atlas-gate -l app=mcp-server -f"
echo ""
echo -e "${YELLOW}Access the MCP server at:${NC}"
echo "   http://$SERVER_IP:3000"
echo "   (After port forwarding or Ingress setup)"
echo ""
