# SSH Tunnel Setup for Secure Access

## Secure Access Without Exposing Public IP

Instead of `http://49.12.230.179:30000/` (public, no encryption), use SSH tunnel for encrypted access.

### One-Time SSH Tunnel (Development)

```bash
# Keep this running in a terminal
ssh -i /home/kubuntux/Downloads/.ssh/id_rsa \
    -L 3000:localhost:3000 \
    root@49.12.230.179

# In another terminal, access via localhost
curl http://localhost:3000/health
```

**How it works:**
- Local port 3000 → encrypted SSH tunnel → server:3000
- Server sees requests as coming from localhost
- No traffic exposed on public IP
- All data encrypted in transit

### Persistent SSH Tunnel (Better)

Create a systemd service that auto-starts the tunnel:

**File: ~/.ssh/atlas-tunnel.sh**

```bash
#!/bin/bash
# Auto-reconnecting SSH tunnel

set -e

SSH_KEY="/home/kubuntux/Downloads/.ssh/id_rsa"
SERVER="49.12.230.179"
LOCAL_PORT="3000"
REMOTE_HOST="localhost"
REMOTE_PORT="3000"

echo "Starting SSH tunnel: localhost:$LOCAL_PORT → $SERVER:$REMOTE_PORT"

while true; do
  ssh -i "$SSH_KEY" \
      -N \
      -L "$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" \
      root@"$SERVER"
  
  echo "SSH tunnel disconnected, reconnecting in 5 seconds..."
  sleep 5
done
```

Make it executable:
```bash
chmod +x ~/.ssh/atlas-tunnel.sh
```

**File: ~/.config/systemd/user/atlas-mcp-tunnel.service**

```ini
[Unit]
Description=SSH Tunnel to ATLAS-GATE-MCP
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=kubuntux
ExecStart=%h/.ssh/atlas-tunnel.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

Start it:
```bash
# Create directory if needed
mkdir -p ~/.config/systemd/user

# Enable auto-start on login
systemctl --user daemon-reload
systemctl --user enable atlas-mcp-tunnel
systemctl --user start atlas-mcp-tunnel

# Check status
systemctl --user status atlas-mcp-tunnel

# View logs
journalctl --user -u atlas-mcp-tunnel -f
```

### Multi-Tunnel Setup (Multiple Ports)

Forward multiple services through one SSH connection:

```bash
ssh -i /home/kubuntux/Downloads/.ssh/id_rsa \
    -L 3000:localhost:3000 \
    -L 5432:localhost:5432 \
    -L 6379:localhost:6379 \
    -L 9090:localhost:9090 \
    root@49.12.230.179

# Now access locally:
# - MCP API: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - Prometheus: http://localhost:9090
```

### Windows SSH Tunnel (PuTTY)

If using Windows:

1. Open PuTTY
2. Session → Host: `49.12.230.179`
3. Auth → Private Key: `C:\path\to\ssh\key.ppk`
4. SSH → Tunnels:
   - Source port: `3000`
   - Destination: `localhost:3000`
   - Click "Add"
5. Session → Save as "atlas-gate-tunnel"
6. Click "Open"
7. Access via `http://localhost:3000`

---

## TLS/HTTPS Setup

### Self-Signed Certificate (Testing)

```bash
# On the server, create self-signed cert
ssh root@49.12.230.179

mkdir -p /etc/nginx/certs

openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/nginx/certs/server.key \
  -out /etc/nginx/certs/server.crt \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"

exit
```

Update nginx config in `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name _;
    
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of config
}
```

Then test with curl (ignore self-signed warning):
```bash
curl -k https://localhost:443/health
```

### Let's Encrypt (Production)

Get free, valid SSL certificate:

```bash
ssh root@49.12.230.179

# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Create certificate (requires public domain)
certbot certonly --standalone \
  -d your-domain.com \
  -d mcp.your-domain.com \
  --agree-tos \
  -m your-email@example.com

# Certificates stored in: /etc/letsencrypt/live/your-domain.com/

# Update nginx config to use them:
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

exit
```

Then deploy:
```bash
./deploy.sh 49.12.230.179 /path/to/ssh/key
```

### HTTPS via SSH Tunnel

Even with self-signed cert, use HTTPS via tunnel:

```bash
# Terminal 1: SSH tunnel with HTTPS
ssh -i /path/to/key \
    -L 443:localhost:443 \
    root@49.12.230.179

# Terminal 2: Access with HTTPS
curl -k https://localhost/health

# Or add to your client config:
# url: https://localhost:443
```

