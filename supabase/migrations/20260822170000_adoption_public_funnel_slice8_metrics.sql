create table if not exists public.adoption_funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  protective_household_id uuid not null references public.households(id) on delete restrict,
  listing_id uuid references public.pet_adoption_listings(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint adoption_funnel_events_name_check check (
    event_name in ('protective_landing_viewed', 'pet_listing_viewed', 'share_clicked', 'public_request_started')
  )
);

create index if not exists adoption_funnel_events_household_event_created_idx
  on public.adoption_funnel_events(protective_household_id, event_name, created_at desc);

create index if not exists adoption_funnel_events_listing_event_created_idx
  on public.adoption_funnel_events(listing_id, event_name, created_at desc)
  where listing_id is not null;

alter table public.adoption_funnel_events enable row level security;

drop policy if exists adoption_funnel_events_select_scoped on public.adoption_funnel_events;
create policy adoption_funnel_events_select_scoped
on public.adoption_funnel_events
for select
to authenticated
using (
  public.can_view_household(protective_household_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

create or replace function public.record_public_adoption_funnel_event(
  next_event_name text,
  target_protective_profile_slug text default null,
  target_listing_slug text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  target_listing_id uuid;
begin
  if next_event_name not in ('protective_landing_viewed', 'pet_listing_viewed', 'share_clicked', 'public_request_started') then
    raise exception 'Evento de adopcion no permitido.';
  end if;

  if nullif(trim(coalesce(target_listing_slug, '')), '') is not null then
    select listing.id, listing.household_id
    into target_listing_id, target_household_id
    from public.pet_adoption_listings as listing
    join public.households as household on household.id = listing.household_id
    join public.protective_household_profiles as protective_profile on protective_profile.household_id = listing.household_id
    join public.protective_household_public_profiles as public_profile on public_profile.household_id = listing.household_id
    where listing.public_slug = trim(target_listing_slug)
      and listing.status in ('published', 'adopted')
      and listing.share_status = 'enabled'
      and household.household_type = 'protective'
      and protective_profile.status = 'approved'
      and public_profile.moderation_status = 'approved'
      and public_profile.is_public = true
    limit 1;
  elsif nullif(trim(coalesce(target_protective_profile_slug, '')), '') is not null then
    select public_profile.household_id
    into target_household_id
    from public.protective_household_public_profiles as public_profile
    join public.households as household on household.id = public_profile.household_id
    join public.protective_household_profiles as protective_profile on protective_profile.household_id = public_profile.household_id
    where public_profile.public_slug = trim(target_protective_profile_slug)
      and public_profile.moderation_status = 'approved'
      and public_profile.is_public = true
      and household.household_type = 'protective'
      and protective_profile.status = 'approved'
    limit 1;
  end if;

  if target_household_id is null then
    return;
  end if;

  if next_event_name in ('pet_listing_viewed', 'public_request_started') and target_listing_id is null then
    return;
  end if;

  insert into public.adoption_funnel_events (event_name, protective_household_id, listing_id)
  values (next_event_name, target_household_id, target_listing_id);
end;
$$;

create or replace function public.get_adoption_funnel_metrics(
  target_household_id uuid,
  period_days integer default 90
)
returns table (
  landing_views bigint,
  listing_views bigint,
  share_clicks bigint,
  request_starts bigint,
  public_requests bigint,
  preselected_requests bigint,
  invites_created bigint,
  invites_opened bigint,
  invites_claimed bigint,
  formal_applications bigint,
  adoptions_closed bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  period_start timestamptz;
begin
  if current_user_id is null
     or not (
       public.can_view_household(target_household_id, current_user_id)
       or public.is_platform_admin(current_user_id)
     ) then
    raise exception 'No tienes permiso para consultar estas metricas.';
  end if;

  if period_days < 1 or period_days > 730 then
    raise exception 'El periodo debe estar entre 1 y 730 dias.';
  end if;

  period_start := now() - make_interval(days => period_days);

  return query
  select
    count(*) filter (where event.event_name = 'protective_landing_viewed'),
    count(*) filter (where event.event_name = 'pet_listing_viewed'),
    count(*) filter (where event.event_name = 'share_clicked'),
    count(*) filter (where event.event_name = 'public_request_started'),
    (select count(*) from public.adoption_public_requests request
      where request.protective_household_id = target_household_id and request.created_at >= period_start),
    (select count(distinct history.public_request_id)
      from public.adoption_public_request_status_history history
      join public.adoption_public_requests request on request.id = history.public_request_id
      where request.protective_household_id = target_household_id
        and history.to_status = 'preselected' and history.created_at >= period_start),
    (select count(*) from public.adoption_invites invite
      where invite.protective_household_id = target_household_id and invite.created_at >= period_start),
    (select count(*) from public.adoption_invites invite
      where invite.protective_household_id = target_household_id and invite.opened_at >= period_start),
    (select count(*) from public.adoption_invites invite
      where invite.protective_household_id = target_household_id and invite.claimed_at >= period_start),
    (select count(*) from public.adoption_invites invite
      where invite.protective_household_id = target_household_id
        and invite.formal_application_id is not null and invite.updated_at >= period_start),
    (select count(distinct transfer.id)
      from public.adoption_invites invite
      join public.pet_adoption_applications application on application.id = invite.formal_application_id
      join public.pet_transfer_records transfer on transfer.adoption_application_id = application.id
      where invite.protective_household_id = target_household_id
        and transfer.status = 'accepted' and transfer.accepted_at >= period_start)
  from public.adoption_funnel_events event
  where event.protective_household_id = target_household_id
    and event.created_at >= period_start;
end;
$$;

revoke all on public.adoption_funnel_events from anon;
grant select on public.adoption_funnel_events to authenticated;
revoke execute on function public.record_public_adoption_funnel_event(text, text, text) from public;
revoke execute on function public.get_adoption_funnel_metrics(uuid, integer) from public;
grant execute on function public.record_public_adoption_funnel_event(text, text, text) to anon, authenticated;
grant execute on function public.get_adoption_funnel_metrics(uuid, integer) to authenticated;

comment on table public.adoption_funnel_events is
  'Eventos publicos minimos y sin PII para medir el embudo de adopcion por Familia Protectora.';
