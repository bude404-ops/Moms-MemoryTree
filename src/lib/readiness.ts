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
      id: 'cloud-provider-env',
      label: 'Production cloud provider',
      ready: isSupabaseConfigured,
      detail: isSupabaseConfigured ? 'A live provider environment is configured behind the service registry.' : 'Choose and configure the provider for auth, database, object storage, and signed media access.'
    },
    {
      id: 'private-bucket',
      label: 'Private media bucket',
      ready: false,
      detail: 'Create private object storage for family media and route signed URL creation through authorization checks.'
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
