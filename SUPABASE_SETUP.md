# Supabase Setup

This repository contains the Moms MemoryTree Supabase foundation. GitHub remains the source of truth for application code, migrations, RLS policies, storage definitions, Edge Functions, and documentation.

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

Never expose or commit:

- Service-role keys
- Secret keys
- Database passwords
- GitHub tokens
- `.env` or `.env.local`

## Migrations

Migration file:

```text
supabase/migrations/202608120001_phase1_foundation.sql
```

It creates:

- Core family archive tables
- Private media metadata tables
- Legacy architecture tables
- Backup/export/audit foundations
- RLS helpers
- RLS policies
- Private storage buckets
- Storage object policies
- Signed media authorization RPC
- Story question seed prompts

Apply with Supabase CLI when available:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy signed-media-access
```

If CLI is unavailable, apply the migration SQL through the Supabase SQL editor, then deploy the Edge Function through the Supabase dashboard/CLI from the repository source.

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
3. Run `authorized_signed_media(media_row_id)`.
4. RLS/helper verifies family membership and memory permission.
5. Return short-lived signed URL.

Never return permanent public URLs for private memories.

## Deployment checklist

- Set environment variables locally/deployment host.
- Apply migration.
- Confirm private buckets exist and are not public.
- Deploy Edge Function.
- Run app validation.
- Run real user isolation tests in Supabase.
- Confirm Family A cannot access Family B data.
