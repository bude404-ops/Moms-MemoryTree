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
- Alignment migration added for frontend/schema drift: memory category, grandparent/grandchild relationships, member permissions, storage usage triggers, and audit triggers.
- Security helper functions created for family membership, managers, descendant checks, memory visibility, storage access, and signed media authorization.
- Cloud storage hardening migration added for upload statuses, storage plans, quotas, completed-only signed access, soft-delete media lifecycle, and safe object-path validation.
- Private Supabase Storage bucket definitions added:
  - `family-media`
  - `family-avatars`
  - `family-exports`
- Storage object policies added for private family-scoped access.
- Signed media Edge Function source added.
- Supabase-facing repository/service layer exists for auth, profile, family, people, relationships, memories, timeline, provider-routed private media upload, completed media listing, and signed URL access.
- `MediaStorageService` abstraction and `SupabaseStorageProvider` exist so another storage provider can be added later without rewriting the app.
- Reusable secure `VideoPlayer`, `ImageViewer`, and `AudioPlayer` components exist for temporary signed media access.
- Dedicated auth service tests cover email normalization, signup profile creation, password reset redirects, signout, and Supabase-disabled fallback.
- Centralized auth service supports sign up, sign in, sign out, password reset requests, profile creation after signup, and session-change refresh.
- Mobile UI remains functional in demo mode without Supabase env vars.
- Local tests cover privacy, storage authorization, signed URL expiry logic, migration/RLS/static family isolation checks, and local archive persistence.
- Supabase deployment preflight script and GitHub Actions workflow added for controlled migrations, Edge Function deployment, and optional live verification.
- Storage management system implemented for configurable plans, quotas, warning thresholds, add-ons, and active usage calculations.
- Cost tracking implemented for configurable infrastructure assumptions, estimated storage/bandwidth/backup/AI/payment costs, and budget thresholds.
- Creator/Admin cost dashboard implemented for estimated revenue, gross profit, margin, plan profitability, highest-usage families, and forecasting.
- Subscription architecture foundation implemented with plans, family subscriptions, add-ons, and billing events. Payments are not connected.

## IN PROGRESS

- Live Supabase deployment is pending project credentials and CLI/dashboard execution.
- Real cloud upload/playback requires deployed buckets, migration, and Edge Function in a Supabase project.
- Family invitation email delivery is architecture-only.

## PLANNED

- Deploy migration to Supabase project.
- Deploy `signed-media-access` Edge Function.
- Generate TypeScript database types from Supabase CLI.
- Run real Supabase user isolation tests with Family A / Family B accounts.
- Wire password reset UI.
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

- Cloud Storage: IMPLEMENTED in code and migrations for Supabase Storage.
- Video Upload Status: IMPLEMENTED UI state/progress and provider boundary; true resumable transport depends on deployed provider capability.
- Private Storage: IMPLEMENTED through private buckets, completed-only signed access, and storage policies.
- Storage Quotas: IMPLEMENTED through configurable storage plans and quota checks.
- Actual cloud upload and playback require Supabase deployment before live verification in this environment.

## ARCHIVE EXPORT

FOUNDATION ONLY.

Archive export tracking exists, but no export worker is implemented yet.

## STORAGE ECONOMICS

- STORAGE MANAGEMENT: IMPLEMENTED
- COST TRACKING: IMPLEMENTED
- SUBSCRIPTION ARCHITECTURE: FOUNDATION ONLY
- PAYMENTS: NOT CONNECTED
- BACKUPS: FOUNDATION ONLY
- ARCHIVE EXPORT: FOUNDATION ONLY

`STORAGE_COST_ARCHITECTURE.md` documents plans, quotas, provider abstraction, cost assumptions, billing foundation, forecasts, alerts, retention, and security.

## LEGACY

- Primary/backup custodian architecture exists.
- Legacy permissions exist.
- Legacy Mode remains a future controlled verification workflow.
- No automatic death detection.
- No password transfer model.

## BACKUP

ARCHITECTURE ONLY.

Backup records and export records exist, but no independent backup provider is implemented or verified yet. Do not claim backup protection.
