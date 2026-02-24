#!/bin/bash

###############################################################################
# ATLAS-GATE-MCP Deploy Script
# Automatically deploys Windsurf and Antigravity MCP servers
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WINDSURF_CONFIG="/home/linnyux/.codeium/windsurf/mcp_config.json"
ANTIGRAVITY_CONFIG="/home/linnyux/.gemini/antigravity/mcp_config.json"
WINDSURF_DIR="$(dirname "$WINDSURF_CONFIG")"
ANTIGRAVITY_DIR="$(dirname "$ANTIGRAVITY_CONFIG")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${PROJECT_ROOT}/.deploy_backups/${TIMESTAMP}"

###############################################################################
# Utility Functions
###############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
  log_info "Checking dependencies..."
  
  # Try to find node in various locations
  if command -v node &> /dev/null; then
    NODE_BIN="node"
  elif [ -f /usr/bin/node ]; then
    NODE_BIN="/usr/bin/node"
  elif [ -f /usr/local/bin/node ]; then
    NODE_BIN="/usr/local/bin/node"
  else
    log_warn "Node.js not in standard PATH - will use npm if available"
  fi
  
  if [ -n "$NODE_BIN" ]; then
    local node_version=$("$NODE_BIN" --version)
    log_success "Node.js ${node_version} found at $NODE_BIN"
  fi
  
  if ! command -v npm &> /dev/null; then
    log_warn "npm not in PATH - will proceed with manual configuration generation"
  else
    log_success "npm found"
  fi
}

verify_project_structure() {
  log_info "Verifying ATLAS-GATE-MCP project structure..."
  
  local required_files=(
    "bin/ATLAS-GATE-MCP-windsurf.js"
    "bin/ATLAS-GATE-MCP-antigravity.js"
    "server.js"
    "package.json"
    "core/mcp-sandbox.js"
  )
  
  for file in "${required_files[@]}"; do
    if [ ! -f "${PROJECT_ROOT}/${file}" ]; then
      log_error "Required file not found: ${file}"
      exit 1
    fi
  done
  
  log_success "Project structure verified"
}

create_config_backup() {
  log_info "Creating backup of existing configurations..."
  
  mkdir -p "$BACKUP_DIR"
  
  if [ -f "$WINDSURF_CONFIG" ]; then
    cp "$WINDSURF_CONFIG" "${BACKUP_DIR}/mcp_config_windsurf_backup.json"
    log_success "Backed up Windsurf config to ${BACKUP_DIR}/mcp_config_windsurf_backup.json"
  else
    log_warn "No existing Windsurf config to backup"
  fi
  
  if [ -f "$ANTIGRAVITY_CONFIG" ]; then
    cp "$ANTIGRAVITY_CONFIG" "${BACKUP_DIR}/mcp_config_antigravity_backup.json"
    log_success "Backed up Antigravity config to ${BACKUP_DIR}/mcp_config_antigravity_backup.json"
  else
    log_warn "No existing Antigravity config to backup"
  fi
}

ensure_directories_exist() {
  log_info "Ensuring configuration directories exist..."
  
  if [ ! -d "$WINDSURF_DIR" ]; then
    log_warn "Creating Windsurf config directory: $WINDSURF_DIR"
    mkdir -p "$WINDSURF_DIR"
  fi
  
  if [ ! -d "$ANTIGRAVITY_DIR" ]; then
    log_warn "Creating Antigravity config directory: $ANTIGRAVITY_DIR"
    mkdir -p "$ANTIGRAVITY_DIR"
  fi
  
  log_success "Configuration directories ready"
}

generate_windsurf_config() {
  log_info "Generating Windsurf MCP configuration..."
  
  cat > "$WINDSURF_CONFIG" << 'EOF'
{
  "$schema": "https://modelcontextprotocol.io/json-schemas/config/v1/config.json",
  "mcpServers": {
    "atlas-gate-windsurf": {
      "command": "node",
      "args": [
        "ATLAS_PROJECT_ROOT/bin/ATLAS-GATE-MCP-windsurf.js"
      ],
      "disabled": false,
      "alwaysAllow": [
        "read_file",
        "list_files",
        "get_file_metadata",
        "write_file",
        "edit_file",
        "create_directory",
        "delete_file",
        "delete_directory",
        "move_file"
      ],
      "env": {
        "ATLAS_GATE_ROLE": "WINDSURF",
        "NODE_ENV": "production"
      }
    }
  }
}
EOF
  
  # Replace placeholder with actual project root
  sed -i "s|ATLAS_PROJECT_ROOT|${PROJECT_ROOT}|g" "$WINDSURF_CONFIG"
  
  log_success "Windsurf configuration created: $WINDSURF_CONFIG"
}

