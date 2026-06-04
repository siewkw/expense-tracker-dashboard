alter table public.transactions
  add column if not exists category_id uuid references public.categories(id) on delete set null;

update public.transactions transactions
set category_id = categories.id
from public.categories categories
where transactions.category_id is null
  and categories.user_id = transactions.user_id
  and lower(categories.name) = lower(transactions.category);

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_occurred_on_idx on public.transactions(occurred_on desc);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_merchant_lower_idx on public.transactions(lower(coalesce(merchant, '')));
create index if not exists transactions_created_at_idx on public.transactions(created_at desc);
create index if not exists transactions_user_occurred_on_idx on public.transactions(user_id, occurred_on desc);

create or replace function public.get_transaction_period_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  income numeric,
  spending numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as spending
  from public.transactions
  where user_id = auth.uid()
    and occurred_on >= p_start_date
    and occurred_on <= p_end_date;
$$;

create or replace function public.get_transaction_daily_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  day date,
  income numeric,
  spending numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    occurred_on as day,
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as spending
  from public.transactions
  where user_id = auth.uid()
    and occurred_on >= p_start_date
    and occurred_on <= p_end_date
  group by occurred_on
  order by occurred_on;
$$;

create or replace function public.get_transaction_category_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  category text,
  spending numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    category,
    coalesce(sum(amount), 0) as spending
  from public.transactions
  where user_id = auth.uid()
    and type = 'expense'
    and occurred_on >= p_start_date
    and occurred_on <= p_end_date
  group by category
  order by spending desc;
$$;
