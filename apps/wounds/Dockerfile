# ---- Base ----
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ---- Install deps (cached layer) ----
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/wounds/package.json ./apps/wounds/
COPY packages/lib/package.json ./packages/lib/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_LIFF_ID
ARG NEXT_PUBLIC_LOGIN_URL

ENV NEXT_PUBLIC_LIFF_ID=$NEXT_PUBLIC_LIFF_ID
ENV NEXT_PUBLIC_LOGIN_URL=$NEXT_PUBLIC_LOGIN_URL

COPY apps/wounds ./apps/wounds
COPY packages/lib ./packages/lib
COPY packages/ui ./packages/ui

WORKDIR /app/apps/wounds
RUN pnpm build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=builder /app/apps/wounds/.next/standalone ./
COPY --from=builder /app/apps/wounds/.next/static ./apps/wounds/.next/static
COPY --from=builder /app/apps/wounds/public ./apps/wounds/public

CMD ["node", "apps/wounds/server.js"]
