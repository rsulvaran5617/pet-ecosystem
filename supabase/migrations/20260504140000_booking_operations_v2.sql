-- V2 Provider Ops: Booking Operations Tables
-- Enables check-in, check-out, evidence metadata, report card, and internal notes.
-- Scope: V2 non-financial provider operations only. No payments, payouts, refunds, or reconciliation.

create or replace function public.can_manage_booking_operations(
  target_booking_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings as booking
    where booking.id = target_booking_id
      and booking.status = 'confirmed'
      and public.can_manage_provider_organization(booking.provider_organization_id, target_user_id)
  );
$$;

create or replace function public.can_read_booking_operations_provider(
  target_booking_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings as booking
    where booking.id = target_booking_id
      and public.can_manage_provider_organization(booking.provider_organization_id, target_user_id)
  );
$$;

create or replace function public.can_read_booking_operations_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(target_user_id);
$$;

create or replace function public.extract_booking_id_from_operation_storage_path(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  booking_prefix text := nullif(split_part(coalesce(object_name, ''), '/', 1), '');
begin
  if booking_prefix is null then
    return null;
  end if;

  begin
    return booking_prefix::uuid;
  exception
    when others then
      return null;
  end;
end;
$$;

-- Main operations log: one check-in and one check-out per booking.
create table if not exists public.booking_operations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  operation_type text not null check (operation_type in ('check_in', 'check_out')),
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  location_latitude numeric(9, 6),
  location_longitude numeric(9, 6),
  location_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_operations_location_pair_check check (
    (location_latitude is null and location_longitude is null)
    or (location_latitude is not null and location_longitude is not null)
  ),
  constraint booking_operations_latitude_range_check check (
    location_latitude is null or (location_latitude between -90 and 90)
  ),
  constraint booking_operations_longitude_range_check check (
    location_longitude is null or (location_longitude between -180 and 180)
  ),
  constraint booking_operations_check_out_without_location_check check (
    operation_type = 'check_in'
    or (location_latitude is null and location_longitude is null and location_label is null)
  )
);

-- Evidence metadata. Files live in the private booking-operation-evidence bucket.
create table if not exists public.booking_operation_evidence (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  storage_bucket text not null default 'booking-operation-evidence',
  storage_path text not null,
  file_name text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  mime_type text,
  uploaded_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint booking_operation_evidence_bucket_check check (storage_bucket = 'booking-operation-evidence'),
  constraint booking_operation_evidence_path_booking_check check (
    public.extract_booking_id_from_operation_storage_path(storage_path) = booking_id
  )
);

-- Report card: single summary per booking.
create table if not exists public.booking_operation_report (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  report_text text not null check (char_length(trim(report_text)) between 1 and 500),
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Internal notes: provider/admin only, never owner-visible.
create table if not exists public.booking_operation_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  note_text text not null check (char_length(trim(note_text)) between 1 and 1000),
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_operations_one_check_in_per_booking_idx
  on public.booking_operations (booking_id)
  where operation_type = 'check_in';

create unique index if not exists booking_operations_one_check_out_per_booking_idx
  on public.booking_operations (booking_id)
  where operation_type = 'check_out';

create index if not exists booking_operations_booking_id_idx on public.booking_operations (booking_id);
create index if not exists booking_operations_created_by_idx on public.booking_operations (created_by_user_id);
create index if not exists booking_operations_type_idx on public.booking_operations (operation_type);
create index if not exists booking_operation_evidence_booking_id_idx on public.booking_operation_evidence (booking_id);
create unique index if not exists booking_operation_evidence_storage_object_idx
  on public.booking_operation_evidence (storage_bucket, storage_path);
create index if not exists booking_operation_evidence_created_at_idx on public.booking_operation_evidence (created_at);
create index if not exists booking_operation_report_booking_id_idx on public.booking_operation_report (booking_id);
create index if not exists booking_operation_notes_booking_id_idx on public.booking_operation_notes (booking_id);
create index if not exists booking_operation_notes_created_by_idx on public.booking_operation_notes (created_by_user_id);

alter table public.booking_operations enable row level security;
alter table public.booking_operation_evidence enable row level security;
alter table public.booking_operation_report enable row level security;
alter table public.booking_operation_notes enable row level security;

drop policy if exists booking_operations_select_provider on public.booking_operations;
create policy booking_operations_select_provider
on public.booking_operations
for select
to authenticated
using (
  public.can_read_booking_operations_provider(booking_id, auth.uid())
  or public.can_read_booking_operations_admin(auth.uid())
);

drop policy if exists booking_operations_insert_provider on public.booking_operations;
create policy booking_operations_insert_provider
on public.booking_operations
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_booking_operations(booking_id, auth.uid())
);

