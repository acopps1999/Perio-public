import { createClient } from '@supabase/supabase-js'

// These values come from your .env file (using Create React App conventions)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.warn('REACT_APP_SUPABASE_URL is not set. Please configure it in your .env');
}

if (!supabaseAnonKey) {
  console.warn('REACT_APP_SUPABASE_ANON_KEY is not set. Please configure it in your .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)