# DEVELOPMENT STATUS

## COMPLETED

- Existing React + TypeScript + Vite + Tailwind application preserved.
- GitHub repository remains the source of truth.
- Centralized Supabase client moved to `src/lib/supabase/client.ts` with compatibility export.
- `.env.example` updated to use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` placeholders only.
- Supabase config created at `supabase/config.toml`.
- Full Phase 1 Supabase migration created for:
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
- RLS enabled on every private family table.
- Security helper functions created for family membership, managers, descendant checks, memory visibility, storage access, and signed media authorization.
- Private Supabase Storage bucket definitions added:
  - `family-media`
  - `family-avatars`
  - `family-exports`
- Storage object policies added for private family-scoped access.
- Signed media Edge Function source added.
- Supabase-facing repository/service layer exists for auth, profile, family, people, relationships, memories, timeline, upload metadata, and signed URL foundations.
- Mobile UI remains functional in demo mode without Supabase env vars.
- Local tests cover privacy helpers, signed URL expiry logic, migration/RLS/static family isolation checks, and local archive persistence.

## IN PROGRESS

- Live Supabase deployment is pending project credentials and CLI/dashboard execution.
- Real cloud upload/playback is pending deployed buckets and Edge Function.
- Family invitation email delivery is architecture-only.

## PLANNED

- Deploy migration to Supabase project.
- Deploy `signed-media-access` Edge Function.
- Generate TypeScript database types from Supabase CLI.
- Run real Supabase user isolation tests with Family A / Family B accounts.
- Wire password reset UI.
- Build real photo/video upload status UI.
- Add specific-person permission management UI.
- Build family archive export worker.
- Integrate independent backup provider and verification.

## BLOCKED

- Supabase CLI is not installed in this execution environment.
- Supabase cloud project URL/publishable key alone are not present here.
- Supabase deployment requires project access credentials or dashboard execution.

## SECURITY

- No secrets committed.
- `.env`, `.env.local`, and `.env.*.local` are ignored.
- Secret scan is part of validation.
- RLS migration forbids broad authenticated read-all patterns.
- Private storage buckets are defined as non-public.
- Family media requires database authorization before signed URL creation.
- Legacy custodians do not automatically unlock private memories.

## STORAGE

- Architecture: private Supabase Storage + metadata in PostgreSQL.
- Storage usage table tracks video/photo/audio/document totals.
- Actual cloud upload and playback are not yet verified in this environment.

## LEGACY

- Primary/backup custodian architecture exists.
- Legacy permissions exist.
- Legacy Mode remains a future controlled verification workflow.
- No automatic death detection.
- No password transfer model.

## BACKUP

ARCHITECTURE ONLY.

Backup records and export records exist, but no independent backup provider is implemented or verified yet. Do not claim backup protection.
