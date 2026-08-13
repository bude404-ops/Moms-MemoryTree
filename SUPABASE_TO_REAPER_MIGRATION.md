# Supabase to Reaper Migration Map — Moms MemoryTree

## Stage

Stage 2 — Supabase Dependency Mapping

## Date

2026-08-13

## Purpose

This document maps every current Supabase responsibility in Moms MemoryTree to one of:

- a verified Reaper Mini Apps native capability
- a future Reaper provider if/when the platform exposes the capability
- an existing provider abstraction
- a temporary external-provider fallback
- a capability gap marked `UNKNOWN` or `NOT AVAILABLE`

This is a migration map only. Supabase must not be removed until equivalent functionality is implemented and tested.

---

## Rule From Stage 0 and Stage 1

Reaper Mini Apps are the primary app runtime. GitHub is the source of truth. External services exist only for genuine capability gaps.

Current Reaper capability reality:

- Reaper HTML Mini App runtime: `AVAILABLE`
- Reaper Mini App publishing/hosting: `AVAILABLE`
- `window.PW` SDK: `AVAILABLE`
- Mini-App-scoped key/value storage: `AVAILABLE`
- Reaper Server Apps for this session: `NOT AVAILABLE`
- Reaper app-owned relational database: `NOT AVAILABLE / UNKNOWN`
- Reaper private object storage for large family media: `UNKNOWN`
- Reaper app-owned auth: `UNKNOWN`
- Reaper workers/queues/billing/notifications/backups: `UNKNOWN`

Therefore Supabase remains a temporary external provider until each replacement is proven.

---

## Repository Scan Summary

Stage 2 scan found Supabase references in these categories:

| Pattern | Count | File Count | Meaning |
|---|---:|---:|---|
| `supabase` | 188 | 34 | Broad Supabase code/docs/config references. |
| `@supabase` | 30 | 10 | Runtime/package imports. |
| `SUPABASE_` | 89 | 17 | Environment variables and deployment docs/scripts. |
| `createClient` | 13 | 5 | Supabase client construction in app/scripts/functions. |
| `RLS` | 34 | 17 | Row Level Security docs/validators/migrations. |
| `Row Level Security` | 3 | 3 | RLS documentation. |
| `signed-media-access` | 22 | 14 | Edge Function signed media access. |

Important note:

- Exact text `supabase.auth`, `supabase.from`, and `supabase.storage` did not appear because the code generally stores the client in variables such as `client` and then calls `client.auth`, `client.from`, `client.storage`, and `client.functions`.

---

## Supabase Dependency Inventory

### Runtime Packages

| File | Dependency | Current Purpose | Migration Target |
|---|---|---|---|
| `package.json` | `@supabase/supabase-js` | Browser/client auth, database, storage, function calls. | Remove only after provider abstractions no longer import Supabase. |
| `package-lock.json` | Supabase dependency tree | Lockfile for current external provider. | Regenerate after package removal in Stage 25. |

### Supabase Client Bootstrap

| File | Current Supabase Responsibility | Reaper Replacement | Status |
|---|---|---|---|
| `src/lib/supabase/client.ts` | Reads `VITE_SUPABASE_URL` and publishable key; creates Supabase client; persists auth sessions. | `ReaperPlatformClient` only if Reaper exposes app auth/database/storage APIs. | Reaper replacement `UNKNOWN`. Keep until provider abstraction exists. |
| `src/lib/supabase.ts` | Re-export of Supabase client helpers. | Provider registry / app services export. | Replace in Stage 3. |

### Authentication

| File | Current Supabase Responsibility | Reaper Equivalent | Migration Action |
|---|---|---|---|
| `src/lib/auth.ts` | Imports Supabase types and calls `client.auth.getUser`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `signOut`. | Reaper Authentication if production user-app auth exists. | Create `AuthService` interface and `SupabaseAuthProvider`; later add `ReaperAuthProvider` if available. |
| `src/lib/onboarding.ts` | Uses Supabase `User` type and `isSupabaseConfigured` to determine demo/signed-out/ready modes. | Provider-neutral `AppUser` and `AuthService.isConfigured`. | Replace Supabase types with domain auth types in Stage 3. |
| `src/test/authService.test.ts` | Tests Supabase auth service behavior with mocked client. | Provider-neutral auth tests plus Supabase provider tests while retained. | Convert after `AuthService` abstraction. |
| `src/test/auth.test.ts` | Tests auth flow behavior. | Keep as behavior tests independent of provider. | Ensure no provider-specific assumptions after Stage 3. |

