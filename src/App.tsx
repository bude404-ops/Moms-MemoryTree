import { BookOpenText, Clock3, FileHeart, Home, PlusCircle, ShieldCheck, TreePine, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FamilyPage, HomePage, LegacyPage, MemoriesPage, MemoryTreePage, RecordPage, TimelinePage } from './pages/Pages';
import { isSupabaseConfigured } from './lib/supabase';
import { useOnboarding } from './lib/onboarding';
import { OnboardingGate } from './components/OnboardingGate';
import { useArchiveData } from './lib/archiveData';
import type { Memory } from './types/domain';
import type { UploadProgressEvent } from './lib/mediaStorage';

type Tab = 'home' | 'tree' | 'record' | 'memories' | 'family' | 'timeline' | 'legacy';

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tree', label: 'MemoryTree', icon: TreePine },
  { id: 'record', label: 'Record', icon: PlusCircle },
  { id: 'memories', label: 'Memories', icon: FileHeart },
  { id: 'family', label: 'Family', icon: UsersRound },
  { id: 'timeline', label: 'Timeline', icon: Clock3 },
  { id: 'legacy', label: 'Legacy', icon: ShieldCheck }
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const onboarding = useOnboarding();
  const archiveData = useArchiveData({ mode: onboarding.state.mode, activeFamily: onboarding.state.activeFamily, userId: onboarding.state.user?.id });

  const activeTitle = useMemo(() => tabs.find(t => t.id === tab)?.label ?? 'Home', [tab]);

  async function createMemory(input: Omit<Memory, 'id' | 'createdAt' | 'creatorId' | 'familyId' | 'tags' | 'legacyStatus'>, file?: File, options?: { signal?: AbortSignal; onUploadProgress?: (event: UploadProgressEvent) => void }) {
    const created = await archiveData.createMemory(input, file, options);
    setTab('memories');
    return created;
  }

  const archive = archiveData.archive;

  return <div className="min-h-screen text-stone-900">
    <header className="sticky top-0 z-30 border-b border-amber-100 bg-[#fffaf3]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-emerald-200 shadow-inner"><TreePine className="text-stone-800" /></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Moms MemoryTree</p><h1 className="text-lg font-semibold leading-none">{activeTitle}</h1></div>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-stone-600 shadow-sm ring-1 ring-amber-100 sm:flex"><BookOpenText size={16} /> Private family archive</div>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-5 pb-28 md:pb-8">
      {!isSupabaseConfigured && <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><b>Development mode:</b> Supabase is not configured yet, so the UI uses local seed data. Database migrations, RLS policies, and private storage architecture are included for real Supabase deployment.</div>}
      <OnboardingGate state={onboarding.state} onSignIn={onboarding.actions.signIn} onSignUp={onboarding.actions.signUp} onRequestPasswordReset={(email) => onboarding.actions.requestPasswordReset({ email })} onCreateFamily={onboarding.actions.createFirstFamily} />
      {(onboarding.state.mode === 'demo' || onboarding.state.mode === 'ready') && <>
        {onboarding.state.mode === 'ready' && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><span><b>Family archive active:</b> {onboarding.state.activeFamily?.name}<span className="ml-2 text-emerald-800">Signed in as {onboarding.state.user?.email ?? 'authenticated family member'}</span></span><button onClick={() => void onboarding.actions.signOut()} className="rounded-full bg-white px-4 py-2 font-bold text-emerald-900 ring-1 ring-emerald-200">Sign out</button></div>}
        {tab === 'home' && <HomePage archive={archive} />}
        {tab === 'tree' && <MemoryTreePage people={archive.people} relationships={archive.relationships} />}
        {tab === 'record' && <RecordPage archive={archive} onCreate={createMemory} />}
        {tab === 'memories' && <MemoriesPage archive={archive} />}
        {tab === 'family' && <FamilyPage family={archive.family} members={archive.members} people={archive.people} relationships={archive.relationships} onAddPerson={async (displayName) => { await archiveData.addPerson(displayName); }} onCreateRelationship={async (input) => { await archiveData.createRelationship(input); }} onInviteMember={async (input) => { await archiveData.inviteFamilyMember(input); }} />}
        {tab === 'timeline' && <TimelinePage events={archive.timeline} />}
        {tab === 'legacy' && <LegacyPage custodians={archive.custodians} people={archive.people} />}
      </>}
    </main>

    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-amber-100 bg-white/94 px-2 py-2 shadow-[0_-12px_40px_rgba(92,64,35,0.12)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabs.slice(0,5).map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] font-semibold ${tab === item.id ? 'bg-stone-900 text-white' : 'text-stone-600'}`}><item.icon size={19} /><span>{item.label === 'MemoryTree' ? 'Tree' : item.label}</span></button>)}
      </div>
    </nav>

    <aside className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 rounded-full border border-amber-100 bg-white/92 p-2 shadow-2xl backdrop-blur-xl md:block">
      <div className="flex gap-1">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${tab === item.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-amber-50'}`}><item.icon size={18} />{item.label}</button>)}</div>
    </aside>
  </div>;
}
