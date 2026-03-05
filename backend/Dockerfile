FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY src ./src

# Expose port
EXPOSE 8080

# Start
ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "src/index.js"]
