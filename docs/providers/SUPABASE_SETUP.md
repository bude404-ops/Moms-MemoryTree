# Supabase Setup

This repository contains the Moms MemoryTree Supabase foundation. GitHub remains the source of truth for application code, migrations, RLS policies, storage definitions, Edge Functions, and documentation.

## Connection status

Repository integration is configured. Live cloud deployment still requires Supabase project credentials/project access.

This environment does not currently contain a Supabase project ref, access token, or local Supabase CLI binary, so migrations and Edge Functions are committed and ready but not applied to a cloud project from here.

## Required project services

Enable/configure in Supabase:

- PostgreSQL
- Authentication
- Storage
- Row Level Security
- Edge Functions

## Environment variables

Copy `.env.example` to `.env.local` and set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Values come from Supabase Project Settings → API.

Never expose or commit service-role keys, secret keys, database passwords, GitHub tokens, `.env`, or `.env.local`.

## Migrations

Migrations live in:

```text
supabase/migrations/
```

Current migrations create and align:

- Profiles
- Families
- People
- Family members
- Family relationships
- Memories
- Memory media
- Memory people
- Memory tags
- Memory permissions
- Life events
- Story questions
- Legacy messages
- Legacy custodians
- Legacy permissions
- Family invitations
- Storage usage
- Backup records
- Archive exports
- Audit logs
- RLS helpers and policies
- Private storage buckets
- Storage object policies
- Signed media authorization RPC
- Story question seed prompts
- Storage usage/audit triggers

Apply with Supabase CLI when available:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy signed-media-access
```

If CLI is unavailable, apply migration SQL through the Supabase SQL editor in timestamp order, then deploy the Edge Function through the dashboard or CLI from repository source.

## Authentication

Initial auth path:

- Email/password signup
- Email/password sign-in
- Sign-out
- Persistent browser sessions
- Profile row created after signup
- User can create first family archive

Passwords are handled only by Supabase Auth. The application database never stores passwords.

## Storage buckets

The migration defines private buckets:

- `family-media`
- `family-avatars`
- `family-exports`

All must remain private.

Expected path structure:

```text
family/{family_id}/people/{person_id}/
family/{family_id}/memories/{memory_id}/
family/{family_id}/legacy/{message_id}/
```

Do not trust arbitrary user paths. The database and storage policies must confirm family membership and object ownership.

## Signed media access

Source:

```text
supabase/functions/signed-media-access/index.ts
```

Flow:

1. Authenticate user.
2. Request media row by ID.
3. Edge Function runs `authorized_signed_media(media_row_id)`.
4. Database verifies `can_view_memory(memory_id)`.
5. Edge Function returns a short-lived signed URL.

Never return permanent public URLs for private memories.

## Deployment checklist

For full deployment automation, see `docs/SUPABASE_DEPLOYMENT.md`.

- Set environment variables locally/deployment host.
- Apply migrations in timestamp order.
- Confirm private buckets exist and are not public.
- Deploy Edge Function.
- Run app validation.
- Run real user isolation tests in Supabase.
- Confirm Family A cannot access Family B data.
- Confirm private memories are creator-only unless granted.
- Confirm storage upload paths reject wrong-family paths.
