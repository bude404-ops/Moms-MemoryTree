import { useEffect, useMemo, useState } from 'react';
import { memoryTreeRepository, type MemoryTreeRepository } from './repository';
import { serviceRegistry } from './serviceRegistry';
import type { AppUser } from './services';
import type { Family } from '../types/domain';

export type OnboardingMode = 'demo' | 'signed_out' | 'password_reset' | 'needs_family' | 'ready';

export interface OnboardingState {
  configured: boolean;
  loading: boolean;
  mode: OnboardingMode;
  user: AppUser | null;
  families: Family[];
  activeFamily: Family | null;
  passwordRecovery: boolean;
  error: string | null;
  notice: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  password: string;
}

export interface FirstFamilyInput {
  familyName: string;
  displayName: string;
}

export interface InvitationAcceptanceInput {
  token: string;
  displayName: string;
}

export function resolveOnboardingMode(configured: boolean, user: AppUser | null, families: Family[], passwordRecovery = false): OnboardingMode {
  if (!configured) return 'demo';
  if (passwordRecovery) return 'password_reset';
  if (!user) return 'signed_out';
  if (families.length === 0) return 'needs_family';
  return 'ready';
}

export function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(window.location.search);
  return hash.get('type') === 'recovery' || search.get('type') === 'recovery';
}

export function useOnboarding(repository: MemoryTreeRepository = memoryTreeRepository) {
  const [state, setState] = useState<OnboardingState>({
    configured: repository.isConfigured(),
    loading: true,
    mode: repository.isConfigured() ? 'signed_out' : 'demo',
    user: null,
    families: [],
    activeFamily: null,
    passwordRecovery: isPasswordRecoveryUrl(),
    error: null,
    notice: null
  });

  async function refresh() {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const auth = await repository.getAuthState();
      const families = auth.user ? await repository.listFamilies() : [];
      const passwordRecovery = isPasswordRecoveryUrl();
      const mode = resolveOnboardingMode(auth.configured, auth.user, families, passwordRecovery);
      setState(prev => ({ ...prev, configured: auth.configured, loading: false, mode, user: auth.user, families, activeFamily: families[0] ?? null, passwordRecovery, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unable to load archive state.' }));
    }
  }

  useEffect(() => {
    void refresh();
    const subscription = repository.onAuthStateChange?.(() => { void refresh(); });
    return () => subscription?.unsubscribe();
  }, [repository]);

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
      setState(prev => ({ ...prev, loading: true, error: null, notice: null }));
      const { error } = await repository.signUpWithEmail(email, password, displayName || email.split('@')[0]);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      setState(prev => ({ ...prev, notice: 'Account created. If email confirmation is enabled, check your inbox before signing in.' }));
      await refresh();
    },
    async requestPasswordReset({ email }: PasswordResetRequest) {
      setState(prev => ({ ...prev, loading: true, error: null, notice: null }));
      const { error } = await repository.requestPasswordReset(email, window.location.origin);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      setState(prev => ({ ...prev, loading: false, notice: 'Password reset email sent. Open it from the same device when possible.' }));
    },
    async updatePassword({ password }: PasswordUpdateRequest) {
      setState(prev => ({ ...prev, loading: true, error: null, notice: null }));
      const { error } = await repository.updatePassword(password);
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return;
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('type');
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
      }
      setState(prev => ({ ...prev, passwordRecovery: false, notice: 'Password updated. Your archive is ready.' }));
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
    async acceptInvitation(input: InvitationAcceptanceInput) {
      if (!state.user) {
        setState(prev => ({ ...prev, error: 'Sign in before accepting an invitation.' }));
        return;
      }
      setState(prev => ({ ...prev, loading: true, error: null, notice: null }));
      try {
        await repository.acceptFamilyInvitation(input);
        setState(prev => ({ ...prev, notice: 'Invitation accepted. Your family archive is ready.' }));
        await refresh();
      } catch (error) {
        setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unable to accept this family invitation.' }));
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

  return { state: { ...state, configured: serviceRegistry.providers.auth !== 'unavailable' || state.configured }, actions };
}