Reaper mapping:

```text
Supabase Auth
  -> AuthService
      -> ReaperAuthProvider if Reaper user-app auth becomes available
      -> SupabaseAuthProvider temporary fallback until then
```

Do not remove Supabase Auth until these are implemented and tested:

- sign up
- login
- logout
- password reset
- email verification path
- session persistence
- account deletion/account management plan

### Database and Queries

| File | Current Supabase Responsibility | Reaper Equivalent | Migration Action |
|---|---|---|---|
| `src/lib/repository.ts` | Calls `client.from(...)` for families, people, members, relationships, memories, media, timeline, custodians, storage usage, plans, subscriptions, add-ons, cost assumptions. | Reaper Database if a production relational database and query API exist. | Split into `DatabaseService` interface and provider implementations. |
| `src/lib/archiveData.ts` | Uses repository-backed archive data. | Provider-neutral data service. | Keep domain behavior; remove Supabase assumptions through repository split. |
| `src/lib/archiveStore.ts` | Archive store/foundation. | Provider-neutral store. | Keep provider-independent. |
| `src/pages/Pages.tsx` | UI consuming repository/onboarding data. | UI should use app services only. | Avoid direct provider imports. |
| `src/App.tsx` | Displays configured/live state and architecture status. | Provider-neutral readiness state. | Remove Supabase-specific copy only after migration. |

Current tables/entities covered by Supabase migrations:

- `profiles`
- `families`
- `people`
- `family_members`
- `family_relationships`
- `memories`
- `memory_media`
- `memory_people`
- `memory_tags`
- `memory_permissions`
- `life_events`
- `story_questions`
- `legacy_messages`
- `legacy_custodians`
- `legacy_permissions`
- `family_invitations`
- `storage_usage`
- `backup_records`
- `archive_exports`
- `audit_logs`
- `storage_plans`
- `family_subscriptions`
- `storage_addons`
- `cost_assumptions`

Reaper mapping:

```text
Supabase PostgreSQL
  -> DatabaseService
      -> ReaperDatabaseProvider if Reaper relational DB exists
      -> SupabaseDatabaseProvider temporary fallback until then
```

Current Reaper status:

- Reaper app-owned relational DB is not verified available.
- Supabase database remains required for live family data until Reaper provides an equivalent or another external DB is selected for a verified gap.

### Authorization and RLS

| Current Supabase Feature | Purpose | Reaper Equivalent | Migration Action |
|---|---|---|---|
| Supabase RLS policies | Enforce family isolation and row access. | Reaper server-side authorization / RLS equivalent if available. | Keep until equivalent tests pass. |
| SQL helper functions such as `is_family_member`, `is_family_manager`, `can_view_memory`, `can_access_storage_object`, `authorized_signed_media` | Server-side permission checks. | `AuthorizationService` backed by Reaper server capability or external DB policies. | Map to provider-level authorization contract. |
| `scripts/validate-rls.mjs` | Static validation of RLS/security policy presence. | Provider-neutral authorization validation later. | Keep Supabase RLS validation while Supabase remains. |
| `src/test/familyIsolation.test.ts` and `src/test/security.test.ts` | Behavior tests for isolation and security expectations. | Provider-neutral security contract tests. | Preserve and expand; they gate Supabase removal. |

Reaper mapping:

```text
Supabase RLS
  -> AuthorizationService
      -> ReaperAuthorizationProvider if server-side authorization exists
      -> SupabaseRlsAuthorizationProvider temporary fallback
```

Mandatory removal gate:

Supabase RLS cannot be removed until Family A / Family B tests pass against the replacement provider with server-side enforcement.

### Storage

