#!/bin/bash
# Deploy official WhatsApp Cloud API Edge Functions
# Usage:
#   SUPABASE_ACCESS_TOKEN="your-token" ./scripts/deploy-whatsapp-functions.sh
#
# After deploy, set secrets in Supabase Dashboard → Edge Functions → Secrets:
#   WHATSAPP_CLOUD_TOKEN
#   WHATSAPP_PHONE_NUMBER_ID
#   WHATSAPP_VERIFY_TOKEN
#   WHATSAPP_WEBHOOK_SECRET
#   WHATSAPP_CLOUD_ENABLED=false
#
# Then run supabase/whatsapp_cloud_api.sql in the SQL editor.

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
  echo 'Then run: SUPABASE_ACCESS_TOKEN="paste-token" ./scripts/deploy-whatsapp-functions.sh'
  exit 1
fi

cd "$(dirname "$0")/.."

echo "→ Linking project..."
npx supabase link --project-ref ohskpvihxwxtvsgrcbak

echo "→ Deploying send-whatsapp..."
npx supabase functions deploy send-whatsapp --no-verify-jwt

echo "→ Deploying whatsapp-webhook..."
npx supabase functions deploy whatsapp-webhook --no-verify-jwt

echo "✅ Deployed."
echo "Next: run supabase/whatsapp_cloud_api.sql"
echo "Webhook URL for Meta:"
echo "  https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/whatsapp-webhook"
