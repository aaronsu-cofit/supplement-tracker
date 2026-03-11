FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm && apk add --no-cache openssl

# ---- Install deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma
RUN pnpm install --frozen-lockfile --filter @vitera/backend

# ---- Build (prisma generate) ----
FROM deps AS builder
ENV POSTGRES_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd backend && npx prisma generate --schema=prisma/schema.prisma

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/src ./backend/src
COPY --from=builder --chown=node:node /app/backend/prisma ./backend/prisma
COPY --chown=node:node backend/package.json ./backend/

USER node
WORKDIR /app/backend

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "src/index.js"]