import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { requireSupabase, supabase } from './supabase';

export interface AuthSessionState {
  configured: boolean;
  user: User | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface PasswordResetInput {
  email: string;
  redirectTo?: string;
}

export type AuthStateHandler = (event: AuthChangeEvent, session: Session | null) => void;

export class MemoryTreeAuthService {
  constructor(private readonly client: SupabaseClient | null = supabase) {}

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async getAuthState(): Promise<AuthSessionState> {
    if (!this.client) return { configured: false, user: null };
    const { data, error } = await this.client.auth.getUser();
    if (error) return { configured: true, user: null };
    return { configured: true, user: data.user };
  }

  onAuthStateChange(handler: AuthStateHandler) {
    if (!this.client) return { unsubscribe: () => undefined };
    const { data } = this.client.auth.onAuthStateChange(handler);
    return { unsubscribe: () => data.subscription.unsubscribe() };
  }

  async signInWithEmail(email: string, password: string) {
    const client = this.client ?? requireSupabase();
    return client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  }

  async signUpWithEmail(input: SignUpInput) {
    const displayName = input.displayName.trim() || input.email.split('@')[0];
    const client = this.client ?? requireSupabase();
    const result = await client.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { display_name: displayName } }
    });
    if (result.data.user) {
      await client.from('profiles').upsert({ id: result.data.user.id, display_name: displayName });
    }
    return result;
  }

  async requestPasswordReset(input: PasswordResetInput) {
    const client = this.client ?? requireSupabase();
    return client.auth.resetPasswordForEmail(input.email.trim().toLowerCase(), {
      redirectTo: input.redirectTo
    });
  }

  async signOut() {
    const client = this.client ?? requireSupabase();
    return client.auth.signOut();
  }
}

export const memoryTreeAuthService = new MemoryTreeAuthService();
