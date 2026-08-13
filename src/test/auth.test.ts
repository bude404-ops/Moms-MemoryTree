import { describe, expect, it, vi } from 'vitest';
import { MemoryTreeAuthService } from '../lib/auth';

function createAuthClient() {
  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'mom@example.com' } }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null })
  };
  const upsert = vi.fn().mockResolvedValue({ data: {}, error: null });
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { auth, from }, auth, from, upsert };
}

describe('MemoryTreeAuthService', () => {
  it('reports unconfigured state without touching Supabase', async () => {
    const service = new MemoryTreeAuthService(null);
    await expect(service.getAuthState()).resolves.toEqual({ configured: false, user: null });
    const subscription = service.onAuthStateChange(vi.fn());
    expect(subscription.unsubscribe()).toBeUndefined();
  });

  it('normalizes email on sign in', async () => {
    const { client, auth } = createAuthClient();
    const service = new MemoryTreeAuthService(client as never);
    await service.signInWithEmail(' MOM@Example.COM ', 'correct-horse');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'mom@example.com', password: 'correct-horse' });
  });

  it('creates profile after signup using display name metadata', async () => {
    const { client, auth, from, upsert } = createAuthClient();
    const service = new MemoryTreeAuthService(client as never);
    await service.signUpWithEmail({ email: 'new@example.com', password: 'long-password', displayName: ' Grandma Willow ' });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'long-password',
      options: { data: { display_name: 'Grandma Willow' } }
    });
    expect(from).toHaveBeenCalledWith('profiles');
    expect(upsert).toHaveBeenCalledWith({ id: 'user-2', display_name: 'Grandma Willow' });
  });

  it('falls back to email prefix when display name is blank', async () => {
    const { client, auth, upsert } = createAuthClient();
    const service = new MemoryTreeAuthService(client as never);
    await service.signUpWithEmail({ email: 'LegacyKeeper@example.com', password: 'long-password', displayName: '   ' });
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { data: { display_name: 'LegacyKeeper' } } }));
    expect(upsert).toHaveBeenCalledWith({ id: 'user-2', display_name: 'LegacyKeeper' });
  });

  it('requests password reset with normalized email and redirect target', async () => {
    const { client, auth } = createAuthClient();
    const service = new MemoryTreeAuthService(client as never);
    await service.requestPasswordReset({ email: ' MOM@Example.COM ', redirectTo: 'https://app.example/reset' });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('mom@example.com', { redirectTo: 'https://app.example/reset' });
  });

  it('signs out through Supabase Auth', async () => {
    const { client, auth } = createAuthClient();
    const service = new MemoryTreeAuthService(client as never);
    await service.signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });
});
