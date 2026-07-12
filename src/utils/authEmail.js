/** אימייל סינתטי ל-Supabase Auth — שם משתמש באפליקציה → אימייל ב-Auth */
export const ARAGON_AUTH_EMAIL_DOMAIN = 'aragon.auth';

export function authEmailFromUsername(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return null;
  return `${clean}@${ARAGON_AUTH_EMAIL_DOMAIN}`;
}

/** תפקידים שעוברים להתחברות אמיתית בשלב 1 */
export const AUTH_BOOTSTRAP_ROLES = new Set(['admin', 'management']);

export function isAuthBootstrapRole(role) {
  return AUTH_BOOTSTRAP_ROLES.has(role);
}
