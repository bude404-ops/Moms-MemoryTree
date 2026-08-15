# Product Scope Audit — Moms MemoryTree

## Purpose

This audit checks whether the app and repository are still aligned with the product being built, instead of drifting into endless staged documentation.

## Real Product Scope

Moms MemoryTree is a private family memory and legacy product. The product needs:

1. Accounts and sessions.
2. Family archives, members, roles, and invitations.
3. Memories connected to people, dates, privacy, and timeline context.
4. Private media upload and signed playback.
5. Preserved original stories that cannot be silently changed.
6. Legacy/custodian flows that never replace the original story.
7. Backup/export only when a worker and restore verification exist.
8. Simple mobile-first UX for older adults.

## Current Alignment

### Aligned

- Service interfaces exist for auth, database/family, memory, media storage, legacy, notifications, billing, backup, AI, and queue.
- Supabase implementation exists behind provider/service boundaries.
- Database migrations include family, people, memories, permissions, storage, legacy, invitations, audit, and backup/export records.
- Private storage policies and signed media Edge Function source exist.
- Validation scripts check migrations, RLS/static family isolation, env safety, deployment automation, live-harness safety, and secret leakage.
- The preview shell clearly blocks production actions and says what remains mock-only.
- The React app has real service-oriented screens for dashboard, home, MemoryTree, record, memories, family, storage, timeline, legacy, and creator economics.

### Drift Found

- The master plan still pushed a stage-based delivery model even though the next real value is live bring-up.
- The dashboard emphasized foundation stages more than launch blockers.
- Development status listed another documentation/control stage as next instead of production bring-up.
- Several UI controls exist for future capabilities, but must remain honest because backup/export, payments, AI, queue jobs, and invitation email are not production-connected.
- GitHub has two local commits queued because authorization is unavailable from this environment.

## Changes Made During Audit

- Updated the master development plan to stop decorative stages and define a launch blocker roadmap.
- Changed the practical provider stance: Supabase is acceptable as the first production path because working migrations, services, policies, and verification scripts already exist.
- Updated development status so the next real path is Production Sprint 1 — Supabase live bring-up, not another stage.
- Updated the dashboard copy to emphasize launch blockers over stage completion.
- Updated dashboard next actions to focus on:
  - restoring GitHub authorization
  - deploying Supabase migrations, buckets, and signed media function
  - running live Family A / Family B isolation tests
  - wiring real auth/memory/media/invitations
  - building backup/export only after live storage and access control pass
- Updated tests for the corrected dashboard language.

## Launch Blockers That Actually Matter

1. Restore GitHub authorization and push queued commits.
2. Create/provide Supabase project credentials outside source control.
3. Deploy migrations to the live project.
4. Create private storage buckets and policies.
5. Deploy `signed-media-access` Edge Function.
6. Configure live env vars outside source control.
7. Run the live Family A / Family B verification harness.
8. Fix any live RLS/storage/function failures.
9. Wire React auth and password reset to the live provider.
10. Wire real memory creation plus private media upload/playback.
11. Wire real invitation email accept/expire flow.
12. Build archive export worker and restore verification before claiming export/backup protection.

## Guardrail

No new stage should be created unless it removes one of the launch blockers above.

The product should now move into Production Sprint 1: Supabase live bring-up.
