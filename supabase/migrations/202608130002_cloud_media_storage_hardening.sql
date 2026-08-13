-- Moms MemoryTree cloud media storage hardening
-- Adds explicit upload states, quota plans, soft-delete media lifecycle, stronger path validation,
-- and storage policy support without storing large media in PostgreSQL.

create type public.media_upload_status as enum ('pending','uploading','paused','processing','completed','failed','deleted');

alter table public.memory_media
  add column if not exists original_file_name text,
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists upload_status public.media_upload_status not null default 'completed',
  add column if not exists upload_error text,
  add column if not exists provider text not null default 'supabase',
  add column if not exists original_preserved boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.memory_media
set original_file_name = coalesce(original_file_name, file_name)
where original_file_name is null;

alter table public.memory_media
  alter column original_file_name set not null;

create trigger memory_media_touch
before update on public.memory_media
for each row execute function public.touch_updated_at();

create table if not exists public.storage_plans (
  id text primary key,
  label text not null,
  quota_bytes bigint not null check (quota_bytes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger storage_plans_touch
before update on public.storage_plans
for each row execute function public.touch_updated_at();

insert into public.storage_plans(id, label, quota_bytes) values
  ('free', 'Free', 1073741824),
  ('family', 'Family', 107374182400),
  ('family_plus', 'Family Plus', 536870912000),
  ('legacy', 'Legacy', 1099511627776)
on conflict (id) do update set label = excluded.label, quota_bytes = excluded.quota_bytes, active = true;

alter table public.families add column if not exists storage_plan_id text references public.storage_plans(id) default 'family_plus';

create or replace function public.family_storage_used_bytes(target_family_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(mm.file_size), 0)::bigint
  from public.memory_media mm
  where mm.family_id = target_family_id
    and mm.upload_status = 'completed'
    and mm.deleted_at is null;
$$;

create or replace function public.family_storage_limit_bytes(target_family_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sp.quota_bytes, f.storage_limit_bytes, 536870912000)
  from public.families f
  left join public.storage_plans sp on sp.id = f.storage_plan_id and sp.active = true
  where f.id = target_family_id;
$$;

create or replace function public.family_has_storage_capacity(target_family_id uuid, incoming_bytes bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.family_storage_used_bytes(target_family_id) + greatest(incoming_bytes, 0) <= public.family_storage_limit_bytes(target_family_id);
$$;

create or replace function public.validate_memory_media_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.storage_bucket <> 'family-media' then
    raise exception 'memory media must use private family-media bucket';
  end if;
  if new.storage_path !~ ('^family/' || new.family_id::text || '/(memories|people|timeline|legacy)/[0-9a-f-]{36}/[0-9a-f-]{36}(-original)?\.[a-z0-9]+$') then
    raise exception 'invalid family media storage path';
  end if;
  if new.storage_path like '%..%' or new.storage_path like '%//%' then
    raise exception 'invalid storage traversal path';
  end if;
  if new.upload_status = 'completed' and not public.family_has_storage_capacity(new.family_id, new.file_size) then
    raise exception 'family storage quota exceeded';
  end if;
  if new.upload_status = 'completed' and (new.storage_path is null or new.file_size <= 0) then
    raise exception 'completed media requires uploaded object metadata';
  end if;
  new.original_file_name = coalesce(new.original_file_name, new.file_name);
  return new;
end;
$$;

drop trigger if exists memory_media_validate_write on public.memory_media;
create trigger memory_media_validate_write
before insert or update on public.memory_media
for each row execute function public.validate_memory_media_write();

create or replace function public.increment_storage_usage_from_media()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.upload_status <> 'completed' or new.deleted_at is not null then
    return new;
  end if;
  insert into public.storage_usage(family_id, video_bytes, photo_bytes, audio_bytes, document_bytes)
  values (
    new.family_id,
    case when new.media_type = 'video' then new.file_size else 0 end,
    case when new.media_type = 'photo' then new.file_size else 0 end,
    case when new.media_type = 'audio' then new.file_size else 0 end,
    case when new.media_type = 'document' then new.file_size else 0 end
  )
  on conflict (family_id) do update set
    video_bytes = public.storage_usage.video_bytes + excluded.video_bytes,
    photo_bytes = public.storage_usage.photo_bytes + excluded.photo_bytes,
    audio_bytes = public.storage_usage.audio_bytes + excluded.audio_bytes,
    document_bytes = public.storage_usage.document_bytes + excluded.document_bytes,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.can_access_storage_object(bucket_id text, object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when bucket_id = 'family-avatars' then exists(
      select 1 from public.people p where object_name like ('family/' || p.family_id::text || '/people/' || p.id::text || '/%') and public.is_family_member(p.family_id)
    )
    when bucket_id = 'family-media' then exists(
      select 1 from public.memory_media mm
      where mm.storage_path = object_name
        and mm.upload_status = 'completed'
        and mm.deleted_at is null
        and public.can_view_memory(mm.memory_id)
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
  join public.memories m on m.id = mm.memory_id
  where mm.id = media_row_id
    and mm.family_id = m.family_id
    and mm.upload_status = 'completed'
    and mm.deleted_at is null
    and public.can_view_memory(mm.memory_id);
$$;

create or replace function public.soft_delete_memory_media(media_row_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare row_family uuid;
begin
  select family_id into row_family from public.memory_media where id = media_row_id;
  if row_family is null then raise exception 'media not found'; end if;
  if not public.is_family_manager(row_family) then raise exception 'not authorized'; end if;
  update public.memory_media
  set upload_status = 'deleted', deleted_at = now(), delete_after = now() + interval '30 days'
  where id = media_row_id;
  insert into public.audit_logs(family_id, actor_user_id, event_type, target_table, target_id, metadata)
  values (row_family, auth.uid(), 'memory_deleted', 'memory_media', media_row_id, jsonb_build_object('delete_after', now() + interval '30 days'));
end;
$$;

alter table public.storage_plans enable row level security;
create policy storage_plans_public_read on public.storage_plans for select using (active = true);

create policy memory_media_creator_or_manager_update on public.memory_media for update
using (uploaded_by = auth.uid() or public.is_family_manager(family_id))
with check (uploaded_by = auth.uid() or public.is_family_manager(family_id));

create policy storage_family_media_update_delete on storage.objects for update using (bucket_id = 'family-media' and public.can_access_storage_object(bucket_id, name)) with check (bucket_id = 'family-media' and public.can_access_storage_object(bucket_id, name));
create policy storage_family_media_delete on storage.objects for delete using (bucket_id = 'family-media' and public.can_access_storage_object(bucket_id, name));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('family-media', 'family-media', false, 10737418240, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/aac','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('family-avatars', 'family-avatars', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('family-exports', 'family-exports', false, 10737418240, array['application/zip','application/json'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
