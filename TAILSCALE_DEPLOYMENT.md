# ATLAS-GATE MCP - TailScale Remote Access Guide

**Status:** ✅ READY FOR TAILSCALE DEPLOYMENT

This guide enables you to deploy atlas-gate on a Raspberry Pi and access it securely via TailScale from anywhere.

## Quick Start

### 1. On Your Raspberry Pi

```bash
# Clone the repository
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP

# Run the setup script
bash RPI_QUICK_START.sh

# Install TailScale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate TailScale
sudo tailscale up
```

### 2. Get Your TailScale IP

```bash
tailscale ip -4
# Example output: 100.64.x.x
```

### 3. Start atlas-gate Service

```bash
# Option A: Via systemd (recommended)
sudo systemctl start atlas-gate
sudo systemctl status atlas-gate

# Option B: Manual startup
npm start:windsurf    # For executor/mutation tool
# OR
npm start:antigravity # For read-only/analysis tool
```

### 4. Verify Remote Access From Your Laptop

```bash
# Get the RPi's TailScale IP (e.g., 100.64.x.x)
# Connect from your laptop (which must also have TailScale installed):

# Test HTTP health endpoint
curl http://100.64.x.x:3000/health

# Test MCP connectivity (requires MCP client)
atlas-gate-mcp-windsurf --remote 100.64.x.x:3000
```

## Detailed Setup

### Step 1: Raspberry Pi Hardware & OS

**Minimum Requirements:**
- RPi 3B+ or newer (RPi 4B/5 recommended)
- 1-2GB RAM
- 16GB microSD card (SSD preferred)
- Stable network (WiFi 5GHz or Gigabit Ethernet)
- Recent OS (Raspberry Pi OS Bullseye+)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be >= 18.0.0
npm --version
```

### Step 2: Install ATLAS-GATE

```bash
# Clone repository
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP

# Install dependencies
npm install

# Verify installation
npm run verify
```

### Step 3: Install & Configure TailScale

```bash
# Install TailScale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate with your TailScale account
sudo tailscale up

# Get your device's TailScale IP
tailscale ip -4

# Make note of the IP (format: 100.x.x.x)
```

### Step 4: Configure ATLAS-GATE for Remote Access

Create/update `.env` file:

```bash
# Generate secrets (on RPi)
ATLAS_GATE_BOOTSTRAP_SECRET=$(openssl rand -hex 32)
ATLAS_GATE_ATTESTATION_SECRET=$(openssl rand -hex 32)

# Create .env file
cat > .env << EOF
NODE_ENV=production
ATLAS_GATE_BOOTSTRAP_SECRET=$ATLAS_GATE_BOOTSTRAP_SECRET
ATLAS_GATE_ATTESTATION_SECRET=$ATLAS_GATE_ATTESTATION_SECRET
ATLAS_GATE_PORT=3000
ATLAS_GATE_HOST=0.0.0.0
TAILSCALE_IP=$(tailscale ip -4)
EOF
```

### Step 5: Set Up Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/atlas-gate.service > /dev/null << EOF
[Unit]
Description=ATLAS-GATE MCP Server
After=network.target tailscaled.service
Wants=tailscaled.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ATLAS-GATE-MCP
ExecStart=/usr/bin/node bin/ATLAS-GATE-MCP-windsurf.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable atlas-gate
sudo systemctl start atlas-gate

# Verify status
sudo systemctl status atlas-gate

# View logs
sudo journalctl -u atlas-gate -f
```

### Step 6: Verify Remote Connectivity

On your laptop (must have TailScale installed):

```bash
# Install TailScale on your laptop
# https://tailscale.com/download

# Authenticate
tailscale up

# From your laptop, test the RPi
RPi_IP=100.x.x.x  # Replace with actual TailScale IP

# Test HTTP health check
curl http://$RPi_IP:3000/health

# Expected response:
# {"status":"ok","session":"...","role":"WINDSURF"}
```

## MCP Tool Access via TailScale

### Option A: Direct Stdio Connection (Fastest)

