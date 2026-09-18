-- Enable only after compatible web/mobile clients have been published.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('expire-unapproved-bookings', '* * * * *',
  'select public.expire_unapproved_bookings();');
