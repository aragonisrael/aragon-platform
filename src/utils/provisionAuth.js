import { supabase } from '../supabaseClient';

/**
 * יוצר/מקשר חשבון Auth למשתמש קיים בטבלת users.
 * דורש סשן אדמין מחובר.
 */
export async function provisionAuthUser(userId) {
  const { data, error } = await supabase.functions.invoke('provision-auth-user', {
    body: { mode: 'one', userId },
  });

  if (error) throw error;
  if (data?.ok === false) {
    throw new Error(data?.result?.error || data?.error || 'Auth provision failed');
  }
  return data;
}

/**
 * העברה חד-פעמית: כל המדריכים בלי auth_user_id.
 * דורש סשן אדמין מחובר.
 */
export async function migrateInstructorAuthUsers() {
  const { data, error } = await supabase.functions.invoke('provision-auth-user', {
    body: { mode: 'migrate_instructors' },
  });

  if (error) throw error;
  if (data?.ok === false && !data?.summary) {
    throw new Error(data?.error || 'Instructor Auth migration failed');
  }
  return data;
}
