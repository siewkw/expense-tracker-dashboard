alter table public.categories
  add column if not exists exclude_from_dashboard boolean not null default false;

create index if not exists categories_user_dashboard_exclusion_idx
  on public.categories(user_id, exclude_from_dashboard)
  where exclude_from_dashboard = true;

create or replace function public.get_dashboard_period_summary(
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
    coalesce(sum(transactions.amount) filter (where transactions.type = 'income'), 0) as income,
    coalesce(sum(transactions.amount) filter (
      where transactions.type = 'expense'
        and not exists (
          select 1
          from public.categories
          where categories.user_id = auth.uid()
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
  where transactions.user_id = auth.uid()
    and transactions.occurred_on >= p_start_date
    and transactions.occurred_on <= p_end_date;
$$;

create or replace function public.get_dashboard_daily_summary(
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
    transactions.occurred_on as day,
    coalesce(sum(transactions.amount) filter (where transactions.type = 'income'), 0) as income,
    coalesce(sum(transactions.amount) filter (
      where transactions.type = 'expense'
        and not exists (
          select 1
          from public.categories
          where categories.user_id = auth.uid()
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
  where transactions.user_id = auth.uid()
    and transactions.occurred_on >= p_start_date
    and transactions.occurred_on <= p_end_date
  group by transactions.occurred_on
  order by transactions.occurred_on;
$$;

create or replace function public.get_dashboard_category_summary(
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
    transactions.category,
    coalesce(sum(transactions.amount), 0) as spending
  from public.transactions
  where transactions.user_id = auth.uid()
    and transactions.type = 'expense'
    and transactions.occurred_on >= p_start_date
    and transactions.occurred_on <= p_end_date
    and not exists (
      select 1
      from public.categories
      where categories.user_id = auth.uid()
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

grant execute on function public.get_dashboard_period_summary(date, date) to authenticated;
grant execute on function public.get_dashboard_daily_summary(date, date) to authenticated;
grant execute on function public.get_dashboard_category_summary(date, date) to authenticated;
