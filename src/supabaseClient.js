import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohskpvihxwxtvsgrcbak.supabase.co';
const supabaseAnonKey = 'sb_publishable_fkcWFHL8-KpMWJXunFegfA_tbIG4OX1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'aragon-auth',
  },
});