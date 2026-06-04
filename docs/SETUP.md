# Setup Guide

## Prerequisites

- Node.js 20 or newer
- npm
- Supabase account
- Vercel account for deployment

## Install

```bash
npm install
```

## Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Fill in values from Supabase Project Settings > API:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database

Run migrations in Supabase SQL Editor in this order:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_defaults.sql
supabase/migrations/004_phase_2_budget_management.sql
supabase/migrations/005_user_managed_categories.sql
supabase/migrations/006_intelligent_categorization.sql
supabase/migrations/007_performance_optimizations.sql
```

## Auth

In Supabase:

1. Go to Authentication > Providers.
2. Enable Email.
3. Go to Authentication > URL Configuration.
4. Set local Site URL:

```text
http://localhost:5173
```

5. Add local redirect URL:

```text
http://localhost:5173/settings
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## CSV Import Notes

The import page accepts `.csv` bank or credit card statements. No extra database migration is required because imported rows are saved into `public.transactions` with the current authenticated user's `user_id`.

Run `006_intelligent_categorization.sql` before using import categorization. It creates default merchant rules and the user-owned learned rule table.

Recommended CSV columns:

```text
Date,Amount,Merchant,Category,Payment Method,Notes
```

Columns can be mapped manually in the import wizard if your bank uses different names.
