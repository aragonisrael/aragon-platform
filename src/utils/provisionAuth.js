import { supabase } from '../supabaseClient';

/**
 * יוצר/מקשר חשבון Auth למשתמש קיים בטבלת users.
 * דורש סשן אדמין או מדריך מחובר.
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

export async function provisionAuthUsers(userIds) {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length) return { ok: true, summary: { total: 0, created: 0, failed: 0, skipped: 0 } };

  const { data, error } = await supabase.functions.invoke('provision-auth-user', {
    body: { mode: 'provision_many', userIds: ids },
  });

  if (error) {
    const details = error.context ? await error.context.text?.().catch(() => '') : '';
    throw new Error(details || error.message || 'Auth provision failed');
  }
  if (data?.ok === false && !data?.summary) {
    throw new Error(data?.error || 'Auth provision failed');
  }
  return data;
}

async function migrateRoleBatch(mode) {
  let totalCreated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let guard = 0;

  while (guard < 50) {
    guard += 1;
    const { data, error } = await supabase.functions.invoke('provision-auth-user', {
      body: { mode, limit: 40 },
    });

    if (error) {
      const details = error.context ? await error.context.text?.().catch(() => '') : '';
      throw new Error(details || error.message || `${mode} failed`);
    }
    if (data?.ok === false && !data?.summary) {
      throw new Error(data?.error || `${mode} failed`);
    }

    const summary = data?.summary || {};
    totalCreated += summary.created || 0;
    totalFailed += summary.failed || 0;
    totalSkipped += summary.skipped || 0;
    totalProcessed += summary.total || 0;

    if (!data?.hasMore || (summary.total || 0) === 0) break;
  }

  return {
    ok: totalFailed === 0,
    summary: {
      total: totalProcessed,
      created: totalCreated,
      failed: totalFailed,
      skipped: totalSkipped,
    },
  };
}

/** העברה חד-פעמית למדריכים — אדמין בלבד */
export async function migrateInstructorAuthUsers() {
  return migrateRoleBatch('migrate_instructors');
}

/** העברה חד-פעמית לתלמידים — אדמין בלבד */
export async function migrateStudentAuthUsers() {
  return migrateRoleBatch('migrate_students');
}
