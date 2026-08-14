# Repository Structure

Moms MemoryTree keeps GitHub as the portable source of truth for code, schemas, tests, documentation, and build configuration.

GitHub must not store private family media, production database records, secrets, passwords, or private credentials.

## Root Files

| Path | Purpose |
|---|---|
| `README.md` | Primary project entry point. |
| `index.html` | Working GitHub Pages visual application prototype. |
| `package.json` / `package-lock.json` | Node project scripts and locked dependencies. |
| `tsconfig.json`, `vite.config.ts`, `eslint.config.js` | Build, TypeScript, and lint configuration. |
| `REAPER_PLATFORM_CAPABILITIES.md` | Reaper platform capability audit required by the master plan. |
| `SUPABASE_TO_REAPER_MIGRATION.md` | Temporary migration map away from Supabase runtime dependency. |
| `MOMS_MEMORYTREE_MASTER_DEVELOPMENT_PLAN.md` | Master staged development plan. |
| `DEVELOPMENT_STATUS.md` | Current implementation state and next stage. |
| `ROADMAP.md` | Product roadmap. |
| `SECURITY.md` | Security boundary and disclosure guidance. |

## Source Directories

| Directory | Purpose |
|---|---|
| `src/` | React/TypeScript app source, domain models, services, tests, and UI pages. |
| `assets/` | Small committed application assets only. No private user uploads. |
| `public/` | Public static assets intended for the web app. |
| `database/` | Portable database placeholders and future non-provider-specific migrations. |
| `supabase/` | Temporary provider-specific migrations/functions retained until the Supabase-to-Reaper migration is complete. |
| `scripts/` | Validation, deployment-safety, and provider utility scripts. |
| `.github/` | GitHub Actions workflow configuration. |
| `docs/` | Documentation, stage reports, provider notes, architecture notes, and static documentation pages. |

## Documentation Organization

| Directory | Purpose |
|---|---|
| `docs/architecture/` | Architecture and storage design documents. |
| `docs/providers/` | Provider-specific setup notes retained for migration and fallback planning. |
| `docs/workflows/` | Example workflow files and workflow notes. |
| `docs/STAGE_*` | Stage reports and stage baselines. |

## Generated Local Files

These may exist locally but must not be committed:

- `node_modules/`
- `dist/`
- `coverage/`
- `.env`, `.env.local`, `.env.*.local`
- `.supabase/`
- temporary uploads or private media
- screenshots and local test artifacts

## Cleanup Rule

Before each new stage:

1. Run `git status --short`.
2. Remove generated local artifacts.
3. Keep private media and credentials out of the repository.
4. Keep provider-specific code documented as temporary if it remains.
5. Run validation.
6. Commit and push cleanup separately from feature work.
