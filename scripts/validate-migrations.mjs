import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
if (files.length === 0) throw new Error('No database migrations found.');
const sql = files.map(file => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n');
const lower = sql.toLowerCase();

const requiredTables = [
  'profiles','families','people','family_members','family_relationships','memories','memory_media','memory_people','memory_tags','memory_permissions','life_events','story_questions','legacy_messages','legacy_custodians','legacy_permissions','family_invitations','storage_usage','backup_records','archive_exports','audit_logs'
];
const missingTables = requiredTables.filter(table => !new RegExp(`create table public\\.${table}\\b`, 'i').test(sql));
if (missingTables.length) throw new Error(`Missing required tables: ${missingTables.join(', ')}`);

const rlsMissing = requiredTables.filter(table => !new RegExp(`alter table public\\.${table} enable row level security`, 'i').test(sql));
if (rlsMissing.length) throw new Error(`Missing RLS enable statements: ${rlsMissing.join(', ')}`);

const requiredTerms = [
  'can_view_memory','is_family_member','is_family_manager','is_descendant_of','authorized_signed_media','can_access_storage_object',
  'family-media','family-avatars','family-exports','storage_private_authorized_read','memory_media_authorized_read','memories_authorized_read',
  'privacy_level','private_forever','family_after_legacy','descendants_after_legacy','custodian_only','specific_person'
];
const missingTerms = requiredTerms.filter(term => !lower.includes(term.toLowerCase()));
if (missingTerms.length) throw new Error(`Missing security/storage terms: ${missingTerms.join(', ')}`);

const forbiddenPatterns = [
  /using\s*\(\s*true\s*\)/i,
  /to\s+authenticated\s+using\s*\(\s*true\s*\)/i,
  /create\s+policy[^;]+authenticated[^;]+read[^;]+everything/i,
  /public\s*=\s*true/i
];
for (const pattern of forbiddenPatterns) {
  if (pattern.test(sql)) throw new Error(`Forbidden broad access pattern detected: ${pattern}`);
}

console.log(`Database validation passed for ${files.length} migration file(s), ${requiredTables.length} private tables, RLS, storage buckets, and signed-media helpers.`);
