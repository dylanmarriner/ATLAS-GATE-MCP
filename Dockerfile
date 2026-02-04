# Multi-stage Dockerfile for ATLAS-GATE-MCP

# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy built dependencies from builder
COPY --from=builder /build/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001

# Set ownership
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Expose port
EXPOSE 3000

# Health check (curl to /health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Default command (can be overridden)
CMD ["node", "bin/server-network.js"]

# Build metadata
LABEL org.opencontainers.image.title="ATLAS-GATE-MCP" \
      org.opencontainers.image.description="Enterprise MCP Security Gateway" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.authors="dylanmarriner"
