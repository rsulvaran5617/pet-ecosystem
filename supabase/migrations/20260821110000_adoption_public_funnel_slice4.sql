create table if not exists public.adoption_public_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.pet_adoption_listings(id) on delete restrict,
  protective_household_id uuid not null references public.households(id) on delete restrict,
  pet_id uuid not null references public.pets(id) on delete restrict,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  requester_city text,
  motivation text not null,
  experience text,
  housing_type text,
  has_other_pets boolean,
  has_children boolean,
  privacy_acknowledged_at timestamptz not null,
  status text not null default 'submitted',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adoption_public_requests_status_check
    check (status in ('submitted', 'in_review', 'preselected', 'rejected', 'cancelled', 'expired')),
  constraint adoption_public_requests_required_text_check
    check (
      length(trim(requester_name)) between 2 and 120
      and length(trim(requester_email)) between 5 and 254
      and length(trim(motivation)) between 20 and 1500
    ),
  constraint adoption_public_requests_optional_text_check
    check (
      length(coalesce(requester_phone, '')) <= 40
      and length(coalesce(requester_city, '')) <= 120
      and length(coalesce(experience, '')) <= 1500
      and length(coalesce(housing_type, '')) <= 120
      and length(coalesce(source_url, '')) <= 500
    )
);

create table if not exists public.adoption_public_request_status_history (
  id uuid primary key default gen_random_uuid(),
  public_request_id uuid not null references public.adoption_public_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  constraint adoption_public_request_history_status_check
    check (
      (from_status is null or from_status in ('submitted', 'in_review', 'preselected', 'rejected', 'cancelled', 'expired'))
      and to_status in ('submitted', 'in_review', 'preselected', 'rejected', 'cancelled', 'expired')
    ),
  constraint adoption_public_request_history_reason_check
    check (length(coalesce(change_reason, '')) <= 1000)
);

create index if not exists adoption_public_requests_household_status_created_idx
  on public.adoption_public_requests(protective_household_id, status, created_at desc);

create index if not exists adoption_public_requests_listing_created_idx
  on public.adoption_public_requests(listing_id, created_at desc);

create index if not exists adoption_public_requests_email_created_idx
  on public.adoption_public_requests(lower(requester_email), created_at desc);

create index if not exists adoption_public_request_history_request_created_idx
  on public.adoption_public_request_status_history(public_request_id, created_at asc);

drop trigger if exists set_adoption_public_requests_updated_at on public.adoption_public_requests;
create trigger set_adoption_public_requests_updated_at
before update on public.adoption_public_requests
for each row execute function public.set_updated_at();

alter table public.adoption_public_requests enable row level security;
alter table public.adoption_public_request_status_history enable row level security;

drop policy if exists adoption_public_requests_select_scoped on public.adoption_public_requests;
create policy adoption_public_requests_select_scoped
on public.adoption_public_requests
for select
to authenticated
using (
  public.can_view_household(protective_household_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists adoption_public_request_history_select_scoped on public.adoption_public_request_status_history;
create policy adoption_public_request_history_select_scoped
on public.adoption_public_request_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.adoption_public_requests as request
    where request.id = public_request_id
      and (
        public.can_view_household(request.protective_household_id, auth.uid())
        or public.is_platform_admin(auth.uid())
      )
  )
);