```bash
# On your laptop, create a wrapper that tunnels via TailScale:
cat > ~/bin/atlas-gate-remote.sh << 'EOF'
#!/bin/bash
# Usage: atlas-gate-remote TOOL_NAME ARG1 ARG2...

RPi_IP=100.x.x.x  # Set your RPi's TailScale IP here
TOOL=$1
shift

ssh -C "pi@$RPi_IP" "/usr/bin/node ~/ATLAS-GATE-MCP/bin/ATLAS-GATE-MCP-windsurf.js $TOOL $@"
EOF

chmod +x ~/bin/atlas-gate-remote.sh

# Use it:
atlas-gate-remote read_file package.json
```

### Option B: HTTP API (via Nginx Reverse Proxy)

The `nginx.conf` is pre-configured to proxy HTTP requests to the MCP stdio server:

```bash
# On RPi, check nginx status
sudo systemctl status nginx

# From your laptop
curl -X POST http://100.x.x.x:3000/api/read_file \
  -H "Content-Type: application/json" \
  -d '{"path":"package.json"}'
```

### Option C: SSH Tunnel (Simplest for Testing)

```bash
# On your laptop
ssh -L 3000:localhost:3000 -L 5555:localhost:5555 pi@100.x.x.x

# In another terminal
curl http://localhost:3000/health
```

## Security Considerations

### 1. TailScale Authentication

- TailScale handles all encryption and authentication
- Only devices on your TailScale network can access the RPi
- TailScale keys are rotated automatically

### 2. ATLAS-GATE Authorization

Even with network access, ATLAS-GATE enforces:
- Zero-trust execution (no operations without cryptographic authorization)
- Workspace isolation (paths bounded to `/workspace`)
- Audit logging of all operations
- Role-based access (WINDSURF vs ANTIGRAVITY)

### 3. Defense in Depth

```
Internet
   ↓
TailScale VPN (Encrypted)
   ↓
RPi Firewall
   ↓
Nginx Reverse Proxy
   ↓
ATLAS-GATE MCP (Authorization)
   ↓
Workspace (Path-Isolated)
```

## Troubleshooting

### TailScale Connection Issues

```bash
# Check TailScale status
tailscale status

# Restart TailScale
sudo systemctl restart tailscaled

# Check logs
sudo journalctl -u tailscaled -f
```

### ATLAS-GATE Not Responding

```bash
# Check service status
sudo systemctl status atlas-gate

# Check logs
sudo journalctl -u atlas-gate -f

# Check if process is running
ps aux | grep ATLAS-GATE

# Verify port 3000 is listening
netstat -tlnp | grep 3000
```

### Network Connectivity

```bash
# From laptop, test RPi connectivity
ping 100.x.x.x  # TailScale IP

# Check if port 3000 is open
nc -zv 100.x.x.x 3000

# Verify Nginx is listening
ssh pi@100.x.x.x 'sudo netstat -tlnp | grep nginx'
```

## Advanced Configuration

### Load Balancing Multiple RPis

```bash
# In nginx.conf upstream block
upstream atlas_gate_cluster {
    server 100.x.x.1:3000;
    server 100.x.x.2:3000;
    server 100.x.x.3:3000;
}
```

### Monitoring via TailScale

```bash
# Set up prometheus metrics endpoint
# Configure Grafana to scrape via TailScale IP
http://100.x.x.x:3000/metrics
```

### Custom Workspace Isolation

```bash
# Set different workspace roots per instance
ATLAS_GATE_WORKSPACE=/home/pi/projects/customer-a

# Edit .env and restart
sudo systemctl restart atlas-gate
```

## Production Checklist

- [ ] TailScale installed and authenticated
- [ ] Systemd service created and enabled
- [ ] Firewall allows outbound TailScale connection
- [ ] Nginx configured and running
- [ ] ATLAS-GATE healthcheck passing
- [ ] Audit logging enabled
- [ ] Secrets in `.env` generated and secured
- [ ] Workspace root configured
- [ ] SSH key auth configured (no password login)
- [ ] Regular backups of `/workspace` enabled

## See Also

- `RPI_DEPLOYMENT.md` - Raspberry Pi specific setup
- `SECURITY_HARDENING.md` - Security hardening guide
- `PRODUCTION_DEPLOYMENT.md` - General production guide
- TailScale Docs: https://tailscale.com/kb/

## Support

For TailScale setup issues: https://tailscale.com/kb/
For ATLAS-GATE issues: https://github.com/dylanmarriner/ATLAS-GATE-MCP/issues
