# Reaper Platform Capabilities Audit — Moms MemoryTree

## Stage

Stage 0 — Platform Capability Audit

## Audit Date

2026-08-13

## Scope

This document records what is currently known about the Reaper Mini Apps platform for building Moms MemoryTree as a Reaper-native application.

The audit intentionally separates:

- documented HTML Mini App capabilities
- documented Server App capabilities
- capabilities exposed by current Reaper tooling
- capabilities that are unknown or not available to this Reaper session

No capability is treated as available unless it is backed by an observed tool, local platform documentation, or a successful platform capability check.

## Evidence Sources

- Reaper Mini App documentation: `/docs/mini-apps.md`
- PW iframe SDK documentation: `/docs/pw-iframe-client.md`
- Reaper Server App build guidance loaded from the local skills registry
- Reaper platform permission check: `can_create_server_app`
- Current tool surface available in this Reaper session

## Capability Status Legend

- `AVAILABLE` — documented or tool-verified as usable now.
- `PARTIALLY AVAILABLE` — some part exists, but it does not cover Moms MemoryTree production needs by itself.
- `NOT AVAILABLE` — checked and explicitly unavailable in this session.
- `UNKNOWN` — not documented or not verifiable from available tools/docs.

---

## Executive Summary

Current Reaper Mini Apps support a hosted iframe HTML application runtime with a `window.PW` SDK injected by the parent Print World app. The platform provides Mini App publication, frontend hosting for self-contained HTML apps, parent-mediated wallet/token APIs, realtime token/chain subscriptions, transfer helpers, toast/clipboard helpers, and Mini-App-scoped key/value storage.

Current Reaper Server App capability is `NOT AVAILABLE` for this Reaper session. The platform capability check returned `allowed: false`. That means Moms MemoryTree cannot currently rely on Reaper-native server-side execution, app-owned relational database, or app-owned persistent backend APIs through Server Apps from this session.

Because Moms MemoryTree requires production authentication, family isolation, relational data, private large media, server-side authorization, background processing, and backups, most core production capabilities are either `UNKNOWN` or `NOT AVAILABLE` on Reaper Mini Apps alone at this time.

Stage 1 must therefore design around Reaper Mini Apps as the frontend/runtime layer first, keep GitHub as source of truth, and use external providers only for verified gaps.

---

## Application Runtime

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| HTML Mini App frontend runtime | AVAILABLE | Mini Apps are complete HTML documents displayed in an iframe. | Suitable for mobile preview, dashboards, static client UI, and parent SDK calls. |
| Frontend hosting for Mini Apps | AVAILABLE | `publish_ai_mini_app` publishes HTML Mini Apps to the platform. | Available for single-file HTML apps. |
| Parent app API gateway | AVAILABLE | Mini App docs state the parent authenticates, queries backends, and streams data for `PW.*` calls. | Available for documented PW SDK methods, mainly Print World wallet/token operations. |
| Server-side code for this project | NOT AVAILABLE | `can_create_server_app` returned `allowed: false`. | Cannot build a Reaper Server App backend from this session. |
| App-owned backend API endpoints | NOT AVAILABLE | Server Apps are the documented route for backend endpoints; not allowed. | Moms MemoryTree cannot yet use Reaper-native custom backend APIs. |
| Environment management for Mini App runtime | UNKNOWN | No Mini App env/secret manager documented for app-owned variables. | Do not assume secrets/env support in HTML Mini Apps. |
| Server App environment variables | NOT AVAILABLE | Server Apps unavailable in this session. | Server-side secret environment cannot be used here. |
| Rollout of self-contained HTML updates | AVAILABLE | Re-publishing the same Mini App id updates the app. | Useful for preview/runtime shell updates. |

