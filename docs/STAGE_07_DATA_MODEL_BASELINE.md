# Stage 7 — Data Model Baseline

## Status

Complete as a source-controlled schema and domain baseline. Live database deployment remains provider-credential blocked.

## Current Data Model Areas

The repository contains schema coverage for:

- profiles
- families
- people
- family members
- family relationships
- memories
- memory media
- memory people
- memory tags
- memory permissions
- life events
- story questions
- legacy messages
- legacy custodians
- legacy permissions
- family invitations
- storage usage
- storage plans
- storage add-ons
- family subscriptions
- billing events
- backup records
- archive exports
- audit logs

## Provider Boundary

App code must use provider-independent contracts:

- `AuthService`
- `DatabaseService`
- `MediaStorageService`
- `AuthorizationService`
- `BackupService`
- `NotificationService`
- `BillingService`
- `AIService`
- `QueueService`

Supabase remains the current external data provider until replacement gates pass.

## Migration Rules

1. Every schema change must be version-controlled.
2. No production schema drift outside migrations.
3. Do not delete historical migrations.
4. Do not remove Supabase migrations until Stage 25 removal gates pass.
5. Provider-neutral plans belong in `/database` when an alternate provider is selected.

## Domain Rules

- IDs are opaque identifiers.
- Family scoping is mandatory for private resources.
- Media contents live in object storage, not PostgreSQL.
- Database rows store media metadata and paths only.
- Subscription/payment rows do not store payment card data.
- Backup rows do not mean backup protection exists until jobs are verified.

## Validation Gates

- `npm run validate:db`
- `npm run validate:rls`
- `npm run test`
- `npm run validate`

## Stage 7 Decision

The data model baseline is complete enough for dashboard planning and future provider migration, while live deployment remains blocked by provider access.