---

## Client Configuration (Windsurf/Antigravity)

### Via SSH Tunnel (Secure)

1. Start SSH tunnel:
   ```bash
   ssh -L 3000:localhost:3000 root@49.12.230.179
   ```

2. Configure client `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "atlas-gate": {
         "type": "http",
         "url": "http://localhost:3000",
         "retryPolicy": {
           "maxRetries": 3,
           "initialDelayMs": 1000
         }
       }
     }
   }
   ```

### Via HTTPS (Production)

1. Setup Let's Encrypt certificate on server
2. Configure client:
   ```json
   {
     "mcpServers": {
       "atlas-gate": {
         "type": "http",
         "url": "https://mcp.your-domain.com",
         "tlsVerify": true,
         "retryPolicy": {
           "maxRetries": 3
         }
       }
     }
   }
   ```

### Via Public IP (Not Recommended)

Only if you must expose publicly:

```json
{
  "mcpServers": {
    "atlas-gate": {
      "type": "http",
      "url": "http://49.12.230.179:30000",
      "auth": {
        "type": "bearer",
        "token": "your-secret-token"
      }
    }
  }
}
```

But **prefer SSH tunnel or HTTPS**.

---

## Security Best Practices

### ✅ DO

- [ ] Use SSH tunnel for development
- [ ] Use HTTPS (Let's Encrypt) for production
- [ ] Keep SSH key in `~/.ssh/` with 600 permissions
- [ ] Rotate secrets regularly (PostgreSQL password)
- [ ] Use firewall to limit access to port 22 (SSH)
- [ ] Monitor logs for unauthorized access
- [ ] Use strong SSH key passphrases

### ❌ DON'T

- [ ] Don't expose port 3000 publicly without HTTPS
- [ ] Don't put SSH key in version control
- [ ] Don't use default PostgreSQL password in production
- [ ] Don't run as root if not necessary
- [ ] Don't skip authentication checks

---

## Testing Secure Access

```bash
# Test SSH tunnel works
ssh -L 3000:localhost:3000 root@49.12.230.179 &

# Health check through tunnel
curl http://localhost:3000/health

# Verify encrypted (use tcpdump or Wireshark)
# No unencrypted traffic should appear

# Kill tunnel
kill %1
```

---

## Troubleshooting

### SSH Tunnel Not Working

```bash
# Verify SSH works
ssh -i /path/to/key root@49.12.230.179 "echo Connected"

# Try tunnel with verbose output
ssh -v -L 3000:localhost:3000 root@49.12.230.179

# Check server is listening on port 3000
ssh root@49.12.230.179 "netstat -tlnp | grep 3000"
```

### TLS Certificate Errors

```bash
# If using self-signed cert, use -k flag with curl
curl -k https://localhost/health

# For client config, set:
"tlsVerify": false  (for testing only!)

# Check certificate details
openssl x509 -in /etc/nginx/certs/server.crt -text -noout
```

### Connection Refused

```bash
# Check if service is running
ssh root@49.12.230.179 "kubectl get pods -n atlas-gate"

# Check nginx logs
ssh root@49.12.230.179 "kubectl logs -n ingress-nginx -l app=nginx-ingress"

# Check firewall
ssh root@49.12.230.179 "ufw status"
```

---

## Complete Secure Setup Flow

```bash
# 1. Deploy to server
./deploy.sh 49.12.230.179 /home/kubuntux/Downloads/.ssh/id_rsa

# 2. Setup Let's Encrypt (optional, for production)
# (See section above)

# 3. Start SSH tunnel (development)
ssh -L 3000:localhost:3000 root@49.12.230.179

# 4. Configure client
# Edit .mcp.json to use http://localhost:3000

# 5. Test
curl http://localhost:3000/health

# 6. For production: use HTTPS instead
# Then update client URL to https://your-domain.com
```

---

## Summary

| Method | Security | Ease | Use Case |
|--------|----------|------|----------|
| SSH Tunnel | Excellent | Easy | Development |
| HTTPS (Let's Encrypt) | Excellent | Medium | Production |
| Self-Signed HTTPS | Good | Easy | Testing |
| Public IP (HTTP) | None | Easiest | ❌ Don't use |

**Recommended**: SSH tunnel for development, HTTPS for production.
