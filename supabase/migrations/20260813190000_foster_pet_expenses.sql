create table if not exists public.foster_pet_expenses (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  protective_household_id uuid not null references public.households(id) on delete restrict,
  expense_date date not null,
  category text not null,
  title text not null,
  description text null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  vendor_name text null,
  payment_method text null,
  receipt_document_id uuid null references public.pet_documents(id) on delete set null,
  is_reimbursed boolean not null default false,
  reimbursement_note text null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foster_pet_expenses_category_check check (
    category in (
      'food',
      'veterinary',
      'medication',
      'vaccination',
      'deworming',
      'sterilization',
      'transport',
      'hygiene',
      'accessories',
      'documentation',
      'emergency',
      'other'
    )
  ),
  constraint foster_pet_expenses_amount_check check (amount >= 0),
  constraint foster_pet_expenses_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint foster_pet_expenses_title_check check (char_length(btrim(title)) > 0)
);

comment on table public.foster_pet_expenses is
  'Private expense ledger for pets under approved protective households. Not public and not a payment module.';
comment on column public.foster_pet_expenses.receipt_document_id is
  'Optional private pet_documents record used as receipt/supporting evidence for this expense.';

create index if not exists foster_pet_expenses_pet_date_idx
  on public.foster_pet_expenses (pet_id, expense_date desc);

create index if not exists foster_pet_expenses_household_date_idx
  on public.foster_pet_expenses (protective_household_id, expense_date desc);

create index if not exists foster_pet_expenses_category_idx
  on public.foster_pet_expenses (category);

create index if not exists foster_pet_expenses_receipt_document_idx
  on public.foster_pet_expenses (receipt_document_id)
  where receipt_document_id is not null;

drop trigger if exists trg_foster_pet_expenses_updated_at on public.foster_pet_expenses;
create trigger trg_foster_pet_expenses_updated_at
before update on public.foster_pet_expenses
for each row
execute function public.set_updated_at();

alter table public.foster_pet_expenses enable row level security;

drop policy if exists foster_pet_expenses_select_private on public.foster_pet_expenses;
create policy foster_pet_expenses_select_private
on public.foster_pet_expenses
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or (
    public.can_view_pet(pet_id, auth.uid())
    and exists (
      select 1
      from public.pets pet
      join public.households household on household.id = pet.household_id
      where pet.id = foster_pet_expenses.pet_id
        and pet.household_id = foster_pet_expenses.protective_household_id
        and household.household_type = 'protective'
    )
  )
);

drop policy if exists foster_pet_expenses_insert_editable on public.foster_pet_expenses;
create policy foster_pet_expenses_insert_editable
on public.foster_pet_expenses
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_edit_pet(pet_id, auth.uid())
  and exists (
    select 1
    from public.pets pet
    join public.households household on household.id = pet.household_id
    where pet.id = foster_pet_expenses.pet_id
      and pet.household_id = foster_pet_expenses.protective_household_id
      and household.household_type = 'protective'
      and public.is_approved_protective_household(foster_pet_expenses.protective_household_id)
  )
  and (
    receipt_document_id is null
    or exists (
      select 1
      from public.pet_documents document
      where document.id = foster_pet_expenses.receipt_document_id
        and document.pet_id = foster_pet_expenses.pet_id
        and public.can_view_pet(document.pet_id, auth.uid())
    )
  )
);

drop policy if exists foster_pet_expenses_update_editable on public.foster_pet_expenses;
create policy foster_pet_expenses_update_editable
on public.foster_pet_expenses
for update
to authenticated
using (
  public.can_edit_pet(pet_id, auth.uid())
  and exists (
    select 1
    from public.pets pet
    join public.households household on household.id = pet.household_id
    where pet.id = foster_pet_expenses.pet_id
      and pet.household_id = foster_pet_expenses.protective_household_id
      and household.household_type = 'protective'
  )
)
with check (
  public.can_edit_pet(pet_id, auth.uid())
  and exists (
    select 1
    from public.pets pet
    join public.households household on household.id = pet.household_id
    where pet.id = foster_pet_expenses.pet_id
      and pet.household_id = foster_pet_expenses.protective_household_id
      and household.household_type = 'protective'
  )
  and (
    receipt_document_id is null
    or exists (
      select 1
      from public.pet_documents document
      where document.id = foster_pet_expenses.receipt_document_id
        and document.pet_id = foster_pet_expenses.pet_id
        and public.can_view_pet(document.pet_id, auth.uid())
    )
  )
);

drop policy if exists foster_pet_expenses_delete_editable on public.foster_pet_expenses;
create policy foster_pet_expenses_delete_editable
on public.foster_pet_expenses
for delete
to authenticated
using (
  public.can_edit_pet(pet_id, auth.uid())
  and exists (
    select 1
    from public.pets pet
    join public.households household on household.id = pet.household_id
    where pet.id = foster_pet_expenses.pet_id
      and pet.household_id = foster_pet_expenses.protective_household_id
      and household.household_type = 'protective'
  )
);

grant select, insert, update, delete on public.foster_pet_expenses to authenticated;
