import { LogIn, Mail, Sprout, ShieldCheck, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { AuthCredentials, FirstFamilyInput, OnboardingState } from '../lib/onboarding';

export interface OnboardingGateProps {
  state: OnboardingState;
  onSignIn: (input: AuthCredentials) => Promise<void>;
  onSignUp: (input: AuthCredentials) => Promise<void>;
  onCreateFamily: (input: FirstFamilyInput) => Promise<void>;
}

export function OnboardingGate({ state, onSignIn, onSignUp, onCreateFamily }: OnboardingGateProps) {
  if (state.mode === 'demo' || state.mode === 'ready') return null;
  if (state.mode === 'needs_family') return <CreateFamilyGate state={state} onCreateFamily={onCreateFamily} />;
  return <AuthGate state={state} onSignIn={onSignIn} onSignUp={onSignUp} />;
}

function AuthGate({ state, onSignIn, onSignUp }: Pick<OnboardingGateProps, 'state' | 'onSignIn' | 'onSignUp'>) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-up');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { email: form.email, password: form.password, displayName: form.displayName };
    if (mode === 'sign-up') await onSignUp(payload);
    else await onSignIn(payload);
  }

  return <div className="mx-auto grid min-h-[72vh] max-w-5xl place-items-center px-4 py-8">
    <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-stone-900/10 ring-1 ring-amber-100 md:grid-cols-[1.05fr_0.95fr]">
      <section className="bg-gradient-to-br from-amber-100 via-orange-50 to-emerald-50 p-7 md:p-10">
        <div className="mb-10 grid h-14 w-14 place-items-center rounded-3xl bg-white shadow-inner"><Sprout className="text-emerald-700" /></div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">Private family archive</p>
        <h2 className="mt-4 text-4xl font-black leading-tight text-stone-950">Don't just leave your family pictures. Leave them your story.</h2>
        <p className="mt-5 max-w-md leading-7 text-stone-700">Create a protected family archive built around memories, relationships, permissions, and future continuity — not a social feed.</p>
        <div className="mt-8 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-stone-700 ring-1 ring-white"><ShieldCheck className="mb-2 text-stone-800" /> Every memory keeps its own privacy. Family membership alone does not unlock everything.</div>
      </section>
      <form onSubmit={submit} className="space-y-4 p-7 md:p-10">
        <div className="flex rounded-2xl bg-amber-50 p-1">
          <button type="button" onClick={() => setMode('sign-up')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${mode === 'sign-up' ? 'bg-white shadow-sm' : 'text-stone-500'}`}><UserPlus className="mr-2 inline" size={17} />Create account</button>
          <button type="button" onClick={() => setMode('sign-in')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${mode === 'sign-in' ? 'bg-white shadow-sm' : 'text-stone-500'}`}><LogIn className="mr-2 inline" size={17} />Sign in</button>
        </div>
        {mode === 'sign-up' && <input required className="w-full rounded-2xl border border-amber-200 px-4 py-4" placeholder="Your name" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} />}
        <label className="block"><span className="sr-only">Email</span><div className="relative"><Mail className="absolute left-4 top-4 text-stone-400" size={18} /><input required type="email" className="w-full rounded-2xl border border-amber-200 py-4 pl-11 pr-4" placeholder="Email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></div></label>
        <input required minLength={8} type="password" className="w-full rounded-2xl border border-amber-200 px-4 py-4" placeholder="Password, 8+ characters" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
        {state.error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</div>}
        <button disabled={state.loading} className="w-full rounded-2xl bg-stone-950 px-5 py-4 font-black text-white disabled:opacity-60">{state.loading ? 'Working...' : mode === 'sign-up' ? 'Create my archive account' : 'Enter my archive'}</button>
      </form>
    </div>
  </div>;
}

function CreateFamilyGate({ state, onCreateFamily }: Pick<OnboardingGateProps, 'state' | 'onCreateFamily'>) {
  const [form, setForm] = useState({ familyName: '', displayName: state.user?.user_metadata?.display_name as string || '' });
  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreateFamily(form);
  }
  return <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-8">
    <form onSubmit={submit} className="w-full rounded-[2rem] bg-white p-7 shadow-2xl shadow-stone-900/10 ring-1 ring-amber-100 md:p-10">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-3xl bg-emerald-100"><Sprout className="text-emerald-800" /></div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">First family archive</p>
      <h2 className="mt-3 text-3xl font-black text-stone-950">Name the family legacy.</h2>
      <p className="mt-3 leading-7 text-stone-600">The family is the center. Memories belong to the family archive with individual permissions — not only to one phone or one account.</p>
      <div className="mt-6 space-y-4">
        <input required className="w-full rounded-2xl border border-amber-200 px-4 py-4" placeholder="Family name, e.g. The Willow Family" value={form.familyName} onChange={event => setForm({ ...form, familyName: event.target.value })} />
        <input required className="w-full rounded-2xl border border-amber-200 px-4 py-4" placeholder="Your display name" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} />
        {state.error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</div>}
        <button disabled={state.loading} className="w-full rounded-2xl bg-stone-950 px-5 py-4 font-black text-white disabled:opacity-60">{state.loading ? 'Creating...' : 'Create family archive'}</button>
      </div>
    </form>
  </div>;
}
