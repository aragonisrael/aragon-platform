import { createClient } from 'npm:@supabase/supabase-js@2';
import { getAdminClient, jsonResponse } from '../_shared/push.ts';

const AUTH_EMAIL_DOMAIN = 'aragon.auth';
const AUTH_EMAIL_LOCAL_ALIASES: Record<string, string> = {
  לוגיסטיקה: 'logistics',
};
const ASCII_LOCAL_RE = /^[a-zA-Z0-9._+-]+$/;

type AppUser = {
  id: number;
  username: string;
  password: string | null;
  role: string;
  auth_user_id: string | null;
};

function authEmailFromUser(user: AppUser): string | null {
  const raw = String(user.username || '').trim();
  if (!raw) return null;
  if (AUTH_EMAIL_LOCAL_ALIASES[raw]) {
    return `${AUTH_EMAIL_LOCAL_ALIASES[raw]}@${AUTH_EMAIL_DOMAIN}`;
  }
  if (ASCII_LOCAL_RE.test(raw)) {
    return `${raw.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
  }
  return `uid${user.id}@${AUTH_EMAIL_DOMAIN}`;
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: jsonResponse({ ok: false, error: 'Missing auth' }, 401) };
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    return { error: jsonResponse({ ok: false, error: 'Missing anon env' }, 500) };
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { error: jsonResponse({ ok: false, error: 'Invalid session' }, 401) };
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('username, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { error: jsonResponse({ ok: false, error: 'Admin only' }, 403) };
  }

  return { admin, profile };
}

async function provisionOne(admin: ReturnType<typeof getAdminClient>, user: AppUser) {
  if (user.auth_user_id) {
    return { username: user.username, status: 'already_linked', auth_user_id: user.auth_user_id };
  }

  const email = authEmailFromUser(user);
  if (!email) {
    return { username: user.username, status: 'error', error: 'Cannot build auth email' };
  }

  const password = String(user.password || '').trim() || '12345678';

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      app_username: user.username,
      app_role: user.role,
      app_user_id: user.id,
    },
  });

  if (createErr) {
    // אם כבר קיים ב-Auth — ננסה לקשר לפי אימייל
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return { username: user.username, status: 'error', error: createErr.message };
    }
    const existing = (listData?.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (!existing) {
      return { username: user.username, status: 'error', error: createErr.message };
    }

    const { error: linkErr } = await admin
      .from('users')
      .update({ auth_user_id: existing.id })
      .eq('id', user.id);

    if (linkErr) {
      return { username: user.username, status: 'error', error: linkErr.message };
    }
    return { username: user.username, status: 'linked_existing', auth_user_id: existing.id, email };
  }

  const authUserId = created.user?.id;
  if (!authUserId) {
    return { username: user.username, status: 'error', error: 'Auth user missing id' };
  }

  const { error: linkErr } = await admin
    .from('users')
    .update({ auth_user_id: authUserId })
    .eq('id', user.id);

  if (linkErr) {
    return { username: user.username, status: 'error', error: linkErr.message, auth_user_id: authUserId };
  }

  return { username: user.username, status: 'created', auth_user_id: authUserId, email };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const gate = await requireAdmin(req);
    if ('error' in gate && gate.error) return gate.error;
    const admin = gate.admin!;

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'one';

    if (mode === 'one') {
      const userId = Number(body?.userId);
      if (!userId) return jsonResponse({ ok: false, error: 'userId required' }, 400);

      const { data: user, error } = await admin
        .from('users')
        .select('id, username, password, role, auth_user_id')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return jsonResponse({ ok: false, error: error?.message || 'User not found' }, 404);
      }

      const result = await provisionOne(admin, user as AppUser);
      return jsonResponse({ ok: result.status !== 'error', result });
    }

    if (mode === 'migrate_instructors') {
      const { data: users, error } = await admin
        .from('users')
        .select('id, username, password, role, auth_user_id')
        .in('role', ['instructor', 'temp_instructor'])
        .is('auth_user_id', null)
        .order('id', { ascending: true });

      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 500);
      }

      const results = [];
      for (const user of users || []) {
        results.push(await provisionOne(admin, user as AppUser));
      }

      const created = results.filter((r) => r.status === 'created' || r.status === 'linked_existing').length;
      const failed = results.filter((r) => r.status === 'error').length;
      const skipped = results.filter((r) => r.status === 'already_linked').length;

      return jsonResponse({
        ok: failed === 0,
        summary: { total: results.length, created, failed, skipped },
        results,
      });
    }

    return jsonResponse({ ok: false, error: 'Unknown mode' }, 400);
  } catch (err) {
    console.error(err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
});
