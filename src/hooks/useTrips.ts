import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import type { Transaction, Trip } from '../types/database';

const transactionFields = 'id,user_id,occurred_on,amount,type,category,category_id,merchant,payment_method,notes,tags,recurring_income_id,recurring_expense_id,trip_id,original_amount,original_currency,exchange_rate,home_currency_amount,created_at,updated_at';

export function useTrips({ includeTransactions = true }: { includeTransactions?: boolean } = {}) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [tripResult, transactionResult] = await Promise.all([
      supabase
        .from('trips')
        .select('id,user_id,name,destination,start_date,end_date,total_budget,home_currency,destination_currency,default_exchange_rate,status,created_at,updated_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      includeTransactions
        ? supabase
          .from('transactions')
          .select(transactionFields)
          .eq('user_id', user.id)
          .not('trip_id', 'is', null)
          .order('occurred_on', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const failure = tripResult.error ?? transactionResult.error;
    if (failure) {
      setError(failure.message);
      setLoading(false);
      return;
    }

    setTrips((tripResult.data ?? []) as Trip[]);
    setTransactions((transactionResult.data ?? []) as Transaction[]);
    setLoading(false);
  }, [includeTransactions, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trips, transactions, loading, error, refresh };
}
