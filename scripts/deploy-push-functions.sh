#!/bin/bash
# Deploy push notification Edge Functions to Supabase
# Usage:
#   1. Create token: https://supabase.com/dashboard/account/tokens
#   2. Run: SUPABASE_ACCESS_TOKEN="your-token" ./scripts/deploy-push-functions.sh

set -e

export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx not found. Trying nvm..."
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ Still no npx. Install Node from https://nodejs.org or fix nvm."
  exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Missing SUPABASE_ACCESS_TOKEN"
  echo "Create one at: https://supabase.com/dashboard/account/tokens"
  echo 'Then run: SUPABASE_ACCESS_TOKEN="paste-token" ./scripts/deploy-push-functions.sh'
  exit 1
fi

cd "$(dirname "$0")/.."

echo "→ Linking project..."
npx supabase link --project-ref ohskpvihxwxtvsgrcbak

echo "→ Deploying notify-new-task..."
npx supabase functions deploy notify-new-task --no-verify-jwt

echo "→ Deploying meeting-reminders..."
npx supabase functions deploy meeting-reminders --no-verify-jwt

echo "→ Deploying notify-student-task..."
npx supabase functions deploy notify-student-task --no-verify-jwt

echo "✅ Done! Now run in Supabase SQL Editor:"
echo "   - notify_new_task_webhook.sql"
echo "   - notify_student_task_webhook.sql"
echo "   - meeting_reminders_cron.sql"
