#!/usr/bin/env bash
set -euo pipefail

# ─── Setup a new Vitera environment ───────────────────────────────────────────
# Configures Vercel env vars and Cloud Run env vars for a given environment.
#
# Usage:
#   ./scripts/setup-env.sh <env> <base-domain> [options]
#
# Arguments:
#   env          Environment name: staging | production (or any custom name)
#   base-domain  Root domain, e.g. cofit.me
#
# Options:
#   --gcp-project   GCP project ID (required for Cloud Run setup)
#   --gcp-region    GCP region (default: asia-east1)
#   --skip-vercel   Skip Vercel env var setup
#   --skip-gcp      Skip Cloud Run env var setup
#   --add-domains   Also add custom domains to Vercel projects
#
# Examples:
#   ./scripts/setup-env.sh staging cofit.me --gcp-project my-gcp-project
#   ./scripts/setup-env.sh production cofit.me --gcp-project my-gcp-project --add-domains
#   ./scripts/setup-env.sh staging cofit.me --skip-gcp

# ─── Parse args ───────────────────────────────────────────────────────────────
ENV="${1:-}"
BASE_DOMAIN="${2:-}"

if [[ -z "$ENV" || -z "$BASE_DOMAIN" ]]; then
  echo "Usage: $0 <env> <base-domain> [--gcp-project ID] [--gcp-region REGION] [--skip-vercel] [--skip-gcp] [--add-domains]"
  echo ""
  echo "Examples:"
  echo "  $0 staging cofit.me --gcp-project my-gcp-project"
  echo "  $0 production cofit.me --gcp-project my-gcp-project --add-domains"
  exit 1
fi

shift 2

GCP_PROJECT=""
GCP_REGION="asia-east1"
SKIP_VERCEL=false
SKIP_GCP=false
ADD_DOMAINS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gcp-project) GCP_PROJECT="$2"; shift 2 ;;
    --gcp-region)  GCP_REGION="$2";  shift 2 ;;
    --skip-vercel) SKIP_VERCEL=true; shift ;;
    --skip-gcp)    SKIP_GCP=true;    shift ;;
    --add-domains) ADD_DOMAINS=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Derive URLs from env + domain ────────────────────────────────────────────
APPS=("portal" "wounds" "supplements" "bones" "intimacy" "hq")
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# URL helpers: production uses "vitera-api.cofit.me", staging uses "vitera-api-staging.cofit.me"
if [[ "$ENV" == "production" ]]; then
  api_url()    { echo "https://vitera-api.${BASE_DOMAIN}"; }
  app_url()    { echo "https://vitera-${1}.${BASE_DOMAIN}"; }
  service_name() { echo "vitera-api"; }
else
  api_url()    { echo "https://vitera-api-${ENV}.${BASE_DOMAIN}"; }
  app_url()    { echo "https://vitera-${1}-${ENV}.${BASE_DOMAIN}"; }
  service_name() { echo "vitera-api-${ENV}"; }
fi

API_URL="$(api_url)"
PORTAL_URL="$(app_url portal)"

# Build comma-separated list of all non-portal app origins
OTHER_ORIGINS=""
for app in "${APPS[@]}"; do
  [[ "$app" == "portal" ]] && continue
  url="$(app_url "$app")"
  OTHER_ORIGINS="${OTHER_ORIGINS:+${OTHER_ORIGINS},}${url}"
done

# Build comma-separated list of ALL app origins (for ALLOWED_ORIGINS on backend)
ALL_ORIGINS=""
for app in "${APPS[@]}"; do
  url="$(app_url "$app")"
  ALL_ORIGINS="${ALL_ORIGINS:+${ALL_ORIGINS},}${url}"
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Vitera Environment Setup                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Environment : $ENV"
echo "  Domain      : $BASE_DOMAIN"
echo "  API URL     : $API_URL"
echo "  Portal URL  : $PORTAL_URL"
echo ""

