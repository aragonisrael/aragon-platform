import {
  getStudentPushPayload,
  getStudentUsernamesForTask,
  shouldNotifyStudents,
  type AdminTaskRecord,
} from '../_shared/studentPush.ts';
import {
  jsonResponse,
  markNotificationSent,
  sendPushToUser,
  wasNotificationSent,
} from '../_shared/push.ts';

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: AdminTaskRecord;
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

    if (!record?.id || !record.category) {
      return jsonResponse({ ok: false, reason: 'Missing admin_tasks record' });
    }

    if (!shouldNotifyStudents(record)) {
      return jsonResponse({ ok: true, skipped: 'not a student notification category' });
    }

    const usernames = await getStudentUsernamesForTask(record);
    if (!usernames.length) {
      return jsonResponse({ ok: true, skipped: 'no matching students' });
    }

    const pushPayload = getStudentPushPayload(record);
    const summary: Array<Record<string, unknown>> = [];

    for (const username of usernames) {
      const notificationKey = `student_task:${record.id}:${username}:created`;
      if (await wasNotificationSent(notificationKey)) {
        summary.push({ username, skipped: true });
        continue;
      }

      const results = await sendPushToUser(username, pushPayload);
      const sentCount = results.filter((r) => r.ok).length;

      if (sentCount > 0) {
        await markNotificationSent(notificationKey);
      }

      summary.push({ username, sentCount, hasToken: results.length > 0 });
    }

    return jsonResponse({
      ok: true,
      taskId: record.id,
      category: record.category,
      recipients: usernames.length,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[notify-student-task]', message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
