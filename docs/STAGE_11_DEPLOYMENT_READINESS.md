# Stage 11 — Deployment Readiness

## Status

Complete as local/source-control deployment readiness. Live deployment remains blocked by provider credentials and operator action.

## Current Automated Readiness

`npm run validate` verifies:

- lint
- tests
- database migrations
- RLS/static isolation
- environment template safety
- live harness safety
- deployment automation
- secret scan
- production build

## Deployment Providers

Current external provider:

- Supabase for auth/database/storage/signed media function

Current Reaper-native runtime:

- Reaper Mini Apps for app shell/runtime/publishing where applicable

## Live Deployment Blockers

- Supabase CLI/dashboard access required
- live provider credentials required outside source control
- live Family A / Family B test accounts required
- GitHub push requires temporary authorization in this environment

## Promotion Gates

Development to staging:

- full validation passes
- environment values are staging-specific
- no real family data

Staging to production:

- migrations deployed
- signed media function deployed
- private buckets verified
- live RLS tests pass
- live signed media tests pass
- secret scan passes
- production build passes
- rollback plan documented

## Stage 11 Decision

The repo is deployment-ready locally, but live deployment is not claimed until credentials and live checks complete.
