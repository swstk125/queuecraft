# Backend Dockerfile for QueueCraft API and Job Processor
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose API port
EXPOSE 2000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:2000/sync', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command (can be overridden in docker-compose)
CMD ["node", "appServer.js"]

