# Stage 2 — Architecture Alignment

## Status

COMPLETE.

## Purpose

Lock Moms MemoryTree into a portable, Reaper-first architecture before deep feature work continues.

The application must remain movable across platforms because the UI, domain logic, database schemas, migrations, tests, documentation, and service contracts stay in GitHub.

## Architecture Rule

The UI must not directly depend on provider-specific clients for core product behavior.

Instead, the UI routes through app service contracts. Providers can then be swapped without redesigning the product experience.

```text
UI / index.html / React pages
        │
        ▼
Moms MemoryTree Service Contracts
        │
        ├── Mock provider for GitHub Pages
        ├── Reaper provider when native capability exists
        └── External provider only for verified platform gaps
```

## Service Contracts

The portable service layer covers:

| Service | Responsibility | GitHub Pages Provider | Production Priority |
|---|---|---|---|
| `AuthService` | sign up, login, logout, password reset, sessions, account state | `MockAuthService` | `ReaperAuthService`, then external fallback |
| `DatabaseService` | relational family data, memories, timeline, legacy records, audit metadata | `MockDatabaseService` | `ReaperDatabaseService`, then external fallback |
| `FamilyService` | families, members, relationships, invitations, roles | `MockFamilyService` | `ReaperFamilyService`, then external fallback |
| `MemoryService` | memories, media metadata, detail, privacy, timeline links | `MockMemoryService` | `ReaperMemoryService`, then external fallback |
| `MediaStorageService` | uploads, private media storage, signed access, quotas | `MockMediaStorageService` | `ReaperStorageService`, then S3-compatible fallback |
| `LegacyService` | preserved stories, legacy mode, custodians, memorial media, audit events | `MockLegacyService` | `ReaperLegacyService`, then external fallback |
| `NotificationService` | invitations, shared memory notices, storage warnings, archive ready, security alerts | `MockNotificationService` | `ReaperNotificationService`, then external fallback |
| `BillingService` | plans, subscriptions, storage upgrades, checkout routing | `MockBillingService` | `ReaperBillingService`, then Stripe fallback |
| `BackupService` | archive backup requests, backup verification, restore readiness | `MockBackupService` | `ReaperBackupService`, then independent backup fallback |
| `AIService` | optional transcription, summaries, tags, family-history search | `MockAIService` | `ReaperAIService`, then privacy-approved external fallback |

## Current Provider Reality

Reaper Mini Apps currently provide the frontend runtime and local Mini App storage behavior needed for prototype state.

The following production capabilities remain unverified or unavailable from the current session:

- custom app backend/API
- app-owned relational database
- server-side family authorization
- large private object storage
- signed media URL backend
- background jobs/video processing
- production email/push notifications
- billing/subscriptions
- backups/restore testing
- AI processing for private media

Because of this, production services remain behind contracts. No production provider may be assumed without evidence.

## GitHub Pages Mock Layer

`index.html` must behave like the real app using browser-side mock services and persistence.

The mock layer must simulate:

- account creation
- login/logout
- family creation
- family invitations
- memory creation
- video/photo/audio upload flow
- upload progress and processing states
- family tree editing
- timeline creation
- privacy settings
- preserved stories
- legacy mode
- memorial videos
- notifications
- storage usage
- settings
- help and accessibility modes

The mock layer must mirror the production service contracts so production integration later means replacing providers, not rebuilding screens.

## Supabase Boundary

Target state: **no Supabase runtime dependency**.

Current rule:

1. Do not delete working provider code blindly.
2. Migrate behavior behind service contracts first.
3. Add mock/Reaper/external replacement providers.
4. Run tests against replacement behavior.
5. Remove unused Supabase packages, imports, clients, env variables, calls, scripts, and docs only after gates pass.
6. Confirm with repository search and full validation.

## Backend Authorization Principle

Frontend controls are not security.

Family isolation, preserved story immutability, private media access, archive access, legacy access, audit log protection, and billing actions must be enforced by the active production provider at the backend/database/storage authorization layer.

## Legacy Principle

Preserved original life stories are immutable records. Descendant memories, tributes, funeral videos, and memorial media are always separate contributions.

Display must never make later family contributions appear to be the original creator's words.

## Stage 2 Gate

Stage 2 is complete when:

- service contracts are documented
- provider priority is documented
- GitHub Pages mock direction is documented
- Supabase removal gates remain explicit
- no new infrastructure is invented
- validation passes
