import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use createBrowserClient from @supabase/ssr for proper cookie handling
// This ensures the session is stored in cookies that middleware can read
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable navigator.locks which can deadlock when DevTools is closed
    // ? This was added to make sure the profile wasn't on infinite loading when refreshed or coming from 404 page
    // or when restoring from bfcache. Safe for single-tab usage.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
