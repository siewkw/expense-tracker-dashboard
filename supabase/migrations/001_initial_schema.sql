create extension if not exists "pgcrypto";

create type public.transaction_type as enum ('income', 'expense', 'transfer');
create type public.asset_type as enum ('cash', 'bank', 'investment', 'property', 'vehicle', 'other');
create type public.liability_type as enum ('mortgage', 'car_loan', 'credit_card', 'personal_loan', 'other');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'MYR',
  monthly_income_target numeric(14,2) not null default 0 check (monthly_income_target >= 0),
  monthly_budget_target numeric(14,2) not null default 0 check (monthly_budget_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_user_match check (id = user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#18a46f',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create unique index categories_default_name_uidx on public.categories(name) where user_id is null;
create unique index payment_methods_default_name_uidx on public.payment_methods(name) where user_id is null;
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  type public.transaction_type not null default 'expense',
  category text not null,
  merchant text,
  payment_method text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  month date not null,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month)
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account text,
  quantity numeric(18,6) not null default 0 check (quantity >= 0),
  cost_basis numeric(14,2) not null default 0 check (cost_basis >= 0),
  current_value numeric(14,2) not null default 0 check (current_value >= 0),
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_type public.asset_type not null default 'other',
  value numeric(14,2) not null default 0 check (value >= 0),
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  liability_type public.liability_type not null default 'other',
  balance numeric(14,2) not null default 0 check (balance >= 0),
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  market_value numeric(14,2) not null default 0 check (market_value >= 0),
  mortgage_balance numeric(14,2) not null default 0 check (mortgage_balance >= 0),
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index transactions_user_category_idx on public.transactions(user_id, category);
create index budgets_user_month_idx on public.budgets(user_id, month desc);
create index investments_user_idx on public.investments(user_id);
create index assets_user_idx on public.assets(user_id);
create index liabilities_user_idx on public.liabilities(user_id);
create index properties_user_idx on public.properties(user_id);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger investments_set_updated_at before update on public.investments for each row execute function public.set_updated_at();
create trigger assets_set_updated_at before update on public.assets for each row execute function public.set_updated_at();
create trigger liabilities_set_updated_at before update on public.liabilities for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, user_id, full_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
