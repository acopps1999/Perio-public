import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,  // CRITICAL: Must be true for RLS policies to work
    autoRefreshToken: true, // Auto-refresh tokens so session doesn't expire
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