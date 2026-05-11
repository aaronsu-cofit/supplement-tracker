#!/bin/bash

# Exit on error
set -e

# Load environment variables from backend/.env.staging.local for staging
STAGING_ENV="backend/.env.staging.local"
if [ ! -f "$STAGING_ENV" ]; then
    echo "❌ Staging env file not found: $STAGING_ENV"
    exit 1
fi

# Extract staging connection info (assuming standard format)
STAGING_URL=$(grep POSTGRES_URL "$STAGING_ENV" | grep -v "^#" | cut -d'=' -f2-)
# Remove potential quotes
STAGING_URL=$(echo $STAGING_URL | sed -e 's/^"//' -e 's/"$//')

# Parse staging URL
# Format: postgresql://USER:PASS@HOST:PORT/DB
STAGING_USER=$(echo $STAGING_URL | sed -e 's|postgresql://||' -e 's|:.*||')
STAGING_PASS=$(echo $STAGING_URL | sed -e 's|.*://[^:]*:||' -e 's|@.*||')
STAGING_HOST=$(echo $STAGING_URL | sed -e 's|.*@||' -e 's|:.*||')
STAGING_PORT=$(echo $STAGING_URL | sed -e 's|.*@||' -e 's|.*:||' -e 's|/.*||')
STAGING_DB=$(echo $STAGING_URL | sed -e 's|.*/||' -e 's|\?.*||')

echo "🐘 Staging DB: $STAGING_DB on $STAGING_HOST:$STAGING_PORT"

# Local connection info (from docker-compose.yml default)
LOCAL_HOST="localhost"
LOCAL_PORT="5434"
LOCAL_USER="vitera_user"
LOCAL_PASS="vitera_pass"
LOCAL_DB="vitera_dev"

echo "🏠 Local DB: $LOCAL_DB on $LOCAL_HOST:$LOCAL_PORT"

DUMP_FILE="vitera_staging_$(date +%Y%m%d_%H%M%S).dump"

echo "📥 Dumping Staging DB..."
PGPASSWORD="$STAGING_PASS" pg_dump -h "$STAGING_HOST" -p "$STAGING_PORT" -U "$STAGING_USER" -d "$STAGING_DB" -F c -b -f "$DUMP_FILE"

echo "📤 Restoring to Local DB..."
# pg_restore might exit with 1 due to minor version mismatch warnings (e.g. transaction_timeout)
# We allow it to continue but warn the user.
PGPASSWORD="$LOCAL_PASS" pg_restore -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE" || echo "⚠️  Note: pg_restore reported some issues. This is often due to version differences between Staging and Local (e.g. Postgres 18 vs 15 session parameters). Data migration usually completes anyway."

echo "✅ Database sync process finished!"
echo "🗑️  Cleaning up dump file..."
rm "$DUMP_FILE"
