# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Set working directory
WORKDIR /app

# Copy root level files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy packages and apps directories
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN pnpm install

# Install turbo globally
RUN npm install -g turbo@^2

# Build period-tracker (turbo will automatically build its dependencies)
RUN turbo build --filter=@vitera/period-tracker

# Production stage
FROM nginx:alpine

# Build args for nginx backend URL (must be specified at build time)
# Examples:
#   docker build --build-arg BACKEND_URL=http://192.168.0.12:8000 ...  (Local development)
#   docker build --build-arg BACKEND_URL=http://backend-service:8000 ... (GKE production)
ARG BACKEND_URL=http://localhost:8000

# Copy nginx configuration template
# nginx:alpine automatically processes templates with envsubst
COPY apps/period-tracker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Export environment variable for envsubst (used by nginx for backend proxy)
ENV BACKEND_URL=${BACKEND_URL}

# Copy built app from builder
COPY --from=builder /app/apps/period-tracker/dist /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# nginx entrypoint already handles envsubst for files in /etc/nginx/templates/
CMD ["nginx", "-g", "daemon off;"]
