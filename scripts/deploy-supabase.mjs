import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const functionDir = path.join(root, 'supabase', 'functions', 'signed-media-access');
const configPath = path.join(root, 'supabase', 'config.toml');
const config = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
const configuredProjectRef = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
const projectRef = process.env.SUPABASE_PROJECT_REF || configuredProjectRef;
const deployRequested = process.argv.includes('--deploy');
const verifyRequested = process.argv.includes('--verify-live');
const missingEnv = projectRef ? [] : ['SUPABASE_PROJECT_REF or supabase/config.toml project_id'];
let supabaseCommand = 'supabase';
let supabaseArgsPrefix = [];
let hasSupabase = spawnSync(supabaseCommand, ['--version'], { encoding: 'utf8' });
if (hasSupabase.status !== 0) {
  const npxCheck = spawnSync('npx', ['supabase', '--version'], { encoding: 'utf8' });
  if (npxCheck.status === 0) {
    supabaseCommand = 'npx';
    supabaseArgsPrefix = ['supabase'];
    hasSupabase = npxCheck;
  }
}

function supabaseCli(args) {
  return [supabaseCommand, [...supabaseArgsPrefix, ...args]];
}

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
if (projectRef) ok(`Supabase project ref configured: ${projectRef}`);

execFileSync(process.execPath, ['scripts/validate-migrations.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/validate-rls.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/check-secrets.mjs'], { stdio: 'inherit' });
ok('Local migration, RLS, and secret validations passed.');

if (hasSupabase.status !== 0) {
  console.log('Supabase CLI not found. Install it before deployment, or use npx supabase, or apply migrations through the Supabase dashboard in timestamp order.');
  if (deployRequested) fail('Cannot deploy because Supabase CLI is unavailable.');
} else {
  ok(`Supabase CLI available: ${hasSupabase.stdout.trim()}`);
}

if (missingEnv.length) {
  console.log(`Deployment config missing: ${missingEnv.join(', ')}`);
  console.log('Set SUPABASE_PROJECT_REF outside the repo, or set project_id in supabase/config.toml. Use CLI login or SUPABASE_ACCESS_TOKEN outside the repo when required by Supabase CLI.');
  if (deployRequested) fail('Cannot deploy because required deployment env is missing.');
}

if (!deployRequested) {
  console.log('Preflight complete. Re-run with --deploy to link, push migrations, and deploy Edge Function.');
  process.exit(0);
}

let [cli, args] = supabaseCli(['link', '--project-ref', projectRef]);
execFileSync(cli, args, { stdio: 'inherit' });
[cli, args] = supabaseCli(['db', 'push']);
execFileSync(cli, args, { stdio: 'inherit' });
[cli, args] = supabaseCli(['functions', 'deploy', 'signed-media-access']);
execFileSync(cli, args, { stdio: 'inherit' });
ok('Supabase migrations and signed-media-access Edge Function deployed.');

if (verifyRequested) {
  execFileSync(process.execPath, ['scripts/verify-live-supabase.mjs'], { stdio: 'inherit' });
}
