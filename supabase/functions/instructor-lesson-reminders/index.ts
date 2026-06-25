import {
  getFirstLessonToday,
  getIsraelClock,
  inReminderWindow,
  lessonReminderKey,
  zonedTimeToUtc,
} from '../_shared/instructorPush.ts';
import {
  getAdminClient,
  jsonResponse,
  markNotificationSent,
  sendPushToUser,
  verifyCronSecret,
  wasNotificationSent,
} from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    verifyCronSecret(req);

    const supabase = getAdminClient();
    const clock = getIsraelClock();
    const summary: Array<Record<string, unknown>> = [];

    const { data: instructors, error } = await supabase
      .from('users')
      .select('username, full_name')
      .in('role', ['instructor', 'temp_instructor']);

    if (error) throw error;

    for (const instructor of instructors ?? []) {
      if (!instructor.username || !instructor.full_name) continue;

      const firstLesson = await getFirstLessonToday(instructor.full_name, clock);
      if (!firstLesson) {
        summary.push({ username: instructor.username, skipped: 'no upcoming lesson today' });
        continue;
      }

      const lessonStartMs = zonedTimeToUtc(clock.dateKey, firstLesson.startMin);
      if (!inReminderWindow(lessonStartMs, clock.nowMs)) {
        summary.push({ username: instructor.username, skipped: 'outside reminder window' });
        continue;
      }

      const key = lessonReminderKey(instructor.username, clock.dateKey);
      if (await wasNotificationSent(key)) {
        summary.push({ username: instructor.username, key, skipped: true });
        continue;
      }

      const results = await sendPushToUser(instructor.username, {
        title: 'שיעור ראשון בעוד שעה וחצי',
        body: firstLesson.label,
        data: {
          type: 'instructor_lesson_reminder',
          date: clock.dateKey,
        },
      });

      const sentCount = results.filter((result) => result.ok).length;
      if (sentCount > 0) {
        await markNotificationSent(key);
      }

      summary.push({ username: instructor.username, key, sentCount });
    }

    return jsonResponse({
      ok: true,
      dateKey: clock.dateKey,
      checkedInstructors: instructors?.length ?? 0,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[instructor-lesson-reminders]', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return jsonResponse({ ok: false, error: message }, status);
  }
});
