import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save, ShieldAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, ErrorMessage, Field, Input, PageHeader, Skeleton, StatCard } from '../components/ui';
import { CHART_COLORS } from '../constants/finance';
import { currentMonthDate, formatCurrency, formatPercent } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useFinanceData } from '../hooks/useFinanceData';
import type { Category } from '../types/database';

const alertStyles = {
  healthy: {
    label: 'On Track',
    icon: CheckCircle2,
    text: 'text-emerald-700',
    bg: 'border-emerald-100 bg-emerald-50/70',
    bar: 'bg-emerald-500',
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  warning: {
    label: 'Near Limit',
    icon: AlertTriangle,
    text: 'text-amber-700',
    bg: 'border-amber-100 bg-amber-50/70',
    bar: 'bg-amber-500',
    badge: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  critical: {
    label: 'Over Budget',
    icon: ShieldAlert,
    text: 'text-red-700',
    bg: 'border-red-100 bg-red-50/70',
    bar: 'bg-red-600',
    badge: 'border-red-100 bg-red-50 text-red-700',
  },
};

type BudgetAlert = keyof typeof alertStyles;
type AllocationAmounts = Record<string, string>;

function getAlertStyle(alert: string) {
  return alertStyles[(alert in alertStyles ? alert : 'healthy') as BudgetAlert];
}

function monthEndDate(monthStart: string) {
  const [year, month] = monthStart.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function toMonthStart(monthValue: string) {
  return `${monthValue}-01`;
}

function isBudgetSpendingCategory(category: string) {
  return !['income', 'credit card repayment'].includes(category.trim().toLowerCase());
}

function getUsageAlert(allocated: number, spent: number): BudgetAlert {
  if (allocated <= 0 && spent > 0) return 'critical';
  const usage = allocated > 0 ? spent / allocated : 0;
  if (usage >= 1) return 'critical';
  if (usage >= 0.8) return 'warning';
  return 'healthy';
}

export function Budgets() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthDate());
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [allocationAmounts, setAllocationAmounts] = useState<AllocationAmounts>({});
  const {
    categories,
    categorySummary,
    summary,
    profile,
    loading,
    error,
    refresh,
  } = useFinanceData({
    includeWealth: false,
    applyDashboardExclusions: true,
    startDate: selectedMonth,
    endDate: monthEndDate(selectedMonth),
    budgetMonth: selectedMonth,
    recentTransactionLimit: 0,
  });

  const currency = profile?.currency ?? 'MYR';
  const currentMonthLabel = new Date(`${selectedMonth}T00:00:00`).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const activeCategories = useMemo(() => categories.filter((item) => !item.is_archived && !item.exclude_from_dashboard), [categories]);
  const excludedCategoryCount = categories.filter((item) => item.exclude_from_dashboard).length;
  const categoryColors = useMemo(
    () => new Map(categories.map((item) => [item.name, item.color])),
    [categories],
  );
  const alert = getAlertStyle(summary.budgetAlert);
  const AlertIcon = alert.icon;
  const totalAllocated = summary.categoryBudgetTotal;
  const remainingUnallocated = summary.budget - totalAllocated;
  const allocationBase = summary.budget > 0 ? summary.budget : totalAllocated;

  const actualByCategory = useMemo(() => {
    const spending = new Map<string, number>();
    categorySummary
      .filter((item) => isBudgetSpendingCategory(item.category))
      .forEach((item) => spending.set(item.category, item.spending));
    return spending;
  }, [categorySummary]);

  const budgetByCategory = useMemo(
    () => new Map(summary.categoryBudgets.map((budget) => [budget.category, budget.amount])),
    [summary.categoryBudgets],
  );

  const comparisonRows = useMemo(() => {
    const names = new Set<string>();
    activeCategories.forEach((item) => names.add(item.name));
    summary.categoryBudgets.forEach((budget) => names.add(budget.category));
    actualByCategory.forEach((_, category) => names.add(category));

    return [...names]
      .map((category) => {
        const allocated = budgetByCategory.get(category) ?? 0;
        const spent = actualByCategory.get(category) ?? 0;
        const remaining = allocated - spent;
        const usedPercent = allocated > 0 ? spent / allocated : 0;
        const allocationPercent = allocationBase > 0 ? allocated / allocationBase : 0;
        const alertKey = getUsageAlert(allocated, spent);

        return {
          category,
          allocated,
          spent,
          remaining,
          usedPercent,
          allocationPercent,
          alert: alertKey,
          color: categoryColors.get(category) ?? CHART_COLORS[names.size % CHART_COLORS.length],
        };
      })
      .filter((row) => row.allocated > 0 || row.spent > 0)
      .sort((a, b) => b.allocated - a.allocated || b.spent - a.spent || a.category.localeCompare(b.category));
  }, [activeCategories, actualByCategory, allocationBase, budgetByCategory, categoryColors, summary.categoryBudgets]);

  const allocationChartData = useMemo(() => {
    const allocatedSlices = comparisonRows
      .filter((row) => row.allocated > 0)
      .map((row, index) => ({
        name: row.category,
        value: row.allocated,
        color: row.color || CHART_COLORS[index % CHART_COLORS.length],
      }));

    if (remainingUnallocated > 0) {
      allocatedSlices.push({ name: 'Unallocated', value: remainingUnallocated, color: '#e2e8f0' });
    }

    return allocatedSlices;
  }, [comparisonRows, remainingUnallocated]);

  const barChartData = comparisonRows.map((row) => ({
    category: row.category,
    allocated: row.allocated,
    spent: row.spent,
  }));

  useEffect(() => {
    setMonthlyAmount(summary.monthlyBudget ? String(summary.monthlyBudget.amount) : '');
  }, [selectedMonth, summary.monthlyBudget]);

  useEffect(() => {
    const nextAmounts: AllocationAmounts = {};
    activeCategories.forEach((item) => {
      const amount = budgetByCategory.get(item.name);
      nextAmounts[item.name] = amount && amount > 0 ? String(amount) : '';
    });
    setAllocationAmounts(nextAmounts);
  }, [activeCategories, budgetByCategory, selectedMonth]);

  function updateAllocation(category: string, value: string) {
    setAllocationAmounts((current) => ({ ...current, [category]: value }));
  }

  async function saveMonthlyBudget(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('monthly_budgets').upsert(
      { user_id: user.id, month: selectedMonth, amount: Number(monthlyAmount) },
      { onConflict: 'user_id,month' },
    );
    refresh();
  }

  async function saveCategoryAllocations(event: FormEvent) {
    event.preventDefault();
    if (!user || activeCategories.length === 0) return;

    const rows = activeCategories.map((item) => ({
      user_id: user.id,
      category: item.name,
      month: selectedMonth,
      amount: Number(allocationAmounts[item.name] || 0),
    }));

    await supabase.from('budgets').upsert(rows, { onConflict: 'user_id,category,month' });
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        description={`Plan and track ${currentMonthLabel}.`}
        action={
          <Field label="Month">
            <Input
              type="month"
              value={selectedMonth.slice(0, 7)}
              onChange={(event) => setSelectedMonth(toMonthStart(event.target.value))}
            />
          </Field>
        }
      />

      {error ? <ErrorMessage message={`We could not load your budget data. ${error}`} /> : null}
      {excludedCategoryCount > 0 ? (
        <p className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {excludedCategoryCount} {excludedCategoryCount === 1 ? 'category is' : 'categories are'} excluded from spending and category budgets on this page.
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : null}

      <div className={loading ? 'hidden' : '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4'}>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none">
          <StatCard label="Monthly budget" value={formatCurrency(summary.budget, currency)} detail={summary.monthlyBudget ? 'Saved total' : 'Using allocations'} />
        </div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none">
          <StatCard label="Allocated" value={formatCurrency(totalAllocated, currency)} detail={`${formatPercent(allocationBase > 0 ? totalAllocated / allocationBase : 0)} assigned`} />
        </div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none">
          <StatCard label="Unallocated" value={formatCurrency(remainingUnallocated, currency)} detail={remainingUnallocated < 0 ? 'Over allocated' : 'Left to assign'} />
        </div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none">
          <StatCard label="Actual spent" value={formatCurrency(summary.budgetSpending, currency)} detail={`${formatPercent(summary.budgetUsedPercent)} used`} />
        </div>
      </div>

      <Card className={loading ? 'hidden' : `mt-4 ${alert.bg}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`flex items-center gap-3 ${alert.text}`}>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
              <AlertIcon size={22} />
            </span>
            <div>
              <p className="font-sora font-semibold">Budget status: {alert.label}</p>
              <p className="text-sm">Near Limit starts at 80%. Over Budget starts at 100%.</p>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-700">{formatCurrency(summary.budgetSpending, currency)} spent</p>
        </div>
        <div className="mt-4 h-3 rounded-full bg-white shadow-inner">
          <div className={`h-3 rounded-full transition-[width] duration-700 ${alert.bar}`} style={{ width: `${Math.min(summary.budgetUsedPercent * 100, 100)}%` }} />
        </div>
      </Card>

      <div className={loading ? 'hidden' : 'mt-6 grid gap-4 xl:grid-cols-[400px_1fr]'}>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 font-sora text-lg font-semibold text-ink">Monthly Budget</h2>
            <p className="mb-5 text-sm text-slate-500">Set one spending limit for this month.</p>
            <form onSubmit={saveMonthlyBudget} className="space-y-4">
              <Field label="Total budget">
                <Input type="number" min="0" step="0.01" value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} placeholder="0" required />
              </Field>
              <Button type="submit">
                <Save size={16} />
                Save total
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-1 font-sora text-lg font-semibold text-ink">Category Allocation</h2>
            <p className="mb-5 text-sm text-slate-500">Split the monthly budget by category.</p>
            {activeCategories.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">Add or include an active category in Settings before allocating budget.</p>
            ) : (
              <form onSubmit={saveCategoryAllocations} className="space-y-4">
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {activeCategories.map((item: Category) => {
                    const amount = Number(allocationAmounts[item.name] || 0);
                    const percent = allocationBase > 0 ? amount / allocationBase : 0;

                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="truncate text-sm font-semibold text-ink">{item.name}</span>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-slate-500">{formatPercent(percent)}</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={allocationAmounts[item.name] ?? ''}
                          onChange={(event) => updateAllocation(item.name, event.target.value)}
                          placeholder="0"
                        />
                      </div>
                    );
                  })}
                </div>
                <Button type="submit">
                  <Save size={16} />
                  Save allocations
                </Button>
              </form>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <h2 className="font-sora text-lg font-semibold text-ink">Allocation</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">Where the month is planned to go.</p>
            {allocationChartData.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No budget or allocation set.</p>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={allocationChartData} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={3} cornerRadius={5}>
                        {allocationChartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {allocationChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-slate-600">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="shrink-0 font-medium text-ink">{formatCurrency(item.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <h2 className="font-sora text-lg font-semibold text-ink">Budget vs Actual</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">Allocated, spent, and remaining by category.</p>
            <div className="space-y-4">
              {comparisonRows.map((row) => {
                const categoryAlert = getAlertStyle(row.alert);
                const CategoryIcon = categoryAlert.icon;
                const progress = row.allocated > 0 ? Math.min(row.usedPercent * 100, 100) : row.spent > 0 ? 100 : 0;

                return (
                  <div key={row.category} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="truncate font-medium text-ink">{row.category}</span>
                      </div>
                      <span className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryAlert.badge}`}>
                        <CategoryIcon size={13} />
                        {categoryAlert.label}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <Metric label="Allocated" value={`${formatCurrency(row.allocated, currency)} (${formatPercent(row.allocationPercent)})`} />
                      <Metric label="Spent" value={formatCurrency(row.spent, currency)} />
                      <Metric label={row.remaining < 0 ? 'Over by' : 'Remaining'} value={formatCurrency(Math.abs(row.remaining), currency)} tone={row.remaining < 0 ? 'text-red-700' : 'text-ink'} />
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-white shadow-inner">
                      <div className={`h-2.5 rounded-full transition-[width] duration-700 ${categoryAlert.bar}`} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.allocated > 0 ? `${formatPercent(row.usedPercent)} used` : 'No allocation'}
                    </p>
                  </div>
                );
              })}
              {comparisonRows.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Set a budget or add expenses to see category progress.</p> : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className={loading ? 'hidden' : 'mt-6'}>
        <h2 className="font-sora text-lg font-semibold text-ink">Usage Chart</h2>
        <p className="mb-5 mt-1 text-sm text-slate-500">Compare allocated budget with actual spending.</p>
        {barChartData.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No category data for this month.</p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="h-72 min-w-[560px] sm:h-80 sm:min-w-0">
              <ResponsiveContainer>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  <Bar dataKey="allocated" fill="#CBD5E1" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="spent" fill="#6366F1" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function Metric({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
