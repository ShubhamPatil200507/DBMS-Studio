# Multi-stage production Dockerfile for Intelligent DBMS Studio

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install git (required by the Security Analyzer to perform GitHub repository scans)
RUN apk add --no-cache git

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy compiled backend code
COPY --from=backend-builder /app/backend/dist ./dist

# Copy database schema definition for migrations / init
COPY database/ /app/database/

# Copy compiled frontend dist so Express can serve it statically
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
