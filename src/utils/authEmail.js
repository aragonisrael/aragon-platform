/** אימייל סינתטי ל-Supabase Auth — שם משתמש באפליקציה → אימייל ב-Auth */
export const ARAGON_AUTH_EMAIL_DOMAIN = 'aragon.auth';

/** שמות משתמש בעברית / מיוחדים → מזהה ASCII לאימייל Auth */
const AUTH_EMAIL_LOCAL_ALIASES = {
  לוגיסטיקה: 'logistics',
};

const ASCII_LOCAL_RE = /^[a-zA-Z0-9._+-]+$/;

/**
 * @param {string} username
 * @param {{ userId?: number|string }=} options — נדרש לשמות לא-ASCII (למשל עברית)
 */
export function authEmailFromUsername(username, options = {}) {
  const raw = String(username || '').trim();
  if (!raw) return null;

  if (AUTH_EMAIL_LOCAL_ALIASES[raw]) {
    return `${AUTH_EMAIL_LOCAL_ALIASES[raw]}@${ARAGON_AUTH_EMAIL_DOMAIN}`;
  }

  if (ASCII_LOCAL_RE.test(raw)) {
    return `${raw.toLowerCase()}@${ARAGON_AUTH_EMAIL_DOMAIN}`;
  }

  if (options.userId != null && String(options.userId).trim() !== '') {
    return `uid${options.userId}@${ARAGON_AUTH_EMAIL_DOMAIN}`;
  }

  return null;
}

/** תפקידים שעוברים להתחברות אמיתית */
export const AUTH_BOOTSTRAP_ROLES = new Set([
  'admin',
  'management',
  'logistics',
  'instructor',
  'temp_instructor',
  'student',
]);

export function isAuthBootstrapRole(role) {
  return AUTH_BOOTSTRAP_ROLES.has(role);
}

export function isInstructorRole(role) {
  return role === 'instructor' || role === 'temp_instructor';
}
