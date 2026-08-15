import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const scriptPath = 'scripts/verify-live-supabase.mjs';
const env = { ...process.env };
delete env.SUPABASE_LIVE_URL;
delete env.SUPABASE_LIVE_PUBLISHABLE_KEY;
delete env.SUPABASE_LIVE_TEST_PASSWORD;

const output = execFileSync(process.execPath, [scriptPath], { env, encoding: 'utf8' });
if (!output.includes('Live Supabase verification skipped')) throw new Error('Live harness must skip safely when credentials are absent.');

const source = fs.readFileSync(scriptPath, 'utf8');
const forbidden = [/service[_-]?role/i, /secret[_-]?key/i, /SUPABASE_SERVICE/i, /DATABASE_URL/i];
for (const pattern of forbidden) {
  if (pattern.test(source)) throw new Error(`Live harness must not reference privileged credentials: ${pattern}`);
}
if (!source.includes('SUPABASE_LIVE_PUBLISHABLE_KEY')) throw new Error('Live harness should use publishable client credentials.');

const requiredChecks = [
  'signUpAndProfile',
  'createFamilyFixture',
  'Family B cannot read Family A family memory',
  'Family B cannot modify Family A memory',
  'Family B cannot upload media into Family A storage path',
  'Family A receives signed media URL through Edge Function',
  'Family B cannot receive signed media URL for Family A media'
];
for (const check of requiredChecks) {
  if (!source.includes(check)) throw new Error(`Live harness must preserve verification check: ${check}`);
}

console.log('Live harness safety validation passed.');
