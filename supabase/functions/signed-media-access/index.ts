// Moms MemoryTree signed media access Edge Function.
// Requires deployed Supabase environment variables supplied by Supabase runtime.
// It never returns permanent public URLs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'Supabase runtime not configured' }, 500);

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const { mediaId } = await req.json().catch(() => ({ mediaId: null }));
  if (!mediaId || typeof mediaId !== 'string') return json({ error: 'mediaId is required' }, 400);

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Session expired' }, 401);

  const { data, error } = await client.rpc('authorized_signed_media', { media_row_id: mediaId }).single();
  if (error || !data) return json({ error: 'Permission denied or media not found' }, 403);

  const { data: signed, error: signedError } = await client.storage
    .from(data.storage_bucket)
    .createSignedUrl(data.storage_path, data.expires_in_seconds ?? 300);
  if (signedError || !signed?.signedUrl) return json({ error: 'Unable to create signed media URL' }, 500);

  return json({ signedUrl: signed.signedUrl, expiresInSeconds: data.expires_in_seconds ?? 300 });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });
}
