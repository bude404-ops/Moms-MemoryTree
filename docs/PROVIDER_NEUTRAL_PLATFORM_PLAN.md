# Provider-Neutral Platform Plan — Moms MemoryTree

## Decision

Moms MemoryTree is our platform. Auth, database, storage, media access, workers, AI, payments, and notifications must sit behind service contracts so no single backend vendor becomes a product requirement.

The current preview can run locally. A production deployment must choose and verify a cloud provider, but the UI and product language must remain provider-neutral.

## Browser recording

The Record screen supports the product path for:

- video recording through the browser camera and microphone
- audio recording through the browser microphone
- upload of existing photos, videos, audio, documents, and scans
- staging captured media locally before the user presses Preserve Memory
- saving the memory row before the media object and metadata
- showing success only after the save chain completes

Recorded blobs are converted into normal `File` objects and sent through the same upload path as selected device files. That keeps recording independent from the storage provider.

## Cloud storage boundary

Large media never belongs in the database or GitHub. Production storage must provide:

- private buckets or private object containers
- path scoping by family, memory, person, and legacy zone
- MIME/type and size limits
- quota checks before upload
- short-lived signed playback/download URLs
- server-side authorization before any signed URL is issued
- deletion/recovery behavior defined by policy

## Required service contracts

The frontend must continue using these boundaries:

- `AuthService`
- `DatabaseService`
- `FamilyService`
- `MemoryService`
- `MediaStorageService`
- `AuthorizationService`
- `LegacyService`
- `BackupService`
- `NotificationService`
- `BillingService`
- `AIService`
- `QueueService`

Provider-specific code may exist only behind those contracts.

## Production provider choices

Acceptable production paths include:

- custom backend API + S3-compatible object storage
- Firebase or Google Cloud backed implementation
- AWS Cognito/API Gateway/Lambda/RDS or DynamoDB/S3
- Cloudflare Workers/D1/R2 where limits fit the product
- Supabase as a temporary or chosen provider, only behind provider interfaces

No provider is considered production-ready until Family A / Family B isolation tests pass for auth, memory records, media metadata, storage paths, and signed URL access.

## GitHub source-of-truth rule

Every platform change must update:

- source code
- docs and roadmap
- tests or validation where possible
- Git commit history

Private media, credentials, secrets, and production user records must never enter GitHub.
