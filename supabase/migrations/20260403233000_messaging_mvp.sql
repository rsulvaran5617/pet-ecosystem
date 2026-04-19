create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  provider_organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  customer_user_id uuid not null references auth.users (id) on delete cascade,
  provider_user_id uuid not null references auth.users (id) on delete cascade,
  customer_display_name text not null,
  provider_display_name text not null,
  pet_name text not null,
  service_name text not null,
  booking_status text not null check (booking_status in ('pending_approval', 'confirmed', 'cancelled')),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  message_text text not null check (char_length(trim(message_text)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_threads_booking_id_idx on public.chat_threads (booking_id);
create index if not exists chat_threads_customer_user_id_idx on public.chat_threads (customer_user_id);
create index if not exists chat_threads_provider_user_id_idx on public.chat_threads (provider_user_id);
create index if not exists chat_threads_last_message_at_idx on public.chat_threads (last_message_at desc);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id);
create index if not exists chat_messages_thread_id_created_at_idx on public.chat_messages (thread_id, created_at asc);

create or replace function public.can_view_chat_thread(target_thread_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads as thread
    where thread.id = target_thread_id
      and (
        thread.customer_user_id = target_user_id
        or thread.provider_user_id = target_user_id
      )
  );
$$;

create or replace function public.upsert_booking_chat_thread_from_booking(target_booking_id uuid)
returns public.chat_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
  provider_row public.provider_organizations;
  pricing_row public.booking_pricing;
  pet_row public.pets;
  customer_profile public.profiles;
  customer_display_name text;
  upserted_thread public.chat_threads;
begin
  select *
  into booking_row
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  select *
  into provider_row
  from public.provider_organizations
  where id = booking_row.provider_organization_id;

  if not found then
    raise exception 'Provider organization was not found';
  end if;

  select *
  into pricing_row
  from public.booking_pricing
  where booking_id = booking_row.id;

  if not found then
    raise exception 'Booking pricing was not found';
  end if;

  select *
  into pet_row
  from public.pets
  where id = booking_row.pet_id;

  if not found then
    raise exception 'Booking pet was not found';
  end if;

  select *
  into customer_profile
  from public.profiles
  where id = booking_row.booked_by_user_id;

  customer_display_name := coalesce(
    nullif(trim(concat_ws(' ', customer_profile.first_name, customer_profile.last_name)), ''),
    customer_profile.email,
    'Customer'
  );

  insert into public.chat_threads (
    booking_id,
    household_id,
    provider_organization_id,
    customer_user_id,
    provider_user_id,
    customer_display_name,
    provider_display_name,
    pet_name,
    service_name,
    booking_status,
    last_message_at,
    last_message_preview
  )
  values (
    booking_row.id,
    booking_row.household_id,
    booking_row.provider_organization_id,
    booking_row.booked_by_user_id,
    provider_row.owner_user_id,
    customer_display_name,
    provider_row.name,
    pet_row.name,
    pricing_row.service_name,
    booking_row.status,
    null,
    null
  )
  on conflict (booking_id) do update
  set household_id = excluded.household_id,
      provider_organization_id = excluded.provider_organization_id,
      customer_user_id = excluded.customer_user_id,
      provider_user_id = excluded.provider_user_id,
      customer_display_name = excluded.customer_display_name,
      provider_display_name = excluded.provider_display_name,
      pet_name = excluded.pet_name,
      service_name = excluded.service_name,
      booking_status = excluded.booking_status,
      updated_at = now()
  returning * into upserted_thread;

  return upserted_thread;
end;
$$;

create or replace function public.sync_chat_thread_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_booking_chat_thread_from_booking(new.id);
  return new;
end;
$$;

create or replace function public.send_chat_message(
  target_thread_id uuid,
  next_message_text text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_message_text text := nullif(trim(next_message_text), '');
  target_thread public.chat_threads;
  created_message public.chat_messages;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to send chat messages';
  end if;

  if normalized_message_text is null then
    raise exception 'Message text is required';
  end if;

  select *
  into target_thread
  from public.chat_threads
  where id = target_thread_id;

  if not found then
    raise exception 'Chat thread was not found';
  end if;

  if not public.can_view_chat_thread(target_thread.id, current_user_id) then
    raise exception 'Only authorized chat participants can send messages';
  end if;

  insert into public.chat_messages (
    thread_id,
    sender_user_id,
    message_text
  )
  values (
    target_thread.id,
    current_user_id,
    normalized_message_text
  )
  returning * into created_message;

  update public.chat_threads
  set last_message_at = created_message.created_at,
      last_message_preview = left(created_message.message_text, 160),
      updated_at = now()
  where id = target_thread.id;

  return created_message;
end;
$$;

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at
before update on public.chat_threads
for each row
execute function public.set_updated_at();

drop trigger if exists trg_chat_messages_updated_at on public.chat_messages;
create trigger trg_chat_messages_updated_at
before update on public.chat_messages
for each row
execute function public.set_updated_at();

drop trigger if exists trg_sync_chat_thread_from_booking on public.bookings;
create trigger trg_sync_chat_thread_from_booking
after insert or update on public.bookings
for each row
execute function public.sync_chat_thread_from_booking();

insert into public.chat_threads (
  booking_id,
  household_id,
  provider_organization_id,
  customer_user_id,
  provider_user_id,
  customer_display_name,
  provider_display_name,
  pet_name,
  service_name,
  booking_status,
  last_message_at,
  last_message_preview
)
select
  booking.id,
  booking.household_id,
  booking.provider_organization_id,
  booking.booked_by_user_id,
  provider_row.owner_user_id,
  coalesce(nullif(trim(concat_ws(' ', customer_profile.first_name, customer_profile.last_name)), ''), customer_profile.email, 'Customer'),
  provider_row.name,
  pet_row.name,
  pricing_row.service_name,
  booking.status,
  null,
  null
from public.bookings as booking
join public.provider_organizations as provider_row on provider_row.id = booking.provider_organization_id
join public.booking_pricing as pricing_row on pricing_row.booking_id = booking.id
join public.pets as pet_row on pet_row.id = booking.pet_id
left join public.profiles as customer_profile on customer_profile.id = booking.booked_by_user_id
where not exists (
  select 1
  from public.chat_threads as existing_thread
  where existing_thread.booking_id = booking.id
);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_threads_select_participants on public.chat_threads;
create policy chat_threads_select_participants
on public.chat_threads
for select
to authenticated
using (
  customer_user_id = auth.uid()
  or provider_user_id = auth.uid()
);

drop policy if exists chat_messages_select_participants on public.chat_messages;
create policy chat_messages_select_participants
on public.chat_messages
for select
to authenticated
using (public.can_view_chat_thread(thread_id, auth.uid()));

grant execute on function public.can_view_chat_thread(uuid, uuid) to authenticated;
grant execute on function public.upsert_booking_chat_thread_from_booking(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
