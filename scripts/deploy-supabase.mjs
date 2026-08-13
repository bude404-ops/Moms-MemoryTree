import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const functionDir = path.join(root, 'supabase', 'functions', 'signed-media-access');
const requiredEnv = ['SUPABASE_PROJECT_REF'];
const deployRequested = process.argv.includes('--deploy');
const verifyRequested = process.argv.includes('--verify-live');
const missingEnv = requiredEnv.filter(name => !process.env[name]);
const hasSupabase = spawnSync('supabase', ['--version'], { encoding: 'utf8' });

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

if (!fs.existsSync(migrationDir)) fail('Missing supabase/migrations directory.');
if (!fs.existsSync(functionDir)) fail('Missing signed-media-access Edge Function source.');
const migrations = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
if (migrations.length === 0) fail('No Supabase migration files found.');
ok(`${migrations.length} migration file(s) present.`);
ok('signed-media-access Edge Function source present.');

execFileSync(process.execPath, ['scripts/validate-migrations.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/validate-rls.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/check-secrets.mjs'], { stdio: 'inherit' });
ok('Local migration, RLS, and secret validations passed.');

if (hasSupabase.status !== 0) {
  console.log('Supabase CLI not found. Install it before deployment, or apply migrations through the Supabase dashboard in timestamp order.');
  if (deployRequested) fail('Cannot deploy because Supabase CLI is unavailable.');
} else {
  ok(`Supabase CLI available: ${hasSupabase.stdout.trim()}`);
}

if (missingEnv.length) {
  console.log(`Deployment env missing: ${missingEnv.join(', ')}`);
  console.log('Set SUPABASE_PROJECT_REF for deployment. Use CLI login or SUPABASE_ACCESS_TOKEN outside the repo when required by Supabase CLI.');
  if (deployRequested) fail('Cannot deploy because required deployment env is missing.');
}

if (!deployRequested) {
  console.log('Preflight complete. Re-run with --deploy to link, push migrations, and deploy Edge Function.');
  process.exit(0);
}

execFileSync('supabase', ['link', '--project-ref', process.env.SUPABASE_PROJECT_REF], { stdio: 'inherit' });
execFileSync('supabase', ['db', 'push'], { stdio: 'inherit' });
execFileSync('supabase', ['functions', 'deploy', 'signed-media-access'], { stdio: 'inherit' });
ok('Supabase migrations and signed-media-access Edge Function deployed.');

if (verifyRequested) {
  execFileSync(process.execPath, ['scripts/verify-live-supabase.mjs'], { stdio: 'inherit' });
}
