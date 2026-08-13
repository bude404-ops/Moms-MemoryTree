import { describe, expect, it, vi } from 'vitest';
import { MemoryTreeAuthService } from '../lib/auth';

function createClientMock() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const unsubscribe = vi.fn();
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } })
    },
    from: vi.fn((_table: string) => ({ upsert }))
  };
}

describe('MemoryTreeAuthService', () => {
  it('normalizes email for sign in', async () => {
    const client = createClientMock();
    const service = new MemoryTreeAuthService(client as never);
    await service.signInWithEmail(' MOM@Example.COM ', 'password123');
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'mom@example.com', password: 'password123' });
  });

  it('creates a profile row after signup without storing password', async () => {
    const client = createClientMock();
    const service = new MemoryTreeAuthService(client as never);
    await service.signUpWithEmail({ email: 'family@example.com', password: 'password123', displayName: 'Family Keeper' });
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'family@example.com', password: 'password123', options: { data: { display_name: 'Family Keeper' } } });
    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(client.from('profiles').upsert).toHaveBeenCalledWith({ id: 'user-1', display_name: 'Family Keeper' });
  });

  it('requests password reset with redirect target', async () => {
    const client = createClientMock();
    const service = new MemoryTreeAuthService(client as never);
    await service.requestPasswordReset({ email: ' RESET@Example.COM ', redirectTo: 'https://app.example.com' });
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', { redirectTo: 'https://app.example.com' });
  });

  it('subscribes and unsubscribes from auth changes', () => {
    const client = createClientMock();
    const service = new MemoryTreeAuthService(client as never);
    const subscription = service.onAuthStateChange(vi.fn());
    subscription.unsubscribe();
    expect(client.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
