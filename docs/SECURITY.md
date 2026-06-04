# Security Notes

## Data Isolation

This app uses Supabase Row Level Security as the primary security boundary.

Every private table includes `user_id`, and each policy checks:

```sql
auth.uid() = user_id
```

The frontend also filters by `user_id`, but frontend filters are not trusted as a security control. They are only used for clearer queries and better performance.

CSV imports use the same `public.transactions` table as manually entered expenses. Each imported transaction is inserted with the current authenticated user's `user_id`, and RLS rejects inserts where `auth.uid()` does not match that value.

Merchant categorization rules can be global defaults or user-owned learned rules. Users can read default rules, but they can only create, update, and delete rules where `merchant_rules.user_id = auth.uid()`.

Performance summary functions are `security invoker` functions and filter by `auth.uid()`, so they do not bypass RLS or expose another user's transaction summaries.

## Public Keys

Only the Supabase anon key should be used in the browser:

```text
VITE_SUPABASE_ANON_KEY
```

Never expose the Supabase service role key in Vite, Vercel, frontend code, logs, or browser-visible environment variables.

## Recommended Supabase Settings

- Enable email confirmations for production.
- Configure a production SMTP provider.
- Add only approved redirect URLs.
- Keep RLS enabled on all public tables.
- Review policies after every schema change.
- Archive categories with `is_archived` instead of deleting records used by historic transactions or budgets.

## Manual Privacy Test

1. Create User A.
2. Add transactions, monthly budgets, category budgets, investments, assets, liabilities, and properties.
3. Log out.
4. Create User B.
5. Confirm User B sees no User A records.
6. Try querying User A record IDs from User B's session; Supabase should return no rows or reject writes.

## Tables Covered By RLS

- `profiles`
- `categories` user-managed, archiveable
- `merchant_rules`
- `payment_methods`
- `transactions`
- `monthly_budgets`
- `budgets`
- `investments`
- `assets`
- `liabilities`
- `properties`
