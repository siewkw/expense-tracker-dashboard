import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import type { Asset, Budget, Category, Investment, Liability, MerchantRule, MonthlyBudget, Profile, Property, Transaction } from '../types/database';
import { currentMonthDate } from '../lib/format';

type DailySummary = {
  day: string;
  income: number;
  spending: number;
};

type CategorySummary = {
  category: string;
  spending: number;
};

type FinanceData = {
  profile: Profile | null;
  categories: Category[];
  merchantRules: MerchantRule[];
  transactions: Transaction[];
  dailySummary: DailySummary[];
  categorySummary: CategorySummary[];
  monthlyBudgets: MonthlyBudget[];
  budgets: Budget[];
  investments: Investment[];
  assets: Asset[];
  liabilities: Liability[];
  properties: Property[];
};

type FinanceDataOptions = {
  startDate?: string;
  endDate?: string;
  recentTransactionLimit?: number;
  includeWealth?: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyData: FinanceData = {
  profile: null,
  categories: [],
  merchantRules: [],
  transactions: [],
  dailySummary: [],
  categorySummary: [],
  monthlyBudgets: [],
  budgets: [],
  investments: [],
  assets: [],
  liabilities: [],
  properties: [],
};

export function useFinanceData(options: FinanceDataOptions = {}) {
  const { user } = useAuth();
  const startDate = options.startDate ?? currentMonthDate();
  const endDate = options.endDate ?? today();
  const recentTransactionLimit = options.recentTransactionLimit ?? 8;
  const includeWealth = options.includeWealth ?? true;
  const [data, setData] = useState<FinanceData>(emptyData);
  const [periodSummary, setPeriodSummary] = useState({ income: 0, spending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const [
      profile,
      categories,
      merchantRules,
      transactions,
      periodSummaryResult,
      dailySummary,
      categorySummary,
      monthlyBudgets,
      budgets,
      investments,
      assets,
      liabilities,
      properties,
    ] = await Promise.all([
      supabase.from('profiles').select('id,user_id,full_name,currency,monthly_income_target,monthly_budget_target,created_at,updated_at').eq('user_id', user.id).maybeSingle(),
      supabase.from('categories').select('id,user_id,name,color,is_archived,created_at,updated_at').eq('user_id', user.id).order('is_archived', { ascending: true }).order('name', { ascending: true }),
      supabase.from('merchant_rules').select('id,user_id,merchant_pattern,category,source,confidence,is_active,created_at,updated_at').or(`user_id.is.null,user_id.eq.${user.id}`).eq('is_active', true).order('source', { ascending: false }).order('merchant_pattern', { ascending: true }),
      supabase
        .from('transactions')
        .select('id,user_id,occurred_on,amount,type,category,category_id,merchant,payment_method,notes,tags,created_at,updated_at')
        .eq('user_id', user.id)
        .gte('occurred_on', startDate)
        .lte('occurred_on', endDate)
        .order('occurred_on', { ascending: false })
        .limit(recentTransactionLimit),
      supabase.rpc('get_transaction_period_summary', { p_start_date: startDate, p_end_date: endDate }),
      supabase.rpc('get_transaction_daily_summary', { p_start_date: startDate, p_end_date: endDate }),
      supabase.rpc('get_transaction_category_summary', { p_start_date: startDate, p_end_date: endDate }),
      supabase.from('monthly_budgets').select('id,user_id,month,amount,created_at,updated_at').eq('user_id', user.id).order('month', { ascending: false }),
      supabase.from('budgets').select('id,user_id,category,month,amount,created_at,updated_at').eq('user_id', user.id).order('month', { ascending: false }),
      includeWealth ? supabase.from('investments').select('id,user_id,name,account,quantity,cost_basis,current_value,as_of,created_at,updated_at').eq('user_id', user.id).order('current_value', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      includeWealth ? supabase.from('assets').select('id,user_id,name,asset_type,value,as_of,created_at,updated_at').eq('user_id', user.id).order('value', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      includeWealth ? supabase.from('liabilities').select('id,user_id,name,liability_type,balance,as_of,created_at,updated_at').eq('user_id', user.id).order('balance', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      includeWealth ? supabase.from('properties').select('id,user_id,name,address,market_value,mortgage_balance,as_of,created_at,updated_at').eq('user_id', user.id).order('market_value', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);

    const results = [profile, categories, merchantRules, transactions, periodSummaryResult, dailySummary, categorySummary, monthlyBudgets, budgets, investments, assets, liabilities, properties];
    const failure = results.find((result) => result.error);
    if (failure?.error) {
      setError(failure.error.message);
      setLoading(false);
      return;
    }

    const period = periodSummaryResult.data?.[0] ?? { income: 0, spending: 0 };
    setPeriodSummary({ income: Number(period.income), spending: Number(period.spending) });
    setData({
      profile: profile.data ?? null,
      categories: (categories.data ?? []) as Category[],
      merchantRules: (merchantRules.data ?? []) as MerchantRule[],
      transactions: (transactions.data ?? []) as Transaction[],
      dailySummary: (dailySummary.data ?? []).map((item) => ({ day: item.day, income: Number(item.income), spending: Number(item.spending) })),
      categorySummary: (categorySummary.data ?? []).map((item) => ({ category: item.category, spending: Number(item.spending) })),
      monthlyBudgets: (monthlyBudgets.data ?? []) as MonthlyBudget[],
      budgets: (budgets.data ?? []) as Budget[],
      investments: (investments.data ?? []) as Investment[],
      assets: (assets.data ?? []) as Asset[],
      liabilities: (liabilities.data ?? []) as Liability[],
      properties: (properties.data ?? []) as Property[],
    });
    setLoading(false);
  }, [endDate, includeWealth, recentTransactionLimit, startDate, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const monthStart = currentMonthDate();
    const income = periodSummary.income;
    const spending = periodSummary.spending;
    const monthlyBudgetRecord = data.monthlyBudgets.find((item) => item.month === monthStart) ?? null;
    const categoryBudgetTotal = data.budgets.filter((item) => item.month === monthStart).reduce((sum, item) => sum + item.amount, 0);
    const budget = monthlyBudgetRecord?.amount ?? categoryBudgetTotal;
    const budgetUsedPercent = budget > 0 ? spending / budget : 0;
    const budgetAlert = budgetUsedPercent >= 1 ? 'critical' : budgetUsedPercent >= 0.8 ? 'warning' : 'healthy';
    const spendingByCategory = new Map(data.categorySummary.map((item) => [item.category, item.spending]));
    const categoryBudgets = data.budgets
      .filter((item) => item.month === monthStart)
      .map((budgetItem) => {
        const spent = spendingByCategory.get(budgetItem.category) ?? 0;
        const usedPercent = budgetItem.amount > 0 ? spent / budgetItem.amount : 0;
        return {
          ...budgetItem,
          spent,
          remaining: Math.max(budgetItem.amount - spent, 0),
          usedPercent,
          alert: usedPercent >= 1 ? 'critical' : usedPercent >= 0.8 ? 'warning' : 'healthy',
        };
      });
    const investmentValue = data.investments.reduce((sum, item) => sum + item.current_value, 0);
    const assetValue = data.assets.reduce((sum, item) => sum + item.value, 0);
    const propertyEquity = data.properties.reduce((sum, item) => sum + item.market_value - item.mortgage_balance, 0);
    const liabilities = data.liabilities.reduce((sum, item) => sum + item.balance, 0);
    const netWorth = assetValue + investmentValue + propertyEquity - liabilities;
    const savingsRate = income > 0 ? (income - spending) / income : 0;

    return {
      income,
      spending,
      budget,
      monthlyBudget: monthlyBudgetRecord,
      categoryBudgetTotal,
      remainingBudget: Math.max(budget - spending, 0),
      budgetUsedPercent,
      budgetAlert,
      categoryBudgets,
      savingsRate,
      investmentValue,
      netWorth,
      monthTransactions: data.transactions,
    };
  }, [data, periodSummary]);

  return { ...data, summary, loading, error, refresh, range: { startDate, endDate } };
}
