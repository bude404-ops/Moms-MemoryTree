import type { User } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import { memoryTreeRepository, type MemoryTreeRepository } from './repository';
import { isSupabaseConfigured } from './supabase';
import type { Family } from '../types/domain';

export type OnboardingMode = 'demo' | 'signed_out' | 'needs_family' | 'ready';

export interface OnboardingState {
  configured: boolean;
  loading: boolean;
  mode: OnboardingMode;
  user: User | null;
  families: Family[];
  activeFamily: Family | null;
  error: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface FirstFamilyInput {
  familyName: string;
  displayName: string;
}

export function resolveOnboardingMode(configured: boolean, user: User | null, families: Family[]): OnboardingMode {
  if (!configured) return 'demo';
  if (!user) return 'signed_out';
  if (families.length === 0) return 'needs_family';
  return 'ready';
}

export function useOnboarding(repository: MemoryTreeRepository = memoryTreeRepository) {
  const [state, setState] = useState<OnboardingState>({
    configured: repository.isConfigured(),
    loading: true,
    mode: repository.isConfigured() ? 'signed_out' : 'demo',
    user: null,
    families: [],
    activeFamily: null,
    error: null
  });

  async function refresh() {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const auth = await repository.getAuthState();
      const families = auth.user ? await repository.listFamilies() : [];
      const mode = resolveOnboardingMode(auth.configured, auth.user, families);
      setState({ configured: auth.configured, loading: false, mode, user: auth.user, families, activeFamily: families[0] ?? null, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unable to load archive state.' }));
    }
  }

  useEffect(() => { void refresh(); }, []);

  const actions = useMemo(() => ({
    async signIn({ email, password }: AuthCredentials) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await repository.signInWithEmail(email, password);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      await refresh();
    },
    async signUp({ email, password, displayName }: AuthCredentials) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await repository.signUpWithEmail(email, password, displayName || email.split('@')[0]);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      await refresh();
    },
    async createFirstFamily(input: FirstFamilyInput) {
      if (!state.user) {
        setState(prev => ({ ...prev, error: 'Sign in before creating a family archive.' }));
        return;
      }
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        await repository.createFamily({ creatorProfileId: state.user.id, creatorDisplayName: input.displayName, name: input.familyName });
        await refresh();
      } catch (error) {
        setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unable to create family archive.' }));
      }
    },
    async signOut() {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await repository.signOut();
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      await refresh();
    },
    refresh
  }), [repository, state.user]);

  return { state: { ...state, configured: isSupabaseConfigured || state.configured }, actions };
}