drop policy if exists booking_operation_evidence_select_provider on public.booking_operation_evidence;
create policy booking_operation_evidence_select_provider
on public.booking_operation_evidence
for select
to authenticated
using (
  public.can_read_booking_operations_provider(booking_id, auth.uid())
  or public.can_read_booking_operations_admin(auth.uid())
);

drop policy if exists booking_operation_evidence_insert_provider on public.booking_operation_evidence;
create policy booking_operation_evidence_insert_provider
on public.booking_operation_evidence
for insert
to authenticated
with check (
  uploaded_by_user_id = auth.uid()
  and storage_bucket = 'booking-operation-evidence'
  and public.can_manage_booking_operations(booking_id, auth.uid())
  and public.extract_booking_id_from_operation_storage_path(storage_path) = booking_id
);

drop policy if exists booking_operation_report_select_provider on public.booking_operation_report;
create policy booking_operation_report_select_provider
on public.booking_operation_report
for select
to authenticated
using (
  public.can_read_booking_operations_provider(booking_id, auth.uid())
  or public.can_read_booking_operations_admin(auth.uid())
);

drop policy if exists booking_operation_report_insert_provider on public.booking_operation_report;
create policy booking_operation_report_insert_provider
on public.booking_operation_report
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_booking_operations(booking_id, auth.uid())
);

drop policy if exists booking_operation_report_update_provider on public.booking_operation_report;
create policy booking_operation_report_update_provider
on public.booking_operation_report
for update
to authenticated
using (public.can_manage_booking_operations(booking_id, auth.uid()))
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_booking_operations(booking_id, auth.uid())
);

drop policy if exists booking_operation_notes_select_provider on public.booking_operation_notes;
create policy booking_operation_notes_select_provider
on public.booking_operation_notes
for select
to authenticated
using (
  public.can_read_booking_operations_provider(booking_id, auth.uid())
  or public.can_read_booking_operations_admin(auth.uid())
);

drop policy if exists booking_operation_notes_insert_provider on public.booking_operation_notes;
create policy booking_operation_notes_insert_provider
on public.booking_operation_notes
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_booking_operations(booking_id, auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('booking-operation-evidence', 'booking-operation-evidence', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists booking_operation_evidence_objects_select on storage.objects;
create policy booking_operation_evidence_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'booking-operation-evidence'
  and (
    public.can_read_booking_operations_provider(public.extract_booking_id_from_operation_storage_path(name), auth.uid())
    or public.can_read_booking_operations_admin(auth.uid())
  )
);

drop policy if exists booking_operation_evidence_objects_insert on storage.objects;
create policy booking_operation_evidence_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'booking-operation-evidence'
  and public.can_manage_booking_operations(public.extract_booking_id_from_operation_storage_path(name), auth.uid())
);

drop policy if exists booking_operation_evidence_objects_delete on storage.objects;
create policy booking_operation_evidence_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'booking-operation-evidence'
  and public.can_manage_booking_operations(public.extract_booking_id_from_operation_storage_path(name), auth.uid())
);

-- Audit decision:
-- This migration does not insert a synthetic audit row. The current audit_logs
-- model requires an authenticated actor_user_id via insert_audit_log(), which a
-- schema migration does not have. Runtime mutations should add audit entries in
-- follow-up RPCs or controlled server-side functions.

grant execute on function public.can_manage_booking_operations(uuid, uuid) to authenticated;
grant execute on function public.can_read_booking_operations_provider(uuid, uuid) to authenticated;
grant execute on function public.can_read_booking_operations_admin(uuid) to authenticated;
grant execute on function public.extract_booking_id_from_operation_storage_path(text) to authenticated;
