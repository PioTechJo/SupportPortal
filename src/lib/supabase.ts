import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Create a clean, completely unauthenticated client specifically for fetching public lookup tables
// (like customers, products, priorities) to bypass any broken/orphaned user sessions
// and RLS policies that might restrict authenticated users with missing profiles.
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
