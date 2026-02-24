#!/bin/bash

################################################################################
# ATLAS-GATE HTTP Server - Complete Deployment Script
################################################################################
# One-command deployment to Docker or Kubernetes
# Auto-installs Docker & Kubernetes if missing
# Usage: ./deploy.sh [docker|kubernetes] [--options]
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_MODE="${1:-docker}"
SERVER_IP="${SERVER_IP:-localhost}"
DOMAIN="${DOMAIN:-atlas-gate.local}"
ENVIRONMENT="${ENVIRONMENT:-production}"
REGISTRY="${REGISTRY:-}"
IMAGE_NAME="${REGISTRY:+$REGISTRY/}atlas-gate"
IMAGE_TAG="latest"

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

print_banner() {
  echo -e "${BLUE}"
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║       ATLAS-GATE HTTP Server - Deployment Script             ║"
  echo "║          Mode: $DEPLOY_MODE ($(echo $DEPLOY_MODE | tr '[:lower:]' '[:upper:]'))                      ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

check_root() {
  if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
  fi
}

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
  else
    log_error "Cannot detect OS"
  fi
  
  log_success "Detected OS: $OS $OS_VERSION"
}

################################################################################
# DOCKER INSTALLATION
################################################################################

install_docker() {
  log_info "Installing Docker..."
  
  case "$OS" in
    ubuntu|debian)
      log_info "Installing Docker on Debian/Ubuntu..."
      
      # Update package manager
      apt-get update
      apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
      
      # Add Docker GPG key
      curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
      
      # Add Docker repository
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
      
      # Install Docker
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      
      log_success "Docker installed"
      ;;
      
    centos|rhel|fedora)
      log_info "Installing Docker on CentOS/RHEL/Fedora..."
      
      yum install -y yum-utils
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      systemctl start docker
      systemctl enable docker
      
      log_success "Docker installed"
      ;;
      
    alpine)
      log_info "Installing Docker on Alpine..."
      apk add --no-cache docker docker-compose
      rc-service docker start
      rc-update add docker
      
      log_success "Docker installed"
      ;;
      
    *)
      log_error "Unsupported OS: $OS. Please install Docker manually: https://docs.docker.com/engine/install/"
      ;;
  esac
}

install_docker_compose() {
  log_info "Installing Docker Compose..."
  
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
  
  curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  
  log_success "Docker Compose installed: $(docker-compose --version)"
}

################################################################################
# KUBERNETES INSTALLATION
################################################################################

install_kubectl() {
  log_info "Installing kubectl..."
  
  KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
  
  curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
  chmod +x kubectl
  mv kubectl /usr/local/bin/kubectl
  
  log_success "kubectl installed: $(kubectl version --client --short)"
}

install_kind() {
  log_info "Installing kind (Kubernetes in Docker)..."
  
  curl -Lo /usr/local/bin/kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
  chmod +x /usr/local/bin/kind
  
  log_success "kind installed: $(kind --version)"
}

create_kind_cluster() {
  log_info "Creating Kubernetes cluster with kind..."
  
  # Check if cluster already exists
  if kind get clusters 2>/dev/null | grep -q "atlas-gate-cluster"; then
    log_warn "Cluster atlas-gate-cluster already exists, skipping creation"
    return
  fi
  
  # Create cluster
  kind create cluster --name atlas-gate-cluster --config - << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: atlas-gate-cluster
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
  - containerPort: 3000
    hostPort: 3000
    protocol: TCP
- role: worker
- role: worker
EOF
  
  log_success "Kubernetes cluster created: atlas-gate-cluster"
  
  # Wait for cluster to be ready
  log_info "Waiting for cluster to be ready..."
  sleep 10
  
  kubectl cluster-info
}

install_ingress_nginx() {
  log_info "Installing Nginx Ingress Controller..."
  
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
  
  log_success "Ingress Nginx installed"
}

################################################################################
# DOCKER DEPLOYMENT
################################################################################

