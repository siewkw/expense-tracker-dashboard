create table if not exists public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  day_of_month integer not null check (day_of_month between 1 and 31),
  start_month date not null default date_trunc('month', current_date)::date,
  payment_method text not null default 'Bank Transfer/QR',
  notes text,
  is_active boolean not null default true,
  last_generated_month date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_incomes_start_month_first_day check (start_month = date_trunc('month', start_month)::date),
  constraint recurring_incomes_last_generated_first_day check (
    last_generated_month is null or last_generated_month = date_trunc('month', last_generated_month)::date
  )
);

alter table public.transactions
  add column if not exists recurring_income_id uuid references public.recurring_incomes(id) on delete set null;

create index if not exists recurring_incomes_user_active_idx
  on public.recurring_incomes(user_id, is_active, day_of_month);

create unique index if not exists transactions_recurring_income_date_uidx
  on public.transactions(recurring_income_id, occurred_on)
  where recurring_income_id is not null;

drop trigger if exists recurring_incomes_set_updated_at on public.recurring_incomes;
create trigger recurring_incomes_set_updated_at
  before update on public.recurring_incomes
  for each row execute function public.set_updated_at();

alter table public.recurring_incomes enable row level security;

drop policy if exists "recurring_incomes_select_own" on public.recurring_incomes;
create policy "recurring_incomes_select_own" on public.recurring_incomes
  for select using (auth.uid() = user_id);

drop policy if exists "recurring_incomes_insert_own" on public.recurring_incomes;
create policy "recurring_incomes_insert_own" on public.recurring_incomes
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_incomes_update_own" on public.recurring_incomes;
create policy "recurring_incomes_update_own" on public.recurring_incomes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_incomes_delete_own" on public.recurring_incomes;
create policy "recurring_incomes_delete_own" on public.recurring_incomes
  for delete using (auth.uid() = user_id);

create or replace function public.process_recurring_incomes(
  p_as_of date default current_date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  schedule public.recurring_incomes%rowtype;
  target_month date := date_trunc('month', p_as_of)::date;
  target_date date;
  days_in_month integer;
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  days_in_month := extract(day from (target_month + interval '1 month - 1 day'))::integer;

  for schedule in
    select *
    from public.recurring_incomes
    where user_id = auth.uid()
      and is_active = true
      and start_month <= target_month
      and (last_generated_month is null or last_generated_month < target_month)
    order by created_at
  loop
    target_date := target_month + (least(schedule.day_of_month, days_in_month) - 1);

    if target_date <= p_as_of then
      insert into public.transactions (
        user_id,
        occurred_on,
        amount,
        type,
        category,
        category_id,
        merchant,
        payment_method,
        notes,
        tags,
        recurring_income_id
      )
      values (
        schedule.user_id,
        target_date,
        schedule.amount,
        'income',
        'Income',
        null,
        schedule.name,
        schedule.payment_method,
        schedule.notes,
        array['recurring', 'income'],
        schedule.id
      )
      on conflict (recurring_income_id, occurred_on)
        where recurring_income_id is not null
        do nothing;

      if found then
        inserted_count := inserted_count + 1;
      end if;

      update public.recurring_incomes
      set last_generated_month = target_month
      where id = schedule.id
        and user_id = auth.uid();
    end if;
  end loop;

  return inserted_count;
end;
$$;

grant execute on function public.process_recurring_incomes(date) to authenticated;
