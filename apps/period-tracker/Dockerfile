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

# Build args for Vite (baked into the static bundle at build time)
ARG VITE_API_URL
ARG VITE_ENABLE_ERUDA=false
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ENABLE_ERUDA=${VITE_ENABLE_ERUDA}

# Build period-tracker (turbo will automatically build its dependencies)
RUN turbo build --filter=@vitera/period-tracker

# Production stage — unprivileged nginx for K8s restricted security context
FROM nginxinc/nginx-unprivileged:alpine

# Copy nginx configuration
COPY apps/period-tracker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder
COPY --from=builder /app/apps/period-tracker/dist /usr/share/nginx/html

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
