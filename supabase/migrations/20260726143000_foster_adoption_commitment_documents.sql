insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foster-adoption-documents',
  'foster-adoption-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.protective_household_adoption_commitment_templates (
  id uuid primary key default gen_random_uuid(),
  protective_household_id uuid not null references public.households(id) on delete cascade,
  title text not null default 'Compromiso de adopcion',
  description text,
  requirement_policy text not null default 'informational',
  storage_bucket text not null default 'foster-adoption-documents',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint,
  is_active boolean not null default true,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protective_commitment_requirement_policy_check
    check (requirement_policy in ('informational', 'required_before_approval', 'required_before_transfer')),
  constraint protective_commitment_file_check
    check (
      storage_bucket = 'foster-adoption-documents'
      and mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
      and coalesce(file_size_bytes, 0) <= 10485760
    )
);

create unique index if not exists protective_commitment_one_active_per_household_idx
on public.protective_household_adoption_commitment_templates(protective_household_id)
where is_active;

create index if not exists protective_commitment_household_created_idx
on public.protective_household_adoption_commitment_templates(protective_household_id, created_at desc);

drop trigger if exists set_protective_commitment_templates_updated_at
on public.protective_household_adoption_commitment_templates;
create trigger set_protective_commitment_templates_updated_at
before update on public.protective_household_adoption_commitment_templates
for each row execute function public.set_updated_at();

alter table public.protective_household_adoption_commitment_templates enable row level security;

create table if not exists public.pet_adoption_application_commitment_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pet_adoption_applications(id) on delete cascade,
  template_id uuid references public.protective_household_adoption_commitment_templates(id) on delete set null,
  status text not null default 'pending',
  storage_bucket text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  review_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_commitment_status_check
    check (status in ('pending', 'received', 'reviewed', 'needs_correction')),
  constraint application_commitment_file_check
    check (
      (
        status = 'pending'
        and storage_bucket is null
        and storage_path is null
        and file_name is null
        and mime_type is null
      )
      or (
        storage_bucket = 'foster-adoption-documents'
        and storage_path is not null
        and file_name is not null
        and mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
        and coalesce(file_size_bytes, 0) <= 10485760
      )
    )
);

create unique index if not exists application_commitment_one_per_application_idx
on public.pet_adoption_application_commitment_documents(application_id);

create index if not exists application_commitment_status_created_idx
on public.pet_adoption_application_commitment_documents(status, created_at desc);

drop trigger if exists set_application_commitment_documents_updated_at
on public.pet_adoption_application_commitment_documents;
create trigger set_application_commitment_documents_updated_at
before update on public.pet_adoption_application_commitment_documents
for each row execute function public.set_updated_at();

alter table public.pet_adoption_application_commitment_documents enable row level security;

