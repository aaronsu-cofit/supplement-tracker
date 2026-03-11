#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ────────────────────────────────────────────────────────────────────
# Deploy one or all frontend apps to GCP Cloud Run.
# Build context is always the monorepo root (required for workspace packages).
#
# Usage:
#   ./scripts/deploy-frontend-cloudrun.sh <app|all> [--no-cache]
#
# Examples:
#   ./scripts/deploy-frontend-cloudrun.sh portal
#   ./scripts/deploy-frontend-cloudrun.sh all
#   ./scripts/deploy-frontend-cloudrun.sh wounds --no-cache
#
# Required env vars (set in shell or .env.cloudrun at repo root):
#   GCP_PROJECT
#   NEXT_PUBLIC_LOGIN_URL
#   NEXT_PUBLIC_PORTAL_URL
#   NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS
#   NEXT_PUBLIC_LIFF_ID_WOUNDS
#   NEXT_PUBLIC_LIFF_ID_BONES
#   NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS
#   NEXT_PUBLIC_LIFF_ID_INTIMACY

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS=("portal" "wounds" "supplements" "bones" "intimacy" "hq")

# ─── Parse args ───────────────────────────────────────────────────────────────
APP="${1:-}"
NO_CACHE=""
if [[ "${2:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

if [[ -z "$APP" ]]; then
  echo "Usage: $0 <app|all> [--no-cache]"
  echo "Apps: ${APPS[*]}"
  exit 1
fi

# ─── Load .env.cloudrun if present ────────────────────────────────────────────
if [[ -f "$REPO_ROOT/.env.cloudrun" ]]; then
  echo "📄 Loading $REPO_ROOT/.env.cloudrun"
  set -o allexport
  # shellcheck disable=SC1090
  source "$REPO_ROOT/.env.cloudrun"
  set +o allexport
fi

# ─── Config ───────────────────────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-}"
GCP_REGION="${GCP_REGION:-asia-east1}"

# ─── Validate ─────────────────────────────────────────────────────────────────
if [[ -z "$GCP_PROJECT" ]]; then
  echo "❌ GCP_PROJECT is not set."
  echo "   Set it in your shell: export GCP_PROJECT=your-project-id"
  echo "   Or create $REPO_ROOT/.env.cloudrun with GCP_PROJECT=..."
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

# ─── Ensure docker is authenticated to GCR ────────────────────────────────────
gcloud auth configure-docker --quiet

# ─── Deploy function ──────────────────────────────────────────────────────────
deploy_app() {
  local app="$1"
  local service_name="vitera-${app}"
  local image="gcr.io/${GCP_PROJECT}/${service_name}"
  local dockerfile="$REPO_ROOT/apps/${app}/Dockerfile"

  if [[ ! -f "$dockerfile" ]]; then
    echo "❌ Dockerfile not found: $dockerfile"
    return 1
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 Deploying: $app"
  echo "   Image   : $image"
  echo "   Service : $service_name"
  echo "   Region  : $GCP_REGION"
  echo ""

  # ── Build ──
  echo "📦 Building Docker image..."
  docker build $NO_CACHE \
    -f "$dockerfile" \
    --build-arg NEXT_PUBLIC_LOGIN_URL="${NEXT_PUBLIC_LOGIN_URL:-}" \
    --build-arg NEXT_PUBLIC_PORTAL_URL="${NEXT_PUBLIC_PORTAL_URL:-}" \
    --build-arg NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS="${NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS:-}" \
    --build-arg NEXT_PUBLIC_LIFF_ID_WOUNDS="${NEXT_PUBLIC_LIFF_ID_WOUNDS:-}" \
    --build-arg NEXT_PUBLIC_LIFF_ID_BONES="${NEXT_PUBLIC_LIFF_ID_BONES:-}" \
    --build-arg NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS="${NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS:-}" \
    --build-arg NEXT_PUBLIC_LIFF_ID_INTIMACY="${NEXT_PUBLIC_LIFF_ID_INTIMACY:-}" \
    -t "$image" \
    "$REPO_ROOT"

  # ── Push ──
  echo ""
  echo "⬆️  Pushing image to GCR..."
  docker push "$image"

  # ── Deploy ──
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

  # ── Print URL ──
  local url
  url=$(gcloud run services describe "$service_name" \
    --platform managed \
    --region "$GCP_REGION" \
    --project "$GCP_PROJECT" \
    --format "value(status.url)")

  echo ""
  echo "✅ $app deployed → $url"
}

# ─── Run ──────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Vitera Frontend → Cloud Run                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "   Project : $GCP_PROJECT"
echo "   Region  : $GCP_REGION"

if [[ "$APP" == "all" ]]; then
  for a in "${APPS[@]}"; do
    deploy_app "$a"
  done
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ All apps deployed!"
else
  # Validate app name
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
