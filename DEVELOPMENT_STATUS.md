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
- Stage 0 Reaper platform capability audit completed in `REAPER_PLATFORM_CAPABILITIES.md`.
- Stage 1 Reaper-first architecture completed in `docs/architecture/MOMS_MEMORYTREE_ARCHITECTURE.md`.
- Stage 2 Supabase-to-Reaper migration map completed in `SUPABASE_TO_REAPER_MIGRATION.md`.
- Stage 3 provider-independent service contracts added for auth, database, authorization, backup, notification, billing, AI, and queue services.
- Existing Supabase auth/database/storage behavior now sits behind provider-oriented contracts and a service registry while Reaper-native backend capabilities remain unavailable/unknown.
- Stage 4 GitHub source-of-truth structure documented in `docs/GITHUB_SOURCE_OF_TRUTH.md`.
- Reserved source-control directories added for `/assets`, `/public`, `/database`, `/database/migrations`, `/tests`, and `/config` without moving live runtime code.
- Stage 5 environment management documented in `docs/ENVIRONMENT_MANAGEMENT.md` with development/staging/production separation.
- `.env.example` is placeholder-only, and `npm run validate:env` now enforces environment template safety.
- Stage 6 security baseline documented in `docs/STAGE_06_SECURITY_BASELINE.md`.
- Stage 7 data model baseline documented in `docs/STAGE_07_DATA_MODEL_BASELINE.md`.
- Stage 8 media pipeline baseline documented in `docs/STAGE_08_MEDIA_PIPELINE_BASELINE.md`.
- Stage 9 legacy and archive baseline documented in `docs/STAGE_09_LEGACY_AND_ARCHIVE_BASELINE.md`.
- Stage 10 backup and recovery baseline documented in `docs/STAGE_10_BACKUP_AND_RECOVERY_BASELINE.md`.
- Stage 11 deployment readiness documented in `docs/STAGE_11_DEPLOYMENT_READINESS.md`.
- Stage 12 pre-dashboard handoff documented in `docs/STAGE_12_PRE_DASHBOARD_HANDOFF.md`.
- Master development plan captured in `MOMS_MEMORYTREE_MASTER_DEVELOPMENT_PLAN.md`.
- Stage 1 platform audit report added in `docs/STAGE_01_PLATFORM_AUDIT_REPORT.md`.
- GitHub Actions CI added for install, lint, tests, migration validation, authorization validation, environment validation, deployment safety, secret scan, and build.
- Stage 2 architecture alignment completed in `docs/STAGE_02_ARCHITECTURE_ALIGNMENT_REPORT.md`.
- Family, Memory, and Legacy are now explicit service boundaries alongside Auth, Database, MediaStorage, Notification, Billing, Backup, AI, and Queue.
- GitHub Actions CI pushed after workflow-scoped authorization was provided.
- Stage 2 architecture alignment documented in `docs/STAGE_02_ARCHITECTURE_ALIGNMENT.md` and `docs/STAGE_02_ARCHITECTURE_ALIGNMENT_REPORT.md`.
- Portable service-contract strategy locked for Auth, Database, Family, Memory, Media Storage, Legacy, Notification, Billing, Backup, and AI services.
- Repository cleanup completed before Stage 3: root documentation moved into organized docs folders, committed image asset moved into `assets/`, stale empty root `tests/` placeholder removed, repository structure documented, and `.gitignore` strengthened for generated files, credentials, and private media.
- Stage 3 GitHub application shell completed in `docs/STAGE_03_GITHUB_APPLICATION_SHELL_REPORT.md`.
- Root `index.html` now follows the app navigation shell: Home, Memories, Family, Record, Timeline, Legacy.
- `npm run validate:github-shell` added to enforce GitHub Pages shell requirements.
- Stage 4 interactive prototype completed in `docs/STAGE_04_INTERACTIVE_PROTOTYPE_REPORT.md`.
- Root `index.html` now supports browser-local mock account setup, family tree persistence, invitations, memory creation, upload simulation, and generated timeline rendering.
- Stage 5 mock service layer hardening completed in `docs/STAGE_05_MOCK_SERVICE_LAYER_HARDENING_REPORT.md`.
- Root `index.html` now routes preview account, family, invitation, memory, reset, load, save, migration, and validation behavior through a browser-local mock service adapter with schema version 5.
- `npm run validate:github-shell` now enforces Stage 5 mock service contracts.

## IN PROGRESS

- Stage 6 production provider readiness gates are next.
- Live production provider deployment remains pending provider selection/credentials.
- Real cloud upload/playback requires an approved production storage/backend provider.
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

- Supabase deployment requires project access credentials or dashboard execution.
- GitHub pushes from this environment require temporary authorization each time credentials are not already present.
- Reaper Server Apps are not available for this Reaper session, so backend/database/storage/auth replacements cannot be invented inside Mini App frontend code.
- Supabase runtime removal remains a staged migration; do not delete working provider code until replacement service gates pass.

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

`docs/architecture/STORAGE_COST_ARCHITECTURE.md` documents plans, quotas, provider abstraction, cost assumptions, billing foundation, forecasts, alerts, retention, and security.

## LEGACY

- Primary/backup custodian architecture exists.
- Legacy permissions exist.
- Legacy Mode remains a future controlled verification workflow.
- No automatic death detection.
- No password transfer model.

## BACKUP

ARCHITECTURE ONLY.

Backup records and export records exist, but no independent backup provider is implemented or verified yet. Do not claim backup protection.
