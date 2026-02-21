#!/bin/bash

###############################################################################
# ATLAS-GATE MCP - Raspberry Pi Quick Start Script
# 
# Usage: bash RPI_QUICK_START.sh
# Runs on: Raspberry Pi OS (32-bit or 64-bit)
# Requirements: internet connection, sudo access
###############################################################################

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     ATLAS-GATE MCP - Raspberry Pi Quick Start Setup      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
  echo -e "${YELLOW}Warning: Not detected as Raspberry Pi. Proceeding anyway...${NC}"
fi

echo "[1/8] Checking system requirements..."
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js not found. Installing...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
else
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
fi

echo "[2/8] Updating system packages..."
sudo apt update -qq
sudo apt upgrade -y -qq > /dev/null

echo "[3/8] Installing dependencies..."
npm install --silent 2>/dev/null || npm install

echo "[4/8] Installing production cosign packages..."
npm install --silent @sigstore/cosign @sigstore/sign @sigstore/verify 2>/dev/null || \
npm install @sigstore/cosign @sigstore/sign @sigstore/verify

echo "[5/8] Creating .env.production file..."
if [ ! -f .env.production ]; then
  BOOTSTRAP_SECRET=$(openssl rand -hex 32)
  ATTESTATION_SECRET=$(openssl rand -hex 32)
  
  cat > .env.production << EOF
NODE_ENV=production
ATLAS-GATE_PORT=3000
ATLAS-GATE_HOST=0.0.0.0
ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET
ATLAS-GATE_ATTESTATION_SECRET=$ATTESTATION_SECRET
EOF
  echo -e "${GREEN}✓ Created .env.production${NC}"
else
  echo -e "${GREEN}✓ .env.production already exists${NC}"
fi

echo "[6/8] Creating systemd service..."
sudo tee /etc/systemd/system/atlas-gate.service > /dev/null << 'EOF'
[Unit]
Description=ATLAS-GATE MCP Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ATLAS-GATE-MCP
EnvironmentFile=/home/pi/ATLAS-GATE-MCP/.env.production
ExecStart=/usr/bin/node bin/ATLAS-GATE-HTTP.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=atlas-gate
MemoryLimit=256M
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable atlas-gate
echo -e "${GREEN}✓ Systemd service created and enabled${NC}"

echo "[7/8] Installing and configuring nginx..."
sudo apt install -y nginx > /dev/null

sudo tee /etc/nginx/sites-available/atlas-gate > /dev/null << 'EOF'
upstream atlas_gate {
  server 127.0.0.1:3000;
}

server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  client_max_body_size 10M;

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
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/atlas-gate /etc/nginx/sites-enabled/
sudo nginx -t > /dev/null 2>&1
sudo systemctl restart nginx
sudo systemctl enable nginx
echo -e "${GREEN}✓ Nginx reverse proxy configured${NC}"

echo "[8/8] Running verification suite..."
npm run verify > /dev/null 2>&1
echo -e "${GREEN}✓ Verification suite passed${NC}"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  Setup Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📋 NEXT STEPS:"
echo ""

echo "1️⃣  Start the service:"
echo "   sudo systemctl start atlas-gate"
echo ""

echo "2️⃣  Check status:"
echo "   sudo systemctl status atlas-gate"
echo ""

echo "3️⃣  View logs:"
echo "   sudo journalctl -u atlas-gate -f"
echo ""

echo "4️⃣  Test locally:"
echo "   curl http://localhost/health"
echo ""

echo "5️⃣  Remote access options:"
echo "   a) SSH tunnel:"
echo "      ssh -L 3000:localhost:3000 pi@$(hostname).local"
echo "      curl http://localhost:3000/health"
echo ""
echo "   b) ngrok (public URL):"
echo "      ngrok http 80"
echo ""
echo "   c) Direct (if on same network):"
echo "      curl http://$(hostname -I | awk '{print $1}'):80/health"
echo ""

echo "📚 Documentation:"
echo "   - Full guide: RPI_DEPLOYMENT.md"
echo "   - Production setup: PRODUCTION_DEPLOYMENT.md"
echo "   - Security hardening: SECURITY_HARDENING.md"
echo ""

echo "🔐 Important:"
echo "   - Save your .env.production file!"
echo "   - Backup .atlas-gate directory regularly"
echo "   - Monitor via: sudo journalctl -u atlas-gate -f"
echo ""

echo "✅ System is ready to use!"
echo ""
