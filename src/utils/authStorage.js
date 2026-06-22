const USER_KEY = 'aragon_logged_user';
const ROLE_KEY = 'aragon_logged_role';

/** חשבונות בדיקה ישנים — מוחלפים אוטומטית ב-Native */
export const NATIVE_TEST_STUDENT_USERNAME = 'student';
export const LEGACY_TEST_STUDENT_USERNAME = 'student1';

/** ברירת מחדל לתצוגה מקדימה (Cursor) ולבדיקות Native */
export const DEV_PREVIEW_INSTRUCTOR_USERNAME = 'guide';
export const DEV_PREVIEW_PASSWORD = '12345678';

export function getDevAutoLoginCredentials() {
  if (!import.meta.env.DEV) return null;

  const username =
    import.meta.env.VITE_DEV_AUTO_LOGIN_USERNAME || DEV_PREVIEW_INSTRUCTOR_USERNAME;
  const password =
    import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD || DEV_PREVIEW_PASSWORD;

  if (!username || !password) return null;
  return { username, password };
}

export function getNativeAutoLoginCredentials() {
  const username =
    import.meta.env.VITE_NATIVE_AUTO_LOGIN_USERNAME || DEV_PREVIEW_INSTRUCTOR_USERNAME;
  const password =
    import.meta.env.VITE_NATIVE_AUTO_LOGIN_PASSWORD || DEV_PREVIEW_PASSWORD;

  if (!username || !password) return null;
  return { username, password };
}

function usePersistentStorage() {
  return typeof window !== 'undefined' && window.Capacitor;
}

function primaryStore() {
  return usePersistentStorage() ? localStorage : sessionStorage;
}

export function getLoggedUser() {
  return primaryStore().getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
}

export function getLoggedRole() {
  return primaryStore().getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY);
}

export function saveAuth(username, role) {
  primaryStore().setItem(USER_KEY, username);
  primaryStore().setItem(ROLE_KEY, role);
  if (usePersistentStorage()) {
    localStorage.setItem(USER_KEY, username);
    localStorage.setItem(ROLE_KEY, role);
  }
}

export function clearAuth() {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function routeForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'logistics') return '/admin/logistics';
  if (role === 'management') return '/management';
  if (role === 'instructor' || role === 'temp_instructor') return '/instructor';
  return '/student';
}