create or replace function public.can_manage_protective_commitment_template(
  target_household_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved_protective_household(target_household_id)
    and public.can_view_household(target_household_id, target_user_id);
$$;

grant execute on function public.can_manage_protective_commitment_template(uuid, uuid) to authenticated;

drop policy if exists protective_commitment_templates_select_scoped
on public.protective_household_adoption_commitment_templates;
create policy protective_commitment_templates_select_scoped
on public.protective_household_adoption_commitment_templates
for select
using (
  public.can_manage_protective_commitment_template(protective_household_id, auth.uid())
  or public.is_platform_admin(auth.uid())
  or exists (
    select 1
    from public.pet_adoption_applications as application
    where application.protective_household_id = protective_household_adoption_commitment_templates.protective_household_id
      and application.applicant_user_id = auth.uid()
      and protective_household_adoption_commitment_templates.is_active
  )
);

drop policy if exists application_commitment_documents_select_scoped
on public.pet_adoption_application_commitment_documents;
create policy application_commitment_documents_select_scoped
on public.pet_adoption_application_commitment_documents
for select
using (
  public.can_view_pet_adoption_application(application_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

create or replace function public.get_protective_adoption_commitment_template(target_household_id uuid)
returns setof public.protective_household_adoption_commitment_templates
language sql
stable
security definer
set search_path = public
as $$
  select template.*
  from public.protective_household_adoption_commitment_templates as template
  where template.protective_household_id = target_household_id
    and template.is_active
    and (
      public.can_manage_protective_commitment_template(template.protective_household_id, auth.uid())
      or public.is_platform_admin(auth.uid())
      or exists (
        select 1
        from public.pet_adoption_applications as application
        where application.protective_household_id = template.protective_household_id
          and application.applicant_user_id = auth.uid()
      )
    )
  order by template.updated_at desc
  limit 1;
$$;

create or replace function public.upsert_protective_adoption_commitment_template(
  target_household_id uuid,
  next_title text,
  next_description text,
  next_requirement_policy text,
  next_storage_bucket text,
  next_storage_path text,
  next_file_name text,
  next_mime_type text,
  next_file_size_bytes bigint default null
)
returns public.protective_household_adoption_commitment_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_template public.protective_household_adoption_commitment_templates%rowtype;
  normalized_title text := nullif(trim(coalesce(next_title, '')), '');
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para cargar un compromiso de adopcion.';
  end if;

  if not public.can_manage_protective_commitment_template(target_household_id, current_user_id) then
    raise exception 'Solo una Familia Protectora aprobada puede cargar compromisos de adopcion.';
  end if;

  if next_requirement_policy not in ('informational', 'required_before_approval', 'required_before_transfer') then
    raise exception 'Politica de compromiso no permitida.';
  end if;

  if next_storage_bucket <> 'foster-adoption-documents' or next_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Archivo de compromiso no permitido.';
  end if;

  if coalesce(next_file_size_bytes, 0) > 10485760 then
    raise exception 'El compromiso no puede superar 10 MB.';
  end if;

  update public.protective_household_adoption_commitment_templates
  set is_active = false
  where protective_household_id = target_household_id
    and is_active;

  insert into public.protective_household_adoption_commitment_templates (
    protective_household_id,
    title,
    description,
    requirement_policy,
    storage_bucket,
    storage_path,
    file_name,
    mime_type,
    file_size_bytes,
    created_by_user_id
  )
  values (
    target_household_id,
    coalesce(normalized_title, 'Compromiso de adopcion'),
    nullif(trim(coalesce(next_description, '')), ''),
    next_requirement_policy,
    next_storage_bucket,
    next_storage_path,
    next_file_name,
    next_mime_type,
    next_file_size_bytes,
    current_user_id
  )
  returning *
  into saved_template;

  perform public.insert_audit_log(
    'protective_household_adoption_commitment_template',
    saved_template.id,
    'protective_commitment_template_upserted',
    jsonb_build_object('household_id', saved_template.protective_household_id, 'requirement_policy', saved_template.requirement_policy),
    current_user_id
  );

  return saved_template;
end;
$$;

create or replace function public.get_pet_adoption_application_commitment_document(target_application_id uuid)
returns setof public.pet_adoption_application_commitment_documents
language sql
stable
security definer
set search_path = public
as $$
  select document.*
  from public.pet_adoption_application_commitment_documents as document
  where document.application_id = target_application_id
    and public.can_view_pet_adoption_application(document.application_id, auth.uid())
  limit 1;
$$;

create or replace function public.register_pet_adoption_application_commitment_document(
  target_application_id uuid,
  target_template_id uuid default null,
  next_storage_bucket text default null,
  next_storage_path text default null,
  next_file_name text default null,
  next_mime_type text default null,
  next_file_size_bytes bigint default null
)
returns public.pet_adoption_application_commitment_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_application public.pet_adoption_applications%rowtype;
  saved_document public.pet_adoption_application_commitment_documents%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para subir el compromiso firmado.';
  end if;

  select *
  into current_application
  from public.pet_adoption_applications
  where id = target_application_id
  for update;

  if current_application.id is null then
    raise exception 'Solicitud de adopcion no encontrada.';
  end if;

  if current_application.applicant_user_id <> current_user_id then
    raise exception 'Solo el solicitante puede subir el compromiso firmado.';
  end if;

  if current_application.status in ('withdrawn', 'rejected', 'converted_to_transfer') then
    raise exception 'Esta solicitud ya no acepta compromisos firmados.';
  end if;

  if next_storage_bucket <> 'foster-adoption-documents' or next_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Archivo de compromiso firmado no permitido.';
  end if;

  if coalesce(next_file_size_bytes, 0) > 10485760 then
    raise exception 'El compromiso firmado no puede superar 10 MB.';
  end if;

  insert into public.pet_adoption_application_commitment_documents (
    application_id,
    template_id,
    status,
    storage_bucket,
    storage_path,
    file_name,
    mime_type,
    file_size_bytes,
    submitted_by_user_id,
    submitted_at,
    reviewed_by_user_id,
    review_notes,
    reviewed_at
  )
  values (
    current_application.id,
    target_template_id,
    'received',
    next_storage_bucket,
    next_storage_path,
    next_file_name,
    next_mime_type,
    next_file_size_bytes,
    current_user_id,
    now(),
    null,
    null,
    null
  )
  on conflict (application_id) do update
  set
    template_id = excluded.template_id,
    status = 'received',
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    file_name = excluded.file_name,
    mime_type = excluded.mime_type,
    file_size_bytes = excluded.file_size_bytes,
    submitted_by_user_id = excluded.submitted_by_user_id,
    submitted_at = excluded.submitted_at,
    reviewed_by_user_id = null,
    review_notes = null,
    reviewed_at = null
  returning *
  into saved_document;

  perform public.insert_audit_log(
    'pet_adoption_application_commitment_document',
    saved_document.id,
    'application_commitment_document_uploaded',
    jsonb_build_object('application_id', current_application.id, 'listing_id', current_application.listing_id),
    current_user_id
  );

  return saved_document;
end;
$$;

create or replace function public.review_pet_adoption_application_commitment_document(
  target_application_id uuid,
  next_status text,
  notes text default null
)
returns public.pet_adoption_application_commitment_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_application public.pet_adoption_applications%rowtype;
  saved_document public.pet_adoption_application_commitment_documents%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para revisar el compromiso.';
  end if;

  if next_status not in ('reviewed', 'needs_correction') then
    raise exception 'Estado documental no permitido.';
  end if;

  select *
  into current_application
  from public.pet_adoption_applications
  where id = target_application_id;

  if current_application.id is null then
    raise exception 'Solicitud de adopcion no encontrada.';
  end if;

  if not public.can_view_household(current_application.protective_household_id, current_user_id) then
    raise exception 'Solo la Familia Protectora puede revisar el compromiso.';
  end if;

  update public.pet_adoption_application_commitment_documents
  set
    status = next_status,
    reviewed_by_user_id = current_user_id,
    review_notes = nullif(trim(coalesce(notes, '')), ''),
    reviewed_at = now()
  where application_id = current_application.id
    and storage_path is not null
  returning *
  into saved_document;

  if saved_document.id is null then
    raise exception 'No existe compromiso recibido para revisar.';
  end if;

  perform public.insert_audit_log(
    'pet_adoption_application_commitment_document',
    saved_document.id,
    'application_commitment_document_reviewed',
    jsonb_build_object('application_id', current_application.id, 'status', saved_document.status),
    current_user_id
  );

  return saved_document;
end;
$$;

create or replace function public.extract_foster_commitment_template_household_id(storage_path text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(storage_path, '/', 1) = 'templates'
      and split_part(storage_path, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(storage_path, '/', 2)::uuid
    else null
  end;
$$;

create or replace function public.extract_foster_commitment_application_id(storage_path text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(storage_path, '/', 1) = 'applications'
      and split_part(storage_path, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(storage_path, '/', 2)::uuid
    else null
  end;
$$;

drop policy if exists foster_adoption_documents_objects_select on storage.objects;
create policy foster_adoption_documents_objects_select
on storage.objects
for select
using (
  bucket_id = 'foster-adoption-documents'
  and (
    exists (
      select 1
      from public.protective_household_adoption_commitment_templates as template
      where template.storage_bucket = storage.objects.bucket_id
        and template.storage_path = storage.objects.name
        and (
          public.can_manage_protective_commitment_template(template.protective_household_id, auth.uid())
          or public.is_platform_admin(auth.uid())
          or exists (
            select 1
            from public.pet_adoption_applications as application
            where application.protective_household_id = template.protective_household_id
              and application.applicant_user_id = auth.uid()
              and template.is_active
          )
        )
    )
    or exists (
      select 1
      from public.pet_adoption_application_commitment_documents as document
      where document.storage_bucket = storage.objects.bucket_id
        and document.storage_path = storage.objects.name
        and public.can_view_pet_adoption_application(document.application_id, auth.uid())
    )
  )
);

drop policy if exists foster_adoption_documents_objects_insert on storage.objects;
create policy foster_adoption_documents_objects_insert
on storage.objects
for insert
with check (
  bucket_id = 'foster-adoption-documents'
  and auth.role() = 'authenticated'
  and (
    public.can_manage_protective_commitment_template(public.extract_foster_commitment_template_household_id(name), auth.uid())
    or public.can_view_pet_adoption_application(public.extract_foster_commitment_application_id(name), auth.uid())
  )
);

drop policy if exists foster_adoption_documents_objects_update on storage.objects;
create policy foster_adoption_documents_objects_update
on storage.objects
for update
using (
  bucket_id = 'foster-adoption-documents'
  and (
    public.can_manage_protective_commitment_template(public.extract_foster_commitment_template_household_id(name), auth.uid())
    or public.can_view_pet_adoption_application(public.extract_foster_commitment_application_id(name), auth.uid())
  )
)
with check (
  bucket_id = 'foster-adoption-documents'
  and (
    public.can_manage_protective_commitment_template(public.extract_foster_commitment_template_household_id(name), auth.uid())
    or public.can_view_pet_adoption_application(public.extract_foster_commitment_application_id(name), auth.uid())
  )
);

drop policy if exists foster_adoption_documents_objects_delete on storage.objects;
create policy foster_adoption_documents_objects_delete
on storage.objects
for delete
using (
  bucket_id = 'foster-adoption-documents'
  and (
    public.can_manage_protective_commitment_template(public.extract_foster_commitment_template_household_id(name), auth.uid())
    or public.can_view_pet_adoption_application(public.extract_foster_commitment_application_id(name), auth.uid())
  )
);

grant select on public.protective_household_adoption_commitment_templates to authenticated;
grant select on public.pet_adoption_application_commitment_documents to authenticated;
grant execute on function public.get_protective_adoption_commitment_template(uuid) to authenticated;
grant execute on function public.upsert_protective_adoption_commitment_template(uuid, text, text, text, text, text, text, text, bigint) to authenticated;
grant execute on function public.get_pet_adoption_application_commitment_document(uuid) to authenticated;
grant execute on function public.register_pet_adoption_application_commitment_document(uuid, uuid, text, text, text, text, bigint) to authenticated;
grant execute on function public.review_pet_adoption_application_commitment_document(uuid, text, text) to authenticated;
grant execute on function public.extract_foster_commitment_template_household_id(text) to authenticated;
grant execute on function public.extract_foster_commitment_application_id(text) to authenticated;
