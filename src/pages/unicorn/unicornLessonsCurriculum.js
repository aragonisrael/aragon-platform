const SUPABASE_URL = 'https://ohskpvihxwxtvsgrcbak.supabase.co';
export const UNICORN_LESSONS_BUCKET = 'unicorn-lessons';

export function getUnicornLessonPdfUrl(fileName, cacheKey) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/${UNICORN_LESSONS_BUCKET}/${encodeURIComponent(fileName)}`;
  return cacheKey ? `${url}?v=${encodeURIComponent(cacheKey)}` : url;
}

/** סדר השיעורים ומפת שמות הקבצים ב־Storage */
export const UNICORN_LESSONS = [
  {
    id: 'lesson-1',
    number: 1,
    title: 'מסע אל יוניקורן - מסלול המצויינות',
    fileName: 'unicorn1.pdf',
  },
  {
    id: 'lesson-2',
    number: 2,
    title: 'היום מקימים חברה',
    fileName: 'unicorn2.pdf',
  },
  {
    id: 'lesson-3',
    number: 3,
    title: 'ממוח למוצר',
    fileName: 'unicorn3.pdf',
  },
  {
    id: 'lesson-4',
    number: 4,
    title: 'ריגול עסקי ועיצוב הזהות',
    fileName: 'unicorn4.pdf',
  },
  {
    id: 'lesson-5',
    number: 5,
    title: 'פסיכולוגיית הצבעים ולוח השראה',
    fileName: 'unicorn5.pdf',
  },
].map((lesson) => ({
  ...lesson,
  pdfUrl: getUnicornLessonPdfUrl(lesson.fileName),
}));
