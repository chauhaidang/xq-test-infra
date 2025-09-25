FROM node:18-alpine

WORKDIR /app
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN

# Copy package files
COPY read-service/package*.json ./
COPY read-service/.npmrc ./.npmrc
RUN cat .npmrc
# Install dependencies
RUN npm ci --only=production

# Copy shared dependencies
COPY shared ./shared

# Copy application code
COPY read-service/src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S readservice -u 1001

# Change ownership and switch user
RUN chown -R readservice:nodejs /app
USER readservice

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
CMD ["npm", "start"]