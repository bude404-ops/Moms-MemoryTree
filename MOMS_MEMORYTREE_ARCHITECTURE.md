# Moms MemoryTree Architecture

## Stage

Stage 1 — Architecture Decision

## Date

2026-08-13

## Mission

Build Moms MemoryTree as a native Reaper Mini Apps application wherever Reaper provides the needed capability, keep GitHub as the source of truth, and use external services only for verified platform gaps.

This architecture is based on `REAPER_PLATFORM_CAPABILITIES.md` and the current Moms MemoryTree source tree.

---

## Architecture Decision Summary

Moms MemoryTree will be a Reaper-first application with a provider-independent service layer.

Current decision:

1. Use Reaper Mini Apps as the primary application runtime and user-facing shell.
2. Use GitHub as the permanent source of truth for source code, assets, schema, migrations, tests, docs, and deployment configuration.
3. Keep app capabilities behind provider-independent services.
4. Do not remove Supabase yet because Reaper-native database, auth, private storage, signed media access, workers, billing, notifications, and backups are not currently verified available.
5. Do not add Render, Railway, or another backend platform at this stage.
6. External services may remain only as temporary/fallback providers where Reaper does not yet provide the needed production capability.

The system must be able to swap providers later without rewriting the UI.

---

## Current Platform Reality

From Stage 0:

| Area | Reaper Capability Now | Architecture Impact |
|---|---:|---|
| HTML Mini App runtime | AVAILABLE | Use Reaper Mini App as app shell/runtime. |
| Mini App hosting/publishing | AVAILABLE | Reaper is the preferred delivery surface. |
| Parent-injected `window.PW` SDK | AVAILABLE | Use for platform-provided UI helpers/storage and future native methods. |
| Mini-App-scoped storage | AVAILABLE | Use for drafts/preferences only, not family data. |
| Server Apps | NOT AVAILABLE | No Reaper-native custom backend for this session. |
| App-owned relational database | NOT AVAILABLE / UNKNOWN | Keep database behind `DatabaseService`; external provider remains necessary until Reaper supplies one. |
| App-owned auth | UNKNOWN | Keep auth behind `AuthService`. |
| Private media object storage | UNKNOWN | Keep media behind `MediaStorageService`. |
| Workers/queues/video processing | UNKNOWN | Keep behind `QueueService` and future processing providers. |
| Billing | UNKNOWN | Keep behind `BillingService`. |
| Notifications | UNKNOWN | Keep behind `NotificationService`. |
| Backups | UNKNOWN | Keep behind `BackupService`. |

---

## Target Runtime Architecture

```text
                    GITHUB
                  SOURCE OF TRUTH
                       │
                       ▼
              Reaper Mini App Artifact
                       │
                       ▼
               REAPER MINI APPS
              Primary App Runtime
                       │
        ┌──────────────┼────────────────────┐
        ▼              ▼                    ▼
  HTML/React UI    PW SDK Adapter     Provider Services
        │              │                    │
        │              │          ┌─────────┼──────────┐
        │              │          ▼         ▼          ▼
        │          Reaper UI   AuthService Database  MediaStorage
        │          Helpers        │          │          │
        │                         ▼          ▼          ▼
        │                   Reaper Provider if available
        │                         │
        │                         ▼
        │                  External Provider only for gaps
        │
        ▼
  Moms MemoryTree UX
```

GitHub remains the canonical source. Reaper Mini Apps is the primary runtime. Provider services isolate all non-UI capabilities.

---

## Source of Truth Boundaries

## GitHub Contains

- application source code
- UI assets
- public static assets
- configuration templates
- database schemas
- database migrations
- tests
- documentation
- build scripts
- CI/deployment configuration
- version history

## GitHub Never Contains

- family videos
- private photos
- private audio
- private documents
- user passwords
- production secrets
- signing keys
- service credentials
- private family data

---

## Service Layer Architecture

The application must talk through these services rather than directly importing platform-specific clients throughout UI code.

