/** Default description when an instructor creates a task from /instructor/tasks */
export const INSTRUCTOR_TASKS_DESC = 'משימה מאת המדריך לשילוב הפרויקט';

export function buildGroupIdentifier(groupData) {
  if (!groupData) return '';
  return `${groupData.venue} — ${groupData.name}`;
}

function normalizeGroupLabel(label) {
  if (!label) return '';
  return label
    .replace(/\s*[|—–-]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function groupLabelsMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeGroupLabel(a) === normalizeGroupLabel(b);
}

/** Whether a row from admin_tasks should appear for this student */
export function taskAppliesToStudent(task, studentFullName, groupIdentifier) {
  if (!task) return false;
  if (task.target_type === 'global' || task.target_type === 'all') return true;
  if (task.target_name && task.target_name === studentFullName) return true;
  if (groupIdentifier && groupLabelsMatch(task.target_name, groupIdentifier)) return true;
  return false;
}

function isFromInstructor(task) {
  const desc = (task.description || '').trim();
  return desc === INSTRUCTOR_TASKS_DESC || desc.startsWith('נשלח ע"י המדריך');
}

/** Admin hub challenges (+ legacy admin rows before category split) */
export function isStudentChallenge(task) {
  if (task.category === 'student_challenge') return true;
  if (task.category === 'student_mission' && !isFromInstructor(task)) return true;
  return false;
}

/** Instructor / group tasks from instructor/tasks (and groups modal) */
export function isStudentRegularMission(task) {
  return task.category === 'student_mission' && isFromInstructor(task);
}

export const STUDENT_TASK_CATEGORIES = ['student_mission', 'student_challenge'];
