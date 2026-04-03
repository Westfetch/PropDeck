import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Admin client — server-side only, bypasses RLS
export const getSupabaseAdmin = () => createClient(supabaseUrl, supabaseServiceKey);

// Anon client — respects RLS, for user-context operations
export const getSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey);
