insert into public.categories (user_id, name, color)
select null, seed.name, seed.color
from (values
  ('Meals', '#ef4444'),
  ('Groceries', '#22c55e'),
  ('Petrol/Charging', '#f97316'),
  ('Parking & Toll', '#eab308'),
  ('Shopping', '#a855f7'),
  ('Bills', '#0ea5e9'),
  ('Entertainment', '#ec4899'),
  ('Subscriptions', '#6366f1'),
  ('Utilities', '#14b8a6'),
  ('Insurance', '#64748b'),
  ('Property', '#8b5cf6'),
  ('Investment', '#10b981'),
  ('Travel', '#06b6d4'),
  ('Car Loan', '#f59e0b'),
  ('Others', '#71717a')
) as seed(name, color)
where not exists (
  select 1 from public.categories existing
  where existing.user_id is null and existing.name = seed.name
);

insert into public.payment_methods (user_id, name)
select null, seed.name
from (values
  ('Credit Card'),
  ('Debit Card'),
  ('Cash'),
  ('Touch n'' Go'),
  ('Bank Transfer/QR')
) as seed(name)
where not exists (
  select 1 from public.payment_methods existing
  where existing.user_id is null and existing.name = seed.name
);
