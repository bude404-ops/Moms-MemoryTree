-- Moms MemoryTree Phase 1 foundation
-- Purpose: family-owned private legacy archive with per-memory permissions and future continuity architecture.

create extension if not exists pgcrypto;

create type public.family_role as enum ('family_member','contributor','family_manager','legacy_custodian');
create type public.member_status as enum ('invited','active','removed');
create type public.relationship_type as enum ('parent','child','grandparent','grandchild','sibling','spouse','partner');
create type public.memory_type as enum ('video','audio','photo','story','letter','life_lesson','event','family_tradition','recipe','important_document');
create type public.privacy_level as enum ('private','family','specific_people','descendants','legacy');
create type public.media_type as enum ('photo','video','audio','document');
create type public.legacy_permission_rule as enum ('private_forever','family_after_legacy_activation','descendants_after_legacy_activation','custodian_only','specific_person');
create type public.audit_event_type as enum ('memory_created','memory_updated','memory_deleted','permission_changed','family_member_added','family_member_removed','custodian_changed','legacy_request_submitted','legacy_status_changed','archive_exported','backup_performed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'User profile metadata separate from authentication credentials.';

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  storage_limit_bytes bigint not null default 536870912000,
  legacy_mode_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.families is 'Central ownership unit for family archive, permissions, storage, backup, and export configuration.';

create table public.people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  birth_date date,
  approximate_birth_year int,
  profile_photo_path text,
  biography text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.people is 'Family-tree person records. Names are display labels, never unique identifiers.';

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  person_id uuid not null references public.people(id) on delete cascade,
  role public.family_role not null default 'family_member',
  relationship_label text,
  permissions text[] not null default '{}',
  status public.member_status not null default 'invited',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique(family_id, person_id),
  unique(family_id, user_id)
);
comment on table public.family_members is 'Explicit family membership and role/permission records. Relationship names do not imply permissions.';

create table public.family_relationships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  from_person_id uuid not null references public.people(id) on delete cascade,
  to_person_id uuid not null references public.people(id) on delete cascade,
  relationship_type public.relationship_type not null,
  created_at timestamptz not null default now(),
  check (from_person_id <> to_person_id)
);
comment on table public.family_relationships is 'Scalable graph edges for parent, child, grandparent, sibling, spouse, and partner relationships.';

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  associated_person_id uuid references public.people(id) on delete set null,
  title text not null,
  description text,
  memory_type public.memory_type not null,
  memory_date date,
  approximate_date text,
  location_text text,
  category text,
  privacy public.privacy_level not null default 'private',
  legacy_permission public.legacy_permission_rule not null default 'private_forever',
  legacy_status text not null default 'active',
  soft_deleted_at timestamptz,
  deletion_eligible_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.memories is 'Universal memory records for video, audio, photos, stories, letters, lessons, events, traditions, recipes, and documents.';

create table public.memory_media (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  media_type public.media_type not null,
  storage_bucket text not null default 'family-media',
  storage_path text not null,
  mime_type text,
  bytes bigint not null default 0,
  checksum_sha256 text,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);
comment on table public.memory_media is 'Private object storage references and metadata. Large media is never stored in PostgreSQL.';

create table public.memory_people (memory_id uuid references public.memories(id) on delete cascade, person_id uuid references public.people(id) on delete cascade, family_id uuid not null references public.families(id) on delete cascade, primary key(memory_id, person_id));
comment on table public.memory_people is 'People involved in each memory.';

create table public.memory_tags (id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memories(id) on delete cascade, family_id uuid not null references public.families(id) on delete cascade, tag text not null);
comment on table public.memory_tags is 'Searchable family-defined memory tags.';

