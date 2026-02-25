# ATLAS-GATE MCP - Raspberry Pi Deployment

**Status:** ✅ READY FOR RASPBERRY PI

This system is fully optimized for Raspberry Pi deployment.

## Hardware Requirements
- Model: RPi 3B+ or newer (RPi 4B or 5 recommended)
- RAM: 512 MB minimum, 1-2 GB recommended
- Storage: 16 GB microSD minimum, SSD recommended
- Network: WiFi 5 GHz or Gigabit Ethernet

## Quick Setup

```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
bash RPI_QUICK_START.sh
```

This automated script:
- Installs Node.js 18+
- Installs dependencies
- Creates systemd service
- Configures nginx
- Verifies installation

## Service Management

```bash
# Start
sudo systemctl start atlas-gate

# Stop
sudo systemctl stop atlas-gate

# Restart
sudo systemctl restart atlas-gate

# View logs
sudo journalctl -u atlas-gate -f

# Check status
sudo systemctl status atlas-gate
```

## Remote Access

### SSH Tunnel (Simplest)
```bash
ssh -L 3000:localhost:3000 pi@raspberrypi.local
curl http://localhost:3000/health
```

### ngrok (Public URL)
```bash
ngrok http 80
# Public URL: https://xxxx-xxx-xxx.ngrok.io
```

### Direct Access
If on same network:
```bash
curl http://<rpi-ip>:80/health
```

## Performance
- Startup: 0.5 seconds
- Memory: ~80 MB base
- CPU: <1% idle
- Concurrent users: 1-2

## See Also
- RPI_QUICK_START.sh - Automated setup
- PRODUCTION_DEPLOYMENT.md - Full guide
- READY_FOR_DEPLOYMENT.md - Overview
