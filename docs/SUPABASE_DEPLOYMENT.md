# Supabase Deployment

This document covers deployment of the Moms MemoryTree Supabase backend foundation from GitHub.

GitHub remains the source of truth for:

- Supabase configuration
- Database migrations
- RLS policies
- Private storage bucket definitions
- Edge Functions
- Validation scripts

## Required GitHub secrets

Configure these in the repository or environment used for deployment:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_LIVE_URL`
- `SUPABASE_LIVE_PUBLISHABLE_KEY`
- `SUPABASE_LIVE_TEST_PASSWORD`

Optional if email confirmation is enabled and test users are pre-created:

- `SUPABASE_LIVE_TEST_EMAIL_A`
- `SUPABASE_LIVE_TEST_EMAIL_B`

Never commit these values.

## Manual local deployment

Prerequisites:

- Supabase CLI installed
- Supabase CLI authenticated
- `SUPABASE_PROJECT_REF` available in your shell
- Live verification env vars available if running the verification harness

Preflight only:

```bash
npm run deploy:supabase
```

Deploy migrations and Edge Function:

```bash
npm run deploy:supabase -- --deploy
```

Deploy and run live Family A / Family B verification:

```bash
npm run deploy:supabase:run
```

## GitHub Actions deployment

Workflow template:

```text
docs/workflows/supabase.yml.example
```

Copy it to `.github/workflows/supabase.yml` with a GitHub credential that has workflow scope.

Behavior:

- Push and pull requests run `npm run validate` only.
- Manual `workflow_dispatch` can deploy Supabase when `deploy_supabase=true`.
- Manual deployment can optionally run live verification when `run_live_verification=true`.
- Deployment uses GitHub secrets and the Supabase CLI action.
- No secrets are stored in repository files.

## Deployment order

1. Checkout repository.
2. Install Node dependencies.
3. Run full validation.
4. Install Supabase CLI.
5. Link Supabase project.
6. Push migrations.
7. Deploy `signed-media-access` Edge Function.
8. Optionally run live verification harness.

## Required post-deployment checks

Run the live harness before trusting production privacy boundaries:

```bash
npm run verify:live-supabase
```

It proves cross-family and private-media denials through real Supabase Auth, PostgreSQL RLS, private Storage, and signed media access.

## Failure policy

If any deployment or verification step fails:

- Do not claim Supabase is fully connected.
- Do not claim media is protected by live private storage.
- Do not claim backup exists.
- Fix the failed migration, RLS policy, storage policy, or Edge Function first.
- Re-run validation and live verification.

## Backup boundary

Deployment of this foundation does not create an independent backup provider. Backup remains architecture-only until a separate provider, backup job, verification record, and restore/export test exist.