create table public.memory_permissions (id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memories(id) on delete cascade, family_id uuid not null references public.families(id) on delete cascade, person_id uuid references public.people(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, permission text not null default 'view', created_at timestamptz not null default now());
comment on table public.memory_permissions is 'Specific-person access grants for memories whose privacy is specific_people.';

create table public.life_events (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, person_id uuid not null references public.people(id) on delete cascade, memory_id uuid references public.memories(id) on delete set null, event_year int, event_date date, approximate_date text, title text not null, description text, location_text text, created_at timestamptz not null default now());
comment on table public.life_events is 'Chronological life timeline events linked to people, memories, locations, and media.';

create table public.story_questions (id uuid primary key default gen_random_uuid(), category text not null, question text not null, sort_order int not null default 0, active boolean not null default true, created_at timestamptz not null default now());
comment on table public.story_questions is 'Structured guided storytelling prompts that can grow without code changes.';

create table public.legacy_messages (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, creator_id uuid not null references public.profiles(id), recipient_person_id uuid references public.people(id), title text not null, message_text text, memory_id uuid references public.memories(id), unlock_date date, unlock_event text, privacy public.privacy_level not null default 'specific_people', status text not null default 'locked', created_at timestamptz not null default now());
comment on table public.legacy_messages is 'Open When messages with locked future access conditions.';

create table public.legacy_custodians (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, owner_user_id uuid not null references public.profiles(id), custodian_person_id uuid not null references public.people(id), custodian_user_id uuid references public.profiles(id), priority text not null check(priority in ('primary','backup')), status text not null default 'draft', created_at timestamptz not null default now(), revoked_at timestamptz);
comment on table public.legacy_custodians is 'Designated primary/backup custodians. Custody does not automatically expose private memories.';

create table public.legacy_permissions (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, owner_user_id uuid not null references public.profiles(id), memory_id uuid references public.memories(id) on delete cascade, rule public.legacy_permission_rule not null, specific_person_id uuid references public.people(id), created_at timestamptz not null default now());
comment on table public.legacy_permissions is 'Future access rules activated only through controlled Legacy Mode workflows.';

create table public.family_invitations (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, email text not null, role public.family_role not null default 'family_member', relationship_label text, invited_by uuid not null references public.profiles(id), token_hash text not null, status text not null default 'pending', expires_at timestamptz not null, created_at timestamptz not null default now());
comment on table public.family_invitations is 'Family invitation workflow with explicit role and permissions.';

create table public.storage_usage (family_id uuid primary key references public.families(id) on delete cascade, videos_bytes bigint not null default 0, photos_bytes bigint not null default 0, audio_bytes bigint not null default 0, documents_bytes bigint not null default 0, updated_at timestamptz not null default now());
comment on table public.storage_usage is 'Accurate family-level media storage usage. Metadata is not counted as media storage.';

create table public.backup_records (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, provider text not null, status text not null default 'planned', bytes bigint not null default 0, integrity_hash text, verified_at timestamptz, created_at timestamptz not null default now());
comment on table public.backup_records is 'Future independent backup status and integrity verification records. Redundancy is not claimed until implemented.';

create table public.archive_exports (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, requested_by uuid not null references public.profiles(id), status text not null default 'requested', export_path text, manifest jsonb not null default '{}'::jsonb, bytes bigint not null default 0, created_at timestamptz not null default now(), completed_at timestamptz);
comment on table public.archive_exports is 'Family-controlled downloadable archive/export jobs and manifests.';

create table public.notifications (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, title text not null, body text, read_at timestamptz, created_at timestamptz not null default now());
comment on table public.notifications is 'User notifications for invitations, legacy requests, export status, and backup events.';

create table public.audit_logs (id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id) on delete set null, actor_user_id uuid references public.profiles(id) on delete set null, event_type public.audit_event_type not null, target_table text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
comment on table public.audit_logs is 'Audit trail for sensitive actions without storing private media contents.';

create or replace function public.is_family_member(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.family_members fm where fm.family_id = target_family_id and fm.user_id = auth.uid() and fm.status = 'active');
$$;

create or replace function public.is_family_manager(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.family_members fm where fm.family_id = target_family_id and fm.user_id = auth.uid() and fm.status = 'active' and fm.role in ('family_manager','legacy_custodian'));
$$;

create or replace function public.can_view_memory(target_memory_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.memories m
    left join public.family_members fm on fm.family_id = m.family_id and fm.user_id = auth.uid() and fm.status = 'active'
    where m.id = target_memory_id
      and m.soft_deleted_at is null
      and (
        m.creator_id = auth.uid()
        or (m.privacy = 'family' and fm.id is not null)
        or (m.privacy = 'specific_people' and exists(select 1 from public.memory_permissions mp where mp.memory_id = m.id and (mp.user_id = auth.uid() or mp.person_id = fm.person_id)))
        or (m.privacy = 'legacy' and m.legacy_status = 'archived' and fm.role = 'legacy_custodian')
      )
  );
$$;

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
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy story_questions_read on public.story_questions for select using (active = true);
create policy families_member_read on public.families for select using (public.is_family_member(id));
create policy families_creator_insert on public.families for insert with check (created_by = auth.uid());
create policy families_manager_update on public.families for update using (public.is_family_manager(id));
create policy people_member_read on public.people for select using (public.is_family_member(family_id));
create policy people_manager_write on public.people for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy family_members_member_read on public.family_members for select using (public.is_family_member(family_id));
create policy family_members_manager_write on public.family_members for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy relationships_member_read on public.family_relationships for select using (public.is_family_member(family_id));
create policy relationships_manager_write on public.family_relationships for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy memories_authorized_read on public.memories for select using (public.can_view_memory(id));
create policy memories_member_create on public.memories for insert with check (creator_id = auth.uid() and public.is_family_member(family_id));
create policy memories_creator_update on public.memories for update using (creator_id = auth.uid() or public.is_family_manager(family_id));
create policy memory_media_authorized_read on public.memory_media for select using (public.can_view_memory(memory_id));
create policy memory_media_member_insert on public.memory_media for insert with check (uploaded_by = auth.uid() and public.is_family_member(family_id));
create policy memory_join_member_read on public.memory_people for select using (public.is_family_member(family_id));
create policy memory_tags_member_read on public.memory_tags for select using (public.is_family_member(family_id));
create policy memory_permissions_authorized on public.memory_permissions for select using (public.is_family_manager(family_id) or public.can_view_memory(memory_id));
create policy life_events_member_read on public.life_events for select using (public.is_family_member(family_id));
create policy life_events_manager_write on public.life_events for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy legacy_messages_authorized on public.legacy_messages for select using (creator_id = auth.uid() or public.is_family_manager(family_id));
create policy legacy_custodians_owner_read on public.legacy_custodians for select using (owner_user_id = auth.uid() or public.is_family_manager(family_id));
create policy legacy_permissions_owner_read on public.legacy_permissions for select using (owner_user_id = auth.uid() or public.is_family_manager(family_id));
create policy invitations_manager on public.family_invitations for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));
create policy storage_usage_member_read on public.storage_usage for select using (public.is_family_member(family_id));
create policy backup_records_manager_read on public.backup_records for select using (public.is_family_manager(family_id));
create policy archive_exports_manager_read on public.archive_exports for select using (public.is_family_manager(family_id));
create policy notifications_self on public.notifications for select using (user_id = auth.uid());
create policy audit_logs_manager_read on public.audit_logs for select using (family_id is not null and public.is_family_manager(family_id));

insert into public.story_questions(category, question, sort_order) values
('Childhood','What was your childhood home like?',1),('Childhood','What were your parents like?',2),('Childhood','What did you do for fun?',3),('Childhood','What was your favorite childhood memory?',4),
('Teenage Years','What music did you listen to?',10),('Teenage Years','Who were your closest friends?',11),('Teenage Years','What was your first job?',12),('Teenage Years','What did you dream about becoming?',13),
('Love','How did you meet your spouse?',20),('Love','What was your first date like?',21),('Love','What was your wedding day like?',22),
('Family','What was it like becoming a parent?',30),('Family','What family traditions do you remember?',31),('Family','What traditions should continue?',32),
('Life','What are you most proud of?',40),('Life','What mistakes taught you the most?',41),('Life','What would you tell your younger self?',42),
('Legacy','What do you want your descendants to know?',50),('Legacy','What advice would you give your grandchildren?',51),('Legacy','What do you hope your family remembers?',52);

-- Storage bucket should be private. Apply in Supabase dashboard or CLI:
-- insert into storage.buckets (id, name, public) values ('family-media', 'family-media', false);
-- Storage object policies should verify family membership and memory authorization before signed URL creation.
