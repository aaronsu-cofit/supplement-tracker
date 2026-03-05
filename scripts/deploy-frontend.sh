#!/usr/bin/env bash
set -euo pipefail

# ─── Deploy a specific frontend app to Vercel ─────────────────────────────────
# Usage: ./scripts/deploy-frontend.sh <app-name> [--prod]
# Examples:
#   ./scripts/deploy-frontend.sh portal
#   ./scripts/deploy-frontend.sh wounds --prod
#   ./scripts/deploy-frontend.sh all --prod

APPS=("portal" "wounds" "supplements" "bones" "intimacy" "hq")
APP="${1:-}"
PROD_FLAG="${2:-}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

deploy_app() {
  local app="$1"
  local app_dir="$REPO_ROOT/apps/$app"

  if [[ ! -d "$app_dir" ]]; then
    echo "❌ App directory not found: $app_dir"
    return 1
  fi

  echo ""
  echo "🚀 Deploying $app..."

  if [[ "$PROD_FLAG" == "--prod" ]]; then
    vercel --cwd "$app_dir" --prod
  else
    vercel --cwd "$app_dir"
  fi

  echo "✅ $app deployed"
}

if [[ -z "$APP" ]]; then
  echo "Usage: $0 <app-name|all> [--prod]"
  echo "Apps: ${APPS[*]}"
  exit 1
fi

if [[ "$APP" == "all" ]]; then
  for a in "${APPS[@]}"; do
    deploy_app "$a"
  done
  echo ""
  echo "✅ All apps deployed!"
else
  deploy_app "$APP"
fi