```text
UI / Pages / Components
        │
        ▼
Application Services
        │
        ├── AuthService
        ├── DatabaseService
        ├── MediaStorageService
        ├── AuthorizationService
        ├── BackupService
        ├── NotificationService
        ├── BillingService
        ├── AIService
        └── QueueService
        │
        ▼
Provider Interfaces
        │
        ├── Reaper*Provider when capability exists
        └── External*Provider only for verified gaps
```

---

## Required Services and Provider Strategy

### AuthService

Purpose:

- sign up
- login
- logout
- password reset
- email verification
- session persistence
- account management
- account deletion

Provider priority:

1. `ReaperAuthProvider` if Reaper exposes production family-app auth.
2. Existing external auth provider only while Reaper lacks this capability.
3. No custom password system.

Current state:

- Existing code has `MemoryTreeAuthService`, but it imports Supabase directly.
- Stage 3 should introduce a provider interface and move Supabase into `SupabaseAuthProvider`.
- Future Reaper support should be implemented as `ReaperAuthProvider` without UI rewrites.

### DatabaseService

Purpose:

- users/profiles
- families
- family members
- relationships
- invitations
- memories
- media metadata
- tags/people/timeline
- legacy data
- storage plans/usage
- subscriptions/add-ons
- archive exports
- backup records
- audit logs
- notifications

Provider priority:

1. Reaper relational database if a production app DB becomes available.
2. Existing external relational provider only while Reaper lacks an adequate database.
3. External provider must support migrations and server-side authorization.

Current state:

- Existing `MemoryTreeRepository` is repository-like but still imports Supabase directly.
- Stage 3 should split repository methods into `DatabaseService` plus provider implementations.
- Database schema and migrations remain version-controlled in GitHub.

### MediaStorageService

Purpose:

- private uploads
- videos/photos/audio/documents
- resumable uploads where possible
- signed access
- quota checks
- metadata lookup
- deletion/move/copy
- original preservation

Provider priority:

1. Reaper private object storage if it supports large private media and signed access.
2. External object storage only for missing storage capability.
3. Supabase Storage may remain temporarily because it already has a provider boundary.
4. If Reaper lacks large media storage, evaluate S3-compatible storage behind the same interface.

Current state:

- `MediaStorageService` and `MediaStorageProvider` already exist.
- `SupabaseStorageProvider` is provider-specific and should stay behind the interface until replaced.
- Add `ReaperStorageProvider` only after the Reaper API exists and is tested.

### AuthorizationService

Purpose:

- family isolation
- role checks
- permission checks
- memory privacy checks
- legacy release access
- admin-only controls
- storage quota enforcement authority

Provider priority:

1. Reaper server-side authorization if available.
2. External server-side authorization/RLS only while Reaper lacks app-owned server authorization.
3. Frontend-only authorization is never sufficient.

Current state:

- Existing Supabase RLS policies provide the current server-side isolation model.
- Do not remove RLS until an equivalent Reaper or external service is implemented and tested.

### BackupService

Purpose:

- database backups
- media backups
- independent backup where required
- backup verification
- restore testing
- archive records

Provider priority:

1. Reaper native backup if verified adequate.
2. External independent backup only if Reaper lacks adequate backup guarantees.
3. Never claim permanent preservation without verified backup and restore path.

Current state:

- Backup records/foundation exist, but actual independent backup is not implemented.

### NotificationService

Purpose:

- family invitations
- memory shared
- storage warnings
- archive ready
- legacy message available
- security alerts
- password reset notifications

Provider priority:

1. Reaper email/push/in-app notification services if available.
2. External email provider only for missing notification delivery.
3. In-app notification persistence requires database/backend support.

Current state:

- Reaper notification capability for user apps is unknown.

### BillingService

Purpose:

- FREE / FAMILY / FAMILY PLUS / LEGACY plans
- storage add-ons
- subscriptions
- payment status
- webhooks
- creator/admin storage economics

Provider priority:

1. Reaper billing if production-ready subscriptions exist.
2. Stripe or another external billing provider only if Reaper lacks billing.
3. Never store credit cards.
4. Never fake payment success.

Current state:

- Storage plan/subscription domain types exist.
- Payment provider is not implemented.

### AIService

Purpose:

