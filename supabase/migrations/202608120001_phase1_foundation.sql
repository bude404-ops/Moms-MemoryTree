-- Moms MemoryTree Phase 1 Supabase foundation
-- Reproducible schema, private storage buckets, RLS policies, signed-media authorization helpers, and seed prompts.
-- No secrets belong in migrations.

create extension if not exists pgcrypto;

-- ENUMS
create type public.family_role as enum ('owner','manager','member','contributor','legacy_custodian');
create type public.member_status as enum ('invited','active','removed');
create type public.relationship_type as enum ('parent','child','sibling','spouse','partner');
create type public.memory_type as enum ('video','audio','photo','story','letter','life_lesson','event','family_tradition','recipe','document');
create type public.privacy_level as enum ('private','family','specific_people','descendants','legacy');
create type public.media_type as enum ('photo','video','audio','document');
create type public.legacy_permission_rule as enum ('private_forever','family_after_legacy','descendants_after_legacy','custodian_only','specific_person');
create type public.legacy_message_status as enum ('locked','available','archived','revoked');
create type public.audit_event_type as enum ('memory_created','memory_updated','memory_deleted','permission_changed','family_member_added','family_member_removed','custodian_changed','legacy_request_submitted','legacy_status_changed','archive_exported','backup_performed','media_uploaded','media_access_requested');

-- UPDATED_AT helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- CORE IDENTITY
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'User profile metadata tied to Supabase Auth. Passwords are never stored here.';

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  storage_limit_bytes bigint not null default 536870912000,
  legacy_mode_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.families is 'Family archive ownership unit for memories, people, permissions, storage, backup, and export.';

create table public.people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  birth_date date,
  approximate_birth_year int,
  avatar_path text,
  biography text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.people is 'Family-tree people. Names are display labels, not identity/security keys.';

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  person_id uuid references public.people(id) on delete cascade,
  role public.family_role not null default 'member',
  relationship_label text,
  status public.member_status not null default 'invited',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(family_id, person_id),
  unique(family_id, user_id)
);
comment on table public.family_members is 'Explicit user/person/family connection. Roles never imply all-memory access.';

create table public.family_relationships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  from_person_id uuid not null references public.people(id) on delete cascade,
  to_person_id uuid not null references public.people(id) on delete cascade,
  relationship_type public.relationship_type not null,
  created_at timestamptz not null default now(),
  check (from_person_id <> to_person_id)
);
comment on table public.family_relationships is 'Graph edges supporting many generations through IDs rather than names.';

-- MEMORIES
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  person_id uuid references public.people(id) on delete set null,
  title text not null,
  description text,
  memory_type public.memory_type not null,
  memory_date date,
  approximate_date text,
  location text,
  privacy_level public.privacy_level not null default 'private',
  legacy_permission public.legacy_permission_rule not null default 'private_forever',
  legacy_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.memories is 'Primary memory entity. Large media lives in private Supabase Storage, not PostgreSQL.';

create table public.memory_media (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_bucket text not null default 'family-media',
  storage_path text not null,
  media_type public.media_type not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  duration_seconds numeric,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  unique(storage_bucket, storage_path),
  check (storage_path like ('family/' || family_id::text || '/%'))
);
comment on table public.memory_media is 'Private storage object metadata. Permanent public URLs are not stored.';

create table public.memory_people (
  memory_id uuid not null references public.memories(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  primary key(memory_id, person_id)
);
comment on table public.memory_people is 'Many-to-many people linked to memories.';

create table public.memory_tags (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now()
);
comment on table public.memory_tags is 'Searchable family memory categorization.';

create table public.memory_permissions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  permission text not null default 'view',
  created_at timestamptz not null default now(),
  check (person_id is not null or user_id is not null)
);
comment on table public.memory_permissions is 'Explicit grants for restricted memories.';

create table public.life_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  event_year int,
  event_date date,
  approximate_date text,
  title text not null,
  description text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.life_events is 'Timeline events linked to people and optional memories.';

create table public.story_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question text not null,
  generation_relevance text,
  age_relevance text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.story_questions is 'Guided storytelling prompts managed through data, not hardcoded only.';

-- LEGACY
create table public.legacy_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  recipient_person_id uuid references public.people(id),
  recipient_user_id uuid references public.profiles(id),
  title text not null,
  content text,
  media_memory_id uuid references public.memories(id),
  unlock_date date,
  unlock_condition text,
  status public.legacy_message_status not null default 'locked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.legacy_messages is 'Open When messages. Locked messages must not be readable before conditions are met.';

