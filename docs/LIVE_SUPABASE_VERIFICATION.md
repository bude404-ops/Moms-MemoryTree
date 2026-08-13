# Live Supabase Verification

This harness verifies the deployed Moms MemoryTree Supabase project with real Auth, PostgreSQL RLS, private Storage, and signed media access.

It is intentionally not part of normal `npm run validate` because it creates throwaway users, families, memories, and storage objects in a live project.

## Prerequisites

Deploy first:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy signed-media-access
```

Confirm these private buckets exist and are not public:

- `family-media`
- `family-avatars`
- `family-exports`

## Required environment variables

Use throwaway test credentials only.

```bash
SUPABASE_LIVE_URL=https://your-project.supabase.co
SUPABASE_LIVE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_LIVE_TEST_PASSWORD=a-throwaway-test-password
```

Optional, useful when email confirmation is enabled and you pre-create/confirm test users:

```bash
SUPABASE_LIVE_TEST_EMAIL_A=confirmed-a@example.com
SUPABASE_LIVE_TEST_EMAIL_B=confirmed-b@example.com
SUPABASE_SIGNED_MEDIA_FUNCTION=signed-media-access
```

Never use service-role keys in this harness. It is designed to verify real client-side authorization boundaries.

## Run

```bash
npm run verify:live-supabase
```

If required environment variables are missing, the script exits successfully with a clear skip message.

## What it verifies

The harness creates two authenticated test users and two separate families, then proves:

- User A can create Family A.
- User B can create Family B.
- User A can create private and family memories in Family A.
- Family B cannot read Family A family memories.
- Family B cannot read User A private memories.
- Family B cannot modify Family A memories.
- Family B cannot delete Family A memories.
- Family B cannot upload media into Family A storage paths.
- Family A can upload media into its own memory path.
- Family A can create media metadata.
- Family B cannot read Family A media metadata.
- Family B cannot download Family A private media.
- Family A can receive a temporary signed URL through the `signed-media-access` Edge Function.
- Family B cannot receive a signed URL for Family A media.

## Cleanup

The harness uses normal client credentials and does not use service-role cleanup. Test rows are intentionally identifiable by `MMT Live Test` names and timestamped memory/media titles so an operator can review or remove them through the Supabase dashboard if desired.

A future admin-only cleanup tool can be added separately, but it must never be bundled into the browser app or committed with secret credentials.
