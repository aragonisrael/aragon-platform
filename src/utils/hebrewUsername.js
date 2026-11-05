import { supabase } from '../supabaseClient';

/** שם מלא בעברית → שם משתמש: רווחים הופכים לנקודה. לדוגמה "ינאי שלג" → "ינאי.שלג" */
export function hebrewUsernameFromFullName(fullName) {
  return String(fullName || '').trim().replace(/\s+/g, '.');
}

/** שם משתמש עברי ייחודי. אם הבסיס תפוס, מצמידים מונה: ינאי.שלג1 */
export async function generateUniqueHebrewUsername(fullName, excludeUserId = null) {
  const baseUsername = hebrewUsernameFromFullName(fullName);
  if (!baseUsername) {
    throw new Error('missing full name');
  }

  let finalUsername = baseUsername;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', finalUsername)
      .maybeSingle();

    if (error) throw error;
    if (!data || (excludeUserId != null && String(data.id) === String(excludeUserId))) return finalUsername;

    finalUsername = `${baseUsername}${counter}`;
    counter++;
  }
}
