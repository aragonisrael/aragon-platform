import { supabase } from '../supabaseClient';

export const HANUKKAH_CAMPAIGN = {
  name: 'קמפיין גיוס - קייטנת חנוכה 2026',
  slug: 'hanukkah-camp-2026',
};

/** Table order: accepted first, then waiting, then the rest. */
export const STATUS_SORT = ['accepted', 'waiting', 'not_contacted', 'not_relevant'];

export const RECRUITMENT_STATUSES = [
  { value: 'not_contacted', label: 'טרם קיבל פניה', color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.45)' },
  { value: 'waiting', label: 'רלוונטי - ממתין', color: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.45)' },
  { value: 'accepted', label: 'רלוונטי - התקבל', color: '#86efac', bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.5)' },
  { value: 'not_relevant', label: 'לא רלוונטי', color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.45)' },
];

export const RECRUITMENT_ROLES = [
  { value: 'assistant', label: 'עוזר מדריך' },
  { value: 'instructor', label: 'מדריך' },
  { value: 'pro_instructor', label: 'מדריך מקצועי' },
  { value: 'manager', label: 'מנהל' },
  { value: 'logistics', label: 'לוגיסטיקה' },
];

export const QUOTA_FIELDS = [
  { key: 'instructors_needed', countKey: 'instructors', label: 'מדריכים נדרשים' },
  { key: 'assistants_needed', countKey: 'assistants', label: 'עוזרי מדריך נדרשים' },
  { key: 'managers_needed', countKey: 'managers', label: 'מנהל נדרש' },
];

export const SOURCE_META = {
  manual: { label: 'ידני', color: '#9fb0c6' },
  website: { label: 'אתר', color: '#00d8b0' },
  facebook: { label: 'פייסבוק', color: '#8eb6ff' },
  partners: { label: 'משתפי פעולה', color: '#e2b15a' },
};

export const EMPTY_CANDIDATE = {
  full_name: '',
  age: '',
  city: '',
  phone: '',
  computer_knowledge: '',
  teaching_experience: '',
  hourly_rate: '',
  internal_notes: '',
  status: 'not_contacted',
  role: '',
};

export function statusMeta(value) {
  return RECRUITMENT_STATUSES.find((item) => item.value === value) || RECRUITMENT_STATUSES[0];
}

export function roleLabel(value) {
  return RECRUITMENT_ROLES.find((item) => item.value === value)?.label || '';
}

