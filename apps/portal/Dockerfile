# ---- Base ----
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ---- Install deps (cached layer) ----
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/portal/package.json ./apps/portal/
COPY packages/lib/package.json ./packages/lib/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
WORKDIR /app

# Build-time env vars (NEXT_PUBLIC_* are baked into the JS bundle)
ARG NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS
ARG NEXT_PUBLIC_LIFF_ID_WOUNDS
ARG NEXT_PUBLIC_LIFF_ID_BONES
ARG NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS
ARG NEXT_PUBLIC_LIFF_ID_INTIMACY
ARG NEXT_PUBLIC_LOGIN_URL
ARG NEXT_PUBLIC_PORTAL_URL

ENV NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS=$NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS
ENV NEXT_PUBLIC_LIFF_ID_WOUNDS=$NEXT_PUBLIC_LIFF_ID_WOUNDS
ENV NEXT_PUBLIC_LIFF_ID_BONES=$NEXT_PUBLIC_LIFF_ID_BONES
ENV NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS=$NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS
ENV NEXT_PUBLIC_LIFF_ID_INTIMACY=$NEXT_PUBLIC_LIFF_ID_INTIMACY
ENV NEXT_PUBLIC_LOGIN_URL=$NEXT_PUBLIC_LOGIN_URL
ENV NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL

COPY apps/portal ./apps/portal
COPY packages/lib ./packages/lib
COPY packages/ui ./packages/ui

WORKDIR /app/apps/portal
RUN pnpm build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Standalone output preserves monorepo structure from the tracing root
COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder /app/apps/portal/public ./apps/portal/public

CMD ["node", "apps/portal/server.js"]
