alter table public.adoption_public_requests
  drop constraint if exists adoption_public_requests_status_check;

alter table public.adoption_public_requests
  add constraint adoption_public_requests_status_check
  check (status in ('submitted', 'in_review', 'preselected', 'invited_to_app', 'rejected', 'cancelled', 'expired'));

alter table public.adoption_public_request_status_history
  drop constraint if exists adoption_public_request_history_status_check;

alter table public.adoption_public_request_status_history
  add constraint adoption_public_request_history_status_check
  check (
    (from_status is null or from_status in ('submitted', 'in_review', 'preselected', 'invited_to_app', 'rejected', 'cancelled', 'expired'))
    and to_status in ('submitted', 'in_review', 'preselected', 'invited_to_app', 'rejected', 'cancelled', 'expired')
  );

create table if not exists public.adoption_invites (
  id uuid primary key default gen_random_uuid(),
  public_request_id uuid not null references public.adoption_public_requests(id) on delete restrict,
  listing_id uuid not null references public.pet_adoption_listings(id) on delete restrict,
  protective_household_id uuid not null references public.households(id) on delete restrict,
  invite_token_hash text not null unique,
  recipient_email text not null,
  recipient_phone text,
  status text not null default 'created',
  expires_at timestamptz not null,
  sent_at timestamptz,
  opened_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adoption_invites_status_check
    check (status in ('created', 'sent', 'opened', 'claimed', 'expired', 'revoked')),
  constraint adoption_invites_expiration_check check (expires_at > created_at),
  constraint adoption_invites_recipient_email_check check (length(trim(recipient_email)) between 5 and 254)
);

create unique index if not exists adoption_invites_one_active_per_request_idx
  on public.adoption_invites(public_request_id)
  where status in ('created', 'sent', 'opened');

create index if not exists adoption_invites_household_created_idx
  on public.adoption_invites(protective_household_id, created_at desc);

drop trigger if exists set_adoption_invites_updated_at on public.adoption_invites;
create trigger set_adoption_invites_updated_at
before update on public.adoption_invites
for each row execute function public.set_updated_at();

alter table public.adoption_invites enable row level security;

drop policy if exists adoption_invites_select_scoped on public.adoption_invites;
create policy adoption_invites_select_scoped
on public.adoption_invites
for select
to authenticated
using (
  public.can_view_household(protective_household_id, auth.uid())
  or claimed_by_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
);

create or replace function public.create_adoption_invite(
  target_public_request_id uuid,
  expires_in_hours integer default 168
)
returns table (
  invite_id uuid,
  invite_token text,
  invite_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_request public.adoption_public_requests%rowtype;
  plain_token text;
  hashed_token text;
  created_invite public.adoption_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para crear una invitacion.';
  end if;

  if expires_in_hours < 24 or expires_in_hours > 720 then
    raise exception 'La vigencia debe estar entre 24 y 720 horas.';
  end if;

  select request.* into target_request
  from public.adoption_public_requests as request
  where request.id = target_public_request_id
  for update;

  if target_request.id is null
     or not public.can_manage_household(target_request.protective_household_id, current_user_id) then
    raise exception 'No tienes permiso para invitar a este contacto.';
  end if;

  if target_request.status not in ('preselected', 'invited_to_app') then
    raise exception 'Solo un contacto preseleccionado puede recibir invitacion.';
  end if;

  update public.adoption_invites
  set status = 'revoked'
  where public_request_id = target_request.id
    and status in ('created', 'sent', 'opened');

  loop
    plain_token := encode(gen_random_bytes(32), 'hex');
    hashed_token := encode(digest(plain_token, 'sha256'), 'hex');
    exit when not exists (
      select 1 from public.adoption_invites where invite_token_hash = hashed_token
    );
  end loop;

  insert into public.adoption_invites (
    public_request_id,
    listing_id,
    protective_household_id,
    invite_token_hash,
    recipient_email,
    recipient_phone,
    expires_at,
    created_by_user_id
  ) values (
    target_request.id,
    target_request.listing_id,
    target_request.protective_household_id,
    hashed_token,
    target_request.requester_email,
    target_request.requester_phone,
    now() + make_interval(hours => expires_in_hours),
    current_user_id
  ) returning * into created_invite;

  if target_request.status <> 'invited_to_app' then
    update public.adoption_public_requests
    set status = 'invited_to_app'
    where id = target_request.id;

    insert into public.adoption_public_request_status_history (
      public_request_id, from_status, to_status, changed_by_user_id, change_reason
    ) values (
      target_request.id, target_request.status, 'invited_to_app', current_user_id,
      'Invitacion creada para continuar en la app owner.'
    );
  end if;

  perform public.insert_audit_log(
    'adoption_invite', created_invite.id, 'adoption_invite_created',
    jsonb_build_object('public_request_id', target_request.id, 'expires_at', created_invite.expires_at),
    current_user_id
  );

  return query select created_invite.id, plain_token, created_invite.expires_at;
end;
$$;

create or replace function public.resolve_adoption_invite(raw_token text)
returns table (
  invite_status text,
  pet_name text,
  listing_slug text,
  protective_display_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  hashed_token text := encode(digest(trim(coalesce(raw_token, '')), 'sha256'), 'hex');
  target_invite public.adoption_invites%rowtype;
begin
  select invite.* into target_invite
  from public.adoption_invites as invite
  where invite.invite_token_hash = hashed_token
  limit 1;

  if target_invite.id is null then
    return query select 'invalid'::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if target_invite.status in ('created', 'sent', 'opened') and target_invite.expires_at <= now() then
    update public.adoption_invites set status = 'expired' where id = target_invite.id;
    target_invite.status := 'expired';
  elsif target_invite.status in ('created', 'sent') then
    update public.adoption_invites
    set status = 'opened', opened_at = coalesce(opened_at, now())
    where id = target_invite.id;
    target_invite.status := 'opened';
  end if;

  return query
  select
    target_invite.status,
    pet.name,
    listing.public_slug,
    public_profile.display_name,
    target_invite.expires_at
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = listing.household_id
  where listing.id = target_invite.listing_id;
end;
$$;

revoke all on public.adoption_invites from anon;
grant select on public.adoption_invites to authenticated;
revoke execute on function public.create_adoption_invite(uuid, integer) from public;
revoke execute on function public.resolve_adoption_invite(text) from public;
grant execute on function public.create_adoption_invite(uuid, integer) to authenticated;
grant execute on function public.resolve_adoption_invite(text) to anon, authenticated;

comment on table public.adoption_invites is
  'Invitaciones con token hasheado para continuar el interes publico en la app owner. No crean solicitud formal ni transfieren custodia.';
