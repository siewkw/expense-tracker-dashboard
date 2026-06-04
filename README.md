# Multi-User Personal Finance Dashboard

Production-ready React, TypeScript, Vite, Tailwind CSS, Recharts, and Supabase dashboard for private personal finance tracking.

## Features

- Supabase Auth: sign up, login, logout, forgot password, password update
- Protected React routes
- Supabase Postgres database
- Row Level Security on every finance table
- Every private table stores `user_id`
- Users can read, create, update, and delete only their own records
- Dashboard widgets for income, spending, budget overview, remaining budget, savings rate, net worth, investment value, recent transactions, spending trends, category charts, and budget usage
- Phase 2 budget system with monthly budgets, category budgets, 80% warning alerts, 100% critical alerts, monthly budget reports, and overspending reports
- CSV import wizard for bank and credit card statements with column mapping, preview, duplicate detection, and auto categorization
- CSV and Excel-compatible export for transactions
- Imported transactions are saved with the current logged-in user's `user_id` and protected by transaction RLS policies
- Three-layer intelligent categorization: default merchant rules, user-learned rules, and confidence-scored fallback suggestions
- Pages for dashboard, add expense, transactions, budgets, reports, investments, net worth, and settings
- Mobile responsive layout with desktop sidebar and mobile horizontal navigation

## Project Structure

```text
.
|-- supabase/
|   |-- migrations/
|   |   |-- 001_initial_schema.sql
|   |   |-- 002_rls_policies.sql
|   |   |-- 003_seed_defaults.sql
|   |   |-- 004_phase_2_budget_management.sql
|   |   |-- 005_user_managed_categories.sql
|   |   |-- 006_intelligent_categorization.sql
|   |   `-- 007_performance_optimizations.sql
|   `-- seed_sample_user_data.sql
|-- docs/
|   |-- DEPLOYMENT.md
|   |-- PERFORMANCE.md
|   |-- SECURITY.md
|   `-- SETUP.md
|-- src/
|   |-- components/
|   |-- constants/
|   |-- hooks/
|   |-- lib/
|   |-- pages/
|   |-- providers/
|   |-- types/
|   |-- App.tsx
|   |-- main.tsx
|   `-- styles.css
|-- .env.example
|-- package.json
|-- tailwind.config.js
|-- vercel.json
`-- vite.config.ts
```

## Detailed Guides

- Local setup: `docs/SETUP.md`
- Performance notes: `docs/PERFORMANCE.md`
- Security model: `docs/SECURITY.md`
- Vercel deployment: `docs/DEPLOYMENT.md`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. In Supabase, open SQL Editor and run these files in order:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_defaults.sql
supabase/migrations/004_phase_2_budget_management.sql
supabase/migrations/005_user_managed_categories.sql
supabase/migrations/006_intelligent_categorization.sql
supabase/migrations/007_performance_optimizations.sql
```

4. Copy the environment template:

```bash
cp .env.example .env.local
```

5. Fill in:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

6. Run the app:

```bash
npm run dev
```

## Supabase Auth Setup

In Supabase Dashboard:

1. Go to Authentication > Providers.
2. Enable Email provider.
3. Go to Authentication > URL Configuration.
4. Set Site URL for local development:

```text
http://localhost:5173
```

5. Add Redirect URLs:

```text
http://localhost:5173/settings
https://your-vercel-domain.vercel.app/settings
```

## Security Model

The database is the source of truth for user isolation.

- RLS is enabled on `profiles`, user-managed `categories`, `merchant_rules`, `payment_methods`, `transactions`, `monthly_budgets`, `budgets`, `investments`, `assets`, `liabilities`, and `properties`.
- Private policies use `auth.uid() = user_id`.
- Insert and update policies require submitted `user_id` to match the authenticated user.
- Frontend queries also filter by `user_id`, but this is only a convenience and performance filter. RLS remains the security boundary.

Example policy:

```sql
create policy "monthly_budgets_select_own" on public.monthly_budgets
  for select using (auth.uid() = user_id);
```

## Sample Data

After creating a test user, copy that user's UUID from `auth.users`, replace the UUID in:

```text
supabase/seed_sample_user_data.sql
```

Then run the file in Supabase SQL Editor.

## Vercel Deployment

1. Push this project to a Git repository.
2. Import the repo in Vercel.
3. Framework preset: Vite.
4. Build command:

```text
npm run build
```

5. Output directory:

```text
dist
```

6. Add environment variables in Vercel Project Settings:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

7. In Supabase Authentication > URL Configuration, set the production Site URL:

```text
https://your-vercel-domain.vercel.app
```

8. Add production redirect URL:

```text
https://your-vercel-domain.vercel.app/settings
```

## Production Checklist

- Confirm Email Auth is enabled.
- Confirm RLS is enabled for every public table.
- Confirm no service role key is exposed to the frontend.
- Use only `VITE_SUPABASE_ANON_KEY` in Vercel.
- Verify two test users cannot see each other's transactions, monthly budgets, category budgets, investments, properties, assets, or liabilities.
- Enable Supabase email templates and SMTP for production-grade auth email delivery.
- Configure Vercel preview and production environment variables separately.
