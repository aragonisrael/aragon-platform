export const TASK_STATUSES = [
  { id: 'open', label: 'לטיפול', color: '#00c8ff' },
  { id: 'in_progress', label: 'בביצוע', color: '#f0a820' },
  { id: 'blocked', label: 'חסום', color: '#ff5555' },
  { id: 'done', label: 'הושלם', color: '#00e676' },
];

export const TASK_PRIORITIES = [
  { id: 'normal', label: 'רגיל' },
  { id: 'urgent', label: 'דחוף' },
];

export const DEPARTMENTS = [
  { id: 'office', label: 'משרד' },
  { id: 'content', label: 'תוכן' },
  { id: 'training', label: 'ניהול הדרכה' },
  { id: 'marketing', label: 'שיווק' },
  { id: 'logistics', label: 'לוגיסטיקה' },
  { id: 'hr', label: 'משאבי אנוש' },
];

/** חשבונות הנהלה לפי מחלקה — role: management */
export const MANAGEMENT_DEPARTMENT_ACCOUNTS = [
  { username: 'hey', department: 'office', fullName: 'משרד' },
  { username: 'edu', department: 'content', fullName: 'תוכן' },
  { username: 'manager', department: 'training', fullName: 'ניהול הדרכה' },
  { username: 'hello', department: 'marketing', fullName: 'שיווק' },
  { username: 'logistic', department: 'logistics', fullName: 'לוגיסטיקה' },
  { username: 'hr', department: 'hr', fullName: 'משאבי אנוש' },
];

/** לוח לוגיסטיקה מבצעי (/admin/logistics) — role: logistics */
export const LOGISTICS_ADMIN_ACCOUNT = {
  username: 'לוגיסטיקה',
  fullName: 'לוגיסטיקה',
  department: 'logistics',
};

const LEGACY_DEPARTMENT_LABELS = {
  general: 'כללי',
};

export const MEETING_TYPES = [
  { id: 'weekly', label: 'ישיבת צוות שבועית' },
  { id: 'topic', label: 'ישיבת נושא' },
];

export const MEETING_STATUSES = [
  { id: 'scheduled', label: 'מתוכננת' },
  { id: 'live', label: 'במהלך ישיבה' },
  { id: 'closed', label: 'נסגרה' },
];

export const AGENDA_ITEM_TYPES = [
  { id: 'discussion', label: 'לדיון' },
  { id: 'update', label: 'עדכון להצגה' },
  { id: 'decision', label: 'החלטה נדרשת' },
  { id: 'task_draft', label: 'טיוטת משימה' },
];

export const AGENDA_ITEM_STATUSES = [
  { id: 'pending', label: 'ממתין' },
  { id: 'discussed', label: 'נדון' },
  { id: 'converted', label: 'הומר למשימה' },
  { id: 'skipped', label: 'נדחה' },
];

export const deptLabel = (id) =>
  DEPARTMENTS.find(d => d.id === id)?.label || LEGACY_DEPARTMENT_LABELS[id] || id || '—';
export const statusLabel = (id) => TASK_STATUSES.find(s => s.id === id)?.label || id;
export const meetingTypeLabel = (id) => MEETING_TYPES.find(m => m.id === id)?.label || id;
export const meetingStatusLabel = (id) => MEETING_STATUSES.find(s => s.id === id)?.label || id;
export const agendaItemStatusLabel = (id) => AGENDA_ITEM_STATUSES.find(s => s.id === id)?.label || id;

const ROLE_LABELS = {
  management: 'הנהלה',
  admin: 'מנהל מערכת',
  instructor: 'מדריך',
  student: 'תלמיד',
  logistics: 'לוגיסטיקה',
};

export const roleLabel = (id) => ROLE_LABELS[id] || id || '—';

/** מחזיר מחלקה לפי משתמש — לניתוב משימות בין מחלקות */
export function departmentForUser(username, teamUsers = []) {
  const mapped = MANAGEMENT_DEPARTMENT_ACCOUNTS.find((a) => a.username === username);
  if (mapped) return mapped.department;

  const member = teamUsers.find((u) => u.username === username);
  return member?.department || 'office';
}

/** משתמש אחראי לפי מחלקה */
export function assigneeForDepartment(departmentId) {
  return MANAGEMENT_DEPARTMENT_ACCOUNTS.find((a) => a.department === departmentId)?.username || null;
}

/** ברירת מחדל לאחריות — המחלקה של המשתמש המחובר */
export function defaultResponsibilityForUser(username, teamUsers = []) {
  return departmentForUser(username, teamUsers);
}

/** ממפה בחירת אחריות (מחלקה) לשדות משימה בשרת */
export function taskFieldsFromResponsibility(departmentId, createdByUsername) {
  const department = departmentId || 'office';
  const assignee_username = assigneeForDepartment(department) || createdByUsername;
  return { department, assignee_username };
}

/** האם משימה מוצגת בלשונית "שויכו אליי" כולל צירוף אחריות */
export function isTaskInMyQueue(task, loggedUser, profile) {
  if (!task || !loggedUser) return false;
  if (task.assignee_username === loggedUser) return true;

  if (
    profile?.responsibility_coverage_enabled &&
    profile?.responsibility_coverage_department &&
    task.department === profile.responsibility_coverage_department
  ) {
    return true;
  }

  return false;
}

export function coverageDepartmentOptions(userDepartment) {
  return DEPARTMENTS.filter((d) => d.id !== userDepartment);
}
