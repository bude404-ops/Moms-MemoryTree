import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql'));
if (files.length === 0) throw new Error('No database migrations found.');
const sql = files.map(file => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n');
const requiredTables = ['profiles','families','family_members','family_relationships','memories','memory_media','memory_people','memory_tags','life_events','story_questions','legacy_messages','legacy_custodians','legacy_permissions','family_invitations','storage_usage','backup_records','archive_exports','notifications','audit_logs'];
const missingTables = requiredTables.filter(table => !new RegExp(`create table public\\.${table}\\b`, 'i').test(sql));
if (missingTables.length) throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
const requiredPolicies = ['enable row level security','can_view_memory','is_family_member','memory_media_authorized_read','memories_authorized_read'];
const missingPolicies = requiredPolicies.filter(term => !sql.toLowerCase().includes(term.toLowerCase()));
if (missingPolicies.length) throw new Error(`Missing security terms: ${missingPolicies.join(', ')}`);
console.log(`Database validation passed for ${files.length} migration file(s).`);