create table public.legacy_custodians (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id),
  custodian_person_id uuid references public.people(id),
  custodian_user_id uuid references public.profiles(id),
  priority text not null check(priority in ('primary','backup')),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.legacy_custodians is 'Primary/backup custodians. Custodians never receive passwords and do not automatically unlock private memories.';

create table public.legacy_permissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  memory_id uuid references public.memories(id) on delete cascade,
  rule public.legacy_permission_rule not null default 'private_forever',
  specific_person_id uuid references public.people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.legacy_permissions is 'Creator instructions for future controlled Legacy Mode transitions.';

-- OPERATIONS
create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  role public.family_role not null default 'member',
  relationship_label text,
  invited_by uuid not null references public.profiles(id),
  token_hash text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.family_invitations is 'Secure invitation records with hashed tokens only.';

create table public.storage_usage (
  family_id uuid primary key references public.families(id) on delete cascade,
  video_bytes bigint not null default 0,
  photo_bytes bigint not null default 0,
  audio_bytes bigint not null default 0,
  document_bytes bigint not null default 0,
  total_bytes bigint generated always as (video_bytes + photo_bytes + audio_bytes + document_bytes) stored,
  updated_at timestamptz not null default now()
);
comment on table public.storage_usage is 'Family storage tracking from actual media records.';

create table public.backup_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  provider text not null,
  backup_type text not null,
  backup_status text not null default 'not_configured',
  last_successful_backup timestamptz,
  verification_status text not null default 'not_verified',
  bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.backup_records is 'Backup architecture only until an actual independent backup system is configured and verified.';

create table public.archive_exports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  status text not null default 'requested',
  export_path text,
  manifest jsonb not null default '{}'::jsonb,
  bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz
);
comment on table public.archive_exports is 'Portable family archive export tracking.';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type public.audit_event_type not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.audit_logs is 'Security-sensitive action trail without private media contents.';

-- INDEXES
create index on public.family_members(family_id, user_id, status);
create index on public.people(family_id);
create index on public.family_relationships(family_id);
create index on public.memories(family_id, privacy_level, deleted_at);
create index on public.memory_media(family_id, memory_id);
create index on public.memory_permissions(memory_id, user_id, person_id);
create index on public.life_events(family_id, person_id);
create index on public.legacy_messages(family_id, recipient_user_id, status);
create index on public.audit_logs(family_id, created_at desc);

-- TRIGGERS
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger families_touch before update on public.families for each row execute function public.touch_updated_at();
create trigger people_touch before update on public.people for each row execute function public.touch_updated_at();
create trigger family_members_touch before update on public.family_members for each row execute function public.touch_updated_at();
create trigger memories_touch before update on public.memories for each row execute function public.touch_updated_at();
create trigger life_events_touch before update on public.life_events for each row execute function public.touch_updated_at();
create trigger story_questions_touch before update on public.story_questions for each row execute function public.touch_updated_at();
create trigger legacy_messages_touch before update on public.legacy_messages for each row execute function public.touch_updated_at();
create trigger legacy_custodians_touch before update on public.legacy_custodians for each row execute function public.touch_updated_at();
create trigger legacy_permissions_touch before update on public.legacy_permissions for each row execute function public.touch_updated_at();
create trigger family_invitations_touch before update on public.family_invitations for each row execute function public.touch_updated_at();
create trigger backup_records_touch before update on public.backup_records for each row execute function public.touch_updated_at();

-- SECURITY HELPERS
create or replace function public.is_family_member(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.user_id = auth.uid() and fm.status = 'active'
  );
$$;

create or replace function public.is_family_manager(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.user_id = auth.uid() and fm.status = 'active' and fm.role in ('owner','manager')
  );
$$;

