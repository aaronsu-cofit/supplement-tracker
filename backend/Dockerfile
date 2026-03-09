FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Copy prisma schema BEFORE install so postinstall can run prisma generate
COPY prisma ./prisma

# Install dependencies (postinstall runs `prisma generate`)
RUN pnpm install --frozen-lockfile

# Copy source
COPY src ./src

# Expose port
EXPOSE 8080

# Start
ENV NODE_ENV=production
ENV PORT=8080

# Run DB migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
