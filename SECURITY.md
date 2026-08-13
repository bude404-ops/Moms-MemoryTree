# Security

Moms MemoryTree is designed around one principle: family memories must not become public, and access must not depend on one person's device or account.

## Authentication

- Supabase Auth handles credentials.
- The app supports email/password signup, sign-in, sign-out, password reset, auth-state subscriptions, and persistent sessions.
- Passwords are never stored in application tables.
- Signup creates/updates a private profile row tied to the Supabase Auth user ID.
- Profile rows contain display metadata only.
- The repository uses one centralized auth service so session handling does not scatter across UI components.

## Secret handling

Never commit:

- `.env`
- `.env.local`
- Supabase service-role keys
- Database passwords
- GitHub tokens
- Any production credential

Client-side code may only use:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

If a credential is ever committed, rotate it immediately.

## Row Level Security

RLS is enabled on all private family tables. The migration forbids broad authenticated read access. There must never be a policy equivalent to:

```sql
authenticated users can read everything
```

Access must be scoped by family and memory permissions.

## Family isolation

Core helper functions:

- `is_family_member(family_id)`
- `is_family_manager(family_id)`
- `can_view_memory(memory_id)`
- `can_access_storage_object(bucket_id, object_name)`

Required guarantees:

- Family A cannot read Family B data.
- Users cannot modify another family's records.
- Users cannot delete another family's memories.
- Family membership alone does not reveal creator-private memories.
- Specific-person memories require explicit grants.
- Descendant memories require lineage checks.
- Legacy memories require controlled legacy state and explicit legacy permissions.

## Private media

Private buckets:

- `family-media`
- `family-avatars`
- `family-exports`

Media files are stored in Supabase Storage, not PostgreSQL. PostgreSQL stores only metadata and storage paths.

Permanent public URLs are forbidden for private family memories.

Signed URL flow:

1. User authenticates.
2. App requests media access.
3. Edge Function calls `authorized_signed_media(media_row_id)`.
4. Database verifies `can_view_memory(memory_id)`.
5. Supabase returns a short-lived signed URL.

## Legacy security

- No automatic death detection.
- No password transfer model.
- Custodians do not automatically receive private memories.
- Legacy Mode must be a future controlled, audited verification process.
- Creator-defined legacy permissions control future access.

## Backup security

Backup records are architecture only until a real independent backup provider exists. Do not claim backup protection until:

1. Backup job runs successfully.
2. Backup integrity is verified.
3. Backup status is recorded.
4. Restore/export path is tested.

## Audit logging

Audit logs track security-sensitive actions such as:

- Memory created/deleted
- Permission changed
- Family member added/removed
- Custodian changed
- Archive exported
- Legacy request submitted

Audit logs must not store private media contents.
