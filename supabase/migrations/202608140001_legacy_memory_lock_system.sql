-- Legacy Memory Lock system
-- Guiding principle: Preserve what the person said. Let the family add what they remember. Never rewrite history.

create extension if not exists pgcrypto;

do $$ begin
  create type public.account_state as enum ('ACTIVE','LEGACY_PENDING','LEGACY','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.legacy_event_type as enum ('STORY_PRESERVED','LEGACY_STATUS_REQUESTED','LEGACY_STATUS_APPROVED','LEGACY_STATUS_REJECTED','LEGACY_CUSTODIAN_CHANGED','MEMORIAL_VIDEO_ADDED','MEMORIAL_VIDEO_REMOVED','FAMILY_MEMBER_GRANTED_LEGACY_ACCESS','ARCHIVE_CREATED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.legacy_custodian_role as enum ('PRIMARY_NEXT_OF_KIN','BACKUP_NEXT_OF_KIN','LEGACY_CUSTODIAN');
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.memory_type add value if not exists 'memorial';
exception when duplicate_object then null; end $$;

alter table public.people
  add column if not exists account_state public.account_state not null default 'ACTIVE',
  add column if not exists legacy_profile_id uuid,
  add column if not exists legacy_requested_at timestamptz,
  add column if not exists legacy_approved_at timestamptz,
  add column if not exists legacy_approved_by uuid references public.profiles(id),
  add column if not exists archived_at timestamptz;

create table if not exists public.legacy_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id),
  account_state public.account_state not null default 'ACTIVE',
  original_story_current_draft text,
  original_story_preserved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preserved_at timestamptz,
  legacy_requested_at timestamptz,
  legacy_approved_at timestamptz,
  archived_at timestamptz,
  unique(family_id, person_id),
  unique(owner_user_id)
);
comment on table public.legacy_profiles is 'Person-level legacy state. ACTIVE, LEGACY_PENDING, LEGACY, and ARCHIVED are controlled states; family members cannot instantly declare another person deceased.';

create table if not exists public.legacy_custodians_v2 (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  legacy_profile_id uuid not null references public.legacy_profiles(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id),
  custodian_person_id uuid references public.people(id),
  custodian_user_id uuid references public.profiles(id),
  role public.legacy_custodian_role not null,
  relationship_label text,
  authorization_scope text[] not null default array['legacy:request','memorial:create'],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (custodian_person_id is not null or custodian_user_id is not null)
);
comment on table public.legacy_custodians_v2 is 'Primary Next of Kin, Backup Next of Kin, and Legacy Custodian authorization. It never grants full account ownership automatically.';

create table if not exists public.legacy_locks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  legacy_profile_id uuid not null references public.legacy_profiles(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  original_story text not null,
  original_version int not null default 1,
  content_hash text not null,
  created_at timestamptz not null default now(),
  preserved_at timestamptz not null default now(),
  immutable boolean not null default true,
  unique(legacy_profile_id, original_version),
  unique(legacy_profile_id, content_hash),
  check (immutable is true),
  check (content_hash = encode(digest(original_story || '|' || creator_id::text || '|' || original_version::text, 'sha256'), 'hex'))
);
comment on table public.legacy_locks is 'Immutable Original Story — Preserved. No family member, next of kin, custodian, or app administrator should edit, replace, or delete these rows.';

