# Moms MemoryTree Storage Architecture

## Cloud storage status

Moms MemoryTree uses Supabase Storage as the first primary cloud media provider. Large photos, videos, audio files, and documents are not stored in PostgreSQL. PostgreSQL stores metadata, privacy, status, quota, and storage references.

Flow:

```text
Moms MemoryTree App
  ↓
MediaStorageService
  ↓
SupabaseStorageProvider
  ↓
Private Supabase Storage buckets
  ↓
metadata in memory_media
```

The app talks to `MediaStorageService`, not directly to Supabase everywhere, so another provider can be added later behind the same interface.

## Private buckets

Private Supabase buckets are represented in migrations:

- `family-media` — private original memory media
- `family-avatars` — private family/person avatars
- `family-exports` — private generated archive exports

No bucket is public. Permanent public URLs are not used for private family media.

## Media paths

Primary media paths follow this shape:

```text
family/{family_id}/memories/{memory_id}/{file_uuid}-original.{extension}
family/{family_id}/people/{person_id}/{file_uuid}-original.{extension}
family/{family_id}/timeline/{event_id}/{file_uuid}-original.{extension}
family/{family_id}/legacy/{message_id}/{file_uuid}-original.{extension}
```

User filenames are stored as metadata only. They are not security identifiers. The storage object name uses a generated object ID and a validated extension.

## Supported media

Initial validation supports:

- Video: MP4, MOV, WebM
- Images: JPG, JPEG, PNG, WebP
- Audio: MP3, M4A, WAV, AAC
- Documents: PDF, TXT, DOC, DOCX

Both extension and MIME type are checked. Unsupported or mismatched files are rejected before upload.

## Upload states

`memory_media.upload_status` supports:

- `pending`
- `uploading`
- `paused`
- `processing`
- `completed`
- `failed`
- `deleted`

Only `completed` media is presented as successfully stored or returned by normal media listing. Failed uploads do not create false completed records.

## Large video support

The service boundary includes progress, cancellation, retry/resume status, and resumable recommendations. The real upload path now routes through `MediaStorageService` and `SupabaseStorageProvider`, so UI progress comes from provider events rather than hardcoded percentages. Supabase browser uploads are currently single-request uploads through the JS client, but the provider abstraction is ready for a resumable provider such as TUS/S3-compatible storage without rewriting the app.

The UI uses honest language:

- `Uploading Memory...`
- progress percentage
- `Please keep the app open while we finish.`
- `Your memory is now stored in your private family cloud vault.`

It does not say `safely backed up` because independent backup is not implemented yet.

## Download / playback flow

Private playback must follow:

1. Authenticate the user.
2. Identify the family.
3. Verify family membership.
4. Check memory privacy.
5. Check specific-person permissions.
6. Check descendant permissions.
7. Check legacy permissions.
8. Generate temporary signed access.
9. Play the media.

The `signed-media-access` Edge Function calls `authorized_signed_media`, which only returns completed, non-deleted media the user may view.

Reusable playback components exist for:

- `VideoPlayer`
- `ImageViewer`
- `AudioPlayer`

They request temporary signed media access and show loading/error states.

## Storage RLS and policies

Storage policies enforce family scoping. Users cannot read, upload, update, or delete another family's media by guessing paths.

Database helpers include:

- `is_family_member`
- `is_family_manager`
- `can_view_memory`
- `can_access_storage_object`
- `authorized_signed_media`
- `family_has_storage_capacity`

Frontend checks are not the source of truth.

## Quotas

Quotas are configurable with `storage_plans`:

- Free: 1 GB
- Family: 100 GB
- Family Plus: 500 GB
- Legacy: 1 TB

These are architecture defaults, not final pricing commitments. Before upload, the app checks current usage plus incoming file size against family quota.

## Original file preservation

The original uploaded file remains the source of truth. Future optimized playback copies and thumbnails must be additional objects, not replacements.

Planned object pattern:

```text
{file_uuid}-original.mp4
{file_uuid}-playback.mp4
{file_uuid}-thumbnail.jpg
```

## Thumbnails

The schema includes `thumbnail_path`. Automatic thumbnail generation is a foundation only until a processing job or Edge Function is added.

## Delete protection

Media deletion is soft-delete first:

```text
completed → deleted + deleted_at + delete_after
```

Permanent deletion should only occur after permission checks, audit logging, and a recovery period.

## Backup architecture

Independent backup is not yet implemented. The schema has `backup_records` so future backup status, size, verification, failure, and restore state can be tracked without claiming backup exists today.

## Archive export

Archive export is foundation only. `archive_exports` tracks future portable family archives containing originals, stories, family tree, timeline, relationships, transcripts, and legacy metadata.
