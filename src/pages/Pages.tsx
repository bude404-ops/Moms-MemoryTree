import { AlertTriangle, Camera, CheckCircle2, Clock, CreditCard, Database, FileHeart, Gauge, GitBranch, Home, LockKeyhole, Mic, Server, ShieldCheck, TrendingUp, Upload, UsersRound, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CreatedFamilyInvitation, Family, FamilyMember, FamilyRelationship, LegacyCustodian, LifeEvent, Memory, Person, PrivacyLevel } from '../types/domain';
import type { UploadProgressEvent } from '../lib/mediaStorage';
import { AudioPlayer, ImageViewer, VideoPlayer } from '../components/SecureMedia';
import { storyQuestions } from '../lib/demoData';
import { formatBytes } from '../lib/archiveStore';
import { prepareMemoryUpload, validateMemoryUpload } from '../lib/mediaUpload';
import { getRuntimeReadiness } from '../lib/readiness';
import { calculateStorageCostSummary, createCreatorCostDashboard, formatCurrency, planForFamily } from '../lib/storageEconomics';
import type { ArchiveDataState } from '../lib/archiveData';
import { downloadArchiveExportManifest } from '../lib/archiveExport';

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


const foundationStages = [
  ['0', 'Reaper platform capability audit', 'Complete'],
  ['1', 'Reaper-first architecture', 'Complete'],
  ['2', 'Supabase to Reaper migration map', 'Complete'],
  ['3', 'Provider abstraction', 'Complete'],
  ['4', 'GitHub source of truth', 'Complete'],
  ['5', 'Environment management', 'Complete'],
  ['6', 'Security baseline', 'Complete'],
  ['7', 'Data model baseline', 'Complete'],
  ['8', 'Media pipeline baseline', 'Complete'],
  ['9', 'Legacy and archive baseline', 'Complete'],
  ['10', 'Backup and recovery baseline', 'Complete'],
  ['11', 'Deployment readiness', 'Complete'],
  ['12', 'Pre-dashboard handoff', 'Complete']
] as const;

const providerMatrix = [
  ['Mini App runtime', 'Reaper', 'Ready', 'Primary app shell and hosted runtime.'],
  ['Auth', 'Provider-neutral AuthService', 'Provider pending', 'Accounts sit behind a swappable auth boundary; no product copy depends on one vendor.'],
  ['Database', 'Provider-neutral DatabaseService', 'Provider pending', 'Families, people, memories, invites, permissions, and timeline data sit behind service contracts.'],
  ['Private media', 'Provider-neutral cloud storage', 'Provider pending', 'Video, audio, photos, and documents use MediaStorageService plus signed access rules.'],
  ['Backups', 'Unavailable placeholder', 'Foundation only', 'Do not claim backup protection until jobs and restore pass.'],
  ['Payments', 'Unavailable placeholder', 'Foundation only', 'Plans exist; cards and checkout are not connected.'],
  ['AI processing', 'Unavailable placeholder', 'Foundation only', 'Transcription/summaries require a future provider.'],
  ['Queue/jobs', 'Unavailable placeholder', 'Foundation only', 'Needed for archive export, thumbnails, backups, and AI.']
] as const;

const securityGates = [
  'No secrets committed',
  'Placeholder-only environment example',
  'Authorization contract and isolation validation',
  'Private media requires signed access',
  'Live Family A / Family B testing still required before production'
];

const dashboardNextActions = [
  'Restore GitHub authorization and push the queued commits.',
  'Choose the production cloud provider for auth, database, object storage, and signed media access.',
  'Deploy provider migrations/storage rules/functions once a provider is selected.',
  'Run live Family A / Family B isolation tests against the selected provider.',
  'Wire the React auth, memory, media, invitations, recorder, and upload flows to verified live services.',
  'Build backup/export workers only after live storage and access control pass.'
] as const;

