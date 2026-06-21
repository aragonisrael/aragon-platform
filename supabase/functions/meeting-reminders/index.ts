import {
  formatMeetingDate,
  getAdminClient,
  jsonResponse,
  markNotificationSent,
  sendPushToUser,
  verifyCronSecret,
  wasNotificationSent,
} from '../_shared/push.ts';

type MeetingRow = {
  id: number;
  title: string;
  meeting_type: string;
  meeting_date: string;
  status: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

function inWindow(targetMs: number, centerMs: number, windowMs: number) {
  return Math.abs(targetMs - centerMs) <= windowMs;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    verifyCronSecret(req);

    const supabase = getAdminClient();
    const now = Date.now();

    const { data: meetings, error } = await supabase
      .from('management_meetings')
      .select('id, title, meeting_type, meeting_date, status')
      .eq('meeting_type', 'weekly')
      .eq('status', 'scheduled')
      .gte('meeting_date', new Date(now - WINDOW_MS).toISOString())
      .lte('meeting_date', new Date(now + DAY_MS + WINDOW_MS).toISOString());

    if (error) throw error;

    const { data: recipients } = await supabase
      .from('users')
      .select('username')
      .eq('role', 'management');

    const usernames = (recipients ?? []).map((r) => r.username).filter(Boolean);
    const summary: Array<Record<string, unknown>> = [];

    for (const meeting of (meetings ?? []) as MeetingRow[]) {
      const meetingTime = new Date(meeting.meeting_date).getTime();
      const jobs: Array<{ key: string; title: string; body: string }> = [];

      if (inWindow(meetingTime, now + DAY_MS, WINDOW_MS)) {
        jobs.push({
          key: `meeting:${meeting.id}:day_before`,
          title: 'מחר ישיבת צוות',
          body: `${meeting.title} · ${formatMeetingDate(meeting.meeting_date)}`,
        });
      }

      if (inWindow(meetingTime, now + HOUR_MS, WINDOW_MS)) {
        jobs.push({
          key: `meeting:${meeting.id}:hour_before`,
          title: 'ישיבת צוות בעוד שעה',
          body: `${meeting.title} · ${formatMeetingDate(meeting.meeting_date)}`,
        });
      }

      for (const job of jobs) {
        if (await wasNotificationSent(job.key)) {
          summary.push({ meetingId: meeting.id, key: job.key, skipped: true });
          continue;
        }

        let sentCount = 0;
        for (const username of usernames) {
          const results = await sendPushToUser(username, {
            title: job.title,
            body: job.body,
            data: {
              type: 'management_meeting',
              meeting_id: String(meeting.id),
            },
          });
          sentCount += results.filter((r) => r.ok).length;
        }

        if (sentCount > 0) {
          await markNotificationSent(job.key);
        }

        summary.push({ meetingId: meeting.id, key: job.key, sentCount });
      }
    }

    return jsonResponse({ ok: true, checkedMeetings: meetings?.length ?? 0, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[meeting-reminders]', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return jsonResponse({ ok: false, error: message }, status);
  }
});