## Database

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Reaper-native relational database for this app | NOT AVAILABLE | Server Apps unavailable; no separate Mini App database capability documented. | Required for production Moms MemoryTree; external DB likely needed unless platform adds this. |
| PostgreSQL compatibility | UNKNOWN | No Reaper Mini Apps PostgreSQL capability documented. | Do not assume Postgres. |
| Database migrations | NOT AVAILABLE | Server App guidance uses local libSQL migrations, but Server Apps are unavailable. | GitHub can still store migrations/schemas. |
| Queries/transactions for app-owned data | NOT AVAILABLE | No app-owned DB API available through Mini Apps docs. | PW SDK is token/wallet oriented, not custom family data. |
| Backups for app-owned DB | UNKNOWN | No Reaper Mini Apps database backup capability documented. | Must not claim database backups. |
| Database scaling | UNKNOWN | No documented app-owned database service available. | Needs external or future Reaper capability. |
| Mini-App-scoped key/value storage | AVAILABLE | `PW.getStorage` / `PW.setStorage` are documented. | Useful for preferences/drafts only; not family database replacement. |

## Authentication

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Parent Print World user/session context | PARTIALLY AVAILABLE | Mini App docs say parent handles auth and Mini Apps should not assume auth. | Identity is platform-mediated but no family-app auth API is documented. |
| Account creation | UNKNOWN | No Mini App SDK method documented for creating Moms MemoryTree accounts. | Needs platform support or external auth. |
| Login/logout | PARTIALLY AVAILABLE | Server App docs mention standalone logout helpers, but Server Apps unavailable. Mini App parent auth exists. | Cannot implement full Moms account auth from Mini App alone. |
| Password reset | UNKNOWN | No documented Mini App method. | Required for production if using email/password. |
| Email verification | UNKNOWN | No documented Mini App method. | Required for production if email accounts exist. |
| Session persistence | PARTIALLY AVAILABLE | Parent app handles Mini App authentication context; Mini-App-scoped storage exists. | App-specific sessions are not documented. |
| OAuth | UNKNOWN | No documented Mini App OAuth capability. | Do not assume. |
| User identity for app backend | NOT AVAILABLE | Server App identity broker exists only for Server Apps; unavailable. | No verified backend identity binding for custom Moms endpoints. |

## Authorization

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Parent-gated PW SDK calls | AVAILABLE | Parent app executes documented `PW.*` calls. | Applies to Print World token/wallet APIs only. |
| User permissions for Moms family data | NOT AVAILABLE | No app-owned backend/authz available in current Mini App runtime. | Must be server-side in external/future backend. |
| Family permissions | NOT AVAILABLE | No Reaper-native custom authorization layer documented. | Required for Family A / Family B isolation. |
| Role-based access control | UNKNOWN | No Mini App RBAC capability documented. | Need provider abstraction. |
| Server-side authorization | NOT AVAILABLE | Server Apps not allowed; Mini App frontend cannot enforce securely by itself. | External backend required unless platform adds this. |
| Row-level security equivalent | UNKNOWN | No Reaper RLS equivalent documented for Mini Apps. | Do not assume. |

## Storage

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Mini-App-scoped key/value storage | AVAILABLE | `PW.getStorage` / `PW.setStorage`. | Not media storage; useful for local app settings/drafts. |
| Object storage | UNKNOWN | No Reaper Mini App object storage API documented. | Required for family media. |
| File uploads | UNKNOWN | No documented Mini App native upload/storage API for arbitrary files. | Browser can select files, but persistence is not native without backend/storage. |
| Large video uploads | UNKNOWN | No Reaper-native large file storage documented. | Critical gap. |
| Resumable uploads | UNKNOWN | No documented Mini App storage upload/resume API. | Critical gap. |
| Private files | UNKNOWN | No documented native private object storage. | Required for family privacy. |
| Signed URLs | UNKNOWN | No Reaper-native signed URL API documented for custom media. | Required for private playback. |
| File size limits | UNKNOWN | No custom media storage limits documented. | Must be discovered before production. |
| Storage quotas | UNKNOWN | No platform quota API documented for app-owned media. | App can calculate estimates, but enforcement needs backend/storage. |

