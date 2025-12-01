import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`);
}

// Production configuration with proper session management
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Enable session persistence
    autoRefreshToken: true,       // Enable automatic token refresh
    detectSessionInUrl: true,     // Handle OAuth redirects
    storage: window.localStorage, // Use localStorage for sessions
    storageKey: 'prism-auth',     // Custom key to avoid conflicts
  },
  db: {
    schema: 'public'
  }
}); 