create or replace function public.create_public_adoption_request(
  target_listing_slug text,
  next_requester_name text,
  next_requester_email text,
  next_requester_phone text default null,
  next_requester_city text default null,
  next_motivation text default '',
  next_experience text default null,
  next_housing_type text default null,
  next_has_other_pets boolean default null,
  next_has_children boolean default null,
  next_privacy_acknowledged boolean default false,
  next_source_url text default null,
  next_company_website text default null
)
returns table (
  request_id uuid,
  request_status text,
  response_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_listing public.pet_adoption_listings%rowtype;
  normalized_email text := lower(trim(coalesce(next_requester_email, '')));
  created_request public.adoption_public_requests%rowtype;
begin
  if length(trim(coalesce(next_company_website, ''))) > 0 then
    raise exception 'No fue posible validar la solicitud.';
  end if;

  select listing.*
  into target_listing
  from public.pet_adoption_listings as listing
  join public.households as household on household.id = listing.household_id
  join public.pets as pet on pet.id = listing.pet_id
  join public.protective_household_profiles as protective_profile
    on protective_profile.household_id = listing.household_id
  join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = listing.household_id
  where listing.public_slug = trim(target_listing_slug)
    and listing.status = 'published'
    and listing.share_status = 'enabled'
    and household.household_type = 'protective'
    and pet.status = 'active'
    and protective_profile.status = 'approved'
    and public_profile.moderation_status = 'approved'
    and public_profile.is_public = true
  limit 1;

  if target_listing.id is null then
    raise exception 'Esta mascota ya no esta disponible para recibir solicitudes.';
  end if;

  if length(trim(coalesce(next_requester_name, ''))) < 2
     or length(trim(coalesce(next_requester_name, ''))) > 120 then
    raise exception 'Escribe tu nombre completo.';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(normalized_email) > 254 then
    raise exception 'Escribe un correo electronico valido.';
  end if;

  if length(trim(coalesce(next_motivation, ''))) < 20
     or length(trim(coalesce(next_motivation, ''))) > 1500 then
    raise exception 'Cuenta brevemente por que deseas adoptar esta mascota.';
  end if;

  if next_privacy_acknowledged is not true then
    raise exception 'Debes aceptar el aviso de privacidad para enviar la solicitud.';
  end if;

  if exists (
    select 1
    from public.adoption_public_requests as request
    where request.listing_id = target_listing.id
      and lower(request.requester_email) = normalized_email
      and request.status in ('submitted', 'in_review', 'preselected')
      and request.created_at >= now() - interval '7 days'
  ) then
    raise exception 'Ya existe una solicitud reciente para esta mascota con ese correo.';
  end if;

  if (
    select count(*)
    from public.adoption_public_requests as request
    where lower(request.requester_email) = normalized_email
      and request.created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Alcanzaste el limite temporal de solicitudes. Intenta nuevamente mas tarde.';
  end if;

  insert into public.adoption_public_requests (
    listing_id,
    protective_household_id,
    pet_id,
    requester_name,
    requester_email,
    requester_phone,
    requester_city,
    motivation,
    experience,
    housing_type,
    has_other_pets,
    has_children,
    privacy_acknowledged_at,
    source_url
  ) values (
    target_listing.id,
    target_listing.household_id,
    target_listing.pet_id,
    trim(next_requester_name),
    normalized_email,
    nullif(trim(coalesce(next_requester_phone, '')), ''),
    nullif(trim(coalesce(next_requester_city, '')), ''),
    trim(next_motivation),
    nullif(trim(coalesce(next_experience, '')), ''),
    nullif(trim(coalesce(next_housing_type, '')), ''),
    next_has_other_pets,
    next_has_children,
    now(),
    nullif(trim(coalesce(next_source_url, '')), '')
  )
  returning * into created_request;

  insert into public.adoption_public_request_status_history (
    public_request_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  ) values (
    created_request.id,
    null,
    'submitted',
    auth.uid(),
    'Solicitud inicial enviada desde la ficha publica.'
  );

  return query
  select
    created_request.id,
    created_request.status,
    'Tu solicitud fue enviada. La Familia Protectora la revisara y te contactara si el proceso avanza.'::text;
end;
$$;

create or replace function public.list_received_public_adoption_requests(
  target_household_id uuid default null,
  target_status text default null
)
returns table (
  id uuid,
  listing_id uuid,
  protective_household_id uuid,
  pet_id uuid,
  requester_name text,
  requester_email text,
  requester_phone text,
  requester_city text,
  motivation text,
  experience text,
  housing_type text,
  has_other_pets boolean,
  has_children boolean,
  privacy_acknowledged_at timestamptz,
  status text,
  source_url text,
  created_at timestamptz,
  updated_at timestamptz,
  listing_title text,
  listing_slug text,
  pet_name text
)
language sql
security definer
set search_path = public
as $$
  select
    request.id,
    request.listing_id,
    request.protective_household_id,
    request.pet_id,
    request.requester_name,
    request.requester_email,
    request.requester_phone,
    request.requester_city,
    request.motivation,
    request.experience,
    request.housing_type,
    request.has_other_pets,
    request.has_children,
    request.privacy_acknowledged_at,
    request.status,
    request.source_url,
    request.created_at,
    request.updated_at,
    listing.title,
    listing.public_slug,
    pet.name
  from public.adoption_public_requests as request
  join public.pet_adoption_listings as listing on listing.id = request.listing_id
  join public.pets as pet on pet.id = request.pet_id
  where public.can_view_household(request.protective_household_id, auth.uid())
    and (target_household_id is null or request.protective_household_id = target_household_id)
    and (target_status is null or request.status = target_status)
  order by request.created_at desc;
$$;

create or replace function public.update_public_adoption_request_status(
  target_request_id uuid,
  next_status text,
  notes text default null
)
returns public.adoption_public_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_request public.adoption_public_requests%rowtype;
  updated_request public.adoption_public_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para gestionar solicitudes.';
  end if;

  select * into current_request
  from public.adoption_public_requests
  where id = target_request_id
  for update;

  if current_request.id is null
     or not public.can_manage_household(current_request.protective_household_id, current_user_id) then
    raise exception 'No tienes permiso para gestionar esta solicitud.';
  end if;

  if next_status not in ('in_review', 'preselected', 'rejected', 'cancelled') then
    raise exception 'El estado solicitado no esta permitido en esta etapa.';
  end if;

  if not (
    (current_request.status = 'submitted' and next_status in ('in_review', 'rejected', 'cancelled'))
    or (current_request.status = 'in_review' and next_status in ('preselected', 'rejected', 'cancelled'))
    or (current_request.status = 'preselected' and next_status in ('rejected', 'cancelled'))
  ) then
    raise exception 'La transicion de estado no esta permitida.';
  end if;

  if next_status = 'rejected' and length(trim(coalesce(notes, ''))) < 10 then
    raise exception 'Agrega una nota breve antes de rechazar la solicitud.';
  end if;

  update public.adoption_public_requests
  set status = next_status
  where id = target_request_id
  returning * into updated_request;

  insert into public.adoption_public_request_status_history (
    public_request_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  ) values (
    updated_request.id,
    current_request.status,
    updated_request.status,
    current_user_id,
    nullif(trim(coalesce(notes, '')), '')
  );

  perform public.insert_audit_log(
    'adoption_public_request',
    updated_request.id,
    'adoption_public_request_status_changed',
    jsonb_build_object('from_status', current_request.status, 'to_status', updated_request.status),
    current_user_id
  );

  return updated_request;
end;
$$;

revoke all on public.adoption_public_requests from anon;
revoke all on public.adoption_public_request_status_history from anon;
revoke execute on function public.create_public_adoption_request(text, text, text, text, text, text, text, text, boolean, boolean, boolean, text, text) from public;
revoke execute on function public.list_received_public_adoption_requests(uuid, text) from public;
revoke execute on function public.update_public_adoption_request_status(uuid, text, text) from public;
grant select on public.adoption_public_requests to authenticated;
grant select on public.adoption_public_request_status_history to authenticated;
grant execute on function public.create_public_adoption_request(text, text, text, text, text, text, text, text, boolean, boolean, boolean, text, text) to anon, authenticated;
grant execute on function public.list_received_public_adoption_requests(uuid, text) to authenticated;
grant execute on function public.update_public_adoption_request_status(uuid, text, text) to authenticated;

comment on table public.adoption_public_requests is
  'Interes inicial capturado desde una ficha publica. No equivale a solicitud formal ni transfiere custodia.';
