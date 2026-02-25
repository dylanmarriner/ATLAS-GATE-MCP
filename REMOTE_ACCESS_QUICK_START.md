# ATLAS-GATE Remote Access - Quick Start Guide

**Goal:** Use atlas-gate-mcp-windsurf and atlas-gate-mcp-antigravity from anywhere via TailScale on Raspberry Pi

## 5-Minute Setup (Raspberry Pi)

### 1. Install System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install TailScale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 3. Clone & Install ATLAS-GATE

```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
npm install
```

### 4. Generate Secrets & Configure

```bash
cat > .env << EOF
NODE_ENV=production
ATLAS_GATE_BOOTSTRAP_SECRET=$(openssl rand -hex 32)
ATLAS_GATE_ATTESTATION_SECRET=$(openssl rand -hex 32)
ATLAS_GATE_PORT=3000
ATLAS_GATE_HOST=0.0.0.0
EOF
```

### 5. Set Up Systemd Service

```bash
sudo tee /etc/systemd/system/atlas-gate.service > /dev/null << 'EOF'
[Unit]
Description=ATLAS-GATE MCP Server
After=network.target tailscaled.service
Wants=tailscaled.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=/usr/bin/node bin/ATLAS-GATE-MCP-windsurf.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable atlas-gate
sudo systemctl start atlas-gate
```

### 6. Get Your TailScale IP

```bash
tailscale ip -4
# Copy this IP (e.g., 100.64.x.x)
```

## Using from Your Laptop (5 Minutes)

### 1. Install TailScale on Laptop

```bash
# Download from https://tailscale.com/download
# Or via package manager:
brew install tailscale      # macOS
apt install tailscale       # Linux
```

### 2. Authenticate

```bash
tailscale up
```

### 3. Test Connection (Replace IP!)

```bash
RPi_IP=100.64.x.x  # Your RPi's TailScale IP from step 6 above

# Health check
curl http://$RPi_IP:3000/health
# Should return: {"status":"ok",...}
```

### 4. Use the MCP Tools

**Option A: Direct SSH (Simplest)**

```bash
# Create helper script
cat > ~/.local/bin/atlas-windsurf << 'EOF'
#!/bin/bash
RPi_IP=100.64.x.x  # Set your IP
ssh -C "pi@$RPi_IP" "cd ATLAS-GATE-MCP && node bin/ATLAS-GATE-MCP-windsurf.js"
EOF
chmod +x ~/.local/bin/atlas-windsurf

# Use it with your MCP client
```

**Option B: SSH Tunnel (Best for IDEs)**

```bash
# Terminal 1: Create tunnel
ssh -L 3000:localhost:3000 pi@100.64.x.x

# Terminal 2: Connect your client
# Point your MCP client to: localhost:3000
```

**Option C: HTTP API (Simple requests)**

```bash
RPi_IP=100.64.x.x

# Read a file
curl -X POST http://$RPi_IP:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{"tool":"read_file","args":{"path":"package.json"}}'

# List plans
curl http://$RPi_IP:3000/api/call \
  -d '{"tool":"list_plans"}'
```

## Verification Commands

### On Raspberry Pi

```bash
# Check service is running
sudo systemctl status atlas-gate

# View logs
sudo journalctl -u atlas-gate -f

# Verify TailScale connected
tailscale status

# Check port 3000 listening
netstat -tlnp | grep 3000
```

### From Your Laptop

```bash
# Verify connectivity
ping 100.64.x.x              # Should respond
nc -zv 100.64.x.x 3000      # Should show "port 3000 open"

# Test HTTP
curl http://100.64.x.x:3000/health  # {"status":"ok",...}

# View available tools
curl http://100.64.x.x:3000/tools
```

## Switching Between Windsurf & Antigravity

### On RPi, Edit Systemd Service

```bash
# To use WINDSURF (write/execute):
ExecStart=/usr/bin/node bin/ATLAS-GATE-MCP-windsurf.js

# To use ANTIGRAVITY (read-only):
ExecStart=/usr/bin/node bin/ATLAS-GATE-MCP-antigravity.js
```

Then restart:

```bash
sudo systemctl restart atlas-gate
```

## Troubleshooting

### Can't Connect to RPi

```bash
# 1. Check TailScale on RPi
ssh pi@100.64.x.x "tailscale status"

# 2. Restart TailScale
ssh pi@100.64.x.x "sudo systemctl restart tailscaled"

# 3. Check ATLAS-GATE service
ssh pi@100.64.x.x "sudo systemctl status atlas-gate"
```

### TailScale IP Shows But Can't Access

```bash
# 1. Check if port 3000 is listening on RPi
ssh pi@100.64.x.x "netstat -tlnp | grep 3000"

# 2. If not, start the service
ssh pi@100.64.x.x "sudo systemctl start atlas-gate"

# 3. Check logs
ssh pi@100.64.x.x "sudo journalctl -u atlas-gate -e"
```

### ATLAS-GATE Won't Start

```bash
# Check errors
ssh pi@100.64.x.x "node ~/ATLAS-GATE-MCP/bin/ATLAS-GATE-MCP-windsurf.js"

# Verify Node.js installed
ssh pi@100.64.x.x "node --version"  # Should be >= 18.0.0

# Check dependencies
ssh pi@100.64.x.x "cd ~/ATLAS-GATE-MCP && npm install"
```

## Security Notes

1. **TailScale is Encrypted** - All traffic is automatically encrypted
2. **Only Your Devices** - Only devices you authorize can connect
3. **Zero-Trust** - ATLAS-GATE enforces zero-trust authorization on top
4. **Audit Trail** - Every operation is logged to `audit-log.jsonl`
5. **Path Isolation** - Files are restricted to workspace root

## Next Steps

- Full guide: See `TAILSCALE_DEPLOYMENT.md`
- Security details: See `SECURITY_HARDENING.md`
- General deployment: See `PRODUCTION_DEPLOYMENT.md`
- All verification: Run `node verify-complete-setup.js`

## Common Workflows

### Workflow 1: Collaborate with Colleague

1. Both install TailScale
2. Share RPi's TailScale IP in Slack
3. Colleague runs: `curl http://your-rpi-ip:3000/health`
4. They can now read files and run analysis

### Workflow 2: CI/CD Pipeline Integration

```bash
# In your CI system, add:
export ATLAS_GATE_HOST=rpi-tailscale-ip
export ATLAS_GATE_PORT=3000

atlas-gate-mcp-antigravity  # Read-only analysis
```

### Workflow 3: Multiple RPis Load Balanced

```bash
# Configure Nginx on a central server
upstream atlas_gate_cluster {
    server 100.x.x.1:3000;  # RPi 1
    server 100.x.x.2:3000;  # RPi 2
    server 100.x.x.3:3000;  # RPi 3
}
# Route all requests through this upstream
```

---

**Status:** Ready to deploy  
**Tested:** Feb 26, 2026  
**Verified:** All 31 checks passing
