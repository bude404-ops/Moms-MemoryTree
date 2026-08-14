# Moms MemoryTree Storage Cost Architecture

## Purpose

Moms MemoryTree must scale without losing control of storage cost. This system separates family memory preservation from business economics while keeping both measurable.

It answers:

- How much storage are we using?
- How fast is storage growing?
- How much does each family cost?
- How much revenue does each family generate?
- Are subscription plans profitable?
- Which families are approaching limits?
- What would backups cost?

## Provider architecture

```text
Moms MemoryTree App
  ↓
MediaStorageService
  ↓
MediaStorageProvider interface
  ├─ SupabaseStorageProvider
  └─ FutureStorageProvider
```

Supabase remains the initial provider for authentication, PostgreSQL, RLS, metadata, and storage. Media code is kept behind an abstraction so a cheaper object-storage or backup provider can be added later.

Provider interface expectations:

- `upload()`
- `download()`
- `createSignedUrl()`
- `delete()`
- `exists()`
- `getMetadata()`
- `getUsage()`
- `move()`
- `copy()`

## Configurable plans

Plans live in the centralized app config and in database migrations. They are not scattered through business logic.

Initial values:

| Plan | Storage | Monthly price | Notes |
| --- | ---: | ---: | --- |
| Free | 1 GB | $0.00 | Basic family tree and memories |
| Family | 100 GB | $7.99 | Family sharing, photos, video, audio |
| Family Plus | 500 GB | $19.99 | Advanced storage/search, AI allowance |
| Legacy | 1 TB+ | $49.99 | Large archive and legacy tools |

These are configuration defaults, not final pricing decisions.

Configurable fields include:

- price
- storage limit
- max file size
- max video size
- AI transcription allowance
- backup allowance
- member limits
- feature flags

## Subscription architecture

Database foundation:

- `storage_plans`
- `family_subscriptions`
- `storage_addons`
- `billing_events`

Supported subscription statuses:

- trial
- active
- cancelled
- past_due
- expired

Payment cards are not stored. Payments are not connected yet.

## Storage usage

`storage_usage` tracks active usage by type:

- total via calculated media rows
- video bytes
- image/photo bytes
- audio bytes
- document bytes
- thumbnail bytes
- archive bytes
- bandwidth bytes estimate

Active calculations only count completed, non-deleted media. Failed uploads and deleted media do not count as completed active storage.

## Quota protection

Before an upload starts:

1. Authenticate user.
2. Identify family.
3. Verify membership.
4. Determine subscription plan.
5. Add active storage add-ons.
6. Calculate current active usage.
7. Compare incoming file size with remaining capacity.
8. Reject uploads that exceed quota.

The UI gives an honest reason and offers upgrade/manage actions.

## Warning thresholds

Default configurable warning thresholds:

- 50% informational
- 75% warning
- 90% critical
- 95% urgent
- 100% blocked

## Cost model

Cost assumptions are centralized:

- storage cost per GB-month
- bandwidth cost per GB
- backup cost per GB-month
- request cost
- AI cost per minute
- AI cost per GB
- payment processing percentage
- payment processing fixed fee
- monthly budget thresholds
- currency

All cost values are labeled estimated unless actual provider billing data has been imported.

## Actual vs estimated

The app separates:

- estimated infrastructure cost
- actual provider cost
- revenue
- estimated gross profit
- estimated margin

Estimated cost is not an invoice.

## Creator/Admin dashboard

Private admin analytics include:

- total families
- free families
- paid families
- total storage
- storage by media type
- bandwidth estimate
- estimated infrastructure cost
- monthly recurring revenue estimate
- estimated gross margin
- cost per family
- average storage per paid/free family
- highest storage families
- families approaching limits
- plan profitability
- storage growth forecast
- budget alerts

Normal family users see only their family storage and plan screen.

## Forecasting

Storage forecasting uses usage snapshots when available. Until enough history exists, app-side forecasts are clearly labeled estimates.

Forecast fields:

- current storage
- 30-day growth
- 90-day growth
- 1-year projection
- 3-year projection

## Bandwidth tracking

Bandwidth is currently an estimate. The schema supports bandwidth bytes, but exact costs require provider billing or delivery logs.

## Backup architecture

Independent backups remain foundation only. Backup cost fields exist, but the application must not claim memories are independently backed up until backup jobs and verification exist.

## Archive export

Archive export remains foundation only. Families have an explicit path toward portable archive exports, but no export worker is connected yet.

## Retention and delete protection

Retention policies are configurable:

- grace period
- read-only period
- archive period
- deletion policy
- legacy safeguards

Memories are not automatically deleted solely because payment fails or a subscription expires.

## Security

Server/database authorization remains source of truth.

Never trust client-provided:

- family ID
- storage usage
- subscription tier
- quota
- file size

RLS protects storage metadata, subscription records, add-ons, billing events, alerts, and snapshots.
