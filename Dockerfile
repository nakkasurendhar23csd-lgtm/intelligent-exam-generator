# Multi-stage Dockerfile for Intelligent Examination Paper Generator
FROM node:24-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Production Server Stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install server dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend from stage 1 into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Create necessary persistent directories
RUN mkdir -p /app/server/data /app/server/uploads /app/server/exports

EXPOSE 5000

CMD ["node", "server/src/server.js"]
