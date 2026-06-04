alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.investments enable row level security;
alter table public.assets enable row level security;
alter table public.liabilities enable row level security;
alter table public.properties enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id and id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and id = auth.uid());
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

create policy "categories_select_own_or_defaults" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

create policy "payment_methods_select_own_or_defaults" on public.payment_methods
  for select using (user_id is null or auth.uid() = user_id);
create policy "payment_methods_insert_own" on public.payment_methods
  for insert with check (auth.uid() = user_id);
create policy "payment_methods_update_own" on public.payment_methods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payment_methods_delete_own" on public.payment_methods
  for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

create policy "investments_select_own" on public.investments
  for select using (auth.uid() = user_id);
create policy "investments_insert_own" on public.investments
  for insert with check (auth.uid() = user_id);
create policy "investments_update_own" on public.investments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "investments_delete_own" on public.investments
  for delete using (auth.uid() = user_id);

create policy "assets_select_own" on public.assets
  for select using (auth.uid() = user_id);
create policy "assets_insert_own" on public.assets
  for insert with check (auth.uid() = user_id);
create policy "assets_update_own" on public.assets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assets_delete_own" on public.assets
  for delete using (auth.uid() = user_id);

create policy "liabilities_select_own" on public.liabilities
  for select using (auth.uid() = user_id);
create policy "liabilities_insert_own" on public.liabilities
  for insert with check (auth.uid() = user_id);
create policy "liabilities_update_own" on public.liabilities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "liabilities_delete_own" on public.liabilities
  for delete using (auth.uid() = user_id);

create policy "properties_select_own" on public.properties
  for select using (auth.uid() = user_id);
create policy "properties_insert_own" on public.properties
  for insert with check (auth.uid() = user_id);
create policy "properties_update_own" on public.properties
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "properties_delete_own" on public.properties
  for delete using (auth.uid() = user_id);
