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
  { id: 'general', label: 'כללי' },
  { id: 'content', label: 'תוכן' },
  { id: 'training', label: 'ניהול הדרכה' },
  { id: 'marketing', label: 'שיווק' },
  { id: 'logistics', label: 'לוגיסטיקה' },
];

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

export const deptLabel = (id) => DEPARTMENTS.find(d => d.id === id)?.label || id || 'כללי';
export const statusLabel = (id) => TASK_STATUSES.find(s => s.id === id)?.label || id;
export const meetingTypeLabel = (id) => MEETING_TYPES.find(m => m.id === id)?.label || id;

const ROLE_LABELS = {
  management: 'הנהלה',
  admin: 'מנהל מערכת',
  instructor: 'מדריך',
  student: 'תלמיד',
  logistics: 'לוגיסטיקה',
};

export const roleLabel = (id) => ROLE_LABELS[id] || id || '—';