## Background Services

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Workers | NOT AVAILABLE | Server Apps unavailable; no Mini App worker service documented. | External/future worker required for processing. |
| Queues | UNKNOWN | No Mini App queue service documented. | Needed for video processing/archive exports. |
| Scheduled jobs | UNKNOWN | No Mini App scheduled jobs documented. | Needed for backups, retention, archive cleanup. |
| Video processing | UNKNOWN | No native processing documented. | Need provider abstraction. |
| Thumbnail generation | UNKNOWN | No native media worker documented. | Likely external/future worker. |

## Communication

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Toast notifications in parent UI | AVAILABLE | `PW.showToast`. | Good for in-app feedback. |
| Clipboard helper | AVAILABLE | `PW.copyToClipboard`. | Useful for sharing/invites. |
| Realtime market/wallet streams | AVAILABLE | Many `PW.on*` and subscription methods documented. | Useful for trading Mini Apps, not family app core. |
| Email sending | UNKNOWN | No Mini App email API documented. | Needed for invitations/password reset if not platform-provided. |
| Push notifications | UNKNOWN | No documented Mini App push API. | Future enhancement. |
| App-owned in-app notifications | NOT AVAILABLE | No app-owned DB/backend available. | Need backend/storage for notification persistence. |

## Security

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Parent-mediated SDK auth | AVAILABLE | Mini App docs state parent authenticates SDK calls. | Applies only to documented PW SDK methods. |
| Secrets management for Mini Apps | UNKNOWN | No Mini App secret/env manager documented. | Never embed secrets in HTML. |
| Secrets management for Server Apps | NOT AVAILABLE | Server Apps unavailable. | Cannot rely on Reaper Server App secrets. |
| Encryption at rest | UNKNOWN | No app-owned storage/DB documented. | Must be verified with actual provider. |
| Rate limiting | PARTIALLY AVAILABLE | Print World API reference documents API key rate limits for PW backend. | Does not cover Moms MemoryTree custom endpoints. |
| Logging | UNKNOWN | No Mini App app-owned logging service documented. | Need provider/future backend. |
| Audit logs | NOT AVAILABLE | No app-owned backend/database available. | Must be built externally/future backend. |
| XSS control in HTML Mini App | PARTIALLY AVAILABLE | Static app can sanitize/render safely; no platform-specific sanitization guarantee documented. | App code must avoid unsafe HTML injection. |

## Deployment

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Mini App publishing | AVAILABLE | `publish_ai_mini_app` creates/updates HTML Mini Apps. | Runtime shell can be deployed this way. |
| Existing Mini App listing | AVAILABLE | `list_ai_mini_apps` tool exists. | Can update the existing preview by id. |
| Development environment | AVAILABLE | Local repo builds and tests with Node/Vite. | GitHub remains source of truth. |
| Staging environment | UNKNOWN | No documented Reaper Mini App staging channel. | Need manual versioning/preview strategy. |
| Production environment | PARTIALLY AVAILABLE | Published Mini App acts as live panel. | Production-grade backend still missing. |
| Automatic deployments | UNKNOWN | Reaper Mini App automated deployment from GitHub not documented. | GitHub Actions can validate source; Reaper publish remains tool-driven. |
| Rollbacks | UNKNOWN | No Mini App rollback mechanism documented. | Git tags/commits can support source rollback; platform rollback unknown. |
| Versioning | PARTIALLY AVAILABLE | Mini App id persists; Git can track versions. | Need project status/version docs. |

## Analytics

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| App analytics | UNKNOWN | No Mini App analytics API documented. | Do not assume usage analytics. |
| Usage monitoring | UNKNOWN | No app-owned monitoring documented. | Need external/future backend. |
| Error monitoring | UNKNOWN | No Mini App error reporting service documented. | Can add client-side reporting only when backend exists. |
| Storage monitoring | UNKNOWN | No native object storage/usage API documented. | Current app can estimate only. |