export function AppDashboardPage({ archive, mode }: { archive: ArchiveDataState; mode: string }) {
  const runtime = getRuntimeReadiness();
  const completedStages = foundationStages.filter(([, , status]) => status === 'Complete').length;
  const blockers = runtime.filter(item => !item.ready).length + 5;
  const totalBytes = archive.media.reduce((sum, item) => sum + item.bytes, 0);
  const plan = archive.storagePlans.find(item => item.id === archive.subscription.planId) ?? planForFamily(archive.family, archive.storagePlans);
  const summary = calculateStorageCostSummary({ usage: archive.storage, plan, addons: archive.storageAddons, assumptions: archive.costAssumptions });

  return <div className="space-y-5">
    <Card className="overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 text-white">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-200"><Gauge size={16} /> App dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Preview is controlled. Launch blockers are exposed.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-200">This panel separates real product readiness from staged documentation, so the next work removes live blockers instead of adding ceremony.</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Current mode</p>
          <b className="text-2xl capitalize">{mode}</b>
          <p className="mt-1 text-xs text-stone-300">Data source: {archive.source}</p>
        </div>
      </div>
    </Card>

    <div className="grid gap-4 md:grid-cols-4">
      <Card><CheckCircle2 className="mb-3 text-emerald-700" /><p className="text-sm text-stone-500">Foundation checkpoints</p><b className="text-3xl text-stone-900">{completedStages}/13</b><p className="mt-1 text-xs text-stone-500">Documentation/control work is closed.</p></Card>
      <Card><FileHeart className="mb-3 text-rose-700" /><p className="text-sm text-stone-500">Memories tracked</p><b className="text-3xl text-stone-900">{archive.memories.length}</b><p className="mt-1 text-xs text-stone-500">Demo or live provider data.</p></Card>
      <Card><Database className="mb-3 text-amber-700" /><p className="text-sm text-stone-500">Private media tracked</p><b className="text-3xl text-stone-900">{formatBytes(totalBytes)}</b><p className="mt-1 text-xs text-stone-500">Not a backup claim.</p></Card>
      <Card><AlertTriangle className="mb-3 text-orange-700" /><p className="text-sm text-stone-500">Known blockers</p><b className="text-3xl text-stone-900">{blockers}</b><p className="mt-1 text-xs text-stone-500">Mostly provider/live gates.</p></Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card><SectionTitle eyebrow="Foundation index" title="Every checkpoint is closed before live work">These are source-controlled foundations, not production launch claims. New work should remove launch blockers.</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">{foundationStages.map(([stage, label, status]) => <div key={stage} className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100"><div><b>Stage {stage}</b><p className="text-sm text-stone-600">{label}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{status}</span></div>)}</div>
      </Card>
      <Card><SectionTitle eyebrow="Storage economics" title="Costs stay visible early">Numbers are estimates from configured assumptions, not invoices.</SectionTitle>
        <div className="rounded-3xl bg-stone-950 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">{plan.label}</p><b className="mt-2 block text-3xl">{summary.percentUsed.toFixed(1)}% used</b><div className="mt-4 h-4 rounded-full bg-white/20"><div className="h-4 rounded-full bg-gradient-to-r from-amber-400 to-emerald-300" style={{ width: `${summary.percentUsed}%` }} /></div><p className="mt-3 text-sm text-stone-200">{formatBytes(summary.usedBytes)} of {formatBytes(summary.allowedBytes)}</p></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm text-stone-500">Estimated monthly cost</p><b className="text-xl">{formatCurrency(summary.estimatedTotalCostCents, plan.currency)}</b></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm text-stone-500">Subscription revenue</p><b className="text-xl">{formatCurrency(summary.monthlyRevenueCents, plan.currency)}</b></div></div>
      </Card>
    </div>

    <Card><SectionTitle eyebrow="Provider matrix" title="Our platform first, cloud provider second">Blocked capabilities stay explicit so the dashboard does not sell ghosts or lock the product to one vendor.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">{providerMatrix.map(([capability, provider, status, detail]) => <div key={capability} className="rounded-2xl border border-amber-100 bg-white p-4"><div className="flex items-center justify-between gap-3"><b>{capability}</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'Ready' ? 'bg-emerald-100 text-emerald-800' : status === 'Foundation only' ? 'bg-stone-100 text-stone-700' : 'bg-amber-100 text-amber-900'}`}>{status}</span></div><p className="mt-1 text-sm font-semibold text-amber-800">{provider}</p><p className="mt-2 text-sm leading-6 text-stone-600">{detail}</p></div>)}</div>
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><SectionTitle eyebrow="Security readiness" title="Green locally, live gates still ahead" />
        <div className="grid gap-2">{securityGates.map((gate, index) => <div key={gate} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-amber-100">{index < 4 ? <CheckCircle2 className="mt-0.5 text-emerald-700" size={19} /> : <XCircle className="mt-0.5 text-amber-700" size={19} />}<p className="text-sm leading-6 text-stone-700">{gate}</p></div>)}</div>
      </Card>
      <Card><SectionTitle eyebrow="Deployment blockers" title="What must happen before production" />
        <div className="grid gap-2">{runtime.map(item => <div key={item.id} className="rounded-2xl bg-white p-3 ring-1 ring-amber-100"><div className="flex items-center justify-between gap-3"><b className="flex items-center gap-2"><Server size={18} />{item.label}</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.ready ? 'Ready' : 'Needs setup'}</span></div><p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p></div>)}</div>
      </Card>
    </div>

    <Card><SectionTitle eyebrow="Next actions" title="Launch blockers before more dashboard polish">The next pass should make the product real: selected cloud provider, verified isolation, browser recording, and working private media.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-5">{dashboardNextActions.map((action, index) => <div key={action} className="rounded-2xl bg-gradient-to-br from-amber-50 to-white p-4 ring-1 ring-amber-100"><GitBranch className="mb-3 text-amber-700" /><b>0{index + 1}</b><p className="mt-2 text-sm leading-6 text-stone-600">{action}</p></div>)}</div>
    </Card>
  </div>;
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
    <StoragePanel archive={archive} />
    <ReadinessPanel />
  </div>;
}

