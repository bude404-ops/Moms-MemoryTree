/* global fetch */
import { createClient } from '@supabase/supabase-js';

const expectedUrl = 'https://foiyynmpifrpbcymjrgw.supabase.co';
const expectedRef = 'foiyynmpifrpbcymjrgw';
const liveUrl = process.env.SUPABASE_LIVE_URL || process.env.VITE_SUPABASE_URL || expectedUrl;
const publishableKey = process.env.SUPABASE_LIVE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (liveUrl !== expectedUrl) {
  throw new Error(`Unexpected Supabase URL. Expected ${expectedUrl}, received ${liveUrl}.`);
}
if (!liveUrl.includes(expectedRef)) {
  throw new Error(`Supabase URL does not contain expected project ref ${expectedRef}.`);
}

async function checkPublicReachability() {
  const response = await fetch(`${liveUrl}/auth/v1/settings`, { headers: { 'User-Agent': 'moms-memorytree-connectivity-check' } });
  if (![200, 401, 403].includes(response.status)) throw new Error(`Unexpected Supabase auth reachability status: ${response.status}`);
  console.log(`✓ Supabase project host reachable: ${liveUrl} (${response.status})`);
}

async function checkClientApis() {
  if (!publishableKey) {
    console.log('Live client API checks skipped. Missing SUPABASE_LIVE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.');
    console.log('Use the project publishable/anon key only. Do not use service-role keys here.');
    return;
  }
  const client = createClient(liveUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const settings = await client.auth.getSession();
  if (settings.error) throw settings.error;
  console.log('✓ Supabase Auth client initialized with publishable key.');

  const buckets = await client.storage.listBuckets();
  if (buckets.error) {
    console.log(`Storage bucket listing denied or unavailable with publishable key: ${buckets.error.message}`);
    console.log('This is acceptable before authenticated live storage tests; private bucket policy must still be verified after deployment.');
  } else {
    const bucketNames = buckets.data.map(bucket => bucket.name).sort();
    console.log(`✓ Supabase Storage API reachable. Visible buckets: ${bucketNames.join(', ') || '(none visible to anon)'}`);
  }
}

await checkPublicReachability();
await checkClientApis();