deploy_docker() {
  print_banner
  
  log_info "Deploying ATLAS-GATE with Docker Compose..."
  
  # Check if Docker is installed, install if not
  if ! command -v docker &> /dev/null; then
    log_warn "Docker not found, installing..."
    detect_os
    check_root
    install_docker
  fi
  log_success "Docker is available"
  
  # Check if Docker Compose is installed, install if not
  if ! command -v docker-compose &> /dev/null; then
    log_warn "Docker Compose not found, installing..."
    install_docker_compose
  fi
  log_success "Docker Compose is available"
  
  log_info "Building Docker image..."
  docker build -t "$IMAGE_NAME:$IMAGE_TAG" "$SCRIPT_DIR"
  log_success "Docker image built: $IMAGE_NAME:$IMAGE_TAG"
  
  # Create .env file
  log_info "Creating configuration..."
  cat > "$SCRIPT_DIR/.env" << EOF
ENVIRONMENT=$ENVIRONMENT
ATLAS_GATE_PORT=3000
REPOS_PATH=/tmp/repos
NODE_ENV=$ENVIRONMENT
EOF
  
  log_success "Configuration created"
  
  # Start containers
  log_info "Starting containers..."
  cd "$SCRIPT_DIR"
  docker-compose up -d
  
  sleep 3
  
  # Check health
  if docker exec atlas-gate-http curl -f http://localhost:3000/health >/dev/null 2>&1; then
    log_success "ATLAS-GATE HTTP Server is running!"
  else
    log_warn "Server may still be starting. Check logs with: docker-compose logs -f atlas-gate"
  fi
  
  # Get initial API key
  log_info "Retrieving initial API key..."
  API_KEY=$(docker logs atlas-gate-http 2>&1 | grep "API Key:" | head -1 | awk '{print $NF}' || echo "CHECK_LOGS")
  
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}Deployment Complete!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Server URL:     http://$SERVER_IP:3000"
  echo "API Key:        $API_KEY"
  echo ""
  echo "Next steps:"
  echo "  1. Create a session:"
  echo "     curl -X POST http://$SERVER_IP:3000/sessions/create \\"
  echo "       -H \"X-API-Key: $API_KEY\" \\"
  echo "       -H \"Content-Type: application/json\" \\"
  echo "       -d '{\"workspaceRoot\": \"/path/to/repo\"}'"
  echo ""
  echo "  2. View logs:"
  echo "     docker-compose logs -f atlas-gate"
  echo ""
  echo "  3. Stop server:"
  echo "     docker-compose down"
  echo ""
  
  save_credentials "$API_KEY"
}

################################################################################
# KUBERNETES DEPLOYMENT
################################################################################

