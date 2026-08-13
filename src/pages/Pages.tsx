import { Camera, Clock, FileHeart, Home, LockKeyhole, Mic, ShieldCheck, Upload, UsersRound } from 'lucide-react';
import { useState } from 'react';
import type { Family, FamilyMember, FamilyRelationship, LegacyCustodian, LifeEvent, Memory, Person, PrivacyLevel, StorageUsage } from '../types/domain';
import type { UploadProgressEvent } from '../lib/mediaStorage';
import { storyQuestions } from '../lib/demoData';
import { formatBytes } from '../lib/archiveStore';
import { prepareMemoryUpload, validateMemoryUpload } from '../lib/mediaUpload';
import { getRuntimeReadiness } from '../lib/readiness';
import type { ArchiveDataState } from '../lib/archiveData';

const privacyLabels: Record<PrivacyLevel, string> = {
  private: 'Private',
  family: 'Family',
  specific_people: 'Specific people',
  descendants: 'Descendants',
  legacy: 'Legacy'
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[2rem] border border-amber-100 bg-white/82 p-5 shadow-[0_18px_60px_rgba(92,64,35,0.10)] backdrop-blur ${className}`}>{children}</section>;
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">{eyebrow}</p><h2 className="text-2xl font-semibold text-stone-900">{title}</h2>{children && <p className="mt-1 text-sm leading-6 text-stone-600">{children}</p>}</div>;
}

export function HomePage({ archive }: { archive: ArchiveDataState }) {
  const totalBytes = archive.media.reduce((sum, item) => sum + item.bytes, 0);
  return <div className="space-y-5">
    <DataStateBanner archive={archive} />
    <Card className="overflow-hidden bg-gradient-to-br from-[#fff7e8] via-white to-[#edf8ef]">
      <div className="flex items-start gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-100 text-3xl shadow-inner">M</div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-700">Mom's MemoryTree</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-stone-950">Visit Mom, not folders.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-stone-700">“Don't just leave your family pictures. Leave them your story.”</p>
        </div>
      </div>
    </Card>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><Home className="mb-3 text-amber-700" /><p className="text-sm text-stone-500">Family Archive</p><b className="text-2xl text-stone-900">{archive.family.name}</b></Card>
      <Card><FileHeart className="mb-3 text-rose-700" /><p className="text-sm text-stone-500">Preserved Memories</p><b className="text-2xl text-stone-900">{archive.memories.length}</b></Card>
      <Card><LockKeyhole className="mb-3 text-emerald-700" /><p className="text-sm text-stone-500">Private media tracked</p><b className="text-2xl text-stone-900">{formatBytes(totalBytes)}</b></Card>
    </div>
    <Card>
      <SectionTitle eyebrow="Record my story" title="What would you like to remember?">The primary path is intentionally simple for parents and grandparents.</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{['Childhood','Family','Love','Career','Parenthood','Life Lessons'].map(x=><a key={x} href="#record" className="rounded-2xl bg-amber-50 px-4 py-4 text-center font-semibold text-stone-800 ring-1 ring-amber-100 transition hover:bg-amber-100">{x}</a>)}</div>
    </Card>
    <StoragePanel media={archive.media} storage={archive.storage} />
    <ReadinessPanel />
  </div>;
}

function DataStateBanner({ archive }: { archive: ArchiveDataState }) {
  if (archive.loading) return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Loading family archive from {archive.source}...</div>;
  if (archive.error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Archive data error: {archive.error}</div>;
  return <div className={`rounded-3xl border p-4 text-sm ${archive.source === 'supabase' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}><b>Data source:</b> {archive.source === 'supabase' ? 'Live Supabase family archive' : 'Local demo archive'}</div>;
}

export function RecordPage({ archive, onCreate }: { archive: ArchiveDataState; onCreate: RecordPageProps['onCreate'] }) {
  return <div className="space-y-5"><Card className="bg-gradient-to-br from-rose-50 to-amber-50"><SectionTitle eyebrow="Tell your story" title="Record My Story">Video and audio upload foundations are wired to private storage paths. Live recording controls are staged for the next media phase.</SectionTitle><MemoryForm archive={archive} onCreate={onCreate} /></Card><Card><SectionTitle eyebrow="Guided storytelling" title="Choose a question" /> <div className="grid gap-3 md:grid-cols-2">{storyQuestions.map(q=><div key={q.id} className="rounded-2xl border border-amber-100 bg-white p-4"><b className="text-amber-800">{q.category}</b><p className="mt-1 text-stone-700">{q.question}</p></div>)}</div></Card></div>;
}