function DataStateBanner({ archive }: { archive: ArchiveDataState }) {
  if (archive.loading) return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Loading family archive from {archive.source}...</div>;
  if (archive.error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Archive data error: {archive.error}</div>;
  return <div className={`rounded-3xl border p-4 text-sm ${archive.source === 'supabase' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}><b>Data source:</b> {archive.source === 'supabase' ? 'Live cloud family archive' : 'Local demo archive'}</div>;
}

export function RecordPage({ archive, onCreate }: { archive: ArchiveDataState; onCreate: RecordPageProps['onCreate'] }) {
  return <div className="space-y-5"><Card className="bg-gradient-to-br from-rose-50 to-amber-50"><SectionTitle eyebrow="Tell your story" title="Record My Story">Record video or audio in the browser, upload existing files, and preserve everything through the cloud storage boundary when live services are configured.</SectionTitle><MemoryForm archive={archive} onCreate={onCreate} /></Card><Card><SectionTitle eyebrow="Guided storytelling" title="Choose a question" /> <div className="grid gap-3 md:grid-cols-2">{storyQuestions.map(q=><div key={q.id} className="rounded-2xl border border-amber-100 bg-white p-4"><b className="text-amber-800">{q.category}</b><p className="mt-1 text-stone-700">{q.question}</p></div>)}</div></Card></div>;
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
  const [recordingMode, setRecordingMode] = useState<'video' | 'audio' | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  async function startRecording(kind: 'video' | 'audio') {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('This browser does not support in-app recording yet. Use file upload instead.');
      return;
    }
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(kind === 'video' ? { video: true, audio: true } : { audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || (kind === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `memorytree-${kind}-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`, { type: mimeType });
        setSelectedFile(file);
        setMessage(`Recorded ${kind} is staged. It is not preserved until you save the memory.`);
        setStatus('draft');
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecordingMode(null);
      };
      recorder.start();
      setRecordingMode(kind);
      setMessage(`Recording ${kind}. Stop when the story is complete.`);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Camera or microphone permission was denied.');
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecordingMode(null);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      return;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setRecordingMode(null);
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
    <div className="rounded-2xl border border-amber-200 bg-white p-4 text-sm text-stone-700">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><b>Record inside MemoryTree</b><p className="mt-1 text-stone-600">Camera and microphone capture stays local until you press Preserve Memory.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">Browser recorder</span></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><button type="button" disabled={busy || !!recordingMode} onClick={() => void startRecording('video')} className="rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white disabled:bg-stone-300"><Camera className="mr-2 inline" size={17} />Record Video</button><button type="button" disabled={busy || !!recordingMode} onClick={() => void startRecording('audio')} className="rounded-2xl bg-amber-500 px-4 py-3 font-bold text-stone-950 disabled:bg-stone-300"><Mic className="mr-2 inline" size={17} />Record Audio</button><button type="button" disabled={!recordingMode} onClick={stopRecording} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-800 disabled:bg-stone-100 disabled:text-stone-400">Stop Recording</button></div>
      {recordingMode && <p className="mt-3 rounded-2xl bg-red-50 p-3 font-semibold text-red-800">Recording {recordingMode}. Keep this screen open.</p>}
      {recordingError && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-amber-950">{recordingError}</p>}
    </div>
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-stone-600"><Upload className="mb-2" /> Upload an existing file only when you are ready to preserve it. The app saves the memory row first, then the private media object and metadata. No success is shown until the chain completes.<input disabled={busy || !!recordingMode} className="mt-3 block w-full text-sm" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={(event)=>chooseFile(event.currentTarget.files?.[0] ?? null, event.currentTarget)} />{selectedFile && <p className="mt-2 font-semibold text-stone-700">Staged: {selectedFile.name}</p>}</div>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><button disabled={busy} className="rounded-2xl bg-stone-900 px-5 py-4 font-bold text-white shadow-lg shadow-stone-900/20 disabled:bg-stone-400">{busy ? preservationCopy[status].label : 'Preserve Memory'}</button>{busy && <button type="button" onClick={() => aborter?.abort()} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">Cancel upload</button>}</div>
  </form>;
}
interface RecordPageProps { onCreate: (memory: Omit<Memory, 'id' | 'createdAt' | 'creatorId' | 'familyId' | 'tags' | 'legacyStatus'>, file?: File, options?: { signal?: AbortSignal; onUploadProgress?: (event: UploadProgressEvent) => void }) => Memory | Promise<Memory> }

export function MemoriesPage({ archive }: { archive: ArchiveDataState }) {
  const mediaByMemory = new Map<string, typeof archive.media>();
  archive.media.forEach(media => mediaByMemory.set(media.memoryId, [...(mediaByMemory.get(media.memoryId) ?? []), media]));
  return <Card><SectionTitle eyebrow="Memories" title="Family stories, not a file drive">Every memory carries privacy, people, dates, legacy status, and private signed media when live services are configured.</SectionTitle>{archive.memories.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No memories yet. Record the first story for this family archive.</p>}<div className="grid gap-4 md:grid-cols-2">{archive.memories.map(memory=>{const media = mediaByMemory.get(memory.id) ?? []; return <article key={memory.id} className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">{memory.category}</p><h3 className="text-xl font-semibold text-stone-900">{memory.title}</h3></div><span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white">{privacyLabels[memory.privacy]}</span></div><p className="mt-3 text-sm leading-6 text-stone-600">{memory.description}</p>{media.length > 0 && <div className="mt-4 space-y-3">{media.map(item => <MemoryMediaPreview key={item.id} media={item} live={archive.source === 'supabase'} />)}</div>}<div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-500">{memory.tags.map(t=><span key={t} className="rounded-full bg-white px-3 py-1 ring-1 ring-amber-100">#{t}</span>)}</div></article>;})}</div></Card>;
}

function MemoryMediaPreview({ media, live }: { media: ArchiveDataState['media'][number]; live: boolean }) {
  if (!live) return <div className="rounded-2xl border border-amber-200 bg-white p-3 text-sm text-stone-600"><b>{media.mediaType.toUpperCase()}</b><p>{media.originalFileName ?? 'Private media'} staged in preview mode. Signed playback requires live provider configuration.</p></div>;
  if (media.mediaType === 'photo') return <ImageViewer media={media} alt={media.originalFileName ?? 'Family memory'} />;
  if (media.mediaType === 'video') return <VideoPlayer media={media} />;
  if (media.mediaType === 'audio') return <AudioPlayer media={media} />;
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><b>Private document</b><p>{media.originalFileName ?? media.storagePath}</p><p>Access is controlled by signed media authorization.</p></div>;
}

export function MemoryTreePage({ people, relationships }: { people: Person[]; relationships: FamilyRelationship[] }) {
  return <Card><SectionTitle eyebrow="MemoryTree" title="Family relationships without generation limits">People use internal IDs. Names are display labels only.</SectionTitle>{people.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No people have been added to this family tree yet.</p>}<div className="overflow-x-auto pb-4"><div className="grid min-w-[680px] grid-cols-4 gap-4">{people.map(person=><div key={person.id} className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50 p-4 text-center"><div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-white text-2xl shadow-inner">{person.displayName[0]}</div><b>{person.displayName}</b><p className="text-sm text-stone-500">{person.relationshipToViewer}</p><p className="mt-2 text-xs text-stone-400">ID: {person.id}</p></div>)}</div></div><div className="mt-5 grid gap-2">{relationships.map(r=><p key={r.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700 ring-1 ring-amber-100">{r.fromPersonId} → {r.relationshipType} → {r.toPersonId}</p>)}</div></Card>;
}

export function FamilyPage({ family, members, people, relationships, onAddPerson, onCreateRelationship, onInviteMember, onCreateInvitation }: { family: Family; members: FamilyMember[]; people: Person[]; relationships: FamilyRelationship[]; onAddPerson: (displayName: string) => Promise<void> | void; onCreateRelationship: (input: Omit<FamilyRelationship, 'id' | 'familyId'>) => Promise<void> | void; onInviteMember: (input: { personId: string; role: FamilyMember['role']; relationshipLabel?: string; permissions?: string[] }) => Promise<void> | void; onCreateInvitation?: (input: { email: string; role: FamilyMember['role']; relationshipLabel?: string }) => Promise<CreatedFamilyInvitation | null> | CreatedFamilyInvitation | null }) {
  return <div className="space-y-5">
    <Card><SectionTitle eyebrow="Family ownership" title={family.name}>The family is the archive owner. Individual users contribute, but the model is not dependent on one phone or one account.</SectionTitle><div className="grid gap-3 md:grid-cols-3">{members.map(m=>{const p=people.find(x=>x.id===m.personId); return <div key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><UsersRound className="mb-2 text-amber-700" /><b>{p?.displayName ?? 'Linked person pending'}</b><p className="text-sm capitalize text-stone-500">{m.role.replace('_',' ')}</p><p className="mt-2 text-xs text-stone-500">{m.permissions.join(', ') || 'No extra permissions'}</p><p className="mt-1 text-xs text-stone-400">Status: {m.status}</p></div>;})}</div>{members.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No active family members returned yet.</p>}</Card>
    <FamilyManagementForms people={people} relationships={relationships} onAddPerson={onAddPerson} onCreateRelationship={onCreateRelationship} onInviteMember={onInviteMember} onCreateInvitation={onCreateInvitation} />
  </div>;
}

function FamilyManagementForms({ people, relationships, onAddPerson, onCreateRelationship, onInviteMember, onCreateInvitation }: { people: Person[]; relationships: FamilyRelationship[]; onAddPerson: (displayName: string) => Promise<void> | void; onCreateRelationship: (input: Omit<FamilyRelationship, 'id' | 'familyId'>) => Promise<void> | void; onInviteMember: (input: { personId: string; role: FamilyMember['role']; relationshipLabel?: string; permissions?: string[] }) => Promise<void> | void; onCreateInvitation?: (input: { email: string; role: FamilyMember['role']; relationshipLabel?: string }) => Promise<CreatedFamilyInvitation | null> | CreatedFamilyInvitation | null }) {
  const canRelate = people.length >= 2;
  const [lastInvite, setLastInvite] = useState<CreatedFamilyInvitation | null>(null);
  return <Card><SectionTitle eyebrow="Family management" title="Grow the tree carefully">Add people first, then connect relationships and prepare secure invitations.</SectionTitle>
    <div className="grid gap-4 lg:grid-cols-3">
      <form className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100" onSubmit={(e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const name=String(fd.get('displayName')||'').trim(); if (name) void onAddPerson(name); e.currentTarget.reset();}}><b>Add person</b><input required name="displayName" className="mt-3 w-full rounded-2xl border border-amber-200 px-4 py-3" placeholder="Display name" /><button className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white">Add to MemoryTree</button></form>
      <form className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100" onSubmit={(e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); void onCreateRelationship({ fromPersonId: String(fd.get('fromPersonId')), toPersonId: String(fd.get('toPersonId')), relationshipType: String(fd.get('relationshipType')) as FamilyRelationship['relationshipType'] }); e.currentTarget.reset();}}><b>Create relationship</b><select disabled={!canRelate} required name="fromPersonId" className="mt-3 w-full rounded-2xl border border-emerald-200 px-4 py-3">{people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><select disabled={!canRelate} required name="relationshipType" className="mt-3 w-full rounded-2xl border border-emerald-200 px-4 py-3"><option value="parent">Parent of</option><option value="child">Child of</option><option value="grandparent">Grandparent of</option><option value="grandchild">Grandchild of</option><option value="sibling">Sibling of</option><option value="spouse">Spouse of</option><option value="partner">Partner of</option></select><select disabled={!canRelate} required name="toPersonId" className="mt-3 w-full rounded-2xl border border-emerald-200 px-4 py-3">{people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><button disabled={!canRelate} className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white disabled:bg-stone-300">Connect</button><p className="mt-2 text-xs text-stone-500">Existing relationships: {relationships.length}</p></form>
      <form className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100" onSubmit={async (e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const role=String(fd.get('role')) as FamilyMember['role']; const relationshipLabel=String(fd.get('relationshipLabel')||''); const email=String(fd.get('email')||'').trim(); if (email && onCreateInvitation) { const invite = await onCreateInvitation({ email, role, relationshipLabel }); if (invite) setLastInvite(invite); } else { void onInviteMember({ personId: String(fd.get('personId')), role, relationshipLabel, permissions: ['memory:create'] }); } e.currentTarget.reset();}}><b>Invite family member</b><input name="email" type="email" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3" placeholder="Email for secure invite" /><select name="personId" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3">{people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><select required name="role" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3"><option value="member">Family member</option><option value="contributor">Contributor</option><option value="manager">Family manager</option><option value="legacy_custodian">Legacy custodian</option></select><input name="relationshipLabel" className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3" placeholder="Relationship label" /><button disabled={people.length === 0 && !onCreateInvitation} className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white disabled:bg-stone-300">Create secure invite</button></form>
    </div>{lastInvite && <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><b>Invitation created.</b><p>Send this private token to {lastInvite.email}. The token is shown once; only its hash is stored.</p><code className="mt-2 block break-all rounded-2xl bg-white p-3 text-xs text-stone-800">{lastInvite.token}</code><p className="mt-2 break-all text-xs text-emerald-900">Accept path: {lastInvite.acceptUrl}</p></div>}
  </Card>;
}

export function TimelinePage({ events }: { events: LifeEvent[] }) {
  return <Card><SectionTitle eyebrow="Life timeline" title="Family life in order" /> <div className="relative border-l-2 border-amber-200 pl-5">{events.map(e=><div key={e.id} className="mb-6"><span className="absolute -left-2 h-4 w-4 rounded-full bg-amber-600" /><b className="text-xl text-stone-900">{e.year} — {e.title}</b><p className="text-stone-600">{e.description}</p></div>)}</div>{events.length === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-stone-600">No timeline events yet.</p>}</Card>;
}

export function LegacyPage({ custodians, people }: { custodians: LegacyCustodian[]; people: Person[] }) {
  const [story, setStory] = useState('');
  const [preservedStory, setPreservedStory] = useState<string | null>(null);
  const creator = people[0]?.displayName ?? 'Original Creator';
  const preservedAt = preservedStory ? new Date().toLocaleDateString() : null;

  return <div className="space-y-5">
    <Card className="bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 text-white">
      <SectionTitle eyebrow="Legacy Memory Lock" title="Preserve what the person said.">Let the family add what they remember. Never rewrite history.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-4">
        {['ACTIVE', 'LEGACY_PENDING', 'LEGACY', 'ARCHIVED'].map(state => <div key={state} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><p className="text-xs uppercase tracking-[0.18em] text-amber-200">Account state</p><b>{state}</b></div>)}
      </div>
    </Card>

    <Card>
      <SectionTitle eyebrow="Original life story" title={preservedStory ? 'Original Story — Preserved' : 'Create your personal life story'}>{preservedStory ? `Recorded by ${creator}` : 'Before preservation, the owner may edit their own story. After preservation, the original becomes locked.'}</SectionTitle>
      {preservedStory ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white">🔒 Preserved</span><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">Recorded by {creator}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-700 ring-1 ring-emerald-200">Preserved {preservedAt}</span></div>
        <p className="whitespace-pre-wrap text-stone-800">{preservedStory}</p>
        <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-semibold text-stone-700 ring-1 ring-emerald-100">No family member, Next of Kin, Legacy Custodian, or administrator can silently edit, replace, or delete this preserved original.</p>
      </div> : <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (story.trim()) setPreservedStory(story.trim()); }}>
        <textarea value={story} onChange={(event) => setStory(event.target.value)} className="min-h-44 rounded-2xl border border-amber-200 bg-white px-4 py-3" placeholder="Write your original life story in your own words..." />
        <div className="grid gap-2 sm:grid-cols-2"><button type="button" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-bold text-stone-900">Save Draft</button><button className="rounded-2xl bg-stone-900 px-5 py-4 font-bold text-white">Preserve My Story</button></div>
      </form>}
    </Card>

    <Card>
      <SectionTitle eyebrow="Next of kin" title="Designate controlled legacy helpers">Designated people receive legacy-management functions only after the Legacy transition. They do not receive full account ownership.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><b>Primary Next of Kin</b><p className="text-sm text-stone-600">First authorized legacy helper.</p></div>
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><b>Backup Next of Kin</b><p className="text-sm text-stone-600">Secondary helper if needed.</p></div>
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><b>Legacy Custodian</b><p className="text-sm text-stone-600">Manages memorial functions after transition.</p></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{custodians.map(c=>{const p=people.find(x=>x.id===c.custodianPersonId); return <div key={c.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><ShieldCheck className="mb-2 text-emerald-700" /><b>{c.priority.toUpperCase()} Custodian</b><p>{p?.displayName ?? 'Person pending'}</p><p className="text-sm text-stone-500">Status: {c.status}</p></div>;})}</div>
    </Card>

    <Card>
      <SectionTitle eyebrow="Controlled Legacy Mode" title="Request, then approve">Ordinary family members cannot instantly declare another person deceased. Legacy Mode requires the configured authorization process.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-3"><button className="rounded-2xl bg-amber-500 px-5 py-4 font-bold text-stone-950">Request Legacy Status</button><button className="rounded-2xl bg-stone-900 px-5 py-4 font-bold text-white">Approve Legacy Mode</button><button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-900">Add Funeral / Memorial Video</button></div>
    </Card>

    <Card>
      <SectionTitle eyebrow="Memorial timeline" title="Every contribution keeps its author">Original words stay separate from family memories, tributes, and memorial video.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-4">{['Life Story', 'Life Memories', 'Funeral & Memorial', 'Family Memories After Passing'].map((section, index) => <div key={section} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><b>{section}</b><p className="mt-2 text-sm text-stone-600">{index === 0 ? `Original preserved story. Recorded by ${creator}.` : index === 2 ? 'Memorial Video. Added by Next of Kin or Legacy Custodian.' : 'Separate family contributions with contributor and date.'}</p></div>)}</div>
    </Card>
  </div>;
}

export function StoragePanel({ archive }: { archive: ArchiveDataState }) {
  const [lastExport, setLastExport] = useState<{ exportedAt: string; media: number; memories: number; warnings: number } | null>(null);
  const plan = archive.storagePlans.find(item => item.id === archive.subscription.planId) ?? planForFamily(archive.family, archive.storagePlans);
  const summary = calculateStorageCostSummary({ usage: archive.storage, plan, addons: archive.storageAddons, assumptions: archive.costAssumptions });
  const rows = [['Videos',archive.storage.videosBytes,Camera],['Photos',archive.storage.photosBytes,FileHeart],['Audio',archive.storage.audioBytes,Mic],['Documents',archive.storage.documentsBytes,Clock]] as const;

  function exportManifest() {
    const manifest = downloadArchiveExportManifest(archive);
    setLastExport({ exportedAt: manifest.exportedAt, media: manifest.counts.media, memories: manifest.counts.memories, warnings: manifest.warnings.length });
  }

  return <Card><SectionTitle eyebrow="Storage & plan" title="Family Cloud Storage">Usage and costs are estimates from configured plan and provider assumptions — not invoices.</SectionTitle>
    {summary.warning && <div className={`mb-4 rounded-2xl border p-3 text-sm ${summary.warning.severity === 'urgent' || summary.warning.severity === 'blocked' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-950'}`}><AlertTriangle className="mb-1" size={18} /><b>{summary.warning.severity.toUpperCase()}</b><p>{summary.warning.message} You have {formatBytes(summary.remainingBytes)} remaining.</p></div>}
    <div className="rounded-3xl bg-stone-950 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">{plan.label} Plan</p><div className="mt-2 flex items-end justify-between gap-3"><b className="text-3xl">{formatCurrency(plan.monthlyPriceCents, plan.currency)}</b><span className="text-sm text-stone-300">/ month · payments not yet connected</span></div><div className="mt-5 flex justify-between text-sm"><span>{formatBytes(summary.usedBytes)} / {formatBytes(summary.allowedBytes)}</span><span>{summary.percentUsed.toFixed(1)}%</span></div><div className="mt-2 h-4 rounded-full bg-white/20"><div className="h-4 rounded-full bg-gradient-to-r from-amber-400 to-emerald-300" style={{width:`${summary.percentUsed}%`}} /></div><p className="mt-3 text-sm text-stone-200">{formatBytes(summary.remainingBytes)} remaining</p></div>
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{rows.map(([label,bytes,Icon])=><div key={label} className="rounded-2xl bg-amber-50 p-3"><Icon className="mb-2 text-amber-700" /><b>{formatBytes(bytes)}</b><p className="text-sm text-stone-500">{label}</p></div>)}</div>
    <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><Database className="mb-2 text-emerald-700" /><b>Estimated Storage Cost</b><p className="text-xl">{formatCurrency(summary.estimatedStorageCostCents, plan.currency)}</p><p className="text-xs text-stone-500">Based on configured provider assumptions.</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><TrendingUp className="mb-2 text-amber-700" /><b>Estimated Total Cost</b><p className="text-xl">{formatCurrency(summary.estimatedTotalCostCents, plan.currency)}</p><p className="text-xs text-stone-500">Storage + bandwidth + backup + AI + processing estimates.</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><CreditCard className="mb-2 text-rose-700" /><b>Subscription Revenue</b><p className="text-xl">{formatCurrency(summary.monthlyRevenueCents, plan.currency)}</p><p className="text-xs text-stone-500">Revenue is separated from cost. Payments not connected.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><button className="rounded-2xl bg-stone-900 px-5 py-4 font-bold text-white">Manage Storage</button><button className="rounded-2xl bg-amber-500 px-5 py-4 font-bold text-stone-950">Upgrade Plan</button><button type="button" onClick={exportManifest} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-900">Export Manifest</button></div>
    {lastExport && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><b>Archive manifest prepared.</b><p>{lastExport.memories} memories and {lastExport.media} media records indexed. {lastExport.warnings ? `${lastExport.warnings} warning${lastExport.warnings === 1 ? '' : 's'} included.` : 'No warnings included.'}</p><p className="text-xs text-emerald-800">Exported {new Date(lastExport.exportedAt).toLocaleString()}. This manifest is an audit index; private media files still require signed access or backup workers.</p></div>}
  </Card>;
}

export function CreatorCostDashboardPage({ archive }: { archive: ArchiveDataState }) {
  const dashboard = createCreatorCostDashboard({ families: [archive.family], usages: { [archive.family.id]: archive.storage }, plans: archive.storagePlans, assumptions: archive.costAssumptions });
  return <div className="space-y-5"><Card className="bg-gradient-to-br from-stone-950 to-stone-800 text-white"><SectionTitle eyebrow="Creator dashboard" title="Storage economics command center">Private admin-only analytics. These numbers are estimated from configured assumptions unless actual provider bills are imported.</SectionTitle><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Families',dashboard.totalFamilies],['Paid',dashboard.paidFamilies],['Free',dashboard.freeFamilies],['Storage',formatBytes(dashboard.totalStorageBytes)]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-amber-200">{label}</p><b className="text-2xl">{value}</b></div>)}</div></Card>
    <Card><SectionTitle eyebrow="Revenue vs cost" title="Estimated margin" /><div className="grid gap-3 md:grid-cols-4">{[['MRR',formatCurrency(dashboard.monthlyRevenueCents)],['Estimated Infra Cost',formatCurrency(dashboard.estimatedInfrastructureCostCents)],['Estimated Gross Profit',formatCurrency(dashboard.estimatedGrossProfitCents)],['Estimated Margin',dashboard.estimatedMarginPct == null ? 'N/A' : `${dashboard.estimatedMarginPct.toFixed(1)}%`]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-amber-50 p-4"><p className="text-sm text-stone-500">{label}</p><b className="text-xl">{value}</b></div>)}</div></Card>
    <Card><SectionTitle eyebrow="Plan profitability" title="Plans that scale must stay profitable" /><div className="grid gap-3 md:grid-cols-4">{dashboard.planProfitability.map(row=><div key={row.planId} className="rounded-2xl border border-amber-100 bg-white p-4"><b className="capitalize">{row.planId.replace('_',' ')}</b><p className="text-sm text-stone-500">Revenue: {formatCurrency(row.revenueCents)}</p><p className="text-sm text-stone-500">Avg storage: {formatBytes(row.averageStorageBytes)}</p><p className="text-sm text-stone-500">Estimated cost: {formatCurrency(row.estimatedCostCents)}</p><p className="font-bold">Margin: {formatCurrency(row.marginCents)}</p></div>)}</div></Card>
    <Card><SectionTitle eyebrow="Forecast" title="Storage growth projection" /><div className="grid gap-3 md:grid-cols-5">{[['Current',dashboard.forecast.currentBytes],['30-Day Growth',dashboard.forecast.thirtyDayGrowthBytes],['90-Day Growth',dashboard.forecast.ninetyDayGrowthBytes],['1-Year Projection',dashboard.forecast.oneYearProjectionBytes],['3-Year Projection',dashboard.forecast.threeYearProjectionBytes]].map(([label,bytes])=><div key={String(label)} className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm text-stone-500">{label}</p><b>{formatBytes(Number(bytes))}</b></div>)}</div><p className="mt-3 text-sm text-stone-500">Projection is an estimate until provider billing and long-term snapshots are connected.</p></Card>
    <Card><SectionTitle eyebrow="Alerts" title="Budget protection" />{dashboard.alerts.length ? dashboard.alerts.map(alert=><p key={alert} className="rounded-2xl bg-red-50 p-3 text-red-800">{alert}</p>) : <p className="rounded-2xl bg-emerald-50 p-3 text-emerald-900">No storage alerts from configured thresholds.</p>}</Card>
  </div>;
}

export function ReadinessPanel() {
  return <Card><SectionTitle eyebrow="Deployment readiness" title="What is live vs what needs configuration">This prevents the archive from pretending unfinished infrastructure exists.</SectionTitle><div className="grid gap-3 md:grid-cols-2">{getRuntimeReadiness().map(item => <div key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><div className="flex items-center justify-between gap-3"><b>{item.label}</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.ready ? 'Ready' : 'Needs setup'}</span></div><p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p></div>)}</div></Card>;
}
