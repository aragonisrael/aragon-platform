/** אימייל סינתטי ל-Supabase Auth — שם משתמש באפליקציה → אימייל ב-Auth */
export const ARAGON_AUTH_EMAIL_DOMAIN = 'aragon.auth';

/** שמות משתמש בעברית / מיוחדים → מזהה ASCII לאימייל Auth */
const AUTH_EMAIL_LOCAL_ALIASES = {
  לוגיסטיקה: 'logistics',
};

export function authEmailFromUsername(username) {
  const raw = String(username || '').trim();
  if (!raw) return null;

  const local = AUTH_EMAIL_LOCAL_ALIASES[raw] || raw.toLowerCase();
  return `${local}@${ARAGON_AUTH_EMAIL_DOMAIN}`;
}

/** תפקידים שעוברים להתחברות אמיתית */
export const AUTH_BOOTSTRAP_ROLES = new Set(['admin', 'management', 'logistics']);

export function isAuthBootstrapRole(role) {
  return AUTH_BOOTSTRAP_ROLES.has(role);
}
