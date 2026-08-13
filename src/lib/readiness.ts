import { isSupabaseConfigured } from './supabase';

export interface RuntimeReadinessItem {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
}

export function getRuntimeReadiness(): RuntimeReadinessItem[] {
  return [
    {
      id: 'supabase-env',
      label: 'Supabase environment',
      ready: isSupabaseConfigured,
      detail: isSupabaseConfigured ? 'Supabase URL and anon key are configured.' : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    },
    {
      id: 'private-bucket',
      label: 'Private media bucket',
      ready: false,
      detail: 'Create a private Supabase Storage bucket named family-media and route signed URL creation through authorization checks.'
    },
    {
      id: 'edge-functions',
      label: 'Signed URL edge function',
      ready: false,
      detail: 'Deploy a server-side function that verifies memory permissions before creating temporary media access.'
    },
    {
      id: 'backup-provider',
      label: 'Independent backup provider',
      ready: false,
      detail: 'Phase 1 models backup records only. No redundancy is claimed yet.'
    }
  ];
}
