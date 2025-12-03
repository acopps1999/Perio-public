import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`);
}

// Check if running in Node.js environment (for test scripts)
const isNode = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: isNode ? {
    persistSession: false, // No session persistence in Node
    autoRefreshToken: false,
  } : {
    persistSession: true,  // CRITICAL: Must be true for RLS policies to work
    autoRefreshToken: true, // Auto-refresh tokens so session doesn't expire
    detectSessionInUrl: true, // Detect OAuth redirects
    storage: window.localStorage, // Explicitly use localStorage
    storageKey: 'supabase.auth.token', // Custom key to avoid conflicts
  },
  db: {
    schema: 'public'
  },
  realtime: {
    // TEMPORARY: Disable realtime to test if WebSocket is blocking queries
    params: {
      eventsPerSecond: 0
    }
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

// Note: Auth session cleanup is now handled by AuthContext.js checkAuth() on app load
// This prevents blocking the initial app render