create table if not exists public.legacy_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  legacy_profile_id uuid not null references public.legacy_profiles(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type public.legacy_event_type not null,
  previous_state public.account_state,
  new_state public.account_state,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.legacy_events is 'Controlled timeline for preservation, legacy requests, approvals, custodian changes, memorial media, and archive creation.';

create table if not exists public.memorial_media (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  legacy_profile_id uuid not null references public.legacy_profiles(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete restrict,
  creator_id uuid not null references public.profiles(id),
  media_id uuid references public.memory_media(id) on delete set null,
  title text not null default 'Memorial Video',
  description text,
  memorial_date date,
  location text,
  contributors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check (title <> '')
);
comment on table public.memorial_media is 'Funeral, memorial service, celebration-of-life, photo, and tribute media. Always a NEW MEMORIAL memory; never replaces the original life story.';

create table if not exists public.legacy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete set null,
  legacy_profile_id uuid references public.legacy_profiles(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action public.legacy_event_type not null,
  target_table text,
  target_id uuid,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.legacy_audit_logs is 'Append-only legacy audit log. Ordinary users may not modify audit records.';

create index if not exists legacy_profiles_family_person_idx on public.legacy_profiles(family_id, person_id);
create index if not exists legacy_profiles_state_idx on public.legacy_profiles(account_state);
create index if not exists legacy_custodians_v2_profile_idx on public.legacy_custodians_v2(legacy_profile_id, role, active);
create index if not exists legacy_locks_profile_idx on public.legacy_locks(legacy_profile_id, preserved_at desc);
create index if not exists legacy_events_profile_idx on public.legacy_events(legacy_profile_id, created_at desc);
create index if not exists memorial_media_profile_idx on public.memorial_media(legacy_profile_id, created_at desc);
create index if not exists legacy_audit_logs_profile_idx on public.legacy_audit_logs(legacy_profile_id, created_at desc);

create or replace function public.is_legacy_owner(target_legacy_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.legacy_profiles lp where lp.id = target_legacy_profile_id and lp.owner_user_id = auth.uid());
$$;

create or replace function public.is_authorized_legacy_actor(target_legacy_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.legacy_profiles lp
    left join public.legacy_custodians_v2 lc on lc.legacy_profile_id = lp.id and lc.active
    left join public.family_members fm on fm.family_id = lp.family_id and fm.user_id = auth.uid() and fm.status = 'active'
    where lp.id = target_legacy_profile_id
      and (
        lp.owner_user_id = auth.uid()
        or public.is_family_manager(lp.family_id)
        or lc.custodian_user_id = auth.uid()
        or lc.custodian_person_id = fm.person_id
      )
  );
$$;

create or replace function public.is_legacy_transition_actor(target_legacy_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.legacy_profiles lp
    left join public.legacy_custodians_v2 lc on lc.legacy_profile_id = lp.id and lc.active and lc.role in ('PRIMARY_NEXT_OF_KIN','BACKUP_NEXT_OF_KIN','LEGACY_CUSTODIAN')
    left join public.family_members fm on fm.family_id = lp.family_id and fm.user_id = auth.uid() and fm.status = 'active'
    where lp.id = target_legacy_profile_id
      and (
        public.is_family_manager(lp.family_id)
        or lc.custodian_user_id = auth.uid()
        or lc.custodian_person_id = fm.person_id
      )
  );
$$;

create or replace function public.append_legacy_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.legacy_audit_logs(family_id, legacy_profile_id, actor_user_id, action, target_table, target_id, previous_state, new_state, metadata)
  values (
    coalesce(new.family_id, old.family_id),
    coalesce(new.legacy_profile_id, old.legacy_profile_id),
    auth.uid(),
    coalesce(new.event_type, 'STORY_PRESERVED'::public.legacy_event_type),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    jsonb_build_object('operation', tg_op)
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_legacy_lock_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Original Story — Preserved cannot be edited, replaced, or deleted';
end;
$$;

create or replace function public.prevent_preserved_story_profile_mutation()
returns trigger language plpgsql as $$
begin
  if old.original_story_preserved is true and (
    new.original_story_current_draft is distinct from old.original_story_current_draft or
    new.owner_user_id is distinct from old.owner_user_id or
    new.person_id is distinct from old.person_id or
    new.family_id is distinct from old.family_id
  ) then
    raise exception 'Preserved original story ownership and content cannot be modified';
  end if;
  return new;
end;
$$;

create or replace function public.preserve_original_story(target_legacy_profile_id uuid, story text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  profile_row public.legacy_profiles%rowtype;
  lock_id uuid;
  hash_value text;
begin
  select * into profile_row from public.legacy_profiles where id = target_legacy_profile_id for update;
  if not found then raise exception 'Legacy profile not found'; end if;
  if profile_row.owner_user_id <> auth.uid() then raise exception 'Only the original owner can preserve their own story'; end if;
  if profile_row.original_story_preserved then raise exception 'Original Story — Preserved already exists'; end if;
  if nullif(trim(story), '') is null then raise exception 'Original story cannot be empty'; end if;

  hash_value := encode(digest(story || '|' || profile_row.owner_user_id::text || '|1', 'sha256'), 'hex');

  insert into public.legacy_locks(family_id, legacy_profile_id, person_id, creator_id, original_story, original_version, content_hash)
  values(profile_row.family_id, profile_row.id, profile_row.person_id, profile_row.owner_user_id, story, 1, hash_value)
  returning id into lock_id;

  update public.legacy_profiles
  set original_story_preserved = true,
      original_story_current_draft = null,
      preserved_at = now(),
      updated_at = now()
  where id = profile_row.id;

  insert into public.legacy_events(family_id, legacy_profile_id, person_id, actor_user_id, event_type, target_table, target_id, metadata)
  values(profile_row.family_id, profile_row.id, profile_row.person_id, auth.uid(), 'STORY_PRESERVED', 'legacy_locks', lock_id, jsonb_build_object('label','Original Story — Preserved'));

  return lock_id;
end;
$$;

create or replace function public.request_legacy_status(target_legacy_profile_id uuid, reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  profile_row public.legacy_profiles%rowtype;
  event_id uuid;
begin
  select * into profile_row from public.legacy_profiles where id = target_legacy_profile_id for update;
  if not found then raise exception 'Legacy profile not found'; end if;
  if not public.is_legacy_transition_actor(target_legacy_profile_id) then raise exception 'Legacy status request requires authorized next of kin, custodian, or family manager'; end if;
  if profile_row.account_state not in ('ACTIVE','LEGACY_PENDING') then raise exception 'Legacy request is not valid for this account state'; end if;

  update public.legacy_profiles set account_state = 'LEGACY_PENDING', legacy_requested_at = now(), updated_at = now() where id = profile_row.id;
  update public.people set account_state = 'LEGACY_PENDING', legacy_requested_at = now(), legacy_profile_id = profile_row.id, updated_at = now() where id = profile_row.person_id;

  insert into public.legacy_events(family_id, legacy_profile_id, person_id, actor_user_id, event_type, previous_state, new_state, metadata)
  values(profile_row.family_id, profile_row.id, profile_row.person_id, auth.uid(), 'LEGACY_STATUS_REQUESTED', profile_row.account_state, 'LEGACY_PENDING', jsonb_build_object('reason', reason)) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.approve_legacy_status(target_legacy_profile_id uuid, approval_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  profile_row public.legacy_profiles%rowtype;
  event_id uuid;
begin
  select * into profile_row from public.legacy_profiles where id = target_legacy_profile_id for update;
  if not found then raise exception 'Legacy profile not found'; end if;
  if not public.is_family_manager(profile_row.family_id) then raise exception 'Legacy status approval requires configured family authorization'; end if;
  if profile_row.account_state <> 'LEGACY_PENDING' then raise exception 'Legacy status must be requested before approval'; end if;
  if not profile_row.original_story_preserved then raise exception 'Original Story — Preserved is required before Legacy Mode'; end if;

  update public.legacy_profiles set account_state = 'LEGACY', legacy_approved_at = now(), updated_at = now() where id = profile_row.id;
  update public.people set account_state = 'LEGACY', legacy_approved_at = now(), legacy_approved_by = auth.uid(), legacy_profile_id = profile_row.id, updated_at = now() where id = profile_row.person_id;

  insert into public.legacy_events(family_id, legacy_profile_id, person_id, actor_user_id, event_type, previous_state, new_state, metadata)
  values(profile_row.family_id, profile_row.id, profile_row.person_id, auth.uid(), 'LEGACY_STATUS_APPROVED', 'LEGACY_PENDING', 'LEGACY', jsonb_build_object('approval_note', approval_note)) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.add_memorial_memory(target_legacy_profile_id uuid, memory_row_id uuid, media_row_id uuid default null, title text default 'Memorial Video')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  profile_row public.legacy_profiles%rowtype;
  memory_row public.memories%rowtype;
  memorial_id uuid;
begin
  select * into profile_row from public.legacy_profiles where id = target_legacy_profile_id;
  if not found then raise exception 'Legacy profile not found'; end if;
  if profile_row.account_state <> 'LEGACY' then raise exception 'ADD FUNERAL / MEMORIAL VIDEO is available only after Legacy Mode is activated'; end if;
  if not public.is_legacy_transition_actor(target_legacy_profile_id) then raise exception 'Only authorized Next of Kin or Legacy Custodian may add memorial media'; end if;
  select * into memory_row from public.memories where id = memory_row_id and family_id = profile_row.family_id;
  if not found then raise exception 'Memorial memory not found'; end if;
  if memory_row.creator_id <> auth.uid() then raise exception 'Memorial memory creator must match the actor'; end if;
  if memory_row.person_id <> profile_row.person_id then raise exception 'Memorial memory must be associated with the legacy person'; end if;
  if memory_row.memory_type <> 'memorial' then raise exception 'memory_type must be MEMORIAL'; end if;

  insert into public.memorial_media(family_id, legacy_profile_id, person_id, memory_id, creator_id, media_id, title, description, memorial_date, location)
  values(profile_row.family_id, profile_row.id, profile_row.person_id, memory_row.id, auth.uid(), media_row_id, coalesce(nullif(title,''),'Memorial Video'), memory_row.description, memory_row.memory_date, memory_row.location)
  returning id into memorial_id;

  insert into public.legacy_events(family_id, legacy_profile_id, person_id, actor_user_id, event_type, target_table, target_id, metadata)
  values(profile_row.family_id, profile_row.id, profile_row.person_id, auth.uid(), 'MEMORIAL_VIDEO_ADDED', 'memorial_media', memorial_id, jsonb_build_object('display','Memorial Video'));

  return memorial_id;
end;
$$;

drop trigger if exists legacy_locks_no_update on public.legacy_locks;
create trigger legacy_locks_no_update before update on public.legacy_locks for each row execute function public.prevent_legacy_lock_mutation();
drop trigger if exists legacy_locks_no_delete on public.legacy_locks;
create trigger legacy_locks_no_delete before delete on public.legacy_locks for each row execute function public.prevent_legacy_lock_mutation();
drop trigger if exists legacy_profiles_preserved_guard on public.legacy_profiles;
create trigger legacy_profiles_preserved_guard before update on public.legacy_profiles for each row execute function public.prevent_preserved_story_profile_mutation();
drop trigger if exists legacy_profiles_touch on public.legacy_profiles;
create trigger legacy_profiles_touch before update on public.legacy_profiles for each row execute function public.touch_updated_at();
drop trigger if exists legacy_custodians_v2_touch on public.legacy_custodians_v2;
create trigger legacy_custodians_v2_touch before update on public.legacy_custodians_v2 for each row execute function public.touch_updated_at();
drop trigger if exists legacy_events_audit on public.legacy_events;
create trigger legacy_events_audit after insert on public.legacy_events for each row execute function public.append_legacy_audit();

alter table public.legacy_profiles enable row level security;
alter table public.legacy_custodians_v2 enable row level security;
alter table public.legacy_events enable row level security;
alter table public.legacy_locks enable row level security;
alter table public.memorial_media enable row level security;
alter table public.legacy_audit_logs enable row level security;

drop policy if exists legacy_profiles_authorized_read on public.legacy_profiles;
create policy legacy_profiles_authorized_read on public.legacy_profiles for select using (public.is_family_member(family_id));
drop policy if exists legacy_profiles_owner_insert on public.legacy_profiles;
create policy legacy_profiles_owner_insert on public.legacy_profiles for insert with check (owner_user_id = auth.uid() and public.is_family_member(family_id));
drop policy if exists legacy_profiles_owner_draft_update on public.legacy_profiles;
create policy legacy_profiles_owner_draft_update on public.legacy_profiles for update using (owner_user_id = auth.uid() and original_story_preserved is false) with check (owner_user_id = auth.uid() and original_story_preserved is false);

drop policy if exists legacy_custodians_v2_authorized_read on public.legacy_custodians_v2;
create policy legacy_custodians_v2_authorized_read on public.legacy_custodians_v2 for select using (public.is_family_member(family_id));
drop policy if exists legacy_custodians_v2_owner_manager_write on public.legacy_custodians_v2;
create policy legacy_custodians_v2_owner_manager_write on public.legacy_custodians_v2 for all using (owner_user_id = auth.uid() or public.is_family_manager(family_id)) with check (owner_user_id = auth.uid() or public.is_family_manager(family_id));

drop policy if exists legacy_locks_authorized_read on public.legacy_locks;
create policy legacy_locks_authorized_read on public.legacy_locks for select using (public.is_family_member(family_id));
-- No UPDATE or DELETE policy exists for legacy_locks. Creation goes through preserve_original_story only.
drop policy if exists legacy_locks_preservation_insert on public.legacy_locks;
create policy legacy_locks_preservation_insert on public.legacy_locks for insert with check (creator_id = auth.uid() and public.is_legacy_owner(legacy_profile_id));

drop policy if exists legacy_events_authorized_read on public.legacy_events;
create policy legacy_events_authorized_read on public.legacy_events for select using (public.is_family_member(family_id));
drop policy if exists legacy_events_no_user_write on public.legacy_events;
create policy legacy_events_no_user_write on public.legacy_events for all using (false) with check (false);

drop policy if exists memorial_media_authorized_read on public.memorial_media;
create policy memorial_media_authorized_read on public.memorial_media for select using (public.is_family_member(family_id));
drop policy if exists memorial_media_authorized_insert on public.memorial_media;
create policy memorial_media_authorized_insert on public.memorial_media for insert with check (creator_id = auth.uid() and public.is_legacy_transition_actor(legacy_profile_id));
drop policy if exists memorial_media_authorized_remove on public.memorial_media;
create policy memorial_media_authorized_remove on public.memorial_media for update using (creator_id = auth.uid() or public.is_family_manager(family_id)) with check (creator_id = auth.uid() or public.is_family_manager(family_id));

drop policy if exists legacy_audit_logs_manager_read on public.legacy_audit_logs;
create policy legacy_audit_logs_manager_read on public.legacy_audit_logs for select using (family_id is not null and public.is_family_manager(family_id));
drop policy if exists legacy_audit_logs_no_user_write on public.legacy_audit_logs;
create policy legacy_audit_logs_no_user_write on public.legacy_audit_logs for all using (false) with check (false);

-- Archive exports must retain original creator and preservation metadata.
alter table public.archive_exports add column if not exists includes_legacy_content boolean not null default true;
alter table public.archive_exports add column if not exists legacy_manifest jsonb not null default jsonb_build_object(
  'retains_original_story', true,
  'retains_original_creator', true,
  'retains_preservation_date', true,
  'separates_family_contributions', true,
  'includes_audit_metadata', true
);
