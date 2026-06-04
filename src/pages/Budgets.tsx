import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, Field, Input, PageHeader, Select, StatCard } from '../components/ui';
import { currentMonthDate, formatCurrency, formatPercent } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useFinanceData } from '../hooks/useFinanceData';
import type { Category } from '../types/database';

const alertStyles = {
  healthy: {
    label: 'On track',
    icon: CheckCircle2,
    text: 'text-brand-700',
    bg: 'bg-brand-50',
    bar: 'bg-brand-500',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    bar: 'bg-amber-500',
  },
  critical: {
    label: 'Critical',
    icon: ShieldAlert,
    text: 'text-red-700',
    bg: 'bg-red-50',
    bar: 'bg-red-600',
  },
};

type BudgetAlert = keyof typeof alertStyles;

function getAlertStyle(alert: string) {
  return alertStyles[(alert in alertStyles ? alert : 'healthy') as BudgetAlert];
}

export function Budgets() {
  const { user } = useAuth();
  const { categories, summary, profile, refresh } = useFinanceData({ includeWealth: false });
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categoryAmount, setCategoryAmount] = useState('');
  const currency = profile?.currency ?? 'MYR';
  const month = currentMonthDate();
  const currentMonthLabel = new Date(`${month}T00:00:00`).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const alert = getAlertStyle(summary.budgetAlert);
  const AlertIcon = alert.icon;
  const activeCategories = categories.filter((item) => !item.is_archived);
  const selectedCategory = category || activeCategories[0]?.name || '';

  useEffect(() => {
    if (!category && activeCategories[0]) {
      setCategory(activeCategories[0].name);
    }
  }, [activeCategories, category]);

  const chartData = useMemo(
    () =>
      summary.categoryBudgets.map((budget) => ({
        category: budget.category,
        budget: budget.amount,
        spent: budget.spent,
      })),
    [summary.categoryBudgets],
  );

  async function saveMonthlyBudget(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('monthly_budgets').upsert({ user_id: user.id, month, amount: Number(monthlyAmount) }, { onConflict: 'user_id,month' });
    setMonthlyAmount('');
    refresh();
  }

  async function saveCategoryBudget(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!selectedCategory) return;
    await supabase.from('budgets').upsert({ user_id: user.id, category: selectedCategory, month, amount: Number(categoryAmount) }, { onConflict: 'user_id,category,month' });
    setCategoryAmount('');
    refresh();
  }

  return (
    <>
      <PageHeader title="Budgets" description={`Manage monthly and category budgets for ${currentMonthLabel}.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly budget" value={formatCurrency(summary.budget, currency)} detail={summary.monthlyBudget ? 'Custom monthly limit' : 'Using category total'} />
        <StatCard label="Spent" value={formatCurrency(summary.spending, currency)} />
        <StatCard label="Remaining budget" value={formatCurrency(summary.remainingBudget, currency)} />
        <StatCard label="Percentage used" value={formatPercent(summary.budgetUsedPercent)} detail={alert.label} />
      </div>

      <Card className={`mt-4 ${alert.bg}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`flex items-center gap-3 ${alert.text}`}>
            <AlertIcon size={22} />
            <div>
              <p className="font-semibold">Budget status: {alert.label}</p>
              <p className="text-sm">
                Warning starts at 80%. Critical starts at 100% of your monthly budget.
              </p>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-700">{formatPercent(summary.budgetUsedPercent)} used</p>
        </div>
        <div className="mt-4 h-3 rounded-full bg-white">
          <div className={`h-3 rounded-full ${alert.bar}`} style={{ width: `${Math.min(summary.budgetUsedPercent * 100, 100)}%` }} />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold text-ink">Monthly Budget</h2>
            <form onSubmit={saveMonthlyBudget} className="space-y-4">
              <Field label="Budget amount">
                <Input type="number" min="0" step="0.01" value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} placeholder={String(summary.budget || '')} required />
              </Field>
              <Button type="submit">Save monthly budget</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold text-ink">Category Budgets</h2>
            <form onSubmit={saveCategoryBudget} className="space-y-4">
              <Field label="Category">
                <Select value={selectedCategory} onChange={(event) => setCategory(event.target.value)}>
                  {activeCategories.map((item: Category) => <option key={item.id}>{item.name}</option>)}
                </Select>
              </Field>
              <Field label="Budget amount">
                <Input type="number" min="0" step="0.01" value={categoryAmount} onChange={(event) => setCategoryAmount(event.target.value)} required />
              </Field>
              <Button type="submit" disabled={activeCategories.length === 0}>Save category budget</Button>
              {activeCategories.length === 0 ? <p className="text-sm text-slate-600">Add an active category in Settings before creating category budgets.</p> : null}
            </form>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 font-semibold text-ink">Category Budget Breakdown</h2>
          <div className="space-y-5">
            {summary.categoryBudgets.map((budget) => {
              const categoryAlert = getAlertStyle(budget.alert);
              const CategoryIcon = categoryAlert.icon;
              return (
                <div key={budget.id}>
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={categoryAlert.text} size={17} />
                      <span className="font-medium text-ink">{budget.category}</span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.amount, currency)} · {formatPercent(budget.usedPercent)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${categoryAlert.bar}`} style={{ width: `${Math.min(budget.usedPercent * 100, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Remaining: {formatCurrency(budget.remaining, currency)}</p>
                </div>
              );
            })}
            {summary.categoryBudgets.length === 0 ? <p className="text-sm text-slate-600">Set category budgets to see progress here.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold text-ink">Budget Usage Chart</h2>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
              <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" fill="#18a46f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
