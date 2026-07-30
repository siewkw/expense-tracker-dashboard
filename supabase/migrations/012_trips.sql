create type public.trip_status as enum ('upcoming', 'active', 'completed');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  destination text not null check (char_length(trim(destination)) between 1 and 160),
  start_date date not null,
  end_date date not null,
  total_budget numeric(14,2) not null check (total_budget > 0),
  home_currency text not null check (home_currency ~ '^[A-Z]{3}$'),
  destination_currency text not null check (destination_currency ~ '^[A-Z]{3}$'),
  default_exchange_rate numeric(18,8) not null check (default_exchange_rate > 0),
  status public.trip_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_valid check (end_date >= start_date),
  constraint trips_id_user_unique unique (id, user_id)
);

alter table public.transactions
  add column trip_id uuid,
  add column original_amount numeric(14,2),
  add column original_currency text,
  add column exchange_rate numeric(18,8),
  add column home_currency_amount numeric(14,2),
  add constraint transactions_trip_owner_fkey
    foreign key (trip_id, user_id)
    references public.trips(id, user_id)
    on delete restrict,
  add constraint transactions_trip_currency_fields_valid check (
    (
      trip_id is null
      and original_amount is null
      and original_currency is null
      and exchange_rate is null
      and home_currency_amount is null
    )
    or
    (
      trip_id is not null
      and type = 'expense'
      and original_amount > 0
      and original_currency ~ '^[A-Z]{3}$'
      and exchange_rate > 0
      and home_currency_amount > 0
      and amount = home_currency_amount
    )
  );

create index trips_user_status_dates_idx
  on public.trips(user_id, status, start_date desc);

create index transactions_user_trip_date_idx
  on public.transactions(user_id, trip_id, occurred_on desc)
  where trip_id is not null;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

alter table public.trips enable row level security;

create policy "trips_select_own" on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "trips_insert_own" on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "trips_update_own" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "trips_delete_empty_own" on public.trips
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (
      select 1
      from public.transactions
      where transactions.trip_id = trips.id
        and transactions.user_id = (select auth.uid())
    )
  );

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      trip_id is null
      or exists (
        select 1
        from public.trips
        where trips.id = transactions.trip_id
          and trips.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      trip_id is null
      or exists (
        select 1
        from public.trips
        where trips.id = transactions.trip_id
          and trips.user_id = (select auth.uid())
      )
    )
  );

grant select, insert, update, delete on public.trips to authenticated;

