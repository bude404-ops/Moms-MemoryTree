# DEVELOPMENT STATUS

## COMPLETED

- Project initialized as React + TypeScript + Vite + Tailwind application.
- Supabase browser client integration added with safe unconfigured-development mode.
- Mobile-first application shell created.
- Home dashboard created with family archive framing and emotional product direction.
- Basic MemoryTree visualization created using internal person IDs.
- Record My Story foundation created with guided categories and structured memory creation.
- Memories browsing page created with per-memory privacy labels.
- Family members page created with explicit roles and permissions.
- Timeline page created.
- Legacy page created showing custodian architecture without granting premature access.
- Local persistence added for development demo memories.
- Database migration created for Phase 1 relational foundation.
- RLS policies created for family membership and memory access boundaries.
- Storage authorization helper created for private paths and expiring signed URL policy.
- Tests created for:
  - Creator access to private memory.
  - Family member blocked from private memory.
  - Other family blocked from family memory.
  - Legacy memory blocked before legacy activation.
  - Media authorization tied to memory permission.
  - Signed URL expiry.
  - Legacy permission boundaries.
- README, roadmap, storage architecture documentation, and env example created.

## IN PROGRESS

- Supabase project connection remains environment-dependent.
- Real photo/video upload UI now prepares private storage paths and validates file safety before later Supabase upload.
- Supabase-facing repository/service layer added for auth, profiles, family creation, people, relationships, memories, timeline, upload metadata, and signed URL creation.

## PLANNED

- Supabase Auth screens backed by live project.
- Edge function for signed media URL creation after RLS checks.
- Real photo upload to private bucket.
- Video upload with thumbnail generation.
- Family invitation acceptance flow.
- Specific-person permission management UI.
- Descendant graph query support.
- Family archive export worker.
- Independent backup provider integration.
- AI transcription and organization as metadata only.

## BLOCKED

- GitHub push requires a configured remote and credentials.
- Supabase deployment requires project URL, anon key, and migration execution access.
- Private storage signed URLs require a live Supabase Storage bucket and server/edge function deployment.

## SECURITY

- No secrets committed.
- `.env.local` is ignored.
- `.env.example` contains placeholders only.
- RLS migration exists and includes memory authorization helpers.
- Private media architecture avoids permanent public URLs.
- Legacy custodians do not automatically access private memories.

## STORAGE

- Current implementation: local demo metadata plus Supabase-ready schema.
- Media storage model: private object storage references in `memory_media`.
- Storage usage tracked at family level by media category.
- No production redundancy claimed in Phase 1.

## LEGACY

- Custodian and legacy permission data models exist.
- Legacy Mode workflow is documented as future controlled verification.
- No automatic death detection.
- No password transfer model.
- No premature exposure of private memories.

## TECHNICAL DEBT

- Replace local demo persistence with Supabase-backed repositories after project credentials are configured.
- Add Playwright mobile viewport tests after dev server stabilization.
- Expand RLS tests against a real local Supabase instance when available.
- Add generated TypeScript database types from Supabase CLI once configured.
