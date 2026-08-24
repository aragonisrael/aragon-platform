import { supabase } from '../supabaseClient';

/** Statuses that leave the instructor / admin-group trial lists (stay on מתעניינים only). */
export const TRIAL_CLOSED_STATUSES = ['registered', 'not_interested'];

export const TRIAL_ACTIVE_STATUSES = ['before_class', 'after_class', 'thinking'];

/** Normalize to digits-only international IL form: 9725XXXXXXXX */
export function normalizeIsraeliPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('972') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 9) return `972${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `972${digits}`;
  return null;
}

export function isActiveTrialLead(lead) {
  return lead && !TRIAL_CLOSED_STATUSES.includes(lead.status);
}

/**
 * Single registration pipe for all staff channels.
 * DB also queues confirmation WhatsApp via scheduled_followups.
 */
export async function registerTrialLead({
  groupId,
  studentFullName,
  studentGrade,
  parentName,
  parentPhone,
  needsPickup = false,
  sourceChannel = 'phone',
  createdBy = null,
}) {
  const { data, error } = await supabase.rpc('register_trial_lead', {
    p_group_id: Number(groupId),
    p_student_full_name: String(studentFullName || '').trim(),
    p_student_grade: String(studentGrade || '').trim(),
    p_parent_name: String(parentName || '').trim(),
    p_parent_phone: String(parentPhone || '').trim(),
    p_needs_pickup: Boolean(needsPickup),
    p_source_channel: sourceChannel,
    p_created_by: createdBy,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('duplicate phone for group')) {
      return { ok: false, code: 'duplicate', error: 'מספר הטלפון כבר רשום לשיעור ניסיון באותה קבוצה' };
    }
    if (msg.includes('missing required fields')) {
      return { ok: false, code: 'validation', error: 'נא למלא שם תלמיד, כיתה, שם הורה וטלפון תקין' };
    }
    if (msg.includes('group not available')) {
      return { ok: false, code: 'group', error: 'הקבוצה אינה פעילה להרשמה' };
    }
    return { ok: false, code: 'error', error: msg || 'ההרשמה נכשלה' };
  }

  return { ok: true, id: data };
}
