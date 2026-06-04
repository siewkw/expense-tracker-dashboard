-- Run this after signing in as a test user in Supabase SQL editor.
-- Replace the UUID below with the test user's auth.users.id.
do $$
declare
  target_user uuid := '00000000-0000-0000-0000-000000000000';
begin
  insert into public.transactions (user_id, occurred_on, amount, type, category, merchant, payment_method, notes, tags) values
    (target_user, date_trunc('month', current_date)::date + 1, 9800, 'income', 'Others', 'Salary', 'Bank Transfer/QR', 'Monthly salary', array['salary']),
    (target_user, date_trunc('month', current_date)::date + 2, 28.50, 'expense', 'Meals', 'Nasi Kandar Pelita', 'Touch n'' Go', 'Lunch', array['food']),
    (target_user, date_trunc('month', current_date)::date + 4, 210.75, 'expense', 'Groceries', 'Jaya Grocer', 'Credit Card', 'Weekly groceries', array['home']),
    (target_user, date_trunc('month', current_date)::date + 6, 95.00, 'expense', 'Petrol/Charging', 'Petronas', 'Debit Card', 'Fuel top up', array['car']),
    (target_user, date_trunc('month', current_date)::date + 8, 18.40, 'expense', 'Parking & Toll', 'PLUS', 'Touch n'' Go', 'Toll and parking', array['car']),
    (target_user, date_trunc('month', current_date)::date + 10, 129.90, 'expense', 'Subscriptions', 'Netflix', 'Credit Card', 'Streaming', array['recurring']);

  insert into public.budgets (user_id, category, month, amount) values
    (target_user, 'Meals', date_trunc('month', current_date)::date, 900),
    (target_user, 'Groceries', date_trunc('month', current_date)::date, 1200),
    (target_user, 'Petrol/Charging', date_trunc('month', current_date)::date, 550),
    (target_user, 'Shopping', date_trunc('month', current_date)::date, 700),
    (target_user, 'Entertainment', date_trunc('month', current_date)::date, 400),
    (target_user, 'Bills', date_trunc('month', current_date)::date, 1000),
    (target_user, 'Travel', date_trunc('month', current_date)::date, 600),
    (target_user, 'Others', date_trunc('month', current_date)::date, 500)
  on conflict (user_id, category, month) do update set amount = excluded.amount;

  insert into public.monthly_budgets (user_id, month, amount) values
    (target_user, date_trunc('month', current_date)::date, 6200)
  on conflict (user_id, month) do update set amount = excluded.amount;

  insert into public.investments (user_id, name, account, quantity, cost_basis, current_value) values
    (target_user, 'ASNB Fixed Price Fund', 'ASNB', 12000, 12000, 12360),
    (target_user, 'Global Equity ETF', 'Brokerage', 84, 14500, 16220);

  insert into public.assets (user_id, name, asset_type, value) values
    (target_user, 'Emergency Fund', 'bank', 30000),
    (target_user, 'Checking Account', 'bank', 8400),
    (target_user, 'Car', 'vehicle', 62000);

  insert into public.liabilities (user_id, name, liability_type, balance) values
    (target_user, 'Credit Card Balance', 'credit_card', 1650),
    (target_user, 'Car Loan', 'car_loan', 44000);

  insert into public.properties (user_id, name, address, market_value, mortgage_balance) values
    (target_user, 'Condo', 'Kuala Lumpur', 650000, 420000);
end $$;
