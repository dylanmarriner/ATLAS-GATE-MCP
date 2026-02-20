FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data and log directories
RUN mkdir -p /data /data/tenants /data/audits /var/log/atlas-gate && \
    chmod 755 /data /var/log/atlas-gate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app /data /var/log/atlas-gate

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "bin/ATLAS-GATE-HTTP.js"]
