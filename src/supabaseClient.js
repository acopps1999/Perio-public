import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`);
}

// Production configuration - sessions do NOT persist across page refreshes
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,        // DISABLE session persistence (user logs out on refresh)
    autoRefreshToken: false,      // No need to refresh tokens (sessions don't persist)
    detectSessionInUrl: true,     // Still handle OAuth redirects if needed
  },
  db: {
    schema: 'public'
  }
}); 