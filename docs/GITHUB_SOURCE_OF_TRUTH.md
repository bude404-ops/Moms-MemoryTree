# GitHub Source of Truth — Moms MemoryTree

## Stage

Stage 4 — GitHub Source of Truth

## Date

2026-08-13

## Purpose

GitHub is the permanent source-of-truth repository for Moms MemoryTree development artifacts. Reaper Mini Apps is the primary app runtime. External providers exist only for verified platform gaps.

This document defines what belongs in the repository, what does not, and how the source tree is organized.

---

## Repository Rule

GitHub contains project/development files only.

GitHub does not contain private family data.

---

## Canonical Source Tree

| Path | Status | Purpose |
|---|---|---|
| `/src` | ACTIVE | React/TypeScript application source, domain types, services, provider contracts, components, pages, app tests currently colocated under `src/test`. |
| `/assets` | RESERVED | Source-controlled design assets, brand assets, illustrations, and UI files that are safe to publish. Never private family media. |
| `/public` | RESERVED | Vite public assets that are safe to ship with the app. Never private family media or secrets. |
| `/database` | RESERVED | Provider-neutral database schemas, ERD notes, and future Reaper/external database documentation. |
| `/database/migrations` | RESERVED | Provider-neutral or future non-Supabase migrations when introduced. Current Supabase migrations stay in `/supabase/migrations` until migration gates pass. |
| `/tests` | RESERVED | Future top-level integration/e2e/security tests. Current unit/component tests remain in `/src/test` to avoid risky churn. |
| `/docs` | ACTIVE | Operational docs, deployment docs, live verification guides, workflow examples, and provider-specific documentation. |
| `/config` | RESERVED | Non-secret config templates and environment matrix documentation. Secrets never live here. |
| `/scripts` | ACTIVE | Validation, deployment, security scanning, migration checks, and provider health scripts. |
| `/supabase` | CURRENT EXTERNAL PROVIDER | Supabase config, migrations, and Edge Function source retained until equivalent Reaper-native or approved fallback providers are implemented and tested. |

Empty reserved directories contain `.gitkeep` only so the source-of-truth structure is explicit in GitHub.

---

## Files GitHub Must Contain

- application source code
- UI code
- safe UI assets
- safe public assets
- schemas
- migrations
- tests
- documentation
- configuration templates
- build scripts
- CI/CD examples
- deployment automation
- validation scripts
- version history

---

## Files GitHub Must Never Contain

- family videos
- private photos
- private audio
- private documents
- user passwords
- production secrets
- API keys
- database passwords
- service credentials
- signing keys
- payment secrets
- private storage credentials
- authentication secrets
- private family data exports

---

## Asset Policy

Allowed in `/assets` and `/public`:

- app icons
- marketing-safe illustrations
- UI backgrounds
- placeholder/demo images created for the product
- safe static content intended to ship with the app

Forbidden:

- user-generated family videos
- user-generated family photos
- user-generated family audio
- scanned private documents
- exported family archives
- signed media URLs
- provider credentials embedded in static files

---

## Database and Migration Policy

Current state:

- Supabase remains the current external database provider.
- Supabase SQL migrations live in `/supabase/migrations`.
- Provider-neutral database planning lives in `/database`.
- Future Reaper-native or alternate-provider migrations may live in `/database/migrations` once a replacement provider is selected and tested.

Rules:

1. Every schema change must be version-controlled.
2. No undocumented production database changes.
3. No direct production changes without a migration or documented provider operation.
4. Do not delete Supabase migrations until Stage 25 removal gates pass.
5. Historical migrations may remain documented even after runtime dependency removal.

---

## Test Policy

Current state:

- Unit/component tests live in `/src/test`.
- Future integration, end-to-end, live provider, and security test suites may live in `/tests`.

Required validation before every stage commit:

```bash
npm run validate
```

This currently runs:

- lint
- unit/component tests
- database migration validation
- RLS/static family isolation validation
- live harness safety validation
- deployment automation validation
- secret scan
- production build

---

## Config and Environment Policy

Allowed:

- `.env.example` with placeholders only
- non-secret config templates
- environment matrix documentation
- CI workflow examples without credentials

Forbidden:

- `.env`
- `.env.local`
- `.env.*.local`
- real provider tokens
- service-role keys
- private signing material
- production database URLs with passwords

Secrets must be supplied through the runtime/platform/provider secret manager.

---

## Reaper Runtime Boundary

Reaper Mini Apps is the primary runtime and app surface.

GitHub does not replace Reaper runtime services.

GitHub does not store live user data.

GitHub produces source-controlled artifacts that Reaper Mini Apps or approved external providers deploy/run.

---

## External Provider Boundary

External providers are allowed only for verified Reaper capability gaps.

For each external provider, GitHub may contain:

- source code
- schema/migrations
- deployment templates
- validation scripts
- documentation

GitHub may not contain:

- provider secrets
- production credentials
- private user data
- provider-generated private exports

---

## Stage 4 Decision

The source tree is now explicitly structured for Reaper-first staged development while avoiding disruptive moves.

No existing runtime code was moved in this stage.

No Supabase files were deleted.

No private family data was added.

No secrets were added.

Future stages may gradually move or mirror files into `/database`, `/tests`, `/config`, or `/assets` only when doing so is safe and validated.
