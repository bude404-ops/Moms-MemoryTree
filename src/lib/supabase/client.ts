import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes('your-project') &&
    !supabasePublishableKey.includes('your-supabase') &&
    !supabasePublishableKey.includes('your-publishable-key')
);

export type MomsMemoryTreeSupabaseClient = SupabaseClient;

export const supabase: MomsMemoryTreeSupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'moms-memorytree-auth'
      }
    })
  : null;

export function requireSupabase(): MomsMemoryTreeSupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  return supabase;
}
