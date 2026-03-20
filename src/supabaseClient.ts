import { createClient } from '@supabase/supabase-js';

// The Supabase URL is derived from your database host:
// db.aenzjijrepswtcihtkgv.supabase.co -> https://aenzjijrepswtcihtkgv.supabase.co
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aenzjijrepswtcihtkgv.supabase.co';

// Find your 'anon' public key in the Supabase Dashboard: 
// Settings > API > Project API keys > anon (public)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gbSYQ22WYUPrpj_jvXn6LQ_Y4idkMPx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
