# Moms MemoryTree

> “Don't just leave your family pictures. Leave them your story.”

Moms MemoryTree is a private family-centered digital legacy app. It helps families preserve stories, voices, photographs, videos, relationships, life lessons, and future legacy messages without turning family history into a public social feed or a generic cloud drive.

## Start here

**Working GitHub dashboard:** [`index.html`](index.html)

**Coded demo mirror:** [`docs/index.html`](docs/index.html)

**Written app index:** [`docs/APP_INDEX.md`](docs/APP_INDEX.md)

**Repository structure:** [`docs/REPOSITORY_STRUCTURE.md`](docs/REPOSITORY_STRUCTURE.md)

The working dashboard, coded demo mirror, and app index show:

- what Moms MemoryTree is
- what the current dashboard shows
- what every app screen does
- what works now
- what is foundation-only
- what still needs live provider setup before production

## Current build

`0.1.0-phase1` — foundation and dashboard phase

The current app opens to a dashboard that separates:

- completed foundation stages
- provider readiness
- security status
- deployment blockers
- storage economics
- next operator actions

## What the app can do now

- Run as a React + TypeScript + Vite app.
- Start safely in demo mode when live provider variables are absent.
- Model a family-owned archive.
- Track people, family members, and relationships separately.
- Create and display memories with privacy labels and family context.
- Stage private media upload flows and metadata.
- Route signed media access through an authorization boundary.
- Model legacy custodians without granting automatic access.
- Estimate storage usage, quotas, provider costs, and subscription revenue.
- Validate migrations, RLS/static family isolation, environment rules, deployment safety, secrets, tests, and production build.

## Main screens

| Screen | Purpose |
|---|---|
| Dashboard | Foundation status, provider matrix, security readiness, deployment blockers, and operator queue. |
| Home | Family archive landing page and story-first entry point. |
| MemoryTree | People and relationship foundation. |
| Record | Preserve stories and attach private media. |
| Memories | Browse family memories with context and privacy labels. |
| Family | Add people, create relationships, and prepare member invitations. |
| Storage | Storage usage, quota warnings, cost estimates, and plan assumptions. |
| Timeline | Life events in order. |
| Legacy | Custodian and future-access foundation. |
| Creator | Admin storage economics dashboard. |

## Current foundation

This repository is the source of truth for:

- React + TypeScript + Vite application code
- provider configuration kept behind service boundaries
- database migrations
- Row Level Security policies
- private storage bucket definitions
- signed media access function source
- provider abstractions
- validation scripts
- documentation
- environment templates

## Implemented foundation details

- Centralized Supabase browser client.
- Safe unconfigured demo mode.
- Email/password auth service foundation.
- Profile creation/upsert after signup.
- Sign up, sign in, sign out, password reset requests, session refresh, and first-family onboarding.
- Family creation and family-management flows.
- Normalized demo/live archive loading.
- Memory creation and listing architecture.
- Private storage path generation and upload metadata model.
- Signed media access helper and Edge Function source.
- Frontend signed media access routed through Edge Function by media row ID.
- Private buckets in migration:
  - `family-media`
  - `family-avatars`
  - `family-exports`
- Full migration-backed schema with RLS.
- Alignment migration for memory category, grandparent/grandchild relationships, storage usage triggers, and audit triggers.
- Legacy custodian and legacy permission foundation.
- Backup and portable archive export foundations.
- Audit log foundation.
- Storage economics, subscription foundations, quota warnings, cost assumptions, and creator analytics.
- Supabase deployment preflight and GitHub Actions workflow for migrations, Edge Function deployment, and optional live verification.

## Not claimed yet

These are not production-live yet:

- live Supabase deployment from this environment
- live cloud upload/playback verification
- independent backup provider
- scheduled backup jobs
- restore verification
- archive export worker
- payment processing
- notifications
- AI processing
- production launch

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set local Supabase values only if you are testing against a live project:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit `.env`, `.env.local`, or any credential file.

## Validation

```bash
npm install
npm run validate
```

The full validation pipeline covers:

- lint
- tests
- database migration validation
- RLS/static family isolation validation
- environment validation
- live-harness safety validation
- deployment automation validation
- secret scanning
- production build

## Supabase workflow

Every schema change must follow:

1. Create or update a migration.
2. Validate locally.
3. Run tests and production build.
4. Commit the migration and code.
5. Push to GitHub.
6. Apply migrations to Supabase with approved credentials.
7. Verify RLS and storage policies against real users.

This repo includes reproducible SQL migrations and deployment automation, but it does not claim cloud deployment has occurred without project credentials.

## Storage boundary

Large media files must never be stored in PostgreSQL. PostgreSQL stores metadata and private object references only. Private memories must use authorized access and short-lived signed URLs. Permanent public media URLs are forbidden for family memories.

## Backup boundary

Backup tables and status fields exist. Actual independent backup is not implemented yet. Do not display or claim “Backed Up” or “Protected” until a real backup provider has been configured, run, and restore-tested.
