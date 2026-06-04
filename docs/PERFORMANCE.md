# Performance Notes

## What Changed

- Dashboard no longer loads every transaction on startup.
- Dashboard defaults to the current month and supports custom date ranges.
- Reports use the selected date range and query summarized data.
- Transaction list loads the latest 50 transactions by default.
- Transaction list has a `Load more` button and does not render thousands of rows at once.
- Dashboard and report charts use daily and category summaries instead of raw full-table rows.
- Shared dashboard data queries select only the fields each view needs.
- Loading skeletons and friendly error messages were added to high-traffic views.
- CSV import checks duplicates for only the uploaded statement date span.
- CSV import inserts transactions in batches of 500.
- CSV export fetches records in batches of 1,000 only when the user clicks export.

## Database Optimizations

Run:

```text
supabase/migrations/007_performance_optimizations.sql
```

This migration adds:

- `transactions.category_id`
- Index on `transactions.user_id`
- Index on `transactions.occurred_on`
- Index on `transactions.category_id`
- Index on lowercased `transactions.merchant`
- Index on `transactions.created_at`
- Composite index on `transactions(user_id, occurred_on desc)`
- Summary function for period totals
- Summary function for daily chart data
- Summary function for category chart data

## RLS

All summary functions are `security invoker` and filter by `auth.uid()`, so user isolation remains enforced. Existing RLS policies on `public.transactions` still apply.
