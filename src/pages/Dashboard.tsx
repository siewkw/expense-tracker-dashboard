import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorMessage, Field, Input, PageHeader, Skeleton, StatCard } from '../components/ui';
import { CHART_COLORS } from '../constants/finance';
import { currentMonthDate, formatCurrency, formatPercent } from '../lib/format';
import { useFinanceData } from '../hooks/useFinanceData';

export function Dashboard() {
  const [startDate, setStartDate] = useState(currentMonthDate());
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const { transactions, dailySummary, categorySummary, summary, profile, loading, error } = useFinanceData({ startDate, endDate, recentTransactionLimit: 8 });
  const currency = profile?.currency ?? 'MYR';
  const trend = dailySummary.map((item) => ({ date: item.day.slice(5), spending: item.spending, income: item.income }));
  const categoryChart = categorySummary.map((item) => ({ name: item.category, value: item.spending }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A private date-bounded view of income, spending, budgets, investments, and net worth."
        action={
          <div className="grid grid-cols-2 gap-3">
            <Field label="From"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="To"><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
          </div>
        }
      />
      {error ? <ErrorMessage message={`We could not load your dashboard data. ${error}`} /> : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : null}

      <div className={loading ? 'hidden' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
        <StatCard label="Income" value={formatCurrency(summary.income, currency)} />
        <StatCard label="Spending" value={formatCurrency(summary.spending, currency)} />
        <StatCard label="Budget overview" value={formatPercent(summary.budgetUsedPercent)} detail={`${formatCurrency(summary.spending, currency)} of ${formatCurrency(summary.budget, currency)}`} />
        <StatCard label="Remaining budget" value={formatCurrency(summary.remainingBudget, currency)} detail={summary.budgetAlert === 'critical' ? 'Critical' : summary.budgetAlert === 'warning' ? 'Warning' : 'On track'} />
        <StatCard label="Savings rate" value={formatPercent(summary.savingsRate)} />
        <StatCard label="Net worth" value={formatCurrency(summary.netWorth, currency)} />
        <StatCard label="Investment value" value={formatCurrency(summary.investmentValue, currency)} />
      </div>

      <div className={loading ? 'hidden' : 'mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]'}>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Budget Usage Chart</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={[{ name: 'Budget', spent: summary.spending, remaining: summary.remainingBudget }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
                <Bar dataKey="spent" stackId="budget" fill={summary.budgetAlert === 'critical' ? '#dc2626' : summary.budgetAlert === 'warning' ? '#f59e0b' : '#18a46f'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" stackId="budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Category Budget Breakdown</h2>
          <div className="space-y-4">
            {summary.categoryBudgets.slice(0, 8).map((budget) => (
              <div key={budget.id}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-ink">{budget.category}</span>
                  <span className="text-slate-600">{formatPercent(budget.usedPercent)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={budget.alert === 'critical' ? 'h-2 rounded-full bg-red-600' : budget.alert === 'warning' ? 'h-2 rounded-full bg-amber-500' : 'h-2 rounded-full bg-brand-500'}
                    style={{ width: `${Math.min(budget.usedPercent * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(budget.spent, currency)} spent · {formatCurrency(budget.remaining, currency)} remaining
                </p>
              </div>
            ))}
            {summary.categoryBudgets.length === 0 ? <p className="text-sm text-slate-600">No category budgets set for this month.</p> : null}
          </div>
        </Card>
      </div>

      <div className={loading ? 'hidden' : 'mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]'}>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Spending trend</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
                <Line type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="income" stroke="#18a46f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Category breakdown</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {categoryChart.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className={loading ? 'hidden' : 'mt-6'}>
        <h2 className="mb-4 font-semibold text-ink">Recent transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Payment</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-slate-100">
                  <td className="py-3">{transaction.occurred_on}</td>
                  <td>{transaction.merchant ?? '-'}</td>
                  <td>{transaction.category}</td>
                  <td>{transaction.payment_method ?? '-'}</td>
                  <td className="text-right font-medium">{formatCurrency(transaction.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
