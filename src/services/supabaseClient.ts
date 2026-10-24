import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// One optional legacy client, shared by all domains. Example values disable it.
export const supabase = (() => {
  if (!url || !key || url.includes('your-project') || key.includes('your-anon')) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
})();
