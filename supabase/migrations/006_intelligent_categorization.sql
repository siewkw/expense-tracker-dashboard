create table if not exists public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  merchant_pattern text not null,
  category text not null,
  source text not null default 'user' check (source in ('default', 'user', 'ai')),
  confidence numeric(4,3) not null default 1 check (confidence >= 0 and confidence <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchant_rules_user_idx on public.merchant_rules(user_id);
create index if not exists merchant_rules_pattern_idx on public.merchant_rules(lower(merchant_pattern));
create unique index if not exists merchant_rules_default_pattern_uidx
  on public.merchant_rules(lower(merchant_pattern))
  where user_id is null;
create unique index if not exists merchant_rules_user_pattern_uidx
  on public.merchant_rules(user_id, lower(merchant_pattern))
  where user_id is not null;

drop trigger if exists merchant_rules_set_updated_at on public.merchant_rules;
create trigger merchant_rules_set_updated_at
  before update on public.merchant_rules
  for each row execute function public.set_updated_at();

alter table public.merchant_rules enable row level security;

drop policy if exists "merchant_rules_select_own_or_defaults" on public.merchant_rules;
create policy "merchant_rules_select_own_or_defaults" on public.merchant_rules
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "merchant_rules_insert_own" on public.merchant_rules;
create policy "merchant_rules_insert_own" on public.merchant_rules
  for insert with check (auth.uid() = user_id);

drop policy if exists "merchant_rules_update_own" on public.merchant_rules;
create policy "merchant_rules_update_own" on public.merchant_rules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "merchant_rules_delete_own" on public.merchant_rules;
create policy "merchant_rules_delete_own" on public.merchant_rules
  for delete using (auth.uid() = user_id);

insert into public.categories (user_id, name, color)
select null, seed.name, seed.color
from (values
  ('Coffee', '#92400e'),
  ('Petrol', '#f97316'),
  ('Transport', '#0ea5e9'),
  ('Gaming', '#7c3aed')
) as seed(name, color)
where not exists (
  select 1 from public.categories existing
  where existing.user_id is null and lower(existing.name) = lower(seed.name)
);

insert into public.categories (user_id, name, color)
select users.id, defaults.name, defaults.color
from auth.users users
join public.categories defaults on defaults.user_id is null
where defaults.name in ('Coffee', 'Petrol', 'Transport', 'Gaming')
  and not exists (
    select 1
    from public.categories existing
    where existing.user_id = users.id
      and lower(existing.name) = lower(defaults.name)
  );

insert into public.merchant_rules (user_id, merchant_pattern, category, source, confidence)
select null, seed.merchant_pattern, seed.category, 'default', seed.confidence
from (values
  ('Starbucks', 'Coffee', 0.98),
  ('Coffee Bean', 'Coffee', 0.98),
  ('Shell', 'Petrol', 0.98),
  ('Petronas', 'Petrol', 0.98),
  ('Setel', 'Petrol', 0.98),
  ('TNB', 'Utilities', 0.98),
  ('Netflix', 'Subscriptions', 0.98),
  ('Spotify', 'Subscriptions', 0.98),
  ('Grab', 'Transport', 0.88),
  ('Shopee', 'Shopping', 0.98),
  ('Lazada', 'Shopping', 0.98),
  ('Steam', 'Gaming', 0.98),
  ('PlayStation', 'Gaming', 0.98)
) as seed(merchant_pattern, category, confidence)
where not exists (
  select 1
  from public.merchant_rules existing
  where existing.user_id is null
    and lower(existing.merchant_pattern) = lower(seed.merchant_pattern)
);
