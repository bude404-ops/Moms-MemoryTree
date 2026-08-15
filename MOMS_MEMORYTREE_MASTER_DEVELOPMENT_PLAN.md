# Moms MemoryTree — Master Development Plan

## Mission

Build Moms MemoryTree as a professional, simple, family-focused digital memory and legacy application.

Moms MemoryTree helps people record who they are, tell life stories, upload videos/photos/audio, preserve family memories, build a family timeline/tree, and leave a permanent record for future generations.

The product must be simple enough for older adults to use without technical knowledge while still feeling polished, warm, and professional.

## Permanent Principles

1. **GitHub is the source of truth.** Source code, UI, assets, services, schemas, migrations, tests, docs, build config, and CI/CD stay version-controlled.
2. **Reaper Mini Apps is the primary preview/runtime surface.** Use native Reaper Mini App capabilities first whenever they are sufficient, but do not block the product waiting for unavailable backend features.
3. **Build Moms MemoryTree as our platform.** Auth, database, private media, signed access, AI, workers, billing, and notifications must stay behind replaceable service contracts.
4. **Do not invent infrastructure.** Audit platform capabilities before adding backend/database/storage/billing/worker systems.
4. **Use service interfaces.** UI must depend on services, not hard-coded provider clients.
5. **No private media in GitHub.** User videos, photos, audio, private documents, secrets, credentials, and production records never belong in source control.
6. **index.html is the working visual app prototype.** GitHub Pages must feel like the real Moms MemoryTree application, not a static marketing page.
7. **Mock preview, production services.** GitHub Pages/Mini App previews use browser-local services only; the React app must wire real services when provider credentials exist.
8. **No backend lock-in.** Provider-specific code may exist only behind service interfaces, and product copy must not make one provider a requirement.
9. **Protect preserved stories at backend/database authorization level.** UI hiding is never enough.
10. **Stop decorative stages.** Future work must remove a launch blocker: live backend deployment, auth, private upload/playback, invitations, backup/export, verification, or production deployment.

## Guiding Legacy Principle

> Preserve what the person said. Let the family add what they remember. Never rewrite history.

## Portable Architecture

```text
                    GITHUB
               SOURCE OF TRUTH
                       │
                       ▼
              MOMS MEMORYTREE
                APPLICATION
                       │
                       ▼
              REAPER MINI APPS
              PRIMARY PLATFORM
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       RUNTIME      BACKEND      SERVICES
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
                    DATABASE      STORAGE       OTHER
                       │             │          SERVICES
                       ▼             ▼
                  FAMILY DATA    FAMILY MEDIA
                                     │
                                     ▼
                                  BACKUPS
```

## Core Service Interfaces

The UI communicates through these service contracts:

- `AuthService`
- `DatabaseService`
- `MemoryService`
- `FamilyService`
- `MediaStorageService`
- `LegacyService`
- `NotificationService`
- `BillingService`
- `BackupService`
- `AIService`

Production providers should be swappable:

```text
AuthService -> MockAuthService -> ReaperAuthService or external fallback
DatabaseService -> MockDatabaseService -> ReaperDatabaseService or external fallback
MediaStorageService -> MockMediaStorageService -> ReaperStorageService or S3-compatible fallback
LegacyService -> MockLegacyService -> ReaperLegacyService or external fallback
NotificationService -> MockNotificationService -> ReaperNotificationService or external fallback
```

## Required Product Experience

### Main Navigation

Mobile-first navigation must use large touch targets, icon + text labels:

- Home
- Memories
- Family
- Record
- Timeline
- Legacy

### Home Dashboard

Home must show:

- Welcome back, `[First Name]`
- Family name
- Family preview
- Primary action: **Record Your Story**
- Secondary actions: Add a Memory, Add Photos, Upload Video, View Family, View Timeline
- Recent Memories
- Your Family
- Continue Your Story

### Record Your Story

Primary record flow shows:

- Record Video
- Record Audio
- Write a Story
- Add Photos
- Guided prompts
- Save Draft
- Preserve My Story