| File / Migration | Current Supabase Responsibility | Reaper Equivalent | Migration Action |
|---|---|---|---|
| `src/lib/mediaStorage.ts` | Defines `MediaStorageProvider`; includes `SupabaseStorageProvider` using `client.storage`. | `ReaperStorageProvider` if Reaper supports private large media storage/signed URLs. | Keep interface. Add provider registry. Do not remove Supabase provider until replacement tested. |
| `src/lib/mediaUpload.ts` | Provider-neutral path prep, MIME/extension validation, upload status semantics. | Reuse unchanged. | Keep. |
| `src/lib/repository.ts` `uploadMemoryMedia` | Uploads object to Supabase Storage and inserts metadata row. | `MediaStorageService` + `DatabaseService` transaction/compensation flow. | Split storage upload from DB metadata creation through services. |
| `supabase/migrations/202608130002_cloud_media_storage_hardening.sql` | Private buckets, MIME limits, file size limits, quota triggers, path validation, storage policies. | Reaper private object storage policy system if available. | Keep until equivalent storage authorization exists. |
| `docs/STORAGE_ARCHITECTURE.md` / `STORAGE_ARCHITECTURE.md` | Supabase storage architecture docs. | Update after replacement provider exists. | Mark as current external provider docs. |

Current Supabase buckets:

- `family-media` — private family media, max 10 GB configured in migration.
- `family-avatars` — private avatars, max 10 MB.
- `family-exports` — private exports, max 10 GB.

Reaper mapping:

```text
Supabase Storage
  -> MediaStorageService
      -> ReaperStorageProvider if private large media storage exists
      -> SupabaseStorageProvider temporary fallback
      -> S3CompatibleStorageProvider only if Reaper storage is inadequate/unavailable
```

Required replacement tests before Supabase Storage removal:

- upload video/photo/audio/document
- reject disallowed MIME type
- reject path traversal
- preserve original filename/object
- enforce quota before completed upload
- create short-lived signed access
- deny unauthorized family access
- soft-delete and prevent access
- avoid public permanent URLs

### Supabase Edge Function

| File | Current Supabase Responsibility | Reaper Equivalent | Migration Action |
|---|---|---|---|
| `supabase/functions/signed-media-access/index.ts` | Authenticated Deno Edge Function. Validates user session, calls `authorized_signed_media`, creates signed storage URL. | Reaper backend/API endpoint if Server/App backend becomes available; otherwise external backend endpoint. | Replace with `MediaAccessService` provider endpoint only after tested. |
| `src/lib/repository.ts` `createTemporaryMediaAccess` | Calls `client.functions.invoke('signed-media-access')`. | `MediaAccessService.createTemporaryAccess(mediaId)`. | Move function call behind service/provider. |
| `src/components/SecureMedia.tsx` | Uses repository to fetch signed URL for video/image/audio playback. | Component should depend on `MediaAccessService` behavior through repository/app service. | Keep UI behavior; avoid provider specifics. |
| `src/test/services.test.ts` | Tests signed-media-access routing expectations. | Provider-neutral signed media tests. | Preserve as removal gate. |

Reaper mapping:

```text
Supabase Edge Function signed-media-access
  -> MediaAccessService / MediaStorageService.createSignedAccess
      -> ReaperBackendProvider if Reaper backend endpoints become available
      -> External function/backend fallback if not
```

Current Reaper status:

- App-owned backend endpoint capability is `NOT AVAILABLE` in this session.
- A secure replacement cannot be implemented solely in frontend Mini App code.

### Environment Variables and Configuration

| Current Variable | Purpose | Reaper Replacement | Migration Action |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Browser Supabase project URL. | Reaper-native provider config if needed, or no variable if parent SDK handles capability. | Keep as placeholder until provider removed. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY` | Browser-safe Supabase publishable key. | Reaper parent SDK / Reaper env if available. | Keep placeholder only; never commit real key. |
| `SUPABASE_PROJECT_REF` | Deployment target. | Reaper deployment configuration if Reaper deploy automation exists. | Keep for Supabase deployment only while retained. |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI deployment auth. | Reaper deploy auth if applicable. | Never commit. Only external secret. |
| `SUPABASE_LIVE_URL` / `SUPABASE_LIVE_PUBLISHABLE_KEY` | Live verification harness. | Provider-neutral live verification variables. | Rename after provider abstraction. |
| Supabase runtime `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Edge Function runtime. | Reaper backend env/secrets if backend exists. | Keep only in Supabase function until replaced. |