- optional transcription
- optional summaries
- optional tagging
- family-history search
- timeline extraction
- memory recommendations

Provider priority:

1. Reaper-native AI if available and privacy-compatible.
2. External AI only behind explicit opt-in and authorization.
3. Private family media must not be sent to third-party AI automatically.

Current state:

- AI capability is future/unknown.

### QueueService

Purpose:

- video processing jobs
- thumbnail generation
- archive export jobs
- backup verification jobs
- scheduled maintenance

Provider priority:

1. Reaper workers/queues/scheduled jobs if available.
2. Smallest external worker necessary only for missing processing.
3. Keep job definitions provider-independent.

Current state:

- No Reaper worker/queue capability verified for Mini Apps.

---

## Current Codebase Alignment

The existing app already contains some early service seams:

| Existing Code | Current Role | Required Stage 3 Change |
|---|---|---|
| `src/lib/auth.ts` | Supabase-bound auth facade | Split into `AuthService` interface + `SupabaseAuthProvider` + future `ReaperAuthProvider`. |
| `src/lib/repository.ts` | Supabase-bound repository facade | Split into `DatabaseService`/domain repositories + providers. |
| `src/lib/mediaStorage.ts` | Provider interface plus Supabase provider | Keep interface; add provider registry and future `ReaperStorageProvider`. |
| `src/lib/mediaUpload.ts` | Upload preparation/path safety | Keep provider-independent. |
| `src/lib/security.ts` | Security helpers/tests | Keep provider-independent; expand for Reaper/external providers. |
| `src/types/domain.ts` | Domain model | Keep as canonical TypeScript domain layer. |
| `supabase/migrations` | Current schema source | Keep historical/current external-provider migrations until migrated. |

---

## Database Architecture

Required domain tables/entities:

- users
- profiles
- families
- family_members
- family_relationships
- family_invitations
- memories
- memory_media
- memory_people
- memory_tags
- life_events
- legacy_custodians
- legacy_messages
- storage_usage
- storage_limits
- subscription_plans
- family_subscriptions
- storage_addons
- archive_exports
- backup_records
- audit_logs
- notifications

Rules:

1. Schema changes must be migrations.
2. Migrations must be committed to GitHub.
3. No undocumented production database changes.
4. Reaper database becomes first choice only after it is verified production-ready.
5. Supabase migrations remain until a tested replacement exists.

---

## Auth Architecture

Moms MemoryTree requires production authentication. The app will not create a custom password system.

Required flows:

- sign up
- login
- logout
- password reset
- email verification
- session persistence
- account management
- account deletion

Current Reaper Mini Apps do not expose enough documented user-app auth to replace the existing external auth layer. Therefore:

- keep current auth functionality during migration planning
- isolate provider-specific auth behind `AuthService`
- implement Reaper auth only when the platform exposes the needed API
- test all auth flows before removing the external provider

---

## Authorization and Family Isolation

Family isolation is non-negotiable.

Required enforcement:

- Family A cannot read Family B.
- Unauthorized users cannot read private memory data.
- Unauthorized users cannot access private media.
- Unauthorized users cannot delete another user's memory.
- Unauthorized users cannot modify family permissions.
- Unauthorized users cannot access archives.
- Admin functions are creator/admin restricted.

Rules:

1. Server-side enforcement is required.
2. Frontend checks are only UX hints.
3. If using Reaper, Reaper must provide equivalent server-side authorization.
4. If using external infrastructure, authorization must be enforced there.
5. Supabase RLS must not be removed until replacement isolation tests pass.

---

## Media Architecture

Moms MemoryTree must preserve family media privately.

Supported media:

- videos
- photos
- audio
- documents

Required states:

- draft
- pending upload
- uploading
- uploaded
- verified
- failed
- deleted

Rules:

1. Actual media files are never stored in GitHub.
2. Large media is never stored inside relational rows.
3. Media metadata lives in the database.
4. Media objects live in private object storage.
5. Private family media must not use permanent public URLs.
6. Original recordings must be preserved and not overwritten.
7. Signed access must expire.
8. Uploads must validate MIME type, extension, and size.

Provider strategy:

