# Environment Management — Moms MemoryTree

## Stage

Stage 5 — Environment Management

## Date

2026-08-13

## Purpose

Moms MemoryTree needs strict separation between development, staging, and production. The app handles private family memories, so environment drift, accidental production writes, and leaked credentials are unacceptable.

This document defines environment names, allowed files, secret rules, validation gates, and provider boundaries.

---

## Canonical Environments

| Environment | `VITE_APP_ENV` | Purpose | Data Policy |
|---|---:|---|---|
| Development | `development` | Local development and demo mode | Demo data or throwaway provider data only. |
| Staging | `staging` | Pre-production verification with realistic workflows | Test families only. No real family archive data. |
| Production | `production` | Real user/family usage | Real data allowed only in approved live providers, never GitHub. |

Only these values are valid:

- `development`
- `staging`
- `production`

---

## Source-Control Environment Files

Allowed in GitHub:

- `.env.example`
- documentation that lists placeholder names
- non-secret config templates
- CI workflow examples that reference secret names only

Forbidden in GitHub:

- `.env`
- `.env.local`
- `.env.development.local`
- `.env.staging.local`
- `.env.production.local`
- any file containing real tokens, passwords, service-role keys, or private media URLs

---

## Runtime Environment Files

Local operators may create untracked runtime files:

| File | Tracked? | Use |
|---|---:|---|
| `.env.local` | No | Local development defaults. |
| `.env.development.local` | No | Development overrides. |
| `.env.staging.local` | No | Staging provider values. |
| `.env.production.local` | No | Production provider values. |

These files must remain ignored by Git.

---

## Frontend Variables

Frontend variables are visible to browser users after build. Treat every `VITE_*` value as public.

Allowed frontend values:

- `VITE_APP_ENV`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Forbidden frontend values:

- service-role keys
- database passwords
- provider admin tokens
- GitHub tokens
- payment secrets
- signing keys
- private storage credentials

---

## Current Provider Variables

Supabase remains the current external provider until replacement gates pass.

Current allowed provider variables:

| Variable | Scope | Secret? | Notes |
|---|---|---:|---|
| `VITE_SUPABASE_URL` | frontend | No | Public project URL. Use environment-specific project. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | Public-ish | Client publishable/anon key only. Never service-role. |
| `SUPABASE_LIVE_URL` | scripts | No | Live verification target. |
| `SUPABASE_LIVE_PUBLISHABLE_KEY` | scripts | Public-ish | Client publishable/anon key only. |
| `SUPABASE_LIVE_TEST_PASSWORD` | scripts | Yes | Throwaway test password only. Do not commit. |
| `SUPABASE_LIVE_TEST_EMAIL_A` | scripts | Low sensitivity | Throwaway test account only. Do not use family user accounts. |
| `SUPABASE_LIVE_TEST_EMAIL_B` | scripts | Low sensitivity | Throwaway test account only. Do not use family user accounts. |
| `SUPABASE_ACCESS_TOKEN` | deployment | Yes | CI/local secret only. Never commit. |
| `SUPABASE_PROJECT_REF` | deployment | No | Optional override outside repo. |

---

## Reaper Environment Boundary

Reaper Mini Apps is the app runtime.

Reaper-native browser SDK capabilities do not currently replace environment-specific backend credentials for Supabase auth/database/private media.

If Reaper exposes app-owned backend/database/storage/auth later, new variables must be documented here before use.

---

## Environment Selection Rules

1. Default local mode is `development`.
2. Staging and production must be explicit.
3. A production build must never rely on `.env.example` placeholders.
4. A production build must never include service-role/admin credentials.
5. Live verification must use throwaway test accounts.
6. Demo mode is acceptable only when provider env vars are absent or explicitly disabled.
7. Real family media never belongs in the repository or static build assets.

---

## Validation Gates

Before every stage commit:

```bash
npm run validate
```

Environment-specific validation includes:

```bash
npm run validate:env
npm run validate:secrets
npm run validate:deployment
npm run validate:live-harness
```

`validate:env` checks:

- `.env.example` contains required placeholder keys
- `.env.example` does not contain the known live project URL
- only approved `VITE_APP_ENV` values are documented
- local env files remain ignored
- no service-role/admin key names appear in frontend templates

---

## Deployment Rules

Development:

- may use demo mode
- may use a development Supabase project
- may use throwaway test users

Staging:

- must use staging provider values
- must pass migration validation
- must pass RLS/static family isolation validation
- should pass live Family A / Family B verification before production promotion

Production:

- must use production provider values injected by host/provider secret manager
- must not use local `.env` files from developer machines
- must not use staging/test passwords
- must pass secret scanning and production build
- must verify private media access after deployment

---

## GitHub Actions Rules

GitHub Actions may reference secret names.

GitHub Actions must not contain literal secret values.

Allowed secret references:

- `SUPABASE_ACCESS_TOKEN`
- future provider deployment tokens by name only

Forbidden:

- literal access tokens
- literal service-role keys
- literal database passwords
- hardcoded GitHub personal access tokens

---

## Stage 5 Decision

Environment management is now explicit.

The repository keeps `.env.example` placeholder-only.

Runtime provider secrets stay outside GitHub.

Development, staging, and production are separated by declared `VITE_APP_ENV` values and provider-specific runtime injection.

Supabase remains the current provider, but its credentials are managed as environment-specific runtime values, not source code.
