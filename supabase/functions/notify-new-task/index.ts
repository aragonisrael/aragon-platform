import {
  getAdminClient,
  jsonResponse,
  markNotificationSent,
  sendPushToUser,
  wasNotificationSent,
} from '../_shared/push.ts';

type TaskRecord = {
  id: number;
  title: string;
  assignee_username: string;
  created_by_username: string;
  due_date?: string | null;
  priority?: string;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: TaskRecord;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
    if (webhookSecret) {
      const got = req.headers.get('x-webhook-secret');
      if (got !== webhookSecret) {
        return jsonResponse({ ok: false, error: 'Unauthorized webhook' }, 401);
      }
    }

    const payload = (await req.json()) as WebhookPayload;
    const record = payload.record;

    if (!record?.id || !record.assignee_username) {
      return jsonResponse({ ok: false, reason: 'Missing task record' });
    }

    if (record.assignee_username === record.created_by_username) {
      return jsonResponse({ ok: true, skipped: 'self-assigned task' });
    }

    const notificationKey = `task:${record.id}:created`;
    if (await wasNotificationSent(notificationKey)) {
      return jsonResponse({ ok: true, skipped: 'already sent' });
    }

    const supabase = getAdminClient();
    const { data: assignee } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('username', record.assignee_username)
      .maybeSingle();

    if (!assignee || !['management', 'admin'].includes(assignee.role)) {
      return jsonResponse({ ok: true, skipped: 'assignee not management' });
    }

    const duePart = record.due_date ? ` · יעד: ${record.due_date}` : '';
    const urgentPart = record.priority === 'urgent' ? ' · דחוף' : '';

    const results = await sendPushToUser(record.assignee_username, {
      title: 'משימה חדשה',
      body: `${record.title}${urgentPart}${duePart}`,
      data: {
        type: 'management_task',
        task_id: String(record.id),
      },
    });

    const sentCount = results.filter((r) => r.ok).length;
    if (sentCount > 0) {
      await markNotificationSent(notificationKey);
    }

    return jsonResponse({ ok: true, sentCount, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[notify-new-task]', message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