### Memories

Tabs:

- All
- Videos
- Photos
- Stories
- Audio
- Memorial

Each memory must clearly show creator, date, privacy, media, connected family members, and timeline context.

### Family

A simple visual family tree should show grandparents, parents, children, and grandchildren. Each person opens story, memories, timeline, and legacy information.

### Timeline

A vertical life/family timeline must distinguish who added every event.

### Legacy

Living users see My Legacy, My Story, Preserved Stories, Legacy Messages, Future Messages, and Legacy Custodian.

Legacy profiles show Original Life Story, Memories, Family Timeline, Funeral/Memorial, Family Tributes, and Letters.

## Legacy Memory Lock Requirements

When a creator selects **Preserve My Story**, create an immutable record storing:

- `creator_id`
- `family_id`
- `original_story`
- `created_at`
- `preserved_at`
- `original_version`
- `content_hash`

After preservation:

- no family member can edit, replace, or delete it
- no next of kin can edit it
- no legacy custodian can edit it
- no administrator can silently modify it
- descendants may add separate contributions only

Display:

- `🔒 ORIGINAL STORY — PRESERVED`
- `Recorded by [Name]`
- `Preserved on [Date]`

## Legacy Mode

Account states:

- `ACTIVE`
- `LEGACY_PENDING`
- `LEGACY`
- `ARCHIVED`

Ordinary family members cannot instantly declare another person deceased. Legacy Mode requires the configured authorization process.

Designations:

- Primary Next of Kin
- Backup Next of Kin
- Legacy Custodian

## Funeral / Memorial System

Once a person is in Legacy Mode, authorized Next of Kin or Legacy Custodian can add funeral/memorial content as new memories:

- Funeral Video
- Memorial Service
- Celebration of Life
- Tribute Video
- Photos
- Description
- Date
- Location
- Contributors

Never replace the original life story.

## Memorial Timeline Sections

1. Life Story — original preserved story
2. Life Memories — created during life
3. Funeral & Memorial — funeral/memorial videos
4. Family Memories After Passing — descendants' separate contributions

## Accessibility Requirements

Design for older adults:

- large typography
- high contrast
- large touch targets
- clear labels
- icon + text pairings
- minimal menus
- plain language
- large text mode
- high contrast mode
- reduced motion
- keyboard navigation
- screen reader support
- clear focus states

Avoid technical errors, dense dashboards, tiny text, excessive animation, and hidden actions.

## Mock Application Requirements

GitHub Pages/index.html must simulate realistic actions through mock services and browser persistence:

- account creation
- login/logout
- family creation
- family invitations
- memory creation
- video/photo/audio upload
- timeline creation
- family tree
- privacy settings
- legacy mode
- preserved stories
- memorial videos
- notifications
- storage usage
- settings
- help
- large text mode

## Launch Blocker Roadmap

Stop after the preview/control work. Do not keep creating stages unless the work removes one of these blockers.

| Priority | Blocker | Done When |
|---:|---|---|
| 1 | Production provider decision | auth, database, object storage, signed media access, workers, and deployment target selected |
| 2 | Live security proof | Family A / Family B isolation test passes for memories, media metadata, storage paths, and signed URLs |
| 3 | Real auth flow | signup, signin, signout, password reset, profile creation, and session refresh work against live provider |
| 4 | Real recording/media flow | browser video/audio recording, existing-file upload, private object storage, metadata write, and signed playback work without false success states |
| 5 | Real invitation flow | invite, accept/expire token, role assignment, and audit record work against live provider |
| 6 | Backup/export worker | archive export and restore verification run as jobs with evidence; until then, no backup protection claim |
| 7 | Production deployment | operator can deploy, verify, rollback, and publish without private media or secrets entering source control |

## Delivery Report Template

Every future delivery must report:

- blocker removed
- user-facing capability changed
- files changed
- validation/test output
- security impact
- remaining launch blockers
- GitHub commit
- GitHub push status
