import { getAdminClient } from './push.ts';

export type AdminTaskRecord = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  target_type?: string | null;
  target_name?: string | null;
  reward?: number | null;
};

const STUDENT_NOTIFY_CATEGORIES = new Set([
  'student_challenge',
  'student_mission',
  'student_broadcast',
]);

function normalizeGroupLabel(label: string) {
  return label
    .replace(/\s*[|—–-]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function groupLabelsMatch(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeGroupLabel(a) === normalizeGroupLabel(b);
}

export function taskAppliesToStudent(
  task: AdminTaskRecord,
  studentFullName: string,
  groupIdentifier: string,
) {
  const targetType = task.target_type ?? '';
  if (targetType === 'global' || targetType === 'all') return true;
  if (task.target_name && task.target_name === studentFullName) return true;
  if (groupIdentifier && groupLabelsMatch(task.target_name ?? '', groupIdentifier)) return true;
  return false;
}

export function shouldNotifyStudents(task: AdminTaskRecord) {
  return STUDENT_NOTIFY_CATEGORIES.has(task.category);
}

export function getStudentPushPayload(task: AdminTaskRecord) {
  const rewardPart = task.reward ? ` · ${task.reward} אראגונים` : '';

  if (task.category === 'student_challenge') {
    return {
      title: '🏆 אתגר חדש',
      body: `${task.title}${rewardPart}`,
      data: { type: 'student_challenge', task_id: String(task.id) },
    };
  }

  if (task.category === 'student_mission') {
    return {
      title: '📋 משימה חדשה מהמדריך',
      body: `${task.title}${rewardPart}`,
      data: { type: 'student_mission', task_id: String(task.id) },
    };
  }

  return {
    title: '📢 עדכון חדש',
    body: task.title,
    data: { type: 'student_broadcast', task_id: String(task.id) },
  };
}

export async function getStudentUsernamesForTask(task: AdminTaskRecord): Promise<string[]> {
  const supabase = getAdminClient();

  const { data: students, error: studentsErr } = await supabase
    .from('users')
    .select('username, full_name, group_id')
    .eq('role', 'student');

  if (studentsErr || !students?.length) return [];

  const groupIds = [...new Set(students.map((s) => s.group_id).filter(Boolean))] as number[];
  const groupMap = new Map<number, string>();

  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name, venue')
      .in('id', groupIds);

    for (const group of groups ?? []) {
      groupMap.set(group.id, `${group.venue} — ${group.name}`);
    }
  }

  return students
    .filter((student) => {
      const fullName = student.full_name || student.username;
      const groupStr = student.group_id ? groupMap.get(student.group_id) ?? '' : '';
      return taskAppliesToStudent(task, fullName, groupStr);
    })
    .map((student) => student.username)
    .filter(Boolean);
}