- Reaper Storage first if it provides private large object storage, signed URLs, quotas, and resumable upload support.
- Existing external storage remains only until Reaper has an adequate replacement.
- External S3-compatible storage should only be considered if Reaper storage remains unavailable/inadequate.

---

## Backup Architecture

Moms MemoryTree cannot claim permanent preservation until backup is real and verified.

Required capabilities:

- database backup
- media backup
- independent backup if needed
- backup verification
- restore testing
- archive records

Decision:

- Reaper backup first if available and adequate.
- Independent external backup only for a verified gap.
- Label estimates/status honestly.
- Do not display `Backed Up` or `Permanently Preserved` until backup verification is complete.

---

## Billing Architecture

Initial plans:

- FREE — 1 GB
- FAMILY — 100 GB
- FAMILY PLUS — 500 GB
- LEGACY — 1 TB+

Storage add-ons:

- 100 GB
- 500 GB
- 1 TB

Rules:

1. Plan values belong in centralized configuration/database, not scattered constants.
2. Reaper billing is preferred if available.
3. External billing is allowed only if Reaper lacks subscription support.
4. Webhook processing requires backend support.
5. No credit card data is stored by Moms MemoryTree.

---

## Environment Strategy

Environments:

- DEVELOPMENT
- STAGING
- PRODUCTION

Rules:

1. Secrets are never committed.
2. `.env.example` contains placeholders only.
3. Reaper environment/secret management is preferred if available.
4. External provider secret managers are used only for their required services.
5. Mini App HTML must not embed private secrets.

---

## Deployment Strategy

Stage-by-stage deployment flow:

1. Build.
2. Test.
3. Fix.
4. Update documentation.
5. Commit.
6. Push to GitHub.
7. Publish/update Reaper Mini App when UI/runtime artifact changes.
8. Deploy external provider changes only when still required and credentials are configured.

GitHub Actions should validate:

- install
- lint
- TypeScript
- tests
- security tests
- build
- migration validation
- secret scan

Reaper Mini Apps remain the user-facing runtime. GitHub remains source of truth.

---

## Supabase Position After Stage 1

Supabase is not the target architecture. It is a current external provider and migration bridge.

Stage 1 decision:

- Do not automatically use Supabase for new architecture.
- Do not remove Supabase yet.
- Map Supabase capabilities in Stage 2.
- Build provider abstractions in Stage 3.
- Only remove Supabase after equivalent replacement functionality is implemented and tested.

Current Supabase dependency areas:

- authentication
- database
- RLS/authorization
- storage
- signed media access Edge Function
- migrations
- env templates/deployment docs

---

## External Service Minimization Rule

For every service:

1. Ask whether Reaper Mini Apps already provide it.
2. If yes, prefer Reaper.
3. If no, use the smallest external service that fills only that gap.
4. Keep every provider replaceable.
5. Document why any external service remains.

No duplicate infrastructure.

---

## Stage Roadmap From This Architecture

### Stage 2 — Supabase to Reaper Migration Map

Create `SUPABASE_TO_REAPER_MIGRATION.md` mapping every Supabase use to a Reaper capability, external fallback, or unknown.

### Stage 3 — Provider Abstraction

Create the service/provider interfaces and move direct provider imports out of UI-facing services.

Required abstractions:

- `AuthService`
- `DatabaseService`
- `MediaStorageService`
- `AuthorizationService`
- `BackupService`
- `NotificationService`
- `BillingService`
- `AIService`
- `QueueService`

### Stage 4 — GitHub Source Structure

Normalize source tree around:

- `/src`
- `/assets`
- `/public`
- `/database`
- `/migrations`
- `/tests`
- `/docs`
- `/config`
- `/scripts`

### Later Stages

Implement family system, memory system, storage quotas, archive export, legacy messages, security, mobile experience, offline safety, billing, notifications, backup, and production readiness through the service/provider model.

---

## Architecture Status

STATUS: APPROVED FOR STAGED IMPLEMENTATION.

This architecture uses Reaper Mini Apps first, keeps GitHub as source of truth, and avoids adding or removing external infrastructure before replacement capabilities are proven.
