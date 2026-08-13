# Moms MemoryTree

Private, family-centered digital legacy platform foundation.

> “Don't just leave your family pictures. Leave them your story.”

Moms MemoryTree is not a social-media platform and not a generic cloud drive. It is a private family archive designed around people, stories, relationships, voices, photographs, videos, wisdom, and long-term family continuity.

## Current build

`0.1.0-phase1` — Supabase backend foundation

This repository is the source of truth for:

- React + TypeScript + Vite application code
- Supabase configuration
- Database migrations
- Row Level Security policies
- Private storage bucket definitions
- Edge Function source
- Documentation
- Environment templates

## Implemented foundation

- Centralized Supabase browser client at `src/lib/supabase/client.ts`
- Safe unconfigured demo mode when env vars are absent
- Email/password auth wiring through centralized Supabase Auth service
- Profile creation/upsert after signup
- Sign up, sign in, sign out, password reset requests, session persistence refresh, and first-family onboarding
- Family creation and family-management flows
- Normalized demo/live archive data loading
- Memory creation and listing architecture
- Private storage path generation and upload metadata model
- Signed media access helper and Edge Function source
- Frontend signed media access routed through Edge Function by media row ID
- Private buckets in migration:
  - `family-media`
  - `family-avatars`
  - `family-exports`
- Full migration-backed schema with RLS
- Alignment migration for memory category, grandparent/grandchild relationships, storage usage triggers, and audit triggers
- Legacy custodian and legacy permission foundation
- Backup and portable archive export foundations
- Audit log foundation
- Local tests for privacy, storage authorization, signed URL expiry, and migration/RLS protections
- Supabase deployment preflight and GitHub Actions workflow for migrations, Edge Function deployment, and optional live verification

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these in `.env.local` for Supabase-backed development:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit `.env`, `.env.local`, or any credential file.

## Validation

```bash
npm install
npm run lint
npm run test
npm run validate:db
npm run validate:secrets
npm run build
npm run validate
```

## Supabase workflow

Every schema change must follow:

1. Create/update a migration in `supabase/migrations`.
2. Validate locally with `npm run validate:db`.
3. Run tests and build.
4. Commit the migration and code.
5. Push to GitHub.
6. Apply migrations to Supabase with the Supabase CLI or dashboard SQL editor.
7. Verify RLS and storage policies against real users.

The Supabase CLI is not available in this execution environment, so this repo includes `supabase/config.toml` and reproducible SQL migrations but does not claim cloud deployment has occurred without project credentials.

## Storage

Large media files must never be stored in PostgreSQL. PostgreSQL stores metadata and private object references only. Private memories must use authorized access and short-lived signed URLs. Permanent public media URLs are forbidden for family memories.

See `docs/STORAGE_ARCHITECTURE.md` and `SECURITY.md`.

## Backup boundary

Backup tables and status fields exist. Actual independent backup is not implemented yet. Do not display or claim “Backed Up” or “Protected” until a real backup provider has been configured, run, and verified.
