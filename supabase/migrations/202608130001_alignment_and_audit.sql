-- Moms MemoryTree Phase 1 alignment and audit hardening
-- Purpose: align schema with current TypeScript domain model and strengthen storage/audit foundations.

alter type public.relationship_type add value if not exists 'grandparent';
alter type public.relationship_type add value if not exists 'grandchild';

alter table public.memories add column if not exists category text not null default 'Life';

alter table public.family_members add column if not exists permissions text[] not null default array[]::text[];

create or replace function public.increment_storage_usage_from_media()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

drop trigger if exists memory_media_storage_usage_insert on public.memory_media;
create trigger memory_media_storage_usage_insert
after insert on public.memory_media
for each row execute function public.increment_storage_usage_from_media();

create or replace function public.audit_memory_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(family_id, actor_user_id, event_type, target_table, target_id, metadata)
  values (new.family_id, auth.uid(), 'memory_created', 'memories', new.id, jsonb_build_object('privacy_level', new.privacy_level, 'memory_type', new.memory_type));
  return new;
end;
$$;

drop trigger if exists memories_audit_insert on public.memories;
create trigger memories_audit_insert
after insert on public.memories
for each row execute function public.audit_memory_created();

create or replace function public.audit_media_uploaded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(family_id, actor_user_id, event_type, target_table, target_id, metadata)
  values (new.family_id, auth.uid(), 'media_uploaded', 'memory_media', new.id, jsonb_build_object('media_type', new.media_type, 'file_size', new.file_size));
  return new;
end;
$$;

drop trigger if exists memory_media_audit_insert on public.memory_media;
create trigger memory_media_audit_insert
after insert on public.memory_media
for each row execute function public.audit_media_uploaded();

create or replace function public.authorized_signed_media(media_row_id uuid)
returns table(storage_bucket text, storage_path text, expires_in_seconds int)
language sql stable security definer set search_path = public as $$
  select mm.storage_bucket, mm.storage_path, 300
  from public.memory_media mm
  join public.memories m on m.id = mm.memory_id
  where mm.id = media_row_id
    and mm.family_id = m.family_id
    and public.can_view_memory(mm.memory_id);
$$;
