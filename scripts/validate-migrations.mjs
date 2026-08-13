import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
if (files.length === 0) throw new Error('No Supabase migrations found.');

let combined = '';
for (const file of files) {
  if (!/^\d{12}_[a-z0-9_]+\.sql$/.test(file)) throw new Error(`Migration filename must be timestamp_slug.sql: ${file}`);
  const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
  if (!sql.includes('create table') && !sql.includes('alter table') && !sql.includes('create or replace function')) throw new Error(`Migration has no schema/function operation: ${file}`);
  combined += `\n-- ${file}\n${sql}`;
}

const requiredTables = [
  'profiles','families','people','family_members','family_relationships','memories','memory_media','memory_people','memory_tags','life_events','story_questions','legacy_messages','legacy_custodians','legacy_permissions','family_invitations','storage_usage','backup_records','archive_exports','audit_logs'
];
for (const table of requiredTables) {
  if (!combined.includes(`public.${table}`)) throw new Error(`Missing required table/schema reference: ${table}`);
}

const requiredColumns = [
  'display_name','avatar_path','created_by','relationship_label','joined_at','memory_type','privacy_level','category','storage_path','file_name','mime_type','file_size','duration_seconds','thumbnail_path','unlock_condition','backup_status','verification_status','export_path','event_type'
];
for (const column of requiredColumns) {
  if (!combined.includes(column)) throw new Error(`Missing required column/schema reference: ${column}`);
}

const requiredPrivateBuckets = ["'family-media', 'family-media', false", "'family-avatars', 'family-avatars', false", "'family-exports', 'family-exports', false"];
for (const bucket of requiredPrivateBuckets) {
  if (!combined.includes(bucket)) throw new Error(`Missing private bucket definition: ${bucket}`);
}

console.log(`Database validation passed for ${files.length} migration file(s).`);
