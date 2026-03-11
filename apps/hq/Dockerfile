# ---- Base ----
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ---- Install deps (cached layer) ----
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/hq/package.json ./apps/hq/
COPY packages/lib/package.json ./packages/lib/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_LOGIN_URL
ARG NEXT_PUBLIC_PORTAL_URL
ARG NEXT_PUBLIC_LIFF_ID_WOUNDS
ARG NEXT_PUBLIC_LIFF_ID_BONES
ARG NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS
ARG NEXT_PUBLIC_LIFF_ID_INTIMACY

ENV NEXT_PUBLIC_LOGIN_URL=$NEXT_PUBLIC_LOGIN_URL
ENV NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL
ENV NEXT_PUBLIC_LIFF_ID_WOUNDS=$NEXT_PUBLIC_LIFF_ID_WOUNDS
ENV NEXT_PUBLIC_LIFF_ID_BONES=$NEXT_PUBLIC_LIFF_ID_BONES
ENV NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS=$NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS
ENV NEXT_PUBLIC_LIFF_ID_INTIMACY=$NEXT_PUBLIC_LIFF_ID_INTIMACY

COPY apps/hq ./apps/hq
COPY packages/lib ./packages/lib
COPY packages/ui ./packages/ui

WORKDIR /app/apps/hq
RUN pnpm build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=builder /app/apps/hq/.next/standalone ./
COPY --from=builder /app/apps/hq/.next/static ./apps/hq/.next/static
COPY --from=builder /app/apps/hq/public ./apps/hq/public

CMD ["node", "apps/hq/server.js"]
