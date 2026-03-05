#!/usr/bin/env bash
set -euo pipefail

# ─── One-time Vercel project setup for each app ───────────────────────────────
# Run this once to link each app directory to a Vercel project.
# After this, use deploy-frontend.sh for subsequent deploys.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${NEXT_PUBLIC_API_URL:-https://your-backend.run.app}"

APPS=("portal" "wounds" "supplements" "bones" "intimacy" "hq")

for app in "${APPS[@]}"; do
  app_dir="$REPO_ROOT/apps/$app"
  echo ""
  echo "🔧 Setting up Vercel project for: $app"
  echo "   Directory: $app_dir"

  # Pull/init Vercel project (interactive)
  vercel --cwd "$app_dir" link

  # Set env vars
  echo "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production --cwd "$app_dir" 2>/dev/null || true
  echo "$API_URL" | vercel env add NEXT_PUBLIC_API_URL preview --cwd "$app_dir" 2>/dev/null || true
  echo "$API_URL" | vercel env add NEXT_PUBLIC_API_URL development --cwd "$app_dir" 2>/dev/null || true

  echo "✅ $app linked to Vercel"
done

echo ""
echo "✅ All Vercel projects configured!"
echo "   Run './scripts/deploy-frontend.sh all --prod' to deploy all apps."
