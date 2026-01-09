# =========================================
# Stage 1: Builder
# =========================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# =========================================
# Stage 2: Production
# =========================================
FROM node:20-slim AS production

# Install Oracle Instant Client dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1 \
    wget \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Oracle Instant Client Basic Lite (21.x)
# Compatible with oracledb 6.x, supports Wallet authentication
ENV ORACLE_INSTANT_CLIENT_VERSION=21.15.0.0.0
ENV ORACLE_HOME=/opt/oracle/instantclient_21_15
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_15
ENV TNS_ADMIN=/opt/oracle/wallet

RUN mkdir -p /opt/oracle && \
    cd /opt/oracle && \
    wget -q https://download.oracle.com/otn_software/linux/instantclient/2115000/instantclient-basiclite-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}dbru.zip && \
    unzip -q instantclient-basiclite-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}dbru.zip && \
    rm instantclient-basiclite-linux.x64-${ORACLE_INSTANT_CLIENT_VERSION}dbru.zip && \
    # Create symbolic links
    ln -sf /opt/oracle/instantclient_21_15/libclntsh.so.21.1 /opt/oracle/instantclient_21_15/libclntsh.so && \
    # Clean up build tools
    apt-get purge -y wget unzip && \
    apt-get autoremove -y && \
    apt-get clean

WORKDIR /app

# Copy package.json for production dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app

# Create wallet directory (to be mounted at runtime)
RUN mkdir -p /opt/oracle/wallet && chown -R appuser:appgroup /opt/oracle/wallet

USER appuser

# Expose port (configurable via PORT env)
EXPOSE 3000

# Health check using /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); const port = process.env.PORT || 3000; http.get('http://localhost:' + port + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Entry point
CMD ["node", "dist/index.js"]
