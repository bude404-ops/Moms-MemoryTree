# Stage 6 — Security Baseline

## Status

Complete as a source-controlled baseline. Live penetration testing remains blocked until provider deployment credentials and live test users exist.

## Security Principles

1. Server/provider authorization is the source of truth.
2. Frontend checks are UX only.
3. Family data is private by default.
4. Private media never uses permanent public URLs.
5. Secrets never enter GitHub.
6. Legacy access is explicit, audited, and never automatic.
7. Backup protection is not claimed until independent backup jobs and restore tests pass.

## Authentication Baseline

- Email/password auth is routed through `AuthService`.
- Supabase Auth is the current external provider.
- Passwords are never stored in app tables.
- Signup/profile creation is centralized.
- Password reset is supported at service level.
- Demo mode remains available when provider env vars are absent.

## Family Isolation Baseline

Required guarantees:

- Family A cannot read Family B data.
- Family A cannot list Family B media metadata.
- Family A cannot guess Family B storage paths.
- Creator-private memories remain hidden from normal family membership.
- Specific-person memories require explicit grants.
- Descendant memories require lineage checks.
- Legacy memories require explicit legacy permissions and controlled future workflow.

## Media Security Baseline

- Private buckets only: `family-media`, `family-avatars`, `family-exports`.
- Completed media only is returned for normal viewing.
- Soft-deleted media is excluded.
- Signed URLs are temporary.
- Public URLs are forbidden for private family media.
- Object paths are generated and family-scoped.
- User filenames are metadata, not access controls.

## Audit Baseline

Security-sensitive actions must be auditable:

- family created/updated
- member invited/removed
- role/permission changed
- memory created/deleted
- media uploaded/deleted/accessed through signed access
- legacy custodian changed
- legacy request submitted
- archive export created/downloaded
- backup created/verified/restored

Audit logs must never store media contents or secrets.

## Validation Gates

Current automated gates:

- `npm run validate:rls`
- `npm run validate:live-harness`
- `npm run validate:env`
- `npm run validate:secrets`
- `npm run validate`

Manual/live gates before production:

- deploy migrations to live provider
- deploy signed media function
- create Family A / Family B test users
- verify cross-family denial
- verify private bucket denial
- verify short-lived signed access
- verify audit trails

## Stage 6 Decision

Security is documented as a baseline, enforced through static/local validation, and blocked from production claims until live provider tests pass.