type PreservationStatus = 'draft' | 'creating_memory' | 'uploading_media' | 'preserved' | 'failed';

const preservationCopy: Record<PreservationStatus, { label: string; detail: string }> = {
  draft: { label: 'Local draft', detail: 'Nothing is preserved until you save. A selected file is only staged locally.' },
  creating_memory: { label: 'Creating memory row', detail: 'Writing the story, privacy, date, people, and legacy flags first.' },
  uploading_media: { label: 'Uploading private media', detail: 'The memory exists; media must finish storage and metadata before success.' },
  preserved: { label: 'Preserved', detail: 'Memory saved. If a file was attached, storage and media metadata completed.' },
  failed: { label: 'Not preserved', detail: 'The last save failed. Review the message and try again.' }
};

function MemoryForm({ archive, onCreate }: { archive: ArchiveDataState; onCreate: RecordPageProps['onCreate'] }) {
  const people = archive.people.length ? archive.people : [{ id: '', displayName: 'No family people yet', familyId: archive.family.id } as Person];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<PreservationStatus>('draft');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aborter, setAborter] = useState<AbortController | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const controller = new AbortController();
    setAborter(controller);
    setBusy(true);
    setProgress(8);
    setMessage(null);
    setStatus('creating_memory');
    try {
      const file = selectedFile ?? undefined;
      if (file) { setStatus('uploading_media'); }
      await onCreate({
        title: String(fd.get('title') || 'Untitled memory'),
        description: String(fd.get('description') || ''),
        type: String(fd.get('type') || 'story') as Memory['type'],
        associatedPersonId: String(fd.get('person') || ''),
        dateText: String(fd.get('date') || ''),
        locationText: String(fd.get('location') || ''),
        category: String(fd.get('category') || 'Life'),
        privacy: String(fd.get('privacy') || 'private') as PrivacyLevel
      }, file, {
        signal: controller.signal,
        onUploadProgress: (event) => {
          setStatus(event.status === 'completed' ? 'uploading_media' : event.status === 'failed' ? 'failed' : event.status === 'processing' ? 'uploading_media' : 'uploading_media');
          setProgress(event.progress);
          setMessage(`${event.message}${event.resumable ? ' Resumable upload is recommended for this file.' : ''}`);
        }
      });
      setStatus('preserved');
      setProgress(100);
      setMessage(file ? 'Your memory is now stored in your private family cloud vault.' : 'Memory preserved without an attached file.');
      setSelectedFile(null);
      form.reset();
    } catch (error) {
      setStatus('failed');
      setMessage(error instanceof Error ? error.message : 'Unable to preserve this memory.');
    } finally {
      setBusy(false);
      setAborter(null);
    }
  }

  function chooseFile(file: File | null, input: HTMLInputElement) {
    if (!file) {
      setSelectedFile(null);
      setStatus('draft');
      setMessage(null);
      input.setCustomValidity('');
      return;
    }
    const errors = validateMemoryUpload(file);
    if (errors.length) {
      setSelectedFile(null);
      setStatus('failed');
      setMessage(errors.join(' '));
      input.setCustomValidity(errors.join(' '));
      return;
    }
    const prepared = prepareMemoryUpload(archive.family.id, 'pending-memory', file);
    setSelectedFile(file);
    setStatus('draft');
    setMessage(`Ready to attach ${file.name} as ${prepared.mediaType}. It is not preserved yet.`);
    input.setCustomValidity('');
  }

  const statusTone = status === 'preserved' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : status === 'failed' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-950';

  return <form className="grid gap-3" onSubmit={submit}>
    <div className={`rounded-2xl border p-4 text-sm ${statusTone}`}><b>{preservationCopy[status].label}</b><p className="mt-1 leading-6">{message ?? preservationCopy[status].detail}</p>{busy && <div className="mt-3"><div className="mb-1 flex justify-between text-xs font-bold"><span>Uploading Memory...</span><span>{progress}%</span></div><div className="h-3 rounded-full bg-white/70"><div className="h-3 rounded-full bg-gradient-to-r from-amber-600 to-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs">Please keep the app open while we finish. If the connection drops, retry/resume support is handled by the storage service boundary.</p></div>}</div>
    <input required name="title" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100" placeholder="Memory title" />
    <textarea name="description" disabled={busy} className="min-h-28 rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100" placeholder="Tell the story..." />
    <div className="grid gap-3 sm:grid-cols-2"><select name="type" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100"><option value="story">Story</option><option value="photo">Photo</option><option value="video">Video</option><option value="audio">Audio</option><option value="life_lesson">Life Lesson</option><option value="letter">Letter</option></select><select name="privacy" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100"><option value="private">Private</option><option value="family">Family</option><option value="specific_people">Specific people</option><option value="descendants">Descendants</option><option value="legacy">Legacy</option></select></div>
    <div className="grid gap-3 sm:grid-cols-3"><select name="person" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100">{people.map(p=><option key={p.id || 'empty'} value={p.id}>{p.displayName}</option>)}</select><input name="date" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100" placeholder="Date or approx date" /><input name="location" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100" placeholder="Location" /></div>
    <input name="category" disabled={busy} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 disabled:bg-stone-100" placeholder="Category e.g. Childhood" />
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-stone-600"><Upload className="mb-2" /> Select a file only when you are ready to preserve it. The app now saves the memory row first, then the private media object and metadata. No success is shown until the chain completes.<input disabled={busy} className="mt-3 block w-full text-sm" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={(event)=>chooseFile(event.currentTarget.files?.[0] ?? null, event.currentTarget)} />{selectedFile && <p className="mt-2 font-semibold text-stone-700">Staged: {selectedFile.name}</p>}</div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><button disabled={busy} className="rounded-2xl bg-stone-900 px-5 py-4 font-bold text-white shadow-lg shadow-stone-900/20 disabled:bg-stone-400">{busy ? preservationCopy[status].label : 'Preserve Memory'}</button>{busy && <button type="button" onClick={() => aborter?.abort()} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">Cancel upload</button>}</div>
  </form>;
}
interface RecordPageProps { onCreate: (memory: Omit<Memory, 'id' | 'createdAt' | 'creatorId' | 'familyId' | 'tags' | 'legacyStatus'>, file?: File, options?: { signal?: AbortSignal; onUploadProgress?: (event: UploadProgressEvent) => void }) => Memory | Promise<Memory> }

