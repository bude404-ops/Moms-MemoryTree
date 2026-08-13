# Storage Authorization Architecture

Moms MemoryTree media is private by default.

## Buckets

The migration defines private Supabase Storage buckets:

- `family-media` — original photos, videos, audio, and documents attached to memories.
- `family-avatars` — profile/person photographs.
- `family-exports` — portable archive export artifacts.

None of these buckets should be public.

## Storage paths

Expected structure:

```text
family/{family_id}/people/{person_id}/
family/{family_id}/memories/{memory_id}/
family/{family_id}/legacy/{message_id}/
```

The app generates paths through `src/lib/mediaUpload.ts` and `src/lib/security.ts`. Users must not be trusted to supply raw storage paths.

## Metadata

PostgreSQL table `memory_media` stores:

- Memory reference
- Family reference
- Storage bucket
- Storage path
- Media type
- File name
- MIME type
- File size
- Duration
- Thumbnail path

Large files are never stored directly in PostgreSQL.

## Authorization flow

1. User authenticates with Supabase Auth.
2. User requests media access.
3. Edge Function `signed-media-access` checks the current JWT.
4. Function calls `authorized_signed_media(media_row_id)`.
5. Database verifies `can_view_memory(memory_id)`.
6. Supabase returns a short-lived signed URL.

Permanent public URLs are forbidden for private family memories.

## Current status

Implemented in repository:

- Private bucket SQL definitions
- Storage object RLS policies
- Signed media RPC foundation
- Edge Function source
- Upload path generation
- Upload metadata repository methods
- Local tests inspecting storage/RLS protections

Not yet proven in this environment:

- Live Supabase bucket creation
- Real upload to cloud storage
- Real signed URL playback

Those require Supabase project credentials and migration deployment access.
