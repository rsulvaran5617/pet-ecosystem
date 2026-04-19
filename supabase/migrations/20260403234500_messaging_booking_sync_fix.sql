create or replace function public.sync_chat_thread_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.booking_pricing
    where booking_id = new.id
  ) then
    return new;
  end if;

  perform public.upsert_booking_chat_thread_from_booking(new.id);
  return new;
end;
$$;

create or replace function public.sync_chat_thread_from_booking_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_booking_chat_thread_from_booking(new.booking_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_chat_thread_from_booking_pricing on public.booking_pricing;
create trigger trg_sync_chat_thread_from_booking_pricing
after insert or update on public.booking_pricing
for each row
execute function public.sync_chat_thread_from_booking_pricing();