export function MemoriesPage({ archive }: { archive: ArchiveDataState }) {
  return <Card><SectionTitle eyebrow="Memories" title="Family stories, not a file drive">Every memory carries privacy, people, dates, and legacy status.</SectionTitle>{archive.memories.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No memories yet. Record the first story for this family archive.</p>}<div className="grid gap-4 md:grid-cols-2">{archive.memories.map(memory=><article key={memory.id} className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">{memory.category}</p><h3 className="text-xl font-semibold text-stone-900">{memory.title}</h3></div><span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white">{privacyLabels[memory.privacy]}</span></div><p className="mt-3 text-sm leading-6 text-stone-600">{memory.description}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">{memory.tags.map(t=><span key={t} className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-100">#{t}</span>)}</div></article>)}</div></Card>;
}

export function MemoryTreePage({ people, relationships }: { people: Person[]; relationships: FamilyRelationship[] }) {
  return <Card><SectionTitle eyebrow="MemoryTree" title="Family relationships without generation limits">People use internal IDs. Names are display labels only.</SectionTitle>{people.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No people have been added to this family tree yet.</p>}<div className="overflow-x-auto pb-4"><div className="grid min-w-[680px] grid-cols-4 gap-4">{people.map(person=><div key={person.id} className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50 p-4 text-center"><div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-white text-2xl shadow-inner">{person.displayName[0]}</div><b>{person.displayName}</b><p className="text-sm text-stone-500">{person.relationshipToViewer}</p><p className="mt-2 text-xs text-stone-400">ID: {person.id}</p></div>)}</div></div><div className="mt-5 grid gap-2">{relationships.map(r=><p key={r.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700 ring-1 ring-amber-100">{r.fromPersonId} → {r.relationshipType} → {r.toPersonId}</p>)}</div></Card>;
}

export function FamilyPage({ family, members, people, relationships, onAddPerson, onCreateRelationship, onInviteMember }: { family: Family; members: FamilyMember[]; people: Person[]; relationships: FamilyRelationship[]; onAddPerson: (displayName: string) => Promise<void> | void; onCreateRelationship: (input: Omit<FamilyRelationship, 'id' | 'familyId'>) => Promise<void> | void; onInviteMember: (input: { personId: string; role: FamilyMember['role']; relationshipLabel?: string; permissions?: string[] }) => Promise<void> | void }) {
  return <div className="space-y-5">
    <Card><SectionTitle eyebrow="Family ownership" title={family.name}>The family is the archive owner. Individual users contribute, but the model is not dependent on one phone or one account.</SectionTitle><div className="grid gap-3 md:grid-cols-3">{members.map(m=>{const p=people.find(x=>x.id===m.personId); return <div key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><UsersRound className="mb-2 text-amber-700" /><b>{p?.displayName ?? 'Linked person pending'}</b><p className="text-sm capitalize text-stone-500">{m.role.replace('_',' ')}</p><p className="mt-2 text-xs text-stone-500">{m.permissions.join(', ') || 'No extra permissions'}</p><p className="mt-1 text-xs text-stone-400">Status: {m.status}</p></div>;})}</div>{members.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No active family members returned yet.</p>}</Card>
    <FamilyManagementForms people={people} relationships={relationships} onAddPerson={onAddPerson} onCreateRelationship={onCreateRelationship} onInviteMember={onInviteMember} />
  </div>;
}

function FamilyManagementForms({ people, relationships, onAddPerson, onCreateRelationship, onInviteMember }: { people: Person[]; relationships: FamilyRelationship[]; onAddPerson: (displayName: string) => Promise<void> | void; onCreateRelationship: (input: Omit<FamilyRelationship, 'id' | 'familyId'>) => Promise<void> | void; onInviteMember: (input: { personId: string; role: FamilyMember['role']; relationshipLabel?: string; permissions?: string[] }) => Promise<void> | void }) {
  const canRelate = people.length >= 2;
  return <Card><SectionTitle eyebrow="Family management" title="Grow the tree carefully">Add people first, then connect relationships and prepare member invitations.</SectionTitle>
    <div className="grid gap-4 lg:grid-cols-3">
      <form className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100" onSubmit={(e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const name=String(fd.get('displayName')||'').trim(); if (name) void onAddPerson(name); e.currentTarget.reset();}}><b>Add person</b><input required name="displayName" className="mt-3 w-full rounded-2xl border border-amber-200 px-4 py-3" placeholder="Display name" /><button className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white">Add to MemoryTree</button></form>
      <form className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100" onSubmit={(e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); void onCreateRelationship({ fromPersonId: String(fd.get('fromPersonId')), toPersonId: String(fd.get('toPersonId')), relationshipType: String(fd.get('relationshipType')) as FamilyRelationship['relationshipType'] }); e.currentTarget.reset();}}><b>Create relationship</b><select disabled={!canRelate} required name="fromPersonId" className="mt-3 w-full rounded-2xl border border-emerald-200 px-4 py-3">{people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><select disabled={!canRelate} required name="relationshipType" className="mt-3 w-full rounded-2xl border border-emerald-200 px-4 py-3"><option value="parent">Parent of</option><option value="child">Child of</option><option value="grandparent">Grandparent of</option><option value="grandchild">Grandchild of</option><option value="sibling">Sibling of</option><option value="spouse">Spouse of</option><option value="partner">Partner of</option></select><select disabled={!canRelate} required name="toPersonId" className="mt-3 w-full rounded-2xl border border-emerald-200 px-4 py-3">{people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><button disabled={!canRelate} className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white disabled:bg-stone-300">Connect</button><p className="mt-2 text-xs text-stone-500">Existing relationships: {relationships.length}</p></form>
      <form className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100" onSubmit={(e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); void onInviteMember({ personId: String(fd.get('personId')), role: String(fd.get('role')) as FamilyMember['role'], relationshipLabel: String(fd.get('relationshipLabel')||''), permissions: ['memory:create'] }); e.currentTarget.reset();}}><b>Prepare invite</b><select required name="personId" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3">{people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><select required name="role" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3"><option value="member">Family member</option><option value="contributor">Contributor</option><option value="manager">Family manager</option><option value="legacy_custodian">Legacy custodian</option></select><input name="relationshipLabel" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3" placeholder="Relationship label" /><button disabled={people.length === 0} className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white disabled:bg-stone-300">Create invited member</button></form>
    </div>
  </Card>;
}

export function TimelinePage({ events }: { events: LifeEvent[] }) {
  return <Card><SectionTitle eyebrow="Life timeline" title="Family life in order" /> <div className="relative border-l-2 border-amber-200 pl-5">{events.map(e=><div key={e.id} className="mb-6"><span className="absolute -left-2 h-4 w-4 rounded-full bg-amber-600" /><b className="text-xl text-stone-900">{e.year} — {e.title}</b><p className="text-stone-600">{e.description}</p></div>)}</div>{events.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No timeline events yet.</p>}</Card>;
}

export function LegacyPage({ custodians, people }: { custodians: LegacyCustodian[]; people: Person[] }) {
  return <div className="space-y-5"><Card><SectionTitle eyebrow="Legacy custody" title="Architecture is present, access is not prematurely granted">Custodians control future workflow requests. They do not automatically receive private memories.</SectionTitle><div className="grid gap-3 md:grid-cols-2">{custodians.map(c=>{const p=people.find(x=>x.id===c.custodianPersonId); return <div key={c.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><ShieldCheck className="mb-2 text-emerald-700" /><b>{c.priority.toUpperCase()} Custodian</b><p>{p?.displayName ?? 'Person pending'}</p><p className="text-sm text-stone-500">Status: {c.status}</p></div>;})}</div>{custodians.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No legacy custodians configured yet.</p>}</Card><Card><SectionTitle eyebrow="Backup & archive export" title="Designed, not overstated">Primary storage is Supabase Storage once configured. Independent backup and family archive exports have data models and roadmap tasks, but redundancy is not claimed in Phase 1.</SectionTitle></Card></div>;
}

export function StoragePanel({ media, storage }: { media: ArchiveDataState['media']; storage: StorageUsage }) {
  const total = media.reduce((sum,item)=>sum+item.bytes,0); const pct = Math.min(100, total / storage.limitBytes * 100);
  return <Card><SectionTitle eyebrow="Private family media vault" title="Family Archive storage" /> <div className="mb-3 flex justify-between text-sm"><span>{formatBytes(total)} / {formatBytes(storage.limitBytes)}</span><span>{pct.toFixed(2)}%</span></div><div className="h-3 rounded-full bg-amber-100"><div className="h-3 rounded-full bg-gradient-to-r from-amber-600 to-emerald-600" style={{width:`${pct}%`}} /></div><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Videos',storage.videosBytes,Camera],['Photos',storage.photosBytes,FileHeart],['Audio',storage.audioBytes,Mic],['Documents',storage.documentsBytes,Clock]].map(([label,bytes,Icon])=>{const I=Icon as typeof Camera; return <div key={String(label)} className="rounded-2xl bg-amber-50 p-3"><I className="mb-2 text-amber-700" /><b>{formatBytes(Number(bytes))}</b><p className="text-sm text-stone-500">{String(label)}</p></div>;})}</div></Card>;
}

export function ReadinessPanel() {
  return <Card><SectionTitle eyebrow="Deployment readiness" title="What is live vs what needs configuration">This prevents the archive from pretending unfinished infrastructure exists.</SectionTitle><div className="grid gap-3 md:grid-cols-2">{getRuntimeReadiness().map(item => <div key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><div className="flex items-center justify-between gap-3"><b>{item.label}</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.ready ? 'Ready' : 'Needs setup'}</span></div><p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p></div>)}</div></Card>;
}