Files containing env/config references:

- `.env.example`
- `src/lib/supabase/client.ts`
- `src/lib/readiness.ts`
- `scripts/deploy-supabase.mjs`
- `scripts/verify-live-supabase.mjs`
- `scripts/check-supabase-connectivity.mjs`
- `scripts/validate-live-harness.mjs`
- `scripts/validate-deployment.mjs`
- `docs/SUPABASE_DEPLOYMENT.md`
- `docs/LIVE_SUPABASE_VERIFICATION.md`
- `SUPABASE_SETUP.md`
- `README.md`
- `SECURITY.md`

### Deployment and Validation Scripts

| File | Current Purpose | Reaper Migration Path |
|---|---|---|
| `scripts/deploy-supabase.mjs` | Supabase preflight and optional CLI deployment. | Replace with provider-specific deploy scripts only when provider changes. Keep while Supabase remains. |
| `scripts/verify-live-supabase.mjs` | Live Supabase RLS/storage verification harness. | Rename/split into provider-neutral live verification later. |
| `scripts/check-supabase-connectivity.mjs` | Public Supabase host and optional client connectivity check. | Replace with provider health check after migration. |
| `scripts/validate-deployment.mjs` | Ensures Supabase deployment automation/docs are present and safe. | Expand to validate Reaper-first/provider docs. |
| `scripts/validate-live-harness.mjs` | Validates live harness safety. | Keep and generalize for provider tests. |
| `scripts/validate-migrations.mjs` | Validates SQL migrations. | Keep for any SQL provider; update path/names after migration. |
| `scripts/validate-rls.mjs` | Validates Supabase RLS policies. | Replace/extend with provider-neutral authorization validation. |
| `scripts/check-secrets.mjs` | Secret scanning. | Keep and expand for every provider. |

### Documentation Files

Supabase-current documentation exists in:

- `README.md`
- `SUPABASE_SETUP.md`
- `docs/SUPABASE_DEPLOYMENT.md`
- `docs/LIVE_SUPABASE_VERIFICATION.md`
- `docs/STORAGE_ARCHITECTURE.md`
- `STORAGE_ARCHITECTURE.md`
- `STORAGE_COST_ARCHITECTURE.md`
- `SECURITY.md`
- `DEVELOPMENT_STATUS.md`
- `MOMS_MEMORYTREE_ARCHITECTURE.md`

Migration action:

- Do not delete historical/current docs prematurely.
- Mark Supabase docs as current external-provider documentation while retained.
- After replacement, move Supabase docs to historical migration documentation or remove obsolete runtime docs.

---

## Function-by-Function Mapping

