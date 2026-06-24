export const COIN_EARN_THRESHOLDS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
export const DEFAULT_COIN_EARN_CAP = 10;

export const COIN_AWARD_PRESETS = [
  { amount: 3, emoji: '🏆', label: 'תלמיד מצטיין', reasonType: 'standard' },
  { amount: 7, emoji: '🤝', label: 'חבר מביא חבר', reasonType: 'friend_referral' },
  { amount: 1, emoji: '❤️', label: 'עזרה לזולת', reasonType: 'standard' },
  { amount: 1, emoji: '🙌', label: 'עזרה למדריך', reasonType: 'standard' },
];

export function nextEarnCap(currentCap) {
  const cap = currentCap ?? DEFAULT_COIN_EARN_CAP;
  const idx = COIN_EARN_THRESHOLDS.indexOf(cap);
  if (idx >= 0 && idx < COIN_EARN_THRESHOLDS.length - 1) {
    return COIN_EARN_THRESHOLDS[idx + 1];
  }
  return cap + 5;
}

/** האם מענק דורש אישור הנהלה */
export function grantRequiresApproval({ balance, amount, earnCap, reasonType }) {
  if (reasonType === 'friend_referral') return true;
  const cap = earnCap ?? DEFAULT_COIN_EARN_CAP;
  return balance + amount > cap;
}

/** מחשב תקרה חדשה לאחר אישור מענק */
export function earnCapAfterGrant(balance, currentCap) {
  let cap = currentCap ?? DEFAULT_COIN_EARN_CAP;
  while (balance > cap) {
    cap = nextEarnCap(cap);
  }
  return cap;
}

export function adminRequestSummary(request) {
  if (request.reason_type === 'friend_referral') {
    return `בקשה לאישור חבר מביא חבר — התלמיד ${request.student_full_name} בקבוצה ${request.group_name || '—'} תחת המדריך ${request.instructor_name || '—'}. לאשר מענק של +${request.amount}?`;
  }
  const threshold = request.threshold_crossed ? ` (חוצה תקרת ${request.threshold_crossed})` : '';
  return `מענק ${request.reason_emoji || ''} ${request.reason_label || ''} (+${request.amount}) — ${request.student_full_name} | ${request.group_name || '—'} | מדריך: ${request.instructor_name || '—'} | יתרה: ${request.balance_before}→${request.balance_after}${threshold}`;
}
