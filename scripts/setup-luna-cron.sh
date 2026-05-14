#!/bin/bash
# Setup GCP Cloud Scheduler jobs for Luna 3x daily push
#
# Usage:
#   GCP_PROJECT=coft-pro BACKEND_URL=https://vitera-backend-xxxx.run.app ./scripts/setup-luna-cron.sh
#
# Or edit the defaults below and run directly.

set -e

GCP_PROJECT="${GCP_PROJECT:-coft-pro}"
GCP_REGION="${GCP_REGION:-asia-east1}"
BACKEND_URL="${BACKEND_URL:-}"          # e.g. https://vitera-backend-xxxx.a.run.app
SCHEDULER_TIMEZONE="Asia/Taipei"

# ── Validate ─────────────────────────────────────────────────────────────────

if [[ -z "$BACKEND_URL" ]]; then
  echo "❌ BACKEND_URL is required."
  echo "   Export it or pass inline: BACKEND_URL=https://... ./scripts/setup-luna-cron.sh"
  echo ""
  echo "   To find your backend URL:"
  echo "   gcloud run services describe vitera-backend --region=$GCP_REGION --project=$GCP_PROJECT --format='value(status.url)'"
  exit 1
fi

echo "🌙 Setting up Luna Cloud Scheduler jobs"
echo "   Project : $GCP_PROJECT"
echo "   Region  : $GCP_REGION"
echo "   Backend : $BACKEND_URL"
echo "   Timezone: $SCHEDULER_TIMEZONE"
echo ""

# ── Helper ───────────────────────────────────────────────────────────────────

create_or_update_job() {
  local JOB_NAME="$1"
  local SCHEDULE="$2"
  local TIME_SLOT="$3"
  local DESCRIPTION="$4"

  local URI="${BACKEND_URL}/api/scheduler/run?time_slot=${TIME_SLOT}"

  # Check if job already exists
  if gcloud scheduler jobs describe "$JOB_NAME" \
      --location="$GCP_REGION" --project="$GCP_PROJECT" &>/dev/null; then
    echo "  ↺ Updating job: $JOB_NAME ($SCHEDULE)"
    gcloud scheduler jobs update http "$JOB_NAME" \
      --location="$GCP_REGION" \
      --project="$GCP_PROJECT" \
      --schedule="$SCHEDULE" \
      --uri="$URI" \
      --http-method=POST \
      --time-zone="$SCHEDULER_TIMEZONE" \
      --description="$DESCRIPTION" \
      --attempt-deadline=30s \
      --headers="Content-Type=application/json" \
      --oidc-service-account-email="$(get_sa)" \
      --quiet
  else
    echo "  ✓ Creating job: $JOB_NAME ($SCHEDULE)"
    gcloud scheduler jobs create http "$JOB_NAME" \
      --location="$GCP_REGION" \
      --project="$GCP_PROJECT" \
      --schedule="$SCHEDULE" \
      --uri="$URI" \
      --http-method=POST \
      --time-zone="$SCHEDULER_TIMEZONE" \
      --description="$DESCRIPTION" \
      --attempt-deadline=30s \
      --headers="Content-Type=application/json" \
      --oidc-service-account-email="$(get_sa)" \
      --quiet
  fi
}

get_sa() {
  # Use the Cloud Run service account if it exists, otherwise compute default SA
  gcloud iam service-accounts list \
    --project="$GCP_PROJECT" \
    --filter="email~vitera-backend" \
    --format="value(email)" 2>/dev/null | head -1 || \
  echo "$(gcloud projects describe $GCP_PROJECT --format='value(projectNumber)')@developer.gserviceaccount.com"
}

# ── Create 3 daily jobs ───────────────────────────────────────────────────────

# Morning: 07:00 — sends morning check-in prompts
create_or_update_job \
  "luna-scheduler-morning" \
  "0 7 * * *" \
  "morning" \
  "Luna morning check-in push (07:00 Taipei)"

# Evening: 21:00 — sends daily habit task
create_or_update_job \
  "luna-scheduler-evening" \
  "0 21 * * *" \
  "evening" \
  "Luna evening task push (21:00 Taipei)"

# Bedtime: 22:30 — sends Luna sleep companion message
create_or_update_job \
  "luna-scheduler-bedtime" \
  "30 22 * * *" \
  "bedtime" \
  "Luna bedtime companion push (22:30 Taipei)"

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "✅ All 3 Cloud Scheduler jobs created/updated!"
echo ""
echo "Jobs:"
gcloud scheduler jobs list \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --filter="name~luna-scheduler" \
  --format="table(name, schedule, state)" 2>/dev/null || true
echo ""
echo "To test manually:"
echo "  gcloud scheduler jobs run luna-scheduler-evening --location=$GCP_REGION --project=$GCP_PROJECT"