## Billing

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Subscription support | UNKNOWN | No Mini App billing API documented. | Do not assume. |
| Payments | PARTIALLY AVAILABLE | PW transfer helpers exist for wallet transfers, not subscriptions. | Not equivalent to Moms subscription billing. |
| Usage billing | UNKNOWN | No usage billing API documented. | Need future/external billing. |
| Webhooks | NOT AVAILABLE | No app-owned backend endpoints available in this session. | External/future backend required for Stripe-style webhooks. |

## AI

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Native AI for Mini Apps | UNKNOWN | No documented Mini App AI API for app data/media. | Must not send family media to third-party AI without explicit design. |
| Transcription | UNKNOWN | No documented native transcription. | Needed later behind AIService. |
| Summarization/tagging | UNKNOWN | No documented native service. | Future provider abstraction required. |

## Backups and Data Portability

| Capability | Status | Evidence | Notes for Moms MemoryTree |
|---|---:|---|---|
| Database backups | UNKNOWN | No Reaper app database available. | Cannot claim backups. |
| Media backups | UNKNOWN | No Reaper object storage documented. | Cannot claim backups. |
| Point-in-time recovery | UNKNOWN | No app DB/storage backup docs. | Must verify with provider. |
| Independent backup | UNKNOWN | No native backup system documented. | External independent backup may be required later. |
| Restore testing | UNKNOWN | No restore tooling documented. | Must be designed later. |
| Family archive export | NOT AVAILABLE | Requires backend/storage/worker not available through Mini Apps alone. | Build as future service behind Archive/BackupService. |

---

## Current Native Reaper Mini App Capabilities Moms MemoryTree Can Use Now

1. HTML application shell inside a Reaper Mini App iframe.
2. Mini App publication/update lifecycle.
3. Parent-injected `window.PW` SDK.
4. Mini-App-scoped key/value storage for local state/drafts/preferences.
5. Parent UI helpers: toast and clipboard.
6. Reaper/Print wallet-token APIs, live streams, and transfer helpers where relevant.
7. GitHub as source of truth for code, docs, tests, schemas, migrations, and build configuration.

## Current Reaper Gaps for Moms MemoryTree Production Requirements

The following required Moms MemoryTree capabilities are not currently verified as available natively through Reaper Mini Apps:

- production relational database
- app-owned backend APIs
- server-side family authorization
- family/member RBAC
- private object storage
- large/resumable video upload storage
- signed media URLs for family files
- background workers/queues
- video processing/thumbnail generation
- email invitations/password reset support
- push/in-app notification persistence
- subscription billing and payment webhooks
- database/media backups and restore testing
- archive export generation

## Stage 0 Decision

Do not remove Supabase yet.

Do not add a new external provider yet.

Do not rebuild the application.

Stage 1 should design a provider-independent architecture that uses Reaper Mini Apps for the app shell/runtime and keeps backend/database/storage/auth behind abstractions. External providers should only remain or be added for capabilities that Reaper Mini Apps does not currently provide.

## Open Questions for Reaper Platform

These must be answered before a final Reaper-native production architecture can be declared:

1. Is there a Reaper-native production database service for Mini Apps or future app types?
2. Is PostgreSQL or another relational database available to user apps?
3. Are app-owned backend endpoints available outside Server Apps?
4. Can this Reaper be granted Server App capability later?
5. Does Reaper provide private object storage for arbitrary app media?
6. What are file size limits for Reaper-native storage, if any?
7. Does Reaper support large/resumable video upload?
8. Does Reaper provide signed URLs/private file access for user app media?
9. Does Reaper provide queues, workers, or scheduled jobs?
10. Does Reaper provide email or push notification services for user apps?
11. Does Reaper provide app secret/environment management for Mini Apps?
12. Does Reaper provide billing/subscription services for user apps?
13. Does Reaper provide app analytics/error monitoring/storage monitoring?
14. Does Reaper provide database/media backup and restore guarantees?

## Final Stage 0 Status

STATUS: COMPLETE FOR CURRENTLY AVAILABLE EVIDENCE.

This audit should be revised whenever Reaper Mini Apps exposes new backend, database, storage, auth, billing, or worker capabilities.
