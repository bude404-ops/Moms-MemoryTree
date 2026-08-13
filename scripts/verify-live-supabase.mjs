import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_LIVE_URL', 'SUPABASE_LIVE_PUBLISHABLE_KEY', 'SUPABASE_LIVE_TEST_PASSWORD'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.log(`Live Supabase verification skipped. Missing: ${missing.join(', ')}`);
  console.log('Use only throwaway live-test client credentials. Never use privileged admin keys here.');
  process.exit(0);
}

const url = process.env.SUPABASE_LIVE_URL;
const key = process.env.SUPABASE_LIVE_PUBLISHABLE_KEY;
const password = process.env.SUPABASE_LIVE_TEST_PASSWORD;
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emailA = process.env.SUPABASE_LIVE_TEST_EMAIL_A || `mmt-a-${stamp}@example.test`;
const emailB = process.env.SUPABASE_LIVE_TEST_EMAIL_B || `mmt-b-${stamp}@example.test`;
const edgeName = process.env.SUPABASE_SIGNED_MEDIA_FUNCTION || 'signed-media-access';

function client() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function must(label, fn) {
  try {
    const value = await fn();
    console.log(`✓ ${label}`);
    return value;
  } catch (error) {
    console.error(`✗ ${label}`);
    console.error(error?.message || error);
    process.exitCode = 1;
    throw error;
  }
}

async function expectDenied(label, fn) {
  try {
    const value = await fn();
    const rows = Array.isArray(value?.data) ? value.data.length : value?.data ? 1 : 0;
    if (!value?.error && rows > 0) throw new Error(`Expected denial/empty result, received ${rows} row(s).`);
    console.log(`✓ ${label}`);
  } catch (error) {
    if (/Expected denial/.test(error?.message || '')) throw error;
    console.log(`✓ ${label}`);
  }
}

async function signUpAndProfile(email, displayName) {
  const sb = client();
  const signup = await sb.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (signup.error) throw signup.error;
  let user = signup.data.user;
  if (!user) {
    const signin = await sb.auth.signInWithPassword({ email, password });
    if (signin.error) throw signin.error;
    user = signin.data.user;
  }
  if (!user) throw new Error(`No user returned for ${email}. If email confirmations are required, pre-create/confirm the test users and set SUPABASE_LIVE_TEST_EMAIL_A/B.`);
  const profile = await sb.from('profiles').upsert({ id: user.id, display_name: displayName }).select('*').single();
  if (profile.error) throw profile.error;
  return { sb, user, profile: profile.data };
}

async function createFamilyFixture(session, label) {
  const family = await session.sb.from('families').insert({ name: `MMT Live Test ${label} ${stamp}`, created_by: session.user.id }).select('*').single();
  if (family.error) throw family.error;
  const person = await session.sb.from('people').insert({ family_id: family.data.id, display_name: `${label} Owner`, created_by: session.user.id }).select('*').single();
  if (person.error) throw person.error;
  const member = await session.sb.from('family_members').insert({ family_id: family.data.id, user_id: session.user.id, person_id: person.data.id, role: 'owner', status: 'active', joined_at: new Date().toISOString(), permissions: ['memory:create', 'family:manage', 'media:upload', 'memory:view_family'] }).select('*').single();
  if (member.error) throw member.error;
  return { family: family.data, person: person.data, member: member.data };
}

async function main() {
  console.log('Running live Supabase verification with throwaway client credentials.');
  const a = await must('sign up/sign in test user A and create profile', () => signUpAndProfile(emailA, 'MMT Test A'));
  const b = await must('sign up/sign in test user B and create profile', () => signUpAndProfile(emailB, 'MMT Test B'));
  const fixtureA = await must('create Family A owner fixture', () => createFamilyFixture(a, 'A'));
  await must('create Family B owner fixture', () => createFamilyFixture(b, 'B'));

  const privateMemory = await must('create User A private memory', async () => {
    const result = await a.sb.from('memories').insert({ family_id: fixtureA.family.id, creator_id: a.user.id, person_id: fixtureA.person.id, title: `Private ${stamp}`, description: 'RLS test private memory', memory_type: 'story', privacy_level: 'private', category: 'Security' }).select('*').single();
    if (result.error) throw result.error;
    return result.data;
  });

  const familyMemory = await must('create User A family memory', async () => {
    const result = await a.sb.from('memories').insert({ family_id: fixtureA.family.id, creator_id: a.user.id, person_id: fixtureA.person.id, title: `Family ${stamp}`, description: 'RLS test family memory', memory_type: 'photo', privacy_level: 'family', category: 'Security' }).select('*').single();
    if (result.error) throw result.error;
    return result.data;
  });

  await expectDenied('Family B cannot read Family A family memory', () => b.sb.from('memories').select('*').eq('id', familyMemory.id));
  await expectDenied('Family B cannot read User A private memory', () => b.sb.from('memories').select('*').eq('id', privateMemory.id));
  await expectDenied('Family B cannot modify Family A memory', () => b.sb.from('memories').update({ title: 'blocked' }).eq('id', familyMemory.id).select('*'));
  await expectDenied('Family B cannot delete Family A memory', () => b.sb.from('memories').delete().eq('id', familyMemory.id).select('*'));

  const wrongPath = `family/${fixtureA.family.id}/memories/${familyMemory.id}/${stamp}-blocked.txt`;
  await expectDenied('Family B cannot upload media into Family A storage path', () => b.sb.storage.from('family-media').upload(wrongPath, Buffer.from('blocked'), { contentType: 'text/plain', upsert: false }));

  const allowedPath = `family/${fixtureA.family.id}/memories/${familyMemory.id}/${stamp}-allowed.txt`;
  await must('Family A can upload private media into its memory path', async () => {
    const upload = await a.sb.storage.from('family-media').upload(allowedPath, Buffer.from('allowed'), { contentType: 'text/plain', upsert: false });
    if (upload.error) throw upload.error;
  });

  const media = await must('Family A can create media metadata row', async () => {
    const result = await a.sb.from('memory_media').insert({ family_id: fixtureA.family.id, memory_id: familyMemory.id, uploaded_by: a.user.id, storage_path: allowedPath, file_name: `${stamp}-allowed.txt`, mime_type: 'text/plain', file_size: 7, media_type: 'document' }).select('*').single();
    if (result.error) throw result.error;
    return result.data;
  });

  await expectDenied('Family B cannot read Family A media metadata', () => b.sb.from('memory_media').select('*').eq('id', media.id));
  await expectDenied('Family B cannot download Family A private media path', () => b.sb.storage.from('family-media').download(allowedPath));

  await must('Family A receives signed media URL through Edge Function', async () => {
    const result = await a.sb.functions.invoke(edgeName, { body: { mediaId: media.id } });
    if (result.error) throw result.error;
    if (!result.data?.signedUrl) throw new Error('No signed URL returned.');
  });

  await expectDenied('Family B cannot receive signed media URL for Family A media', () => b.sb.functions.invoke(edgeName, { body: { mediaId: media.id } }));
  console.log('Live Supabase verification passed.');
}

main().catch(error => {
  console.error('Live Supabase verification failed.');
  console.error(error?.message || error);
  process.exit(1);
});
