FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ src/
COPY bin/ bin/

FROM gcr.io/distroless/nodejs18-debian11

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/bin ./bin
COPY package.json ./

ENV NODE_ENV=production
CMD ["bin/ATLAS-GATE-HTTP.js"]