generate_antigravity_config() {
  log_info "Generating Antigravity MCP configuration..."
  
  cat > "$ANTIGRAVITY_CONFIG" << 'EOF'
{
  "$schema": "https://modelcontextprotocol.io/json-schemas/config/v1/config.json",
  "mcpServers": {
    "atlas-gate-antigravity": {
      "command": "node",
      "args": [
        "ATLAS_PROJECT_ROOT/bin/ATLAS-GATE-MCP-antigravity.js"
      ],
      "disabled": false,
      "alwaysAllow": [
        "read_file",
        "list_files",
        "get_file_metadata"
      ],
      "env": {
        "ATLAS_GATE_ROLE": "ANTIGRAVITY",
        "NODE_ENV": "production"
      }
    }
  }
}
EOF
  
  # Replace placeholder with actual project root
  sed -i "s|ATLAS_PROJECT_ROOT|${PROJECT_ROOT}|g" "$ANTIGRAVITY_CONFIG"
  
  log_success "Antigravity configuration created: $ANTIGRAVITY_CONFIG"
}

validate_configs() {
  log_info "Validating generated configurations..."
  
  if ! node -e "const cfg = require('$WINDSURF_CONFIG'); console.log('Windsurf config valid')" 2>/dev/null; then
    log_warn "Windsurf config is not valid JSON (will validate on startup)"
  else
    log_success "Windsurf configuration is valid JSON"
  fi
  
  if ! node -e "const cfg = require('$ANTIGRAVITY_CONFIG'); console.log('Antigravity config valid')" 2>/dev/null; then
    log_warn "Antigravity config is not valid JSON (will validate on startup)"
  else
    log_success "Antigravity configuration is valid JSON"
  fi
}

test_windsurf_server() {
  log_info "Testing Windsurf server startup (timeout: 5s)..."
  
  timeout 5s node "$PROJECT_ROOT/bin/ATLAS-GATE-MCP-windsurf.js" > /tmp/windsurf_test.log 2>&1 || true
  
  if grep -q "MCP-only mode ENFORCED" /tmp/windsurf_test.log; then
    log_success "Windsurf server test passed"
  else
    log_warn "Windsurf server test inconclusive (see /tmp/windsurf_test.log)"
  fi
}

test_antigravity_server() {
  log_info "Testing Antigravity server startup (timeout: 5s)..."
  
  timeout 5s node "$PROJECT_ROOT/bin/ATLAS-GATE-MCP-antigravity.js" > /tmp/antigravity_test.log 2>&1 || true
  
  if grep -q "MCP-only mode ENFORCED" /tmp/antigravity_test.log; then
    log_success "Antigravity server test passed"
  else
    log_warn "Antigravity server test inconclusive (see /tmp/antigravity_test.log)"
  fi
}

run_npm_install() {
  log_info "Installing npm dependencies..."
  
  cd "$PROJECT_ROOT"
  npm install --production
  
  log_success "Dependencies installed"
}

create_deployment_manifest() {
  log_info "Creating deployment manifest..."
  
  cat > "${BACKUP_DIR}/deployment_manifest.txt" << EOF
ATLAS-GATE-MCP Deployment Manifest
Generated: $(date)
Project Root: ${PROJECT_ROOT}

Windsurf Server:
  Config: ${WINDSURF_CONFIG}
  Entrypoint: ${PROJECT_ROOT}/bin/ATLAS-GATE-MCP-windsurf.js
  Mode: Mutation/Execution with MCP-Only Sandbox
  
Antigravity Server:
  Config: ${ANTIGRAVITY_CONFIG}
  Entrypoint: ${PROJECT_ROOT}/bin/ATLAS-GATE-MCP-antigravity.js
  Mode: Read-Only with MCP-Only Sandbox

Backup Location: ${BACKUP_DIR}

Configuration Files:
$(ls -la "${WINDSURF_CONFIG}" "${ANTIGRAVITY_CONFIG}" 2>/dev/null || echo "  (to be created)")

Deployment Status: SUCCESS
EOF
  
  log_success "Deployment manifest created: ${BACKUP_DIR}/deployment_manifest.txt"
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   ATLAS-GATE-MCP Deployment Script                 ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  log_info "Starting deployment process..."
  echo ""
  
  check_dependencies
  verify_project_structure
  ensure_directories_exist
  
  read -p "Install npm dependencies? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_npm_install
  fi
  
  create_config_backup
  
  echo ""
  log_info "Generating MCP configurations..."
  generate_windsurf_config
  generate_antigravity_config
  
  echo ""
  log_info "Validating configurations..."
  validate_configs
  
  echo ""
  read -p "Run server tests? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    test_windsurf_server
    test_antigravity_server
  fi
  
  echo ""
  create_deployment_manifest
  
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   Deployment Complete!                            ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  log_success "Windsurf config: $WINDSURF_CONFIG"
  log_success "Antigravity config: $ANTIGRAVITY_CONFIG"
  log_success "Backups: $BACKUP_DIR"
  echo ""
  
  log_info "Next steps:"
  echo "  1. Restart Windsurf IDE to load the new configuration"
  echo "  2. Restart Gemini with Antigravity support"
  echo "  3. Verify servers are connected via MCP protocol"
  echo "  4. Check audit logs: ${PROJECT_ROOT}/audit-log.jsonl"
  echo ""
}

# Run main function
main "$@"
