import { getAdminClient } from './push.ts';

export type InstructorTaskRecord = {
  id: number;
  title?: string | null;
  description?: string | null;
  category: string;
  target_type?: string | null;
  target_name?: string | null;
  reward?: number | null;
};

const INSTRUCTOR_NOTIFY_CATEGORIES = new Set(['instructor_incentive']);

export function shouldNotifyInstructor(task: InstructorTaskRecord) {
  return INSTRUCTOR_NOTIFY_CATEGORIES.has(task.category);
}

export function getInstructorPushPayload(task: InstructorTaskRecord) {
  const rewardPart = task.reward ? ` · בונוס ${task.reward} ₪` : '';
  const body = `${(task.description || task.title || 'עדכון חדש ממפקדה').trim()}${rewardPart}`;

  return {
    title: '🏆 אתגר / משימה חדשה ממפקדה',
    body,
    data: {
      type: 'instructor_incentive',
      task_id: String(task.id),
    },
  };
}

export async function getInstructorUsernamesForTask(task: InstructorTaskRecord): Promise<string[]> {
  const supabase = getAdminClient();
  const targetType = task.target_type ?? '';

  const { data: instructors, error } = await supabase
    .from('users')
    .select('username, full_name')
    .in('role', ['instructor', 'temp_instructor']);

  if (error || !instructors?.length) return [];

  if (targetType === 'all' || targetType === 'global') {
    return instructors.map((row) => row.username).filter(Boolean);
  }

  const targetName = (task.target_name || '').trim();
  if (!targetName) return [];

  return instructors
    .filter((row) => row.full_name === targetName)
    .map((row) => row.username)
    .filter(Boolean);
}

const WINDOW_MS = 15 * 60 * 1000;
const REMINDER_LEAD_MS = 90 * 60 * 1000;

type IsraelClock = {
  dateKey: string;
  dayOfWeek: number;
  nowMs: number;
};

function getIsraelClock(now = new Date()): IsraelClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short',
    })
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const wallNowMs = zonedTimeToUtc(dateKey, Number(parts.hour) * 60 + Number(parts.minute));

  return {
    dateKey,
    dayOfWeek: weekdayMap[parts.weekday] ?? 0,
    nowMs: wallNowMs + Number(parts.second) * 1000,
  };
}

export function zonedTimeToUtc(dateKey: string, startMin: number, timeZone = 'Asia/Jerusalem'): number {
  const hours = Math.floor(startMin / 60);
  const minutes = startMin % 60;
  let ts = Date.parse(`${dateKey}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const wall = Object.fromEntries(
      formatter
        .formatToParts(new Date(ts))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    ) as Record<string, string>;

    const wallDateKey = `${wall.year}-${wall.month}-${wall.day}`;
    const wallStartMin = Number(wall.hour) * 60 + Number(wall.minute);
    const targetStartMin = hours * 60 + minutes;

    if (wallDateKey === dateKey && wallStartMin === targetStartMin) {
      return ts;
    }

    const dayDiffMs = (Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${wallDateKey}T00:00:00Z`));
    ts += dayDiffMs + (targetStartMin - wallStartMin) * 60 * 1000;
  }

  return ts;
}

export function formatLessonTime(startMin: number) {
  const hours = Math.floor(startMin / 60);
  const minutes = startMin % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function inReminderWindow(targetMs: number, nowMs: number) {
  const reminderAt = targetMs - REMINDER_LEAD_MS;
  return Math.abs(reminderAt - nowMs) <= WINDOW_MS;
}

type LessonCandidate = {
  startMin: number;
  label: string;
};

export async function getFirstLessonToday(fullName: string, clock: IsraelClock): Promise<LessonCandidate | null> {
  const supabase = getAdminClient();
  const candidates: LessonCandidate[] = [];

  const { data: groups } = await supabase
    .from('groups')
    .select('name, venue, day, start_min')
    .eq('instructor', fullName)
    .eq('day', clock.dayOfWeek);

  for (const group of groups ?? []) {
    const startMin = Number(group.start_min);
    if (!Number.isFinite(startMin)) continue;
    candidates.push({
      startMin,
      label: `${formatLessonTime(startMin)} · ${group.venue || group.name || 'שיעור'}`,
    });
  }

  const { data: campRows } = await supabase
    .from('camp_compounds')
    .select('room_type, senior_instructor, temp_instructor, camps(title, start_date, end_date)');

  for (const row of campRows ?? []) {
    if (row.senior_instructor !== fullName && row.temp_instructor !== fullName) continue;
    const camp = Array.isArray(row.camps) ? row.camps[0] : row.camps;
    if (!camp) continue;
    if (clock.dateKey < camp.start_date || clock.dateKey > camp.end_date) continue;

    const isFirstDay = clock.dateKey === camp.start_date;
    const startMin = isFirstDay ? (7 * 60 + 15) : (7 * 60 + 40);
    candidates.push({
      startMin,
      label: `${formatLessonTime(startMin)} · קייטנה: ${camp.title || 'מתחם'}`,
    });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.startMin - b.startMin);
  const first = candidates[0];
  const lessonStartMs = zonedTimeToUtc(clock.dateKey, first.startMin);

  if (lessonStartMs <= clock.nowMs) return null;

  return first;
}

export function lessonReminderKey(username: string, dateKey: string) {
  return `instructor_lesson:${username}:${dateKey}:90min`;
}

export { WINDOW_MS, REMINDER_LEAD_MS };
