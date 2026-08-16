import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OnboardingGate } from '../components/OnboardingGate';
import { resolveOnboardingMode } from '../lib/onboarding';
import type { OnboardingState } from '../lib/onboarding';

const baseState: OnboardingState = {
  configured: true,
  loading: false,
  mode: 'signed_out',
  user: null,
  families: [],
  activeFamily: null,
  passwordRecovery: false,
  error: null,
  notice: null
};

const noop = async () => undefined;
const gateProps = {
  onSignIn: noop,
  onSignUp: noop,
  onRequestPasswordReset: noop,
  onUpdatePassword: noop,
  onCreateFamily: noop,
  onAcceptInvitation: noop
};

describe('onboarding mode resolution', () => {
  it('uses demo mode when Supabase is not configured', () => {
    expect(resolveOnboardingMode(false, null, [])).toBe('demo');
  });

  it('requires sign in when configured without a user', () => {
    expect(resolveOnboardingMode(true, null, [])).toBe('signed_out');
  });

  it('prioritizes password reset recovery links when configured', () => {
    expect(resolveOnboardingMode(true, { id: 'user-1' } as never, [{ id: 'family-1' } as never], true)).toBe('password_reset');
  });

  it('requires family creation after sign in when no family exists', () => {
    expect(resolveOnboardingMode(true, { id: 'user-1' } as never, [])).toBe('needs_family');
  });

  it('is ready when signed in with a family archive', () => {
    expect(resolveOnboardingMode(true, { id: 'user-1' } as never, [{ id: 'family-1' } as never])).toBe('ready');
  });
});

describe('OnboardingGate', () => {
  it('renders account creation when signed out', () => {
    const html = renderToStaticMarkup(<OnboardingGate state={baseState} {...gateProps} />);
    expect(html).toContain('Leave them your story');
    expect(html).toContain('Create my archive account');
  });

  it('renders first family creation after authentication', () => {
    const html = renderToStaticMarkup(<OnboardingGate state={{ ...baseState, mode: 'needs_family', user: { id: 'user-1', user_metadata: { display_name: 'Mom' } } as never }} {...gateProps} />);
    expect(html).toContain('Name the family legacy');
    expect(html).toContain('Create family archive');
  });

  it('does not block archive UI in demo or ready mode', () => {
    const demoHtml = renderToStaticMarkup(<OnboardingGate state={{ ...baseState, mode: 'demo', configured: false }} {...gateProps} />);
    const readyHtml = renderToStaticMarkup(<OnboardingGate state={{ ...baseState, mode: 'ready', user: { id: 'user-1' } as never, families: [{ id: 'family-1' } as never] }} {...gateProps} />);
    expect(demoHtml).toBe('');
    expect(readyHtml).toBe('');
  });

  it('shows auth errors without exposing secrets', () => {
    const html = renderToStaticMarkup(<OnboardingGate state={{ ...baseState, error: 'Invalid login credentials' }} {...gateProps} />);
    expect(html).toContain('Invalid login credentials');
    expect(html).not.toContain('sensitive_token_marker');
  });

  it('shows notices and password handling disclosure', () => {
    const html = renderToStaticMarkup(<OnboardingGate state={{ ...baseState, notice: 'Password reset email sent.' }} {...gateProps} />);
    expect(html).toContain('Password reset email sent.');
    expect(html).toContain('Moms MemoryTree never stores passwords');
  });

  it('renders a dedicated password update screen for recovery links', () => {
    const html = renderToStaticMarkup(<OnboardingGate state={{ ...baseState, mode: 'password_reset', passwordRecovery: true, user: { id: 'user-1' } as never }} {...gateProps} />);
    expect(html).toContain('Set a new archive password');
    expect(html).toContain('Update password');
    expect(html).toContain('Moms MemoryTree does not store it in family tables');
  });
});