deploy_kubernetes() {
  print_banner
  
  log_info "Deploying ATLAS-GATE to Kubernetes..."
  
  # Check if kubectl is installed, install if not
  if ! command -v kubectl &> /dev/null; then
    log_warn "kubectl not found, installing..."
    check_root
    install_kubectl
  fi
  log_success "kubectl is available"
  
  # Check if Docker is installed (needed for building images)
  if ! command -v docker &> /dev/null; then
    log_warn "Docker not found, installing..."
    detect_os
    check_root
    install_docker
  fi
  log_success "Docker is available"
  
  # Check if Kubernetes cluster is available
  if ! kubectl cluster-info &>/dev/null; then
    log_warn "No Kubernetes cluster found, installing kind and creating cluster..."
    check_root
    install_kind
    create_kind_cluster
    install_ingress_nginx
  fi
  
  log_success "Connected to Kubernetes cluster"
  
  # Build and push image if registry is specified
  if [ -n "$REGISTRY" ]; then
    log_info "Building and pushing Docker image to registry..."
    docker build -t "$IMAGE_NAME:$IMAGE_TAG" "$SCRIPT_DIR"
    docker push "$IMAGE_NAME:$IMAGE_TAG"
    log_success "Image pushed: $IMAGE_NAME:$IMAGE_TAG"
  else
    log_warn "No registry specified. Building local image..."
    log_info "Building Docker image for local use..."
    docker build -t "$IMAGE_NAME:$IMAGE_TAG" "$SCRIPT_DIR"
    
    # For kind, load image into cluster
    if command -v kind &>/dev/null; then
      log_info "Loading image into kind cluster..."
      kind load docker-image "$IMAGE_NAME:$IMAGE_TAG" --name atlas-gate-cluster
    fi
  fi
  
  # Create namespace
  log_info "Creating namespace..."
  kubectl create namespace atlas-gate --dry-run=client -o yaml | kubectl apply -f -
  log_success "Namespace ready"
  
  # Generate API key secret
  log_info "Creating API key secret..."
  ADMIN_API_KEY=$(openssl rand -hex 32)
  
  kubectl create secret generic atlas-gate-secrets \
    --from-literal=admin-api-key="$ADMIN_API_KEY" \
    -n atlas-gate \
    --dry-run=client -o yaml | kubectl apply -f -
  
  log_success "Secret created"
  
  # Update image in manifest
  log_info "Applying Kubernetes manifests..."
  
  # Create temporary manifest with updated image
  sed "s|atlas-gate:latest|$IMAGE_NAME:$IMAGE_TAG|g" "$SCRIPT_DIR/k8s-deployment.yaml" | \
    sed "s|atlas-gate.example.com|$DOMAIN|g" | \
    kubectl apply -f -
  
  log_success "Manifests applied"
  
  # Wait for deployment
  log_info "Waiting for deployment to be ready (this may take a minute)..."
  kubectl rollout status deployment/atlas-gate -n atlas-gate --timeout=300s
  log_success "Deployment is ready!"
  
  # Get service information
  log_info "Retrieving service information..."
  
  # Try LoadBalancer first
  LB_IP=$(kubectl get service atlas-gate-lb -n atlas-gate -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
  LB_HOSTNAME=$(kubectl get service atlas-gate-lb -n atlas-gate -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
  
  if [ -z "$LB_IP" ] && [ -z "$LB_HOSTNAME" ]; then
    SERVICE_URL="http://atlas-gate-service.atlas-gate.svc.cluster.local:3000"
    EXTERNAL_URL="Use port-forward: kubectl port-forward -n atlas-gate svc/atlas-gate-service 3000:3000"
  elif [ -n "$LB_IP" ]; then
    SERVICE_URL="http://$LB_IP:3000"
    EXTERNAL_URL="http://$LB_IP"
  else
    SERVICE_URL="http://$LB_HOSTNAME:3000"
    EXTERNAL_URL="http://$LB_HOSTNAME"
  fi
  
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}Kubernetes Deployment Complete!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Internal Service URL: $SERVICE_URL"
  echo "External Access:      $EXTERNAL_URL"
  echo "Admin API Key:        $ADMIN_API_KEY"
  echo "Domain:               $DOMAIN"
  echo ""
  echo "Next steps:"
  echo ""
  echo "1. Port-forward to access locally:"
  echo "   kubectl port-forward -n atlas-gate svc/atlas-gate-service 3000:3000"
  echo ""
  echo "2. View logs:"
  echo "   kubectl logs -n atlas-gate -f deployment/atlas-gate"
  echo ""
  echo "3. Check pod status:"
  echo "   kubectl get pods -n atlas-gate"
  echo ""
  echo "4. Scale deployment:"
  echo "   kubectl scale deployment atlas-gate -n atlas-gate --replicas=5"
  echo ""
  echo "5. Delete deployment:"
  echo "   kubectl delete namespace atlas-gate"
  echo ""
  
  save_credentials "$ADMIN_API_KEY"
}

################################################################################
# UTILITY FUNCTIONS
################################################################################

save_credentials() {
  local api_key=$1
  local creds_file="$SCRIPT_DIR/.atlas-gate-creds"
  
  cat > "$creds_file" << EOF
# ATLAS-GATE Credentials
# Generated: $(date)
# Deployment Mode: $DEPLOY_MODE

export ATLAS_GATE_API_KEY="$api_key"
export ATLAS_GATE_URL="http://$SERVER_IP:3000"
export ATLAS_GATE_DOMAIN="$DOMAIN"
export ATLAS_GATE_MODE="$DEPLOY_MODE"

# Source this file to load credentials:
# source $creds_file
EOF
  
  chmod 600 "$creds_file"
  log_success "Credentials saved to: $creds_file"
  echo "  Source with: source $creds_file"
}

show_help() {
  cat << EOF
ATLAS-GATE Deployment Script - Auto-Install Version

Usage: $0 [MODE] [OPTIONS]

MODE:
  docker       Deploy with Docker Compose (default)
               Installs Docker & Docker Compose if missing
  kubernetes   Deploy to Kubernetes cluster
               Installs kubectl & kind (K8s in Docker) if missing

OPTIONS:
  --server IP    Server IP/hostname (default: localhost)
  --domain DOMAIN  Domain name (default: atlas-gate.local)
  --registry URL   Docker registry URL (for Kubernetes)
  --env ENV        Environment (production/staging/development)
  --help          Show this help message

Examples:
  # Deploy locally with Docker (auto-installs Docker)
  sudo ./deploy.sh docker

  # Deploy to Kubernetes (auto-installs kind cluster)
  sudo ./deploy.sh kubernetes --domain atlas-gate.example.com

  # Deploy to Kubernetes with custom registry
  sudo ./deploy.sh kubernetes --registry gcr.io/my-project --domain atlas-gate.example.com

Environment Variables:
  ATLAS_GATE_PORT      Server port (default: 3000)
  ENVIRONMENT          Environment name (default: production)
  REGISTRY             Docker registry URL

Requirements:
  - Must run as root or with sudo
  - Linux OS (Ubuntu, Debian, CentOS, RHEL, Fedora, or Alpine)
  - Internet connection (to download packages)
  - At least 2GB RAM available

EOF
}

################################################################################
# MAIN
################################################################################

case "${1:-docker}" in
  docker)
    deploy_docker
    ;;
  kubernetes|k8s)
    deploy_kubernetes
    ;;
  --help|-h)
    show_help
    ;;
  *)
    log_error "Unknown mode: $1. Use 'docker' or 'kubernetes'. Run with --help for usage."
    ;;
esac

log_success "Deployment script complete!"
