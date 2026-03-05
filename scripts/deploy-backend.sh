#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-your-gcp-project-id}"
GCP_REGION="${GCP_REGION:-asia-east1}"
SERVICE_NAME="${SERVICE_NAME:-cofit-backend}"
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
echo "⚠️  Don't forget to update ALLOWED_ORIGINS in Cloud Run env vars to include your Vercel app URLs."
echo "⚠️  Also set: POSTGRES_URL, JWT_SECRET, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN"
