-- Moms MemoryTree storage, cost, and subscription management
-- Centralizes pricing, quotas, costs, subscriptions, add-ons, alerts, and retention policy foundations.

create type public.subscription_status as enum ('trial','active','cancelled','past_due','expired');
create type public.billing_event_type as enum ('subscription_started','subscription_renewed','subscription_cancelled','addon_added','payment_failed','manual_adjustment');
create type public.storage_alert_severity as enum ('info','warning','critical','urgent','blocked');

alter table public.storage_plans
  add column if not exists monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  add column if not exists currency text not null default 'USD',
  add column if not exists max_file_bytes bigint,
  add column if not exists max_video_bytes bigint,
  add column if not exists ai_transcription_minutes integer not null default 0,
  add column if not exists backup_allowance_bytes bigint not null default 0,
  add column if not exists max_family_members integer,
  add column if not exists features jsonb not null default '{}'::jsonb,
  add column if not exists sort_order integer not null default 0;

update public.storage_plans set
  monthly_price_cents = case id when 'free' then 0 when 'family' then 799 when 'family_plus' then 1999 when 'legacy' then 4999 else monthly_price_cents end,
  currency = 'USD',
  max_file_bytes = case id when 'free' then 524288000 when 'family' then 5368709120 when 'family_plus' then 10737418240 when 'legacy' then 53687091200 else max_file_bytes end,
  max_video_bytes = case id when 'free' then 524288000 when 'family' then 5368709120 when 'family_plus' then 10737418240 when 'legacy' then 53687091200 else max_video_bytes end,
  ai_transcription_minutes = case id when 'free' then 0 when 'family' then 60 when 'family_plus' then 300 when 'legacy' then 1200 else ai_transcription_minutes end,
  backup_allowance_bytes = case id when 'legacy' then quota_bytes else 0 end,
  max_family_members = case id when 'free' then 5 else null end,
  features = case id
    when 'free' then '{"basic_family_tree":true,"basic_memories":true,"payments_not_connected":true}'::jsonb
    when 'family' then '{"unlimited_family_members":true,"photos":true,"videos":true,"audio":true,"family_sharing":true,"payments_not_connected":true}'::jsonb
    when 'family_plus' then '{"advanced_storage":true,"advanced_search":true,"ai_transcription_allowance":true,"payments_not_connected":true}'::jsonb
    when 'legacy' then '{"large_family_archive":true,"legacy_preservation":true,"advanced_archive_tools":true,"payments_not_connected":true}'::jsonb
    else features end,
  sort_order = case id when 'free' then 10 when 'family' then 20 when 'family_plus' then 30 when 'legacy' then 40 else sort_order end;

create table if not exists public.family_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  plan_id text not null references public.storage_plans(id),
  status public.subscription_status not null default 'trial',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_provider text,
  payment_customer_ref text,
  payment_subscription_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(family_id)
);
create trigger family_subscriptions_touch before update on public.family_subscriptions for each row execute function public.touch_updated_at();

