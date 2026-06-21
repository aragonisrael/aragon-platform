import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendFcmToToken, type PushPayload } from './fcm.ts';

const MANAGEMENT_ROLES = new Set(['management', 'admin']);

export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase service role env is missing');
  return createClient(url, key);
}

export async function wasNotificationSent(key: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('notification_key', key)
    .maybeSingle();
  return !!data;
}

export async function markNotificationSent(key: string) {
  const supabase = getAdminClient();
  const { error } = await supabase.from('notification_log').insert({ notification_key: key });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function getActiveTokensForUser(username: string): Promise<string[]> {
  const supabase = getAdminClient();
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('username', username)
    .maybeSingle();

  if (!userRow || !MANAGEMENT_ROLES.has(userRow.role)) return [];

  const { data: tokens } = await supabase
    .from('push_subscriptions')
    .select('token')
    .eq('username', username)
    .eq('active', true);

  return (tokens ?? []).map((row) => row.token).filter(Boolean);
}

export async function getManagementUsernames(): Promise<string[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('users')
    .select('username')
    .in('role', ['management', 'admin']);

  return (data ?? []).map((row) => row.username).filter(Boolean);
}

export async function sendPushToUser(username: string, payload: PushPayload) {
  const tokens = await getActiveTokensForUser(username);
  const results: Array<{ token: string; ok: boolean; error?: string }> = [];

  for (const token of tokens) {
    try {
      await sendFcmToToken(token, payload);
      results.push({ token, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ token, ok: false, error: message });
      if (message.includes('NOT_FOUND') || message.includes('registration-token-not-registered')) {
        await deactivateToken(token);
      }
    }
  }

  return results;
}

async function deactivateToken(token: string) {
  const supabase = getAdminClient();
  await supabase
    .from('push_subscriptions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('token', token);
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function verifyCronSecret(req: Request) {
  const expected = Deno.env.get('PUSH_CRON_SECRET');
  if (!expected) throw new Error('PUSH_CRON_SECRET is missing');
  const got = req.headers.get('x-cron-secret');
  if (got !== expected) {
    throw new Error('Unauthorized cron request');
  }
}

export function formatMeetingDate(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });
}
