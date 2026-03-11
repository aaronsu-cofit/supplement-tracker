#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# deploy-backend.sh — 部署後端到 GCP Cloud Run
#
# 使用 gcloud builds submit 在雲端 build Docker image 並推上 GCR，
# 再部署到 Cloud Run。只有一個環境（production），staging backend
# 如有需要請複製此 script 並調整 SERVICE_NAME。
#
# 前置需求：
#   - gcloud CLI 已安裝並登入（gcloud auth login）
#   - 已設定 GCP_PROJECT 環境變數，或直接修改下方預設值
#
# 使用方式：
#   GCP_PROJECT=my-project ./scripts/deploy-backend.sh
#   ./scripts/deploy-backend.sh   # 若已 export GCP_PROJECT
#
# 部署後需手動在 Cloud Run 設定以下 secrets：
#   POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Config ───────────────────────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-your-gcp-project-id}"
GCP_REGION="${GCP_REGION:-asia-east1}"
SERVICE_NAME="${SERVICE_NAME:-vitera-backend}"
IMAGE_NAME="gcr.io/${GCP_PROJECT}/${SERVICE_NAME}"

# ─── Validate ─────────────────────────────────────────────────────────────────
if [[ "$GCP_PROJECT" == "your-gcp-project-id" ]]; then
  echo "❌ Please set GCP_PROJECT env var or update this script."
  exit 1
fi

echo "🚀 Deploying backend to GCP Cloud Run..."
echo "   Project  : $GCP_PROJECT"
echo "   Region   : $GCP_REGION"
echo "   Service  : $SERVICE_NAME"
echo ""

# ─── Build & Push ─────────────────────────────────────────────────────────────
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

echo "📦 Building Docker image..."
gcloud builds submit "$BACKEND_DIR" \
  --tag "$IMAGE_NAME" \
  --project "$GCP_PROJECT"

echo ""
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$GCP_REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --project "$GCP_PROJECT"

echo ""
echo "✅ Backend deployed successfully!"
echo ""
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT" \
  --format "value(status.url)")
echo "📡 Service URL: $SERVICE_URL"
echo ""
echo "⚠️  Don't forget to update ALLOWED_ORIGINS in Cloud Run env vars to include your frontend URLs."
echo "⚠️  Also set: POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN"
