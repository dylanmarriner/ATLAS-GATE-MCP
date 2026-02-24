#!/usr/bin/env bash
set -e

echo "[BUILD] Starting ATLAS-GATE build..."
npm test
npm run quality:check

echo "[BUILD] Building Docker image..."
docker build -t atlas-gate-mcp:latest .

echo "[BUILD] Success. Artifacts are ready for signing."
