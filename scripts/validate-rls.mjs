import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '202608120001_phase1_foundation.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const lower = migration.toLowerCase();

const assertions = [
  ['RLS enabled on families', 'alter table public.families enable row level security'],
  ['RLS enabled on memories', 'alter table public.memories enable row level security'],
  ['RLS enabled on memory media', 'alter table public.memory_media enable row level security'],
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
  ['legacy permissions branch exists', 'legacy_permissions']
];

const missing = assertions.filter(([, term]) => !lower.includes(term.toLowerCase())).map(([label]) => label);
if (missing.length) throw new Error(`Missing RLS/storage isolation assertions: ${missing.join(', ')}`);

const forbidden = [/using\s*\(\s*true\s*\)/i, /to\s+authenticated\s+using\s*\(\s*true\s*\)/i, /public\s*=\s*true/i];
for (const pattern of forbidden) if (pattern.test(migration)) throw new Error(`Forbidden broad policy/storage pattern: ${pattern}`);

console.log('RLS/static family isolation validation passed.');
