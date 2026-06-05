import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorMessage, Field, Input, PageHeader, Skeleton, StatCard } from '../components/ui';
import { currentMonthDate, formatCurrency, formatPercent } from '../lib/format';
import { useFinanceData } from '../hooks/useFinanceData';

export function Reports() {
  const [startDate, setStartDate] = useState(currentMonthDate());
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const { categorySummary, summary, profile, loading, error } = useFinanceData({ startDate, endDate, recentTransactionLimit: 0, includeWealth: false });
  const currency = profile?.currency ?? 'MYR';
  const byCategory = categorySummary.map((item) => ({ category: item.category, amount: item.spending })).sort((a, b) => b.amount - a.amount);
  const overspending = summary.categoryBudgets.filter((budget) => budget.spent > budget.amount).sort((a, b) => b.usedPercent - a.usedPercent);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Analyze category concentration, cash flow, savings performance, and budget health for a selected period."
        action={
          <div className="grid grid-cols-2 gap-3">
            <Field label="From"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="To"><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
          </div>
        }
      />
      {error ? <ErrorMessage message={`We could not load reports. ${error}`} /> : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : null}

      <div className={loading ? 'hidden' : '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4'}>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Cash flow" value={formatCurrency(summary.income - summary.spending, currency)} /></div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Savings rate" value={formatPercent(summary.savingsRate)} /></div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Budget used" value={formatPercent(summary.budgetUsedPercent)} detail={`${formatCurrency(summary.spending, currency)} of ${formatCurrency(summary.budget, currency)}`} /></div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Largest category" value={byCategory[0]?.category ?? 'No expenses'} detail={byCategory[0] ? formatCurrency(byCategory[0].amount, currency) : undefined} /></div>
      </div>

      <Card className={loading ? 'hidden' : 'mt-6'}>
        <h2 className="mb-4 font-semibold text-ink">Monthly Budget Report</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-slate-500">
              <tr>
                <th className="py-2">Metric</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Usage</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 font-medium">Budget</td>
                <td className="text-right">{formatCurrency(summary.budget, currency)}</td>
                <td className="text-right">{formatPercent(summary.budgetUsedPercent)}</td>
                <td className="text-right capitalize">{summary.budgetAlert}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 font-medium">Spending</td>
                <td className="text-right">{formatCurrency(summary.spending, currency)}</td>
                <td className="text-right">-</td>
                <td className="text-right">Tracked</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Remaining budget</td>
                <td className="text-right">{formatCurrency(summary.remainingBudget, currency)}</td>
                <td className="text-right">-</td>
                <td className="text-right">{summary.remainingBudget > 0 ? 'Available' : 'Used up'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className={loading ? 'hidden' : 'mt-6'}>
        <h2 className="mb-4 font-semibold text-ink">Spending by category</h2>
        <div className="overflow-x-auto pb-2">
          <div className="h-72 min-w-[560px] sm:h-96 sm:min-w-0">
            <ResponsiveContainer>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Bar dataKey="amount" fill="#18a46f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card className={loading ? 'hidden' : 'mt-6'}>
        <h2 className="mb-4 font-semibold text-ink">Overspending Report</h2>
        {overspending.length === 0 ? (
          <p className="text-sm text-slate-600">No categories are over budget for the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-slate-500">
                <tr>
                  <th className="py-2">Category</th>
                  <th className="text-right">Budget</th>
                  <th className="text-right">Spent</th>
                  <th className="text-right">Over by</th>
                  <th className="text-right">Usage</th>
                </tr>
              </thead>
              <tbody>
                {overspending.map((budget) => (
                  <tr key={budget.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{budget.category}</td>
                    <td className="text-right">{formatCurrency(budget.amount, currency)}</td>
                    <td className="text-right">{formatCurrency(budget.spent, currency)}</td>
                    <td className="text-right text-red-700">{formatCurrency(budget.spent - budget.amount, currency)}</td>
                    <td className="text-right">{formatPercent(budget.usedPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
