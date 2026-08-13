import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase, supabase } from './supabase';
import type { AppUser, AuthService, AuthSessionState, AuthStateHandler, PasswordResetInput, SignUpInput } from './services';

export class MemoryTreeAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient | null = supabase) {}

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async getAuthState(): Promise<AuthSessionState> {
    if (!this.client) return { configured: false, user: null };
    const { data, error } = await this.client.auth.getUser();
    if (error) return { configured: true, user: null };
    return { configured: true, user: data.user ? toAppUser(data.user) : null };
  }

  onAuthStateChange(handler: AuthStateHandler) {
    if (!this.client) return { unsubscribe: () => undefined };
    const { data } = this.client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => handler(event, session));
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
    return { ...result, user: result.data.user ? toAppUser(result.data.user) : null };
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

function toAppUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AppUser {
  return { id: user.id, email: user.email, userMetadata: user.user_metadata };
}

export const memoryTreeAuthService = new MemoryTreeAuthService();
