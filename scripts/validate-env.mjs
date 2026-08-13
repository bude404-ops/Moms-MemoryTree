import fs from 'node:fs';

const envExample = fs.readFileSync('.env.example', 'utf8');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const envDocs = fs.readFileSync('docs/ENVIRONMENT_MANAGEMENT.md', 'utf8');

const requiredEnvExampleKeys = [
  'VITE_APP_ENV=',
  'VITE_SUPABASE_URL=',
  'VITE_SUPABASE_PUBLISHABLE_KEY=',
  'SUPABASE_LIVE_URL=',
  'SUPABASE_LIVE_PUBLISHABLE_KEY=',
  'SUPABASE_LIVE_TEST_PASSWORD=',
  'SUPABASE_SIGNED_MEDIA_FUNCTION='
];

for (const key of requiredEnvExampleKeys) {
  if (!envExample.includes(key)) throw new Error(`.env.example missing required key: ${key}`);
}

const forbiddenEnvExamplePatterns = [
  /foiyynmpifrpbcymjrgw\.supabase\.co/,
  /github_pat_[A-Za-z0-9_]+/,
  /ghp_[A-Za-z0-9_]+/,
  /sbp_[A-Za-z0-9_]+/,
  /^\s*VITE_[A-Z0-9_]*SERVICE[_-]?ROLE\s*=/im,
  /^\s*SUPABASE_SERVICE_ROLE/i,
  /DATABASE_URL\s*=/,
  /SUPABASE_ACCESS_TOKEN\s*=/
];

for (const pattern of forbiddenEnvExamplePatterns) {
  if (pattern.test(envExample)) throw new Error(`.env.example contains forbidden literal or privileged key: ${pattern}`);
}

const requiredIgnoredPatterns = ['.env', '.env.local', '.env.*.local'];
for (const pattern of requiredIgnoredPatterns) {
  if (!gitignore.split(/\r?\n/).includes(pattern)) throw new Error(`.gitignore must ignore ${pattern}`);
}

for (const env of ['development', 'staging', 'production']) {
  if (!envDocs.includes(`\`${env}\``)) throw new Error(`Environment docs missing ${env}.`);
}

if (!envDocs.includes('VITE_APP_ENV')) throw new Error('Environment docs must define VITE_APP_ENV.');
if (!envDocs.includes('validate:env')) throw new Error('Environment docs must mention validate:env.');
if (!envDocs.includes('Never commit')) throw new Error('Environment docs must clearly forbid committed secrets.');

console.log('Environment validation passed.');
