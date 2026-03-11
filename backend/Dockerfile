FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm and openssl (required by Prisma on alpine)
RUN npm install -g pnpm && apk add --no-cache openssl

# ---- Install deps (cached layer) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma
RUN pnpm install --frozen-lockfile --filter @vitera/backend

# Explicitly run prisma generate to ensure client is fully built at image build time
RUN cd backend && npx prisma generate --schema=prisma/schema.prisma

# ---- Runner ----
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma
COPY --from=deps /app/backend/package.json ./backend/

# Ensure node user (uid 1000) owns the app directory
RUN chown -R node:node /app
USER node

WORKDIR /app/backend

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

# Run DB migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