# ─── Vercel env vars ──────────────────────────────────────────────────────────
if [[ "$SKIP_VERCEL" == false ]]; then
  echo "━━━ Vercel: Setting env vars ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if ! command -v vercel &>/dev/null; then
    echo "❌ vercel CLI not found. Install with: pnpm add -g vercel"
    exit 1
  fi

  set_vercel_env() {
    local app="$1"
    local key="$2"
    local value="$3"
    local app_dir="$REPO_ROOT/apps/$app"

    # Remove existing value, then add (ignore errors if not found)
    vercel env rm "$key" production --yes --cwd "$app_dir" 2>/dev/null || true
    vercel env rm "$key" preview   --yes --cwd "$app_dir" 2>/dev/null || true

    echo "$value" | vercel env add "$key" production --cwd "$app_dir"
    echo "$value" | vercel env add "$key" preview    --cwd "$app_dir"
  }

  for app in "${APPS[@]}"; do
    app_dir="$REPO_ROOT/apps/$app"
    if [[ ! -d "$app_dir/.vercel" ]]; then
      echo "⚠️  $app is not linked to Vercel. Run 'vercel link' in apps/$app first."
      echo "   Skipping $app..."
      echo ""
      continue
    fi

    echo "🔧 Configuring $app..."
    set_vercel_env "$app" "NEXT_PUBLIC_API_URL" "$API_URL"

    if [[ "$app" == "portal" ]]; then
      set_vercel_env "$app" "NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS" "$OTHER_ORIGINS"
    else
      set_vercel_env "$app" "NEXT_PUBLIC_LOGIN_URL" "${PORTAL_URL}/login"
    fi

    echo "✅ $app configured"
    echo ""
  done

  echo "✅ Vercel env vars set for all apps"
  echo ""
fi

# ─── Vercel custom domains ────────────────────────────────────────────────────
if [[ "$ADD_DOMAINS" == true ]]; then
  echo "━━━ Vercel: Adding custom domains ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  for app in "${APPS[@]}"; do
    app_dir="$REPO_ROOT/apps/$app"
    domain="$(app_url "$app" | sed 's|https://||')"

    if [[ ! -d "$app_dir/.vercel" ]]; then
      echo "⚠️  Skipping $app (not linked to Vercel)"
      continue
    fi

    echo "🌐 Adding domain $domain to $app..."
    vercel domains add "$domain" --cwd "$app_dir" || echo "   (already exists or needs DNS setup)"
    echo ""
  done

  echo "✅ Custom domains added"
  echo ""
  echo "⚠️  Remember to add CNAME records in your DNS:"
  for app in "${APPS[@]}"; do
    domain="$(app_url "$app" | sed 's|https://||')"
    echo "   $domain  →  cname.vercel-dns.com"
  done
  echo ""
fi

# ─── Cloud Run env vars ───────────────────────────────────────────────────────
if [[ "$SKIP_GCP" == false ]]; then
  echo "━━━ Cloud Run: Setting env vars ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [[ -z "$GCP_PROJECT" ]]; then
    echo "❌ --gcp-project is required for Cloud Run setup."
    echo "   Use --skip-gcp to skip, or provide --gcp-project <id>"
    exit 1
  fi

  if ! command -v gcloud &>/dev/null; then
    echo "❌ gcloud CLI not found. Install from https://cloud.google.com/sdk"
    exit 1
  fi

  SERVICE="$(service_name)"

  echo "🔧 Updating Cloud Run service: $SERVICE"
  echo "   Project : $GCP_PROJECT"
  echo "   Region  : $GCP_REGION"
  echo ""

  gcloud run services update "$SERVICE" \
    --project "$GCP_PROJECT" \
    --region "$GCP_REGION" \
    --update-env-vars "ALLOWED_ORIGINS=${ALL_ORIGINS},COOKIE_DOMAIN=.${BASE_DOMAIN},NODE_ENV=production"

  echo ""
  echo "✅ Cloud Run env vars updated"
  echo ""
  echo "⚠️  Make sure these are also set on Cloud Run (secrets, set manually):"
  echo "   POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN"
  echo ""
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment '$ENV' setup complete!"
echo ""
echo "  API               : $API_URL"
echo "  Portal            : $PORTAL_URL"
for app in "${APPS[@]}"; do
  [[ "$app" == "portal" ]] && continue
  echo "  $(printf '%-18s' "$app"): $(app_url "$app")"
done
echo ""
