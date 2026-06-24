function formatGoogleDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildGoogleCalendarUrl({
  title,
  startDate,
  durationMinutes = 60,
  description = '',
  location = 'Aragon HQ',
}) {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'ישיבת צוות',
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details: description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openGoogleCalendarEvent(meeting, extras = {}) {
  const details = [
    extras.details,
    meeting.topic_department ? `מחלקה: ${extras.departmentLabel || meeting.topic_department}` : '',
    meeting.created_by_username ? `יוצר: ${extras.creatorLabel || meeting.created_by_username}` : '',
  ].filter(Boolean).join('\n');

  const url = buildGoogleCalendarUrl({
    title: meeting.title,
    startDate: meeting.meeting_date,
    description: details,
  });

  window.open(url, '_blank', 'noopener,noreferrer');
}
