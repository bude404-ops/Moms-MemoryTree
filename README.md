# Moms MemoryTree

Private, family-centered digital legacy platform foundation.

> “Don't just leave your family pictures. Leave them your story.”

Moms MemoryTree is not a social-media platform and not a generic cloud drive. It is a private family archive designed around people, stories, relationships, voices, photographs, videos, wisdom, and long-term family continuity.

## Phase 1 status

This repository contains the Phase 1 foundation:

- React + TypeScript + Vite
- Tailwind CSS
- Supabase client integration
- Family ownership architecture
- User profile model
- Family membership model
- Family relationship graph model
- Universal memory model
- Memory permissions architecture
- Timeline model
- Private media metadata model
- Signed media access policy helper
- Supabase-facing repository/service layer
- Upload preparation and private path validation
- Storage usage tracking foundation
- Legacy custodian data model
- Legacy permission data model
- Backup record data model
- Archive export data model
- Audit log model
- Mobile-first dashboard and navigation
- Basic MemoryTree visualization
- Guided storytelling question foundation
- Tests for privacy, media authorization, signed URL expiry, and legacy permission boundaries

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these in `.env.local` for Supabase-backed development:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not commit `.env.local`.

## Validation

```bash
npm run lint
npm run test
npm run validate:db
npm run validate:secrets
npm run build
npm run validate
```

## Database

Apply the migration in `supabase/migrations/202608120001_phase1_foundation.sql` to a Supabase project.

The migration creates the relational foundation and enables Row Level Security. The media bucket should be private. Do not make family media public by default.

## Storage

See `docs/STORAGE_ARCHITECTURE.md`.

Phase 1 stores media references and authorization rules. Large media files belong in private object storage. Production signed URL generation should run through an authenticated server/edge function that checks memory permissions before returning a short-lived signed URL.

## Security principles

- No permanent public URLs for private media.
- RLS is required for family data.
- Memory privacy is separate from family membership.
- Legacy custody does not reveal private memories automatically.
- Backup redundancy is not claimed until independent backup infrastructure exists.
- Original memories must remain separate from future AI-generated metadata.

## GitHub workflow

Before pushing:

1. Run validation.
2. Review changed files.
3. Scan for secrets.
4. Commit with a meaningful message.
5. Push and verify.
