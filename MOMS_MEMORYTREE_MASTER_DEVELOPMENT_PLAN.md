# Moms MemoryTree — Master Development Plan

## Mission

Build Moms MemoryTree as a professional, simple, family-focused digital memory and legacy application.

Moms MemoryTree helps people record who they are, tell life stories, upload videos/photos/audio, preserve family memories, build a family timeline/tree, and leave a permanent record for future generations.

The product must be simple enough for older adults to use without technical knowledge while still feeling polished, warm, and professional.

## Permanent Principles

1. **GitHub is the source of truth.** Source code, UI, assets, services, schemas, migrations, tests, docs, build config, and CI/CD stay version-controlled.
2. **Reaper Mini Apps is the primary runtime.** Use native Reaper Mini App capabilities first whenever they are sufficient.
3. **Do not invent infrastructure.** Audit platform capabilities before adding backend/database/storage/billing/worker systems.
4. **Use service interfaces.** UI must depend on services, not hard-coded provider clients.
5. **No private media in GitHub.** User videos, photos, audio, private documents, secrets, credentials, and production records never belong in source control.
6. **index.html is the working visual app prototype.** GitHub Pages must feel like the real Moms MemoryTree application, not a static marketing page.
7. **Mock now, production later.** GitHub Pages uses mock browser services/local persistence that mirror production service contracts.
8. **No Supabase runtime dependency is the target.** Existing provider work must be migrated behind Reaper-first/portable interfaces before removing packages and code.
9. **Protect preserved stories at backend/database authorization level.** UI hiding is never enough.
10. **Build in stages.** After every stage: build, test, fix, document, commit, push.

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

## Development Stages

| Stage | Name | Gate |
|---:|---|---|
| 1 | Platform audit | `REAPER_PLATFORM_CAPABILITIES.md` current, no guessing |
| 2 | Architecture | service boundaries and portability documented |
| 3 | GitHub application shell | source structure, validation, CI |
| 4 | index.html interactive prototype | real mock app behavior, local persistence |
| 5 | Design system | reusable components and accessibility tokens |
| 6 | Authentication architecture | mock auth + production provider contract |
| 7 | Family system | family, roles, invitations, isolation tests |
| 8 | Memory system | creation, detail, privacy, search/filter |
| 9 | Media/storage system | upload mock flow, progress, quota, storage service |
| 10 | Timeline | visual timeline and event authorship |
| 11 | Legacy Memory Lock | immutable original story and authorization tests |
| 12 | Funeral/memorial system | memorial media as separate memories |
| 13 | Archive/export | portable family archive manifest and mock export |
| 14 | Security | cross-family and preserved-story security gates |
| 15 | Accessibility | large text, contrast, keyboard, screen reader checks |
| 16 | Billing/storage economics | plans, usage, warnings, billing abstraction |
| 17 | Production Reaper integration | replace mock providers where native capability exists |
| 18 | Production testing | live runtime/customer journey validation |

## Stage Report Template

Every completed stage must report:

- stage number
- stage name
- status
- what was built
- what was tested
- what was fixed
- Reaper services used
- external services used
- Supabase dependencies remaining
- security status
- blocked items
- creator action required
- GitHub commit
- GitHub push status
- next stage
