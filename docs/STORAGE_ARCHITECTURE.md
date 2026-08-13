# Storage Authorization Architecture

Moms MemoryTree media is private by default.

## Current Phase 1 implementation

- PostgreSQL stores metadata and object references in `memory_media`.
- Large files belong in Supabase Storage, not PostgreSQL.
- The intended private bucket is `family-media`.
- Storage paths are generated in app code with the form:
  - `family/{family_id}/memories/{memory_id}/{timestamp}-{safe_file_name}`
  - `family/{family_id}/legacy/{memory_id}/{timestamp}-{safe_file_name}`
- Public permanent media URLs are not used.
- Signed URL policy helpers are implemented in `src/lib/security.ts`.
- Upload preparation and file classification are implemented in `src/lib/mediaUpload.ts`.
- Supabase upload and signed URL calls are centralized in `src/lib/repository.ts`.

## Authorization flow

1. User authenticates with Supabase Auth.
2. App requests memory/media metadata.
3. Database RLS verifies family membership and memory permissions.
4. Authorized request calls a server/edge function to create a temporary signed URL.
5. Signed URL expires quickly.
6. Expired URLs must not be accepted as durable access.

## Phase 1 boundary

Phase 1 includes schema, RLS, private bucket design, signed URL helper logic, and tests for authorization rules.

It does **not** claim production media redundancy or permanent preservation. Independent backup and export flows are documented and modeled for later phases.
