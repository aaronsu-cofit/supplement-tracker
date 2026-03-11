#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ────────────────────────────────────────────────────────────────────
# Deploy one or all frontend apps to GCP Cloud Run.
# Build context is always the monorepo root (required for workspace packages).
#
# Usage:
#   ./scripts/deploy-frontend-cloudrun.sh <app|all> --env <staging|production> [--no-cache]
#
# Examples:
#   ./scripts/deploy-frontend-cloudrun.sh portal --env staging
#   ./scripts/deploy-frontend-cloudrun.sh all --env production
#   ./scripts/deploy-frontend-cloudrun.sh wounds --env staging --no-cache
#
# Env vars are loaded from .env.cloudrun.<env> at the repo root.
# Copy .env.cloudrun.example to get started:
#   cp .env.cloudrun.example .env.cloudrun.staging
#   cp .env.cloudrun.example .env.cloudrun.production

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS=("portal" "wounds" "supplements" "bones" "intimacy" "hq")

# ─── Parse args ───────────────────────────────────────────────────────────────
APP="${1:-}"
ENV=""
NO_CACHE=""

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)       ENV="$2"; shift 2 ;;
    --no-cache)  NO_CACHE="--no-cache"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$APP" ]]; then
  echo "Usage: $0 <app|all> --env <staging|production> [--no-cache]"
  echo "Apps: ${APPS[*]}"
  exit 1
fi

if [[ -z "$ENV" ]]; then
  echo "❌ --env is required. Use --env staging or --env production"
  exit 1
fi

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "❌ --env must be 'staging' or 'production', got: $ENV"
  exit 1
fi

# ─── Load env file ────────────────────────────────────────────────────────────
ENV_FILE="$REPO_ROOT/.env.cloudrun.${ENV}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Create it from the template:"
  echo "   cp .env.cloudrun.example .env.cloudrun.${ENV}"
  exit 1
fi

echo "📄 Loading $ENV_FILE"
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

# ─── Config ───────────────────────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-}"
GCP_REGION="${GCP_REGION:-asia-east1}"

# ─── Validate ─────────────────────────────────────────────────────────────────
if [[ -z "$GCP_PROJECT" ]]; then
  echo "❌ GCP_PROJECT is not set in $ENV_FILE"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "❌ docker not found. Install Docker Desktop or Docker Engine."
  exit 1
fi

if ! command -v gcloud &>/dev/null; then
  echo "❌ gcloud not found. Install from https://cloud.google.com/sdk"
  exit 1
fi

gcloud auth configure-docker --quiet

# ─── Per-app LIFF ID lookup ───────────────────────────────────────────────────
get_liff_id() {
  case "$1" in
    wounds)      echo "${LIFF_ID_WOUNDS:-}" ;;
    supplements) echo "${LIFF_ID_SUPPLEMENTS:-}" ;;
    bones)       echo "${LIFF_ID_BONES:-}" ;;
    intimacy)    echo "${LIFF_ID_INTIMACY:-}" ;;
    hq)          echo "${LIFF_ID_HQ:-}" ;;
    portal)      echo "" ;;
  esac
}

# ─── Deploy function ──────────────────────────────────────────────────────────
deploy_app() {
  local app="$1"
  # staging: vitera-portal-staging, production: vitera-portal
  local service_name
  if [[ "$ENV" == "staging" ]]; then
    service_name="vitera-${app}-staging"
  else
    service_name="vitera-${app}"
  fi

  local image="gcr.io/${GCP_PROJECT}/${service_name}"
  local dockerfile="$REPO_ROOT/apps/${app}/Dockerfile"
  local liff_id
  liff_id="$(get_liff_id "$app")"

  if [[ ! -f "$dockerfile" ]]; then
    echo "❌ Dockerfile not found: $dockerfile"
    return 1
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 Deploying: $app ($ENV)"
  echo "   Image   : $image"
  echo "   Service : $service_name"
  echo "   Region  : $GCP_REGION"
  echo ""

  echo "📦 Building Docker image..."
  docker build $NO_CACHE \
    -f "$dockerfile" \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}" \
    --build-arg NEXT_PUBLIC_LIFF_ID="$liff_id" \
    --build-arg NEXT_PUBLIC_LOGIN_URL="${NEXT_PUBLIC_LOGIN_URL:-}" \
    --build-arg NEXT_PUBLIC_PORTAL_URL="${NEXT_PUBLIC_PORTAL_URL:-}" \
    --build-arg NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS="${NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS:-}" \
    -t "$image" \
    "$REPO_ROOT"

  echo ""
  echo "⬆️  Pushing image to GCR..."
  docker push "$image"

  echo ""
  echo "🚢 Deploying to Cloud Run..."
  gcloud run deploy "$service_name" \
    --image "$image" \
    --platform managed \
    --region "$GCP_REGION" \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --project "$GCP_PROJECT"

  local url
  url=$(gcloud run services describe "$service_name" \
    --platform managed \
    --region "$GCP_REGION" \
    --project "$GCP_PROJECT" \
    --format "value(status.url)")

  echo ""
  echo "✅ $app ($ENV) deployed → $url"
}

# ─── Run ──────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Vitera Frontend → Cloud Run                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "   Env     : $ENV"
echo "   Project : $GCP_PROJECT"
echo "   Region  : $GCP_REGION"

if [[ "$APP" == "all" ]]; then
  for a in "${APPS[@]}"; do
    deploy_app "$a"
  done
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ All apps deployed to $ENV!"
else
  valid=false
  for a in "${APPS[@]}"; do
    [[ "$a" == "$APP" ]] && valid=true && break
  done
  if [[ "$valid" == false ]]; then
    echo "❌ Unknown app: $APP"
    echo "   Valid apps: ${APPS[*]}"
    exit 1
  fi
  deploy_app "$APP"
fi
