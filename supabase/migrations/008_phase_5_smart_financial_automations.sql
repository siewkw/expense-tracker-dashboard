create index if not exists transactions_user_merchant_date_idx
  on public.transactions(user_id, lower(coalesce(merchant, '')), occurred_on desc);

create index if not exists budgets_user_category_month_idx
  on public.budgets(user_id, category, month desc);

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
    where user_id = auth.uid()
      and type = 'expense'
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
    where t.user_id = auth.uid()
      and t.type = 'expense'
      and t.occurred_on between b.current_start and b.current_end
    group by t.category
  ),
  baseline_months as (
    select
      t.category,
      date_trunc('month', t.occurred_on)::date as month,
      sum(t.amount) as month_spending
    from public.transactions t, bounds b
    where t.user_id = auth.uid()
      and t.type = 'expense'
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
  where user_id = auth.uid()
    and type = 'expense'
    and occurred_on between p_start_date and p_end_date
  order by amount desc, occurred_on desc
  limit greatest(p_limit, 1);
$$;