create or replace function public.current_person_id(target_family_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select fm.person_id from public.family_members fm where fm.family_id = target_family_id and fm.user_id = auth.uid() and fm.status = 'active' limit 1;
$$;

create or replace function public.is_descendant_of(descendant_person_id uuid, ancestor_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive lineage(person_id) as (
    select fr.to_person_id from public.family_relationships fr where fr.from_person_id = ancestor_person_id and fr.relationship_type = 'parent'
    union
    select fr.to_person_id from public.family_relationships fr join lineage l on fr.from_person_id = l.person_id where fr.relationship_type = 'parent'
  )
  select exists(select 1 from lineage where person_id = descendant_person_id);
$$;

create or replace function public.can_view_memory(target_memory_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.memories m
    left join public.family_members fm on fm.family_id = m.family_id and fm.user_id = auth.uid() and fm.status = 'active'
    where m.id = target_memory_id
      and m.deleted_at is null
      and (
        m.creator_id = auth.uid()
        or (m.privacy_level = 'family' and fm.id is not null)
        or (m.privacy_level = 'specific_people' and exists(select 1 from public.memory_permissions mp where mp.memory_id = m.id and (mp.user_id = auth.uid() or mp.person_id = fm.person_id)))
        or (m.privacy_level = 'descendants' and fm.person_id is not null and m.person_id is not null and public.is_descendant_of(fm.person_id, m.person_id))
        or (m.privacy_level = 'legacy' and m.legacy_status = 'archived' and exists(select 1 from public.legacy_permissions lp where lp.memory_id = m.id and (lp.rule in ('family_after_legacy','descendants_after_legacy') and fm.id is not null or lp.rule = 'custodian_only' and fm.role = 'legacy_custodian' or lp.rule = 'specific_person' and lp.specific_person_id = fm.person_id)))
      )
  );
$$;

create or replace function public.can_access_storage_object(bucket_id text, object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when bucket_id = 'family-avatars' then exists(
      select 1 from public.people p where object_name like ('family/' || p.family_id::text || '/people/' || p.id::text || '/%') and public.is_family_member(p.family_id)
    )
    when bucket_id = 'family-media' then exists(
      select 1 from public.memory_media mm where mm.storage_path = object_name and public.can_view_memory(mm.memory_id)
    )
    when bucket_id = 'family-exports' then exists(
      select 1 from public.archive_exports ae where ae.export_path = object_name and public.is_family_manager(ae.family_id) and ae.expires_at > now()
    )
    else false
  end;
$$;

create or replace function public.authorized_signed_media(media_row_id uuid)
returns table(storage_bucket text, storage_path text, expires_in_seconds int)
language sql stable security definer set search_path = public as $$
  select mm.storage_bucket, mm.storage_path, 300
  from public.memory_media mm
  where mm.id = media_row_id and public.can_view_memory(mm.memory_id);
$$;

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.people enable row level security;
alter table public.family_members enable row level security;
alter table public.family_relationships enable row level security;
alter table public.memories enable row level security;
alter table public.memory_media enable row level security;
alter table public.memory_people enable row level security;
alter table public.memory_tags enable row level security;
alter table public.memory_permissions enable row level security;
alter table public.life_events enable row level security;
alter table public.story_questions enable row level security;
alter table public.legacy_messages enable row level security;
alter table public.legacy_custodians enable row level security;
alter table public.legacy_permissions enable row level security;
alter table public.family_invitations enable row level security;
alter table public.storage_usage enable row level security;
alter table public.backup_records enable row level security;
alter table public.archive_exports enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy story_questions_active_read on public.story_questions for select using (active = true);

create policy families_member_read on public.families for select using (public.is_family_member(id));
create policy families_creator_insert on public.families for insert with check (created_by = auth.uid());
create policy families_manager_update on public.families for update using (public.is_family_manager(id)) with check (public.is_family_manager(id));

create policy people_member_read on public.people for select using (public.is_family_member(family_id));
create policy people_manager_insert on public.people for insert with check (public.is_family_manager(family_id) or created_by = auth.uid());
create policy people_manager_update on public.people for update using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy family_members_member_read on public.family_members for select using (public.is_family_member(family_id));
create policy family_members_self_join_insert on public.family_members for insert with check (user_id = auth.uid() and role = 'owner' and status = 'active');
create policy family_members_manager_insert on public.family_members for insert with check (public.is_family_manager(family_id));
create policy family_members_manager_update on public.family_members for update using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy relationships_member_read on public.family_relationships for select using (public.is_family_member(family_id));
create policy relationships_manager_insert on public.family_relationships for insert with check (public.is_family_manager(family_id));
create policy relationships_manager_update on public.family_relationships for update using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy memories_authorized_read on public.memories for select using (public.can_view_memory(id));
create policy memories_member_insert on public.memories for insert with check (creator_id = auth.uid() and public.is_family_member(family_id));
create policy memories_creator_or_manager_update on public.memories for update using (creator_id = auth.uid() or public.is_family_manager(family_id)) with check (creator_id = auth.uid() or public.is_family_manager(family_id));

create policy memory_media_authorized_read on public.memory_media for select using (public.can_view_memory(memory_id));
create policy memory_media_member_insert on public.memory_media for insert with check (uploaded_by = auth.uid() and public.is_family_member(family_id));

create policy memory_people_member_read on public.memory_people for select using (public.is_family_member(family_id));
create policy memory_people_manager_write on public.memory_people for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy memory_tags_member_read on public.memory_tags for select using (public.is_family_member(family_id));
create policy memory_tags_member_write on public.memory_tags for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy memory_permissions_manager_read on public.memory_permissions for select using (public.is_family_manager(family_id) or public.can_view_memory(memory_id));
create policy memory_permissions_manager_write on public.memory_permissions for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy life_events_member_read on public.life_events for select using (public.is_family_member(family_id));
create policy life_events_manager_write on public.life_events for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy legacy_messages_unlocked_read on public.legacy_messages for select using (creator_id = auth.uid() or (status = 'available' and (recipient_user_id = auth.uid() or public.is_family_manager(family_id))));
create policy legacy_messages_creator_write on public.legacy_messages for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy legacy_custodians_authorized_read on public.legacy_custodians for select using (owner_user_id = auth.uid() or custodian_user_id = auth.uid() or public.is_family_manager(family_id));
create policy legacy_custodians_manager_write on public.legacy_custodians for all using (owner_user_id = auth.uid() or public.is_family_manager(family_id)) with check (owner_user_id = auth.uid() or public.is_family_manager(family_id));
create policy legacy_permissions_authorized_read on public.legacy_permissions for select using (creator_id = auth.uid() or public.is_family_manager(family_id));
create policy legacy_permissions_creator_write on public.legacy_permissions for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy invitations_manager_access on public.family_invitations for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy storage_usage_member_read on public.storage_usage for select using (public.is_family_member(family_id));
create policy storage_usage_service_write on public.storage_usage for all using (false) with check (false);
create policy backup_records_manager_read on public.backup_records for select using (public.is_family_manager(family_id));
create policy archive_exports_manager_read on public.archive_exports for select using (public.is_family_manager(family_id));
create policy archive_exports_manager_insert on public.archive_exports for insert with check (requested_by = auth.uid() and public.is_family_manager(family_id));
create policy audit_logs_manager_read on public.audit_logs for select using (family_id is not null and public.is_family_manager(family_id));

-- PRIVATE STORAGE BUCKETS
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('family-media', 'family-media', false, 10737418240, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mpeg','audio/wav','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('family-avatars', 'family-avatars', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('family-exports', 'family-exports', false, 10737418240, array['application/zip','application/json'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_private_authorized_read on storage.objects for select using (public.can_access_storage_object(bucket_id, name));
create policy storage_family_media_insert on storage.objects for insert with check (
  bucket_id = 'family-media'
  and name like 'family/%/memories/%'
  and exists(
    select 1 from public.memories m
    where name like ('family/' || m.family_id::text || '/memories/' || m.id::text || '/%')
      and public.is_family_member(m.family_id)
  )
);
create policy storage_family_avatars_insert on storage.objects for insert with check (
  bucket_id = 'family-avatars'
  and name like 'family/%/people/%'
  and exists(
    select 1 from public.people p
    where name like ('family/' || p.family_id::text || '/people/' || p.id::text || '/%')
      and public.is_family_manager(p.family_id)
  )
);
create policy storage_family_exports_read on storage.objects for select using (bucket_id = 'family-exports' and public.can_access_storage_object(bucket_id, name));

-- SEED PROMPTS
insert into public.story_questions(category, question, generation_relevance, age_relevance, sort_order) values
('Childhood','What was your childhood home like?','all_descendants','all_ages',1),
('Childhood','What were your parents like?','children_grandchildren','all_ages',2),
('Childhood','What did you do for fun?','children_grandchildren','all_ages',3),
('Childhood','What was your favorite childhood memory?','all_descendants','all_ages',4),
('Teenage Years','What music did you listen to?','children_grandchildren','teen_plus',10),
('Teenage Years','Who were your closest friends?','children_grandchildren','teen_plus',11),
('Teenage Years','What was your first job?','all_descendants','teen_plus',12),
('Love','How did you meet your spouse or partner?','children_grandchildren','adult',20),
('Love','What did love teach you?','all_descendants','teen_plus',21),
('Family','What was it like becoming a parent?','children_grandchildren','adult',30),
('Family','What family traditions should continue?','all_descendants','all_ages',31),
('Life Lessons','What mistakes taught you the most?','all_descendants','teen_plus',40),
('Life Lessons','What would you tell your younger self?','all_descendants','teen_plus',41),
('Legacy','What do you want your descendants to know?','all_descendants','all_ages',50),
('Legacy','What should only be opened later?','specific_recipient','adult',51);