export function sortCandidates(list) {
  return [...list].sort((a, b) => {
    const ra = STATUS_SORT.indexOf(a.status);
    const rb = STATUS_SORT.indexOf(b.status);
    const sa = ra === -1 ? 99 : ra;
    const sb = rb === -1 ? 99 : rb;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

/**
 * Hired slots follow the role on the row.
 * מדריכים = מדריך + מדריך מקצועי.
 */
export function quotaCounts(candidates) {
  const list = candidates || [];
  const instructorOnly = list.filter((c) => c.role === 'instructor').length;
  const pro = list.filter((c) => c.role === 'pro_instructor').length;
  return {
    instructors: instructorOnly + pro,
    instructorOnly,
    pro,
    assistants: list.filter((c) => c.role === 'assistant').length,
    managers: list.filter((c) => c.role === 'manager').length,
    logistics: list.filter((c) => c.role === 'logistics').length,
  };
}

export function makeCampaignSlug(name) {
  const latin = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-4);
  return latin ? `${latin}-${suffix}` : `campaign-${suffix}`;
}

export function isRecruitmentSchemaMissing(error) {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || error.code === 'PGRST202'
    || /recruitment_campaigns|recruitment_candidates|submit_recruitment_application|schema cache/i.test(msg)
  );
}

export function candidateToForm(row) {
  if (!row) return { ...EMPTY_CANDIDATE };
  return {
    full_name: row.full_name || '',
    age: row.age ?? '',
    city: row.city || '',
    phone: row.phone || '',
    computer_knowledge: row.computer_knowledge || '',
    teaching_experience: row.teaching_experience || '',
    hourly_rate: row.hourly_rate ?? '',
    internal_notes: row.internal_notes || '',
    status: row.status || 'not_contacted',
    role: row.role || '',
  };
}

export function formToCandidatePayload(form) {
  const name = String(form.full_name || '').trim();
  const phone = String(form.phone || '').trim();
  const ageRaw = String(form.age ?? '').trim();
  const rateRaw = String(form.hourly_rate ?? '').trim();
  const age = ageRaw === '' ? null : Number(ageRaw);
  const rate = rateRaw === '' ? null : Number(rateRaw);

  if (!name) return { error: 'צריך שם מלא' };
  if (phone.replace(/\D/g, '').length < 9) return { error: 'צריך טלפון תקין' };
  if (age !== null && (!Number.isFinite(age) || age < 14 || age > 80)) {
    return { error: 'גיל צריך להיות בין 14 ל-80, או להישאר ריק' };
  }
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 10000)) {
    return { error: 'תעריף לשעה לא תקין' };
  }
  if (!RECRUITMENT_STATUSES.some((item) => item.value === form.status)) {
    return { error: 'סטטוס לא מוכר' };
  }
  if (form.role && !RECRUITMENT_ROLES.some((item) => item.value === form.role)) {
    return { error: 'תפקיד לא מוכר' };
  }

  return {
    payload: {
      full_name: name,
      age,
      city: String(form.city || '').trim() || null,
      phone,
      computer_knowledge: String(form.computer_knowledge || '').trim() || null,
      teaching_experience: String(form.teaching_experience || '').trim() || null,
      hourly_rate: rate,
      internal_notes: String(form.internal_notes || '').trim() || null,
      status: form.status || 'not_contacted',
      role: form.role || null,
    },
  };
}

export function formatRate(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('he-IL')} ₪`;
}

export function formatLeadWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

export function phoneHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `tel:${digits}`;
}

export async function fetchPublicCampaign(slug) {
  const { data, error } = await supabase.rpc('get_public_recruitment_campaign', {
    p_slug: slug,
  });
  if (error) return { ok: false, error };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, missing: true };
  return { ok: true, campaign: row };
}

export async function submitRecruitmentApplication({
  slug,
  fullName,
  phone,
  age,
  city,
  computerKnowledge,
  teachingExperience,
  hourlyRate,
  source = 'website',
}) {
  const ageNumber = Number(String(age ?? '').trim());
  const rateNumber = Number(String(hourlyRate ?? '').trim());
  const { data, error } = await supabase.rpc('submit_recruitment_application', {
    p_campaign_slug: slug,
    p_full_name: String(fullName || '').trim(),
    p_phone: String(phone || '').trim(),
    p_age: Number.isFinite(ageNumber) ? Math.trunc(ageNumber) : null,
    p_city: String(city || '').trim() || null,
    p_computer_knowledge: String(computerKnowledge || '').trim() || null,
    p_teaching_experience: String(teachingExperience || '').trim() || null,
    p_hourly_rate: Number.isFinite(rateNumber) ? rateNumber : null,
    p_source: source,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('missing name')) return { ok: false, error: 'חסר שם מלא' };
    if (msg.includes('invalid phone')) return { ok: false, error: 'טלפון לא תקין' };
    if (msg.includes('campaign not found')) return { ok: false, error: 'הקמפיין לא נמצא' };
    if (msg.includes('campaign closed')) return { ok: false, error: 'הגיוס לקמפיין הזה סגור' };
    if (isRecruitmentSchemaMissing(error)) {
      return { ok: false, error: 'צינור הלידים עדיין לא הותקן בענן' };
    }
    return { ok: false, error: 'השליחה נכשלה' };
  }

  return { ok: true, id: data };
}
