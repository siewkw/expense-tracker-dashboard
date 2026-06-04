create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists monthly_budgets_user_month_idx on public.monthly_budgets(user_id, month desc);

drop trigger if exists monthly_budgets_set_updated_at on public.monthly_budgets;
create trigger monthly_budgets_set_updated_at
  before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

alter table public.monthly_budgets enable row level security;

drop policy if exists "monthly_budgets_select_own" on public.monthly_budgets;
create policy "monthly_budgets_select_own" on public.monthly_budgets
  for select using (auth.uid() = user_id);

drop policy if exists "monthly_budgets_insert_own" on public.monthly_budgets;
create policy "monthly_budgets_insert_own" on public.monthly_budgets
  for insert with check (auth.uid() = user_id);

drop policy if exists "monthly_budgets_update_own" on public.monthly_budgets;
create policy "monthly_budgets_update_own" on public.monthly_budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "monthly_budgets_delete_own" on public.monthly_budgets;
create policy "monthly_budgets_delete_own" on public.monthly_budgets
  for delete using (auth.uid() = user_id);