| Supabase Functionality | Current Implementation | Target Service | Reaper Native Replacement | Temporary Provider |
|---|---|---|---|---|
| Create client | `createClient` in `src/lib/supabase/client.ts` | Provider registry | Unknown | Supabase client |
| Auth get user | `client.auth.getUser()` | `AuthService.getAuthState` | Unknown | Supabase Auth |
| Auth state changes | `client.auth.onAuthStateChange` | `AuthService.onAuthStateChange` | Unknown | Supabase Auth |
| Email sign in | `client.auth.signInWithPassword` | `AuthService.signInWithEmail` | Unknown | Supabase Auth |
| Email sign up | `client.auth.signUp` | `AuthService.signUpWithEmail` | Unknown | Supabase Auth |
| Password reset | `client.auth.resetPasswordForEmail` | `AuthService.requestPasswordReset` | Unknown | Supabase Auth |
| Logout | `client.auth.signOut` | `AuthService.signOut` | Unknown | Supabase Auth |
| Profile upsert | `client.from('profiles').upsert` | `DatabaseService.upsertProfile` | Unknown | Supabase DB |
| Family list/create | `families` table queries | `DatabaseService.families` | Unknown | Supabase DB |
| People/member/relationship queries | `people`, `family_members`, `family_relationships` | `DatabaseService.familyGraph` | Unknown | Supabase DB |
| Memory list/create | `memories` table | `DatabaseService.memories` | Unknown | Supabase DB |
| Media metadata | `memory_media` table | `DatabaseService.mediaMetadata` | Unknown | Supabase DB |
| Media object upload | `client.storage.from(...).upload` | `MediaStorageService.upload` | Unknown | Supabase Storage |
| Media object download | `client.storage.from(...).download` | `MediaStorageService.download` | Unknown | Supabase Storage |
| Signed URL creation | `client.storage.from(...).createSignedUrl` through Edge Function | `MediaAccessService.createTemporaryAccess` | Needs backend; unavailable now | Supabase Edge Function + Storage |
| Edge function invoke | `client.functions.invoke('signed-media-access')` | `MediaAccessService` | Reaper backend endpoint if available | Supabase Edge Function |
| Storage quota trigger | SQL functions/triggers | `AuthorizationService` + `DatabaseService` + provider policies | Unknown | Supabase PostgreSQL |
| RLS policies | SQL RLS | `AuthorizationService` | Unknown | Supabase RLS |
| Storage object policies | `storage.objects` policies | `MediaStorageService` authorization provider | Unknown | Supabase Storage policies |
| Migrations | `supabase/migrations/*.sql` | `/database` + `/migrations` provider-aware migrations | Unknown | Supabase SQL migrations |

---

## Removal Gates

Supabase can only be removed after all gates pass.

### Gate A — Auth Replacement

- sign up works
- login works
- logout works
- password reset works
- email verification story is implemented or explicitly not required
- session persistence works
- account/profile creation works
- tests pass against replacement provider

### Gate B — Database Replacement

- all required tables/entities exist or map cleanly
- migrations are version-controlled
- create/read/update/delete flows work for families, people, relationships, memories, media metadata, legacy, storage, audit, notifications
- transactions/consistency rules are documented and tested

### Gate C — Authorization Replacement

- Family A cannot access Family B
- unauthorized user cannot access private memory
- unauthorized user cannot access private media
- unauthorized user cannot delete another user's memory
- unauthorized user cannot modify permissions
- admin functions are restricted
- tests prove server-side enforcement

### Gate D — Storage Replacement

- private buckets or equivalent exist
- upload works for videos/photos/audio/documents
- large file limits are adequate
- signed URL/access flow works and expires
- public URLs remain forbidden for private family media
- MIME/extension/size validation works
- quota enforcement works
- soft delete works

### Gate E — Edge Function Replacement

- signed media endpoint/provider exists
- authorization is server-side
- signed access expires
- invalid/unauthorized media IDs are denied
- secure media UI works

### Gate F — Deployment/Docs Replacement

- `.env.example` no longer exposes Supabase runtime variables unless only historical
- package dependency removed
- scripts no longer require Supabase for runtime validation
- docs mark Supabase as removed/historical
- full validation passes
- production build passes
- repository search confirms no Supabase runtime dependency

---

## Stage 2 Decision

Do not delete Supabase yet.

Do not remove `@supabase/supabase-js` yet.

Do not remove migrations, RLS, buckets, Edge Function, scripts, or env templates yet.

Stage 3 should introduce provider-independent services and move Supabase behind provider implementations:

- `AuthService` -> `SupabaseAuthProvider` now, `ReaperAuthProvider` later if available.
- `DatabaseService` -> `SupabaseDatabaseProvider` now, `ReaperDatabaseProvider` later if available.
- `MediaStorageService` already exists; formalize registry and keep `SupabaseStorageProvider` behind it.
- `AuthorizationService` -> Supabase RLS contract now, Reaper/external provider later.
- `BackupService`, `NotificationService`, `BillingService`, `AIService`, `QueueService` as interfaces with unavailable/no-op providers until real capabilities exist.

---

## Next Stage

Stage 3 — Provider Abstraction.

Implement provider-independent services without removing functionality:

1. Create service/provider interfaces.
2. Move Supabase-specific imports into provider files.
3. Keep existing app behavior and demo mode.
4. Keep tests passing.
5. Do not remove Supabase package until Stage 25 gates pass.
