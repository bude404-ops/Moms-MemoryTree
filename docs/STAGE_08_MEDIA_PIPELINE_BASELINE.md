# Stage 8 — Media Pipeline Baseline

## Status

Complete as an upload/playback/storage foundation. Processing jobs, thumbnails, transcoding, and independent backup remain future provider work.

## Current Pipeline

```text
UI upload flow
  -> MediaStorageService
  -> SupabaseStorageProvider when configured
  -> private bucket object
  -> memory_media metadata row
  -> signed-media-access for playback
```

## Supported Media Policy

Initial validation supports:

- images: JPG, JPEG, PNG, WebP
- video: MP4, MOV, WebM
- audio: MP3, M4A, WAV, AAC
- documents: PDF, TXT, DOC, DOCX

Both MIME type and extension must be checked.

## Upload Truthfulness

Allowed language:

- uploading
- stored in private family cloud vault
- private signed playback
- upload failed/retry

Forbidden until verified:

- safely backed up
- permanently preserved across providers
- independently archived
- disaster-proof

## Playback Rules

- Playback uses temporary signed media access.
- Media must be completed and non-deleted.
- Authorization must be verified before URL creation.
- Permanent public URLs are forbidden.

## Future Work

- resumable large upload provider
- thumbnail generation worker
- video/audio transcoding worker
- malware/content scanning provider
- independent backup copy
- restore/export validation

## Validation Gates

- storage authorization tests
- signed URL expiry tests
- RLS/static isolation tests
- live Family A / Family B tests after deployment

## Stage 8 Decision

The media pipeline is safe to build dashboard views around, but dashboard copy must not overclaim backup, processing, or live deployment status.
