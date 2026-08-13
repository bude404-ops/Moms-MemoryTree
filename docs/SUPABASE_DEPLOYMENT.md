# Supabase Deployment — Moms MemoryTree

## Linked project

This repository is configured for:

- Supabase URL: `https://foiyynmpifrpbcymjrgw.supabase.co`
- Project ref: `foiyynmpifrpbcymjrgw`

The public project ref is stored in `supabase/config.toml` so deployment commands can link to the correct project without committing secrets.

## What is in source control

Safe to commit:

- `supabase/config.toml`
- SQL migrations in `supabase/migrations/`
- Edge Function source in `supabase/functions/signed-media-access/`
- deployment/validation scripts
- environment templates with placeholders

Never commit:

- service-role keys
- Supabase access tokens
- database passwords
- local `.env` files
- GitHub tokens

## Required secure authorization for cloud deployment

To deploy migrations and the Edge Function, the operator must authenticate the Supabase CLI outside source control by using one of these secure methods:

1. Local operator session:
   - install Supabase CLI
   - run `supabase login`
   - run `npm run deploy:supabase -- --deploy`

2. GitHub Actions:
   - add repository secret `SUPABASE_ACCESS_TOKEN`
   - use the workflow example in `docs/workflows/supabase.yml.example`

The project ref does not need to be a secret because it is public and already present in `supabase/config.toml`.

## Optional live verification credentials

For live Family A / Family B RLS and private storage tests, provide throwaway client credentials only:

- `SUPABASE_LIVE_URL=https://foiyynmpifrpbcymjrgw.supabase.co`
- `SUPABASE_LIVE_PUBLISHABLE_KEY=<publishable-or-anon-key>`
- `SUPABASE_LIVE_TEST_PASSWORD=<throwaway-password>`
- optional confirmed test users:
  - `SUPABASE_LIVE_TEST_EMAIL_A`
  - `SUPABASE_LIVE_TEST_EMAIL_B`

Do not use service-role keys for live verification.

## Local validation commands

```bash
npm run validate
npm run check:supabase-connectivity
npm run deploy:supabase
```

`npm run deploy:supabase` without `-- --deploy` is a preflight. It validates migrations, RLS, secret scanning, Edge Function source, and project-ref configuration. It does not modify Supabase.

## Cloud deployment command

After the Supabase CLI is authenticated outside the repo:

```bash
npm run deploy:supabase -- --deploy
```

To also run live Family A / Family B verification after deployment:

```bash
SUPABASE_LIVE_URL=https://foiyynmpifrpbcymjrgw.supabase.co \
SUPABASE_LIVE_PUBLISHABLE_KEY=<publishable-key> \
SUPABASE_LIVE_TEST_PASSWORD=<throwaway-password> \
npm run deploy:supabase:run
```

## Required Supabase project configuration after deployment

In Supabase Dashboard:

1. Authentication
   - enable email/password auth
   - set site URL for the deployed app
   - add local/deployed redirect URLs
   - decide whether email confirmations are required

2. Storage
   - verify these private buckets exist:
     - `family-media`
     - `family-avatars`
     - `family-exports`
   - verify buckets are not public

3. Edge Function
   - deploy `signed-media-access`
   - keep JWT verification enabled
   - confirm it returns short-lived signed URLs only to authorized users

4. RLS
   - run live Family A / Family B tests
   - verify Family B cannot read Family A families, memories, media metadata, storage paths, subscriptions, or storage usage

5. Environment variables for the frontend host
   - `VITE_SUPABASE_URL=https://foiyynmpifrpbcymjrgw.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>`

## Manual blocker policy

If deployment fails because the CLI is not authenticated, stop and provide the operator this requirement:

- provide a secure Supabase CLI session with access to project `foiyynmpifrpbcymjrgw`, or
- add GitHub secret `SUPABASE_ACCESS_TOKEN` with permission to deploy to that project.

Do not paste or commit the token.
