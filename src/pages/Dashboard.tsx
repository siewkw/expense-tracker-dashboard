import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, PiggyBank, ReceiptText, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorMessage, Field, Input, PageHeader, Skeleton, StatCard } from '../components/ui';
import { CHART_COLORS } from '../constants/finance';
import { currentMonthDate, formatCurrency, formatPercent } from '../lib/format';
import { useFinanceData } from '../hooks/useFinanceData';

export function Dashboard() {
  const [startDate, setStartDate] = useState(currentMonthDate());
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const { transactions, dailySummary, categorySummary, summary, profile, categories, loading, error } = useFinanceData({ startDate, endDate, recentTransactionLimit: 8, applyDashboardExclusions: true });
  const currency = profile?.currency ?? 'MYR';
  const excludedCategoryCount = categories.filter((category) => category.exclude_from_dashboard).length;
  const trend = dailySummary.map((item) => ({ date: item.day.slice(5), spending: item.spending, income: item.income }));
  const categoryChart = categorySummary.map((item) => ({ name: item.category, value: item.spending }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A private date-bounded view of income, spending, budgets, and investments."
        action={
          <div className="grid grid-cols-2 gap-3">
            <Field label="From"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="To"><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
          </div>
        }
      />
      {error ? <ErrorMessage message={`We could not load your dashboard data. ${error}`} /> : null}
      {excludedCategoryCount > 0 ? (
        <p className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {excludedCategoryCount} {excludedCategoryCount === 1 ? 'category is' : 'categories are'} excluded from dashboard spending.
        </p>
      ) : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : null}

      <section className={loading ? 'hidden' : 'relative mb-5 overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 p-6 text-white shadow-lift sm:p-8'}>
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-indigo-100">Current month spending</p>
            <p className="mt-3 text-4xl font-bold sm:text-5xl">{formatCurrency(summary.spending, currency)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1.5 font-medium backdrop-blur">
                {formatPercent(summary.budgetUsedPercent)} of budget
              </span>
              <span className="text-indigo-100">{formatCurrency(summary.remainingBudget, currency)} left to spend</span>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${Math.min(summary.budgetUsedPercent * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="h-40 rounded-[20px] bg-white/10 p-3 backdrop-blur-sm sm:h-48">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100">Monthly trend</p>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#e0e7ff', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#e0e7ff', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Line type="monotone" dataKey="spending" stroke="#ffffff" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className={loading ? 'hidden' : '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4'}>
        <KpiCard icon={ArrowUpRight} label="Income" value={formatCurrency(summary.income, currency)} tone="success" />
        <KpiCard icon={ArrowDownRight} label="Expenses" value={formatCurrency(summary.spending, currency)} tone="danger" />
        <KpiCard icon={PiggyBank} label="Savings" value={formatPercent(summary.savingsRate)} tone="purple" />
        <KpiCard icon={WalletCards} label="Budget remaining" value={formatCurrency(summary.remainingBudget, currency)} tone="indigo" detail={summary.budgetAlert === 'critical' ? 'Critical' : summary.budgetAlert === 'warning' ? 'Keep an eye on this' : 'Looking good'} />
      </div>

      <div className={loading ? 'hidden' : 'mt-5 grid gap-4 sm:grid-cols-2'}>
        <KpiCard icon={ReceiptText} label="Budget used" value={formatPercent(summary.budgetUsedPercent)} tone="indigo" detail={`${formatCurrency(summary.spending, currency)} of ${formatCurrency(summary.budget, currency)}`} compact />
        <KpiCard icon={WalletCards} label="Investments" value={formatCurrency(summary.investmentValue, currency)} tone="success" compact />
      </div>

      <div className={loading ? 'hidden' : 'mt-7 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]'}>
        <Card>
          <SectionHeading title="Budget pulse" description="How this month's spending compares with your plan." />
          <div className="h-60 sm:h-72">
            <ResponsiveContainer>
              <BarChart data={[{ name: 'Budget', spent: summary.spending, remaining: summary.remainingBudget }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
                <Bar dataKey="spent" stackId="budget" fill={summary.budgetAlert === 'critical' ? '#ef4444' : summary.budgetAlert === 'warning' ? '#f59e0b' : '#6366f1'} radius={[10, 10, 0, 0]} />
                <Bar dataKey="remaining" stackId="budget" fill="#e2e8f0" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionHeading title="Category budgets" description="Your most important spending limits at a glance." />
          <div className="space-y-5">
            {summary.categoryBudgets.slice(0, 8).map((budget) => (
              <div key={budget.id}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-ink">{budget.category}</span>
                  <span className="text-slate-600">{formatPercent(budget.usedPercent)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className={budget.alert === 'critical' ? 'h-2.5 rounded-full bg-red-500' : budget.alert === 'warning' ? 'h-2.5 rounded-full bg-amber-500' : 'h-2.5 rounded-full bg-brand-500'}
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

      <div className={loading ? 'hidden' : 'mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]'}>
        <Card>
          <SectionHeading title="Cash flow rhythm" description="Income and spending movement across the selected period." />
          <div className="h-60 sm:h-72">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
                <Line type="monotone" dataKey="spending" stroke="#a855f7" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionHeading title="Where it went" description="Your spending mix by category." />
          <div className="h-60 sm:h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4} cornerRadius={5}>
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
        <SectionHeading title="Recent activity" description="Your latest money moments." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {transactions.map((transaction) => (
            <article key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5 transition hover:bg-indigo-50/60">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                  <ReceiptText size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{transaction.merchant ?? transaction.category}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{transaction.category} · {transaction.occurred_on} · {transaction.payment_method ?? '-'}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-bold text-ink">{formatCurrency(transaction.amount, currency)}</p>
            </article>
          ))}
        </div>
      </Card>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  detail,
  compact = false,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: string;
  tone: 'success' | 'danger' | 'purple' | 'indigo';
  detail?: string;
  compact?: boolean;
}) {
  const toneClass = {
    success: 'bg-emerald-50 text-emerald-600',
    danger: 'bg-red-50 text-red-500',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }[tone];

  return (
    <Card className={compact ? '' : 'w-[76vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className={compact ? 'mt-2 text-xl font-bold text-ink' : 'mt-3 text-2xl font-bold text-ink'}>{value}</p>
          {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon size={18} />
        </span>
      </div>
    </Card>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
