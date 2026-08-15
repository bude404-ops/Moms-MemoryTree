-- Moms MemoryTree live invitation acceptance
-- Gives the product a real invite/accept spine without storing plaintext invite tokens.

create extension if not exists pgcrypto;

create or replace function public.accept_family_invitation(invite_token text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.family_invitations%rowtype;
  profile_id uuid := auth.uid();
  profile_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite_hash text := encode(digest(coalesce(invite_token, ''), 'sha256'), 'hex');
  new_person_id uuid;
begin
  if profile_id is null then
    raise exception 'Sign in before accepting a family invitation';
  end if;

  if nullif(trim(invite_token), '') is null then
    raise exception 'Invitation token is required';
  end if;

  if nullif(trim(display_name), '') is null then
    raise exception 'Display name is required';
  end if;

  select * into invitation_row
  from public.family_invitations
  where token_hash = invite_hash
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid, expired, or already used';
  end if;

  if lower(invitation_row.email) <> profile_email then
    raise exception 'This invitation belongs to a different email address';
  end if;

  insert into public.profiles(id, display_name)
  values(profile_id, trim(display_name))
  on conflict (id) do update set display_name = excluded.display_name, updated_at = now();

  select person_id into new_person_id
  from public.family_members
  where family_id = invitation_row.family_id
    and user_id = profile_id
    and status = 'active'
  limit 1;

  if new_person_id is null then
    insert into public.people(family_id, display_name, created_by)
    values(invitation_row.family_id, trim(display_name), profile_id)
    returning id into new_person_id;

    insert into public.family_members(family_id, user_id, person_id, role, relationship_label, status, joined_at, permissions)
    values(invitation_row.family_id, profile_id, new_person_id, invitation_row.role, invitation_row.relationship_label, 'active', now(), array['memory:create'])
    on conflict (family_id, user_id) do update set
      person_id = excluded.person_id,
      role = excluded.role,
      relationship_label = excluded.relationship_label,
      status = 'active',
      joined_at = now(),
      updated_at = now();
  end if;

  update public.family_invitations
  set status = 'accepted', updated_at = now()
  where id = invitation_row.id;

  insert into public.audit_logs(family_id, actor_user_id, event_type, target_table, target_id, metadata)
  values(invitation_row.family_id, profile_id, 'family_member_added', 'family_invitations', invitation_row.id, jsonb_build_object('email', invitation_row.email, 'role', invitation_row.role));

  return invitation_row.family_id;
end;
$$;

comment on function public.accept_family_invitation(text, text) is 'Accepts a pending family invitation using a plaintext token supplied by the invitee. Only token hashes are stored.';

grant execute on function public.accept_family_invitation(text, text) to authenticated;
