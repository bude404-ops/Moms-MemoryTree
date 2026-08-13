import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const migration = fs.readdirSync(migrationDir)
  .filter(file => file.endsWith('.sql'))
  .sort()
  .map(file => fs.readFileSync(path.join(migrationDir, file), 'utf8'))
  .join('\n');
const lower = migration.toLowerCase();

const privateTables = ['profiles','families','people','family_members','family_relationships','memories','memory_media','memory_people','memory_tags','memory_permissions','life_events','story_questions','legacy_messages','legacy_custodians','legacy_permissions','family_invitations','storage_usage','storage_plans','backup_records','archive_exports','audit_logs'];
for (const table of privateTables) {
  const needle = `alter table public.${table} enable row level security`;
  if (!lower.includes(needle)) throw new Error(`Missing RLS enablement for ${table}`);
}

const assertions = [
  ['family isolation helper exists', 'is_family_member'],
  ['manager helper exists', 'is_family_manager'],
  ['descendant helper exists', 'is_descendant_of'],
  ['memory authorization helper exists', 'can_view_memory'],
  ['signed media RPC exists', 'authorized_signed_media'],
  ['private media bucket exists', "'family-media', 'family-media', false"],
  ['private avatar bucket exists', "'family-avatars', 'family-avatars', false"],
  ['private export bucket exists', "'family-exports', 'family-exports', false"],
  ['storage path scoped to memories', "name like 'family/%/memories/%'"],
  ['private memory creator-only branch exists', 'm.creator_id = auth.uid()'],
  ['family privacy branch exists', "m.privacy_level = 'family'"],
  ['specific people branch exists', "m.privacy_level = 'specific_people'"],
  ['descendant branch exists', "m.privacy_level = 'descendants'"],
  ['legacy permissions branch exists', 'legacy_permissions'],
  ['storage insert validates memory family', "where name like ('family/' || m.family_id::text || '/memories/' || m.id::text || '/%')"],
  ['storage read requires memory authorization', 'public.can_view_memory(mm.memory_id)'],
  ['storage usage trigger exists', 'increment_storage_usage_from_media'],
  ['audit trigger exists', 'audit_memory_created'],
  ['explicit upload status enum exists', 'media_upload_status'],
  ['completed-only signed media exists', "mm.upload_status = 'completed'"],
  ['soft delete lifecycle exists', 'soft_delete_memory_media'],
  ['quota plans exist', 'storage_plans'],
  ['quota helper exists', 'family_has_storage_capacity'],
  ['safe original path validation exists', 'invalid family media storage path'],
  ['private media includes webm support', 'video/webm'],
  ['public buckets forced private', 'public = false'],
  ['completed media listing enforced', ".eq('upload_status', 'completed')"],
  ['media storage provider abstraction exists', 'MediaStorageService'],
  ['supabase provider exists', 'SupabaseStorageProvider'],
  ['upload cancellation boundary exists', 'AbortSignal'],
  ['no independent backup overclaim', 'Backup records and export records exist, but no independent backup provider is implemented or verified yet']
];

const appSource = [
  'src/lib/repository.ts',
  'src/lib/archiveData.ts',
  'src/lib/mediaStorage.ts',
  'src/pages/Pages.tsx',
  'DEVELOPMENT_STATUS.md'
].map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n').toLowerCase();

const missing = assertions.filter(([, term]) => !(lower.includes(term.toLowerCase()) || appSource.includes(term.toLowerCase()))).map(([label]) => label);
if (missing.length) throw new Error(`Missing RLS/storage isolation assertions: ${missing.join(', ')}`);

const forbidden = [/using\s*\(\s*true\s*\)/i, /to\s+authenticated\s+using\s*\(\s*true\s*\)/i, /public\s*=\s*true/i, /create\s+policy[^;]+authenticated[^;]+read[^;]+all/i];
for (const pattern of forbidden) if (pattern.test(migration)) throw new Error(`Forbidden broad policy/storage pattern: ${pattern}`);

console.log('RLS/static family isolation validation passed.');
