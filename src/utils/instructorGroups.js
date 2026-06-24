import { getLoggedUser } from './authStorage';

/** שמות אפשריים לשדה groups.instructor עבור משתמש מדריך */
export function instructorMatchNames(userData) {
  const fullName = (userData?.full_name || '').trim();
  const username = (userData?.username || '').trim();
  const names = new Set();
  if (fullName) names.add(fullName);
  if (username) names.add(username);
  if (userData?.role === 'temp_instructor' && fullName) {
    names.add(`${fullName} (זמני)`);
    names.add(`${fullName} (זמנית)`);
  }
  return [...names];
}

export function normalizeInstructorLabel(value) {
  return String(value || '')
    .replace(/\s*\(זמנית?\)\s*/gi, '')
    .trim()
    .toLowerCase();
}

export function groupMatchesInstructor(group, userData) {
  const inst = (group?.instructor || '').trim();
  if (!inst || !userData) return false;

  const names = instructorMatchNames(userData);
  if (names.includes(inst)) return true;

  const baseInst = normalizeInstructorLabel(inst);
  const baseFull = normalizeInstructorLabel(userData.full_name);
  const baseUser = normalizeInstructorLabel(userData.username);
  return (baseFull && baseInst === baseFull) || (baseUser && baseInst === baseUser);
}

export async function fetchInstructorUser(supabase, username) {
  const lookup = username || getLoggedUser();
  if (!lookup) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, role, ils_balance, xp, coins')
    .eq('username', lookup)
    .single();

  if (error || !data) return null;
  return data;
}

/** שליפת קבוצות המשויכות למדריך — לפי שם מלא, שם משתמש, או מדריך זמני */
export async function fetchInstructorGroups(supabase, username) {
  const userData = await fetchInstructorUser(supabase, username);
  if (!userData) return { userData: null, groups: [] };

  const matchNames = instructorMatchNames(userData);
  let groups = [];

  if (matchNames.length > 0) {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .in('instructor', matchNames);

    if (!error && data?.length) groups = data;
  }

  if (groups.length === 0) {
    const { data: allGroups, error } = await supabase.from('groups').select('*');
    if (!error && allGroups) {
      groups = allGroups.filter((g) => groupMatchesInstructor(g, userData));
    }
  }

  return { userData, groups };
}
