alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_account_status_check,
  add constraint profiles_account_status_check
    check (account_status in ('active', 'deletion_requested'));

create index if not exists profiles_account_status_idx
  on public.profiles(account_status);

comment on column public.profiles.account_status is
  'Store readiness account lifecycle. deletion_requested anonymizes personal profile data and blocks future product operation without deleting transactional history.';

comment on column public.profiles.deletion_requested_at is
  'Timestamp when the authenticated user requested account deletion from a store-compliant client surface.';

comment on column public.profiles.deleted_at is
  'Timestamp when personal profile data was anonymized for account deletion request. Transactional records are retained for operational, support and audit history.';

create or replace function public.request_account_deletion()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_profile public.profiles%rowtype;
  anonymized_email text;
  updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to request account deletion';
  end if;

  select *
  into existing_profile
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'User profile not found for account deletion request';
  end if;

  if existing_profile.account_status = 'deletion_requested' then
    return existing_profile;
  end if;

  anonymized_email := concat('deleted+', current_user_id::text, '@petecosystem.local');

  update auth.users
  set email = anonymized_email,
      encrypted_password = null,
      email_confirmed_at = null,
      phone = null,
      phone_confirmed_at = null,
      raw_user_meta_data = jsonb_build_object('account_status', 'deletion_requested'),
      banned_until = 'infinity'::timestamptz,
      updated_at = now()
  where id = current_user_id;

  if to_regclass('auth.sessions') is not null then
    if to_regclass('auth.refresh_tokens') is not null then
      execute
        'delete from auth.refresh_tokens where session_id in (select id from auth.sessions where user_id = $1)'
      using current_user_id;
    end if;

    execute 'delete from auth.sessions where user_id = $1'
    using current_user_id;
  end if;

  update public.profiles
  set email = anonymized_email,
      first_name = 'Cuenta',
      last_name = 'eliminada',
      phone = null,
      avatar_url = null,
      marketing_opt_in = false,
      reminder_email_opt_in = false,
      reminder_push_opt_in = false,
      account_status = 'deletion_requested',
      deletion_requested_at = now(),
      deleted_at = now(),
      updated_at = now()
  where id = current_user_id
  returning * into updated_profile;

  delete from public.user_roles
  where user_id = current_user_id;

  update public.payment_methods
  set status = 'disabled',
      is_default = false,
      processor_reference = null,
      updated_at = now()
  where user_id = current_user_id;

  update public.user_addresses
  set recipient_name = 'Cuenta eliminada',
      line_1 = 'Direccion eliminada',
      line_2 = null,
      city = 'N/A',
      state_region = 'N/A',
      postal_code = '0000',
      country_code = 'PA',
      is_default = false,
      updated_at = now()
  where user_id = current_user_id;

  perform public.insert_audit_log(
    'profile',
    current_user_id,
    'account_deletion_requested',
    jsonb_build_object(
      'retention', 'transactional_history_retained',
      'personal_profile', 'anonymized',
      'auth_user_deleted', false
    ),
    current_user_id
  );

  return updated_profile;
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;