create table if not exists public.storage_addons (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  label text not null,
  additional_bytes bigint not null check (additional_bytes > 0),
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  currency text not null default 'USD',
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger storage_addons_touch before update on public.storage_addons for each row execute function public.touch_updated_at();

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete set null,
  subscription_id uuid references public.family_subscriptions(id) on delete set null,
  event_type public.billing_event_type not null,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  provider text,
  provider_event_ref text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.cost_assumptions (
  id text primary key default 'default',
  storage_cost_per_gb_month numeric(12,6) not null default 0,
  bandwidth_cost_per_gb numeric(12,6) not null default 0,
  backup_cost_per_gb_month numeric(12,6) not null default 0,
  request_cost_per_1000 numeric(12,6) not null default 0,
  ai_cost_per_minute numeric(12,6) not null default 0,
  ai_cost_per_gb numeric(12,6) not null default 0,
  payment_processing_percentage numeric(8,4) not null default 0,
  payment_processing_fixed_fee_cents integer not null default 0,
  monthly_budget_cents integer not null default 0,
  budget_warning_pct numeric(5,2) not null default 75,
  budget_critical_pct numeric(5,2) not null default 90,
  budget_emergency_pct numeric(5,2) not null default 100,
  currency text not null default 'USD',
  is_active boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.cost_assumptions(id, currency, is_active) values ('default','USD',true) on conflict (id) do nothing;

create table if not exists public.storage_warning_thresholds (
  id text primary key,
  percent_used numeric(5,2) not null check (percent_used >= 0 and percent_used <= 100),
  severity public.storage_alert_severity not null,
  message_template text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.storage_warning_thresholds(id, percent_used, severity, message_template) values
  ('info_50',50,'info','Your family has used more than 50% of its storage.'),
  ('warning_75',75,'warning','Your family has used more than 75% of its storage.'),
  ('critical_90',90,'critical','Your family has used more than 90% of its storage.'),
  ('urgent_95',95,'urgent','Your family has used more than 95% of its storage.'),
  ('blocked_100',100,'blocked','Your family storage is full. Uploads are blocked until you free space or upgrade.')
on conflict (id) do update set percent_used = excluded.percent_used, severity = excluded.severity, message_template = excluded.message_template, active = true;

create table if not exists public.storage_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  total_bytes bigint not null default 0,
  video_bytes bigint not null default 0,
  image_bytes bigint not null default 0,
  audio_bytes bigint not null default 0,
  document_bytes bigint not null default 0,
  thumbnail_bytes bigint not null default 0,
  archive_bytes bigint not null default 0,
  bandwidth_bytes bigint not null default 0,
  captured_at timestamptz not null default now()
);

create table if not exists public.storage_alerts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  severity public.storage_alert_severity not null,
  alert_type text not null,
  message text not null,
  metric_value numeric,
  threshold_value numeric,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.retention_policies (
  id text primary key default 'default',
  grace_period_days integer not null default 30,
  read_only_period_days integer not null default 60,
  archive_period_days integer not null default 365,
  deletion_policy text not null default 'manual_review_required',
  legacy_extra_safeguards boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.retention_policies(id) values ('default') on conflict (id) do nothing;

alter table public.storage_usage
  add column if not exists thumbnail_bytes bigint not null default 0,
  add column if not exists archive_bytes bigint not null default 0,
  add column if not exists bandwidth_bytes bigint not null default 0;

alter table public.memory_media add column if not exists storage_provider text;
update public.memory_media set storage_provider = coalesce(storage_provider, provider, 'supabase') where storage_provider is null;

create or replace function public.family_total_storage_limit_bytes(target_family_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sp.quota_bytes, f.storage_limit_bytes, 0)
       + coalesce((select sum(sa.additional_bytes) from public.storage_addons sa where sa.family_id = f.id and sa.status in ('trial','active')), 0)
  from public.families f
  left join public.family_subscriptions fs on fs.family_id = f.id and fs.status in ('trial','active','past_due')
  left join public.storage_plans sp on sp.id = coalesce(fs.plan_id, f.storage_plan_id) and sp.active = true
  where f.id = target_family_id;
$$;

create or replace function public.family_storage_limit_bytes(target_family_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(public.family_total_storage_limit_bytes(target_family_id), 536870912000);
$$;

create or replace function public.calculate_family_storage_usage(target_family_id uuid)
returns table(total_bytes bigint, video_bytes bigint, image_bytes bigint, audio_bytes bigint, document_bytes bigint, thumbnail_bytes bigint, archive_bytes bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(mm.file_size),0)::bigint,
         coalesce(sum(case when mm.media_type='video' then mm.file_size else 0 end),0)::bigint,
         coalesce(sum(case when mm.media_type='photo' then mm.file_size else 0 end),0)::bigint,
         coalesce(sum(case when mm.media_type='audio' then mm.file_size else 0 end),0)::bigint,
         coalesce(sum(case when mm.media_type='document' then mm.file_size else 0 end),0)::bigint,
         coalesce(sum(coalesce(mm.file_size,0)) filter (where mm.thumbnail_path is not null),0)::bigint * 0,
         coalesce((select sum(coalesce(ae.file_size,0)) from public.archive_exports ae where ae.family_id = target_family_id),0)::bigint
  from public.memory_media mm
  where mm.family_id = target_family_id and mm.upload_status='completed' and mm.deleted_at is null;
$$;

create or replace view public.family_storage_overview as
select f.id as family_id,
       f.name as family_name,
       coalesce(fs.plan_id, f.storage_plan_id, 'family_plus') as plan_id,
       sp.label as plan_label,
       sp.monthly_price_cents,
       coalesce(u.total_bytes,0) as total_bytes,
       public.family_storage_limit_bytes(f.id) as limit_bytes,
       greatest(public.family_storage_limit_bytes(f.id) - coalesce(u.total_bytes,0), 0) as remaining_bytes,
       case when public.family_storage_limit_bytes(f.id) > 0 then round((coalesce(u.total_bytes,0)::numeric / public.family_storage_limit_bytes(f.id)::numeric) * 100, 2) else 0 end as percent_used,
       coalesce(u.video_bytes,0) as video_bytes,
       coalesce(u.photo_bytes,0) as image_bytes,
       coalesce(u.audio_bytes,0) as audio_bytes,
       coalesce(u.document_bytes,0) as document_bytes,
       coalesce(u.thumbnail_bytes,0) as thumbnail_bytes,
       coalesce(u.archive_bytes,0) as archive_bytes,
       coalesce(u.bandwidth_bytes,0) as bandwidth_bytes
from public.families f
left join public.family_subscriptions fs on fs.family_id = f.id and fs.status in ('trial','active','past_due')
left join public.storage_plans sp on sp.id = coalesce(fs.plan_id, f.storage_plan_id)
left join public.storage_usage u on u.family_id = f.id;

alter table public.family_subscriptions enable row level security;
alter table public.storage_addons enable row level security;
alter table public.billing_events enable row level security;
alter table public.cost_assumptions enable row level security;
alter table public.storage_warning_thresholds enable row level security;
alter table public.storage_usage_snapshots enable row level security;
alter table public.storage_alerts enable row level security;
alter table public.retention_policies enable row level security;

create policy family_subscriptions_member_read on public.family_subscriptions for select using (public.is_family_member(family_id));
create policy family_subscriptions_manager_write on public.family_subscriptions for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy storage_addons_member_read on public.storage_addons for select using (public.is_family_member(family_id));
create policy storage_addons_manager_write on public.storage_addons for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy billing_events_manager_read on public.billing_events for select using (family_id is not null and public.is_family_manager(family_id));
create policy storage_usage_snapshots_member_read on public.storage_usage_snapshots for select using (public.is_family_member(family_id));
create policy storage_alerts_member_read on public.storage_alerts for select using (family_id is not null and public.is_family_member(family_id));
create policy storage_alerts_manager_update on public.storage_alerts for update using (family_id is not null and public.is_family_manager(family_id)) with check (family_id is not null and public.is_family_manager(family_id));
create policy cost_assumptions_no_family_read on public.cost_assumptions for select using (false);
create policy storage_warning_thresholds_public_read on public.storage_warning_thresholds for select using (active = true);
create policy retention_policies_authenticated_read on public.retention_policies for select to authenticated using (auth.uid() is not null);
