# ATLAS-GATE MCP - Production Deployment Guide

**Status:** ✅ PRODUCTION READY

See documentation created in final verification phase.

## Quick Start

### Raspberry Pi

```bash
bash RPI_QUICK_START.sh
sudo systemctl start atlas-gate
```

### Linux Server

```bash
npm install @sigstore/cosign @sigstore/sign @sigstore/verify
npm install
node bin/ATLAS-GATE-HTTP.js
```

### Docker

```bash
docker build -t atlas-gate .
docker run -p 3000:3000 atlas-gate
```

## Key Documentation

- RPI_DEPLOYMENT.md - Raspberry Pi specific guide
- RPI_QUICK_START.sh - Automated setup script
- SECURITY_HARDENING.md - Security details
- DEPLOYMENT_FINAL_CHECKLIST.md - Go/no-go checklist
- READY_FOR_DEPLOYMENT.md - Quick overview

## Environment Variables

Required:

- NODE_ENV=production
- ATLAS-GATE_BOOTSTRAP_SECRET (generate with: openssl rand -hex 32)
- ATLAS-GATE_ATTESTATION_SECRET (generate with: openssl rand -hex 32)

Optional:

- ATLAS-GATE_PORT (default: 3000)
- ATLAS-GATE_HOST (default: 0.0.0.0)

## Verification

```bash
npm run verify
curl http://localhost:3000/health
```

All tests must pass before deploying to production.