drop function if exists public.get_transaction_period_summary(date, date);
create function public.get_transaction_period_summary(
  p_start_date date,
  p_end_date date,
  p_include_travel boolean default false
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
    coalesce(sum(amount) filter (
      where type = 'expense'
        and lower(trim(category)) <> 'credit card repayment'
        and (p_include_travel or trip_id is null)
    ), 0) as spending
  from public.transactions
  where user_id = (select auth.uid())
    and occurred_on >= p_start_date
    and occurred_on <= p_end_date;
$$;

drop function if exists public.get_transaction_daily_summary(date, date);
create function public.get_transaction_daily_summary(
  p_start_date date,
  p_end_date date,
  p_include_travel boolean default false
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
    coalesce(sum(amount) filter (
      where type = 'expense'
        and lower(trim(category)) <> 'credit card repayment'
        and (p_include_travel or trip_id is null)
    ), 0) as spending
  from public.transactions
  where user_id = (select auth.uid())
    and occurred_on >= p_start_date
    and occurred_on <= p_end_date
  group by occurred_on
  order by occurred_on;
$$;

drop function if exists public.get_transaction_category_summary(date, date);
create function public.get_transaction_category_summary(
  p_start_date date,
  p_end_date date,
  p_include_travel boolean default false
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
  where user_id = (select auth.uid())
    and type = 'expense'
    and lower(trim(category)) <> 'credit card repayment'
    and occurred_on >= p_start_date
    and occurred_on <= p_end_date
    and (p_include_travel or trip_id is null)
  group by category
  order by spending desc;
$$;

drop function if exists public.get_dashboard_period_summary(date, date);
create function public.get_dashboard_period_summary(
  p_start_date date,
  p_end_date date,
  p_include_travel boolean default false
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
    coalesce(sum(transactions.amount) filter (where transactions.type = 'income'), 0) as income,
    coalesce(sum(transactions.amount) filter (
      where transactions.type = 'expense'
        and lower(trim(transactions.category)) <> 'credit card repayment'
        and (p_include_travel or transactions.trip_id is null)
        and not exists (
          select 1
          from public.categories
          where categories.user_id = (select auth.uid())
            and categories.exclude_from_dashboard = true
            and (
              categories.id = transactions.category_id
              or (
                transactions.category_id is null
                and lower(categories.name) = lower(transactions.category)
              )
            )
        )
    ), 0) as spending
  from public.transactions
  where transactions.user_id = (select auth.uid())
    and transactions.occurred_on >= p_start_date
    and transactions.occurred_on <= p_end_date;
$$;

drop function if exists public.get_dashboard_daily_summary(date, date);
create function public.get_dashboard_daily_summary(
  p_start_date date,
  p_end_date date,
  p_include_travel boolean default false
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
    transactions.occurred_on as day,
    coalesce(sum(transactions.amount) filter (where transactions.type = 'income'), 0) as income,
    coalesce(sum(transactions.amount) filter (
      where transactions.type = 'expense'
        and lower(trim(transactions.category)) <> 'credit card repayment'
        and (p_include_travel or transactions.trip_id is null)
        and not exists (
          select 1
          from public.categories
          where categories.user_id = (select auth.uid())
            and categories.exclude_from_dashboard = true
            and (
              categories.id = transactions.category_id
              or (
                transactions.category_id is null
                and lower(categories.name) = lower(transactions.category)
              )
            )
        )
    ), 0) as spending
  from public.transactions
  where transactions.user_id = (select auth.uid())
    and transactions.occurred_on >= p_start_date
    and transactions.occurred_on <= p_end_date
  group by transactions.occurred_on
  order by transactions.occurred_on;
$$;

drop function if exists public.get_dashboard_category_summary(date, date);
create function public.get_dashboard_category_summary(
  p_start_date date,
  p_end_date date,
  p_include_travel boolean default false
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
    transactions.category,
    coalesce(sum(transactions.amount), 0) as spending
  from public.transactions
  where transactions.user_id = (select auth.uid())
    and transactions.type = 'expense'
    and lower(trim(transactions.category)) <> 'credit card repayment'
    and transactions.occurred_on >= p_start_date
    and transactions.occurred_on <= p_end_date
    and (p_include_travel or transactions.trip_id is null)
    and not exists (
      select 1
      from public.categories
      where categories.user_id = (select auth.uid())
        and categories.exclude_from_dashboard = true
        and (
          categories.id = transactions.category_id
          or (
            transactions.category_id is null
            and lower(categories.name) = lower(transactions.category)
          )
        )
    )
  group by transactions.category
  order by spending desc;
$$;

create or replace function public.get_recurring_subscriptions(
  p_months integer default 6
)
returns table (
  merchant text,
  category text,
  payment_method text,
  average_amount numeric,
  occurrences bigint,
  first_charge date,
  last_charge date,
  cadence_days numeric,
  confidence numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with charges as (
    select
      lower(trim(merchant)) as merchant_key,
      trim(merchant) as merchant,
      category,
      payment_method,
      amount,
      occurred_on
    from public.transactions
    where user_id = (select auth.uid())
      and type = 'expense'
      and trip_id is null
      and lower(trim(category)) <> 'credit card repayment'
      and merchant is not null
      and trim(merchant) <> ''
      and occurred_on >= (current_date - make_interval(months => greatest(p_months, 1)))
  ),
  grouped as (
    select
      merchant_key,
      min(merchant) as merchant,
      max(category) as category,
      max(payment_method) as payment_method,
      avg(amount) as average_amount,
      count(*) as occurrences,
      min(occurred_on) as first_charge,
      max(occurred_on) as last_charge,
      case
        when count(*) > 1 then round((max(occurred_on) - min(occurred_on))::numeric / nullif(count(*) - 1, 0), 1)
        else null
      end as cadence_days,
      case
        when count(*) >= 5 then 0.95
        when count(*) = 4 then 0.85
        else 0.75
      end as confidence
    from charges
    group by merchant_key
    having count(*) >= 3
  )
  select
    merchant,
    category,
    payment_method,
    round(average_amount, 2) as average_amount,
    occurrences,
    first_charge,
    last_charge,
    cadence_days,
    confidence
  from grouped
  where cadence_days between 25 and 40
  order by average_amount desc, occurrences desc;
$$;

create or replace function public.get_spending_anomalies(
  p_start_date date,
  p_end_date date,
  p_baseline_months integer default 3
)
returns table (
  category text,
  current_spending numeric,
  baseline_monthly_average numeric,
  difference numeric,
  variance_percent numeric,
  severity text
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      p_start_date as current_start,
      p_end_date as current_end,
      (p_start_date - make_interval(months => greatest(p_baseline_months, 1)))::date as baseline_start,
      (p_start_date - interval '1 day')::date as baseline_end
  ),
  current_period as (
    select
      t.category,
      sum(t.amount) as current_spending
    from public.transactions t, bounds b
    where t.user_id = (select auth.uid())
      and t.type = 'expense'
      and t.trip_id is null
      and lower(trim(t.category)) <> 'credit card repayment'
      and t.occurred_on between b.current_start and b.current_end
    group by t.category
  ),
  baseline_months as (
    select
      t.category,
      date_trunc('month', t.occurred_on)::date as month,
      sum(t.amount) as month_spending
    from public.transactions t, bounds b
    where t.user_id = (select auth.uid())
      and t.type = 'expense'
      and t.trip_id is null
      and lower(trim(t.category)) <> 'credit card repayment'
      and t.occurred_on between b.baseline_start and b.baseline_end
    group by t.category, date_trunc('month', t.occurred_on)::date
  ),
  baseline as (
    select
      category,
      avg(month_spending) as baseline_monthly_average
    from baseline_months
    group by category
  )
  select
    c.category,
    round(c.current_spending, 2) as current_spending,
    round(coalesce(b.baseline_monthly_average, 0), 2) as baseline_monthly_average,
    round(c.current_spending - coalesce(b.baseline_monthly_average, 0), 2) as difference,
    case
      when coalesce(b.baseline_monthly_average, 0) = 0 then 1
      else round((c.current_spending - b.baseline_monthly_average) / nullif(b.baseline_monthly_average, 0), 4)
    end as variance_percent,
    case
      when coalesce(b.baseline_monthly_average, 0) = 0 and c.current_spending >= 100 then 'new'
      when c.current_spending >= b.baseline_monthly_average * 2 then 'critical'
      when c.current_spending >= b.baseline_monthly_average * 1.5 then 'warning'
      else 'normal'
    end as severity
  from current_period c
  left join baseline b on b.category = c.category
  where c.current_spending >= 50
    and (
      coalesce(b.baseline_monthly_average, 0) = 0
      or c.current_spending >= b.baseline_monthly_average * 1.5
    )
  order by difference desc;
$$;

create or replace function public.get_biggest_transactions(
  p_start_date date,
  p_end_date date,
  p_limit integer default 5
)
returns table (
  id uuid,
  occurred_on date,
  amount numeric,
  category text,
  merchant text,
  payment_method text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    id,
    occurred_on,
    amount,
    category,
    merchant,
    payment_method
  from public.transactions
  where user_id = (select auth.uid())
    and type = 'expense'
    and trip_id is null
    and lower(trim(category)) <> 'credit card repayment'
    and occurred_on between p_start_date and p_end_date
  order by amount desc, occurred_on desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_transaction_period_summary(date, date, boolean) to authenticated;
grant execute on function public.get_transaction_daily_summary(date, date, boolean) to authenticated;
grant execute on function public.get_transaction_category_summary(date, date, boolean) to authenticated;
grant execute on function public.get_dashboard_period_summary(date, date, boolean) to authenticated;
grant execute on function public.get_dashboard_daily_summary(date, date, boolean) to authenticated;
grant execute on function public.get_dashboard_category_summary(date, date, boolean) to authenticated;
