import { useMemo } from 'react';
import { ArrowLeft, MapPin, ReceiptText } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorMessage, PageHeader, Skeleton, StatCard } from '../components/ui';
import { CHART_COLORS } from '../constants/finance';
import { useTrips } from '../hooks/useTrips';
import { formatCurrency, formatPercent } from '../lib/format';
import { getTransactionHomeAmount, summarizeTrip } from '../lib/trips';

export function TripDashboard() {
  const { tripId } = useParams();
  const { trips, transactions, loading, error } = useTrips();
  const trip = trips.find((item) => item.id === tripId) ?? null;
  const tripTransactions = transactions.filter((transaction) => transaction.trip_id === tripId);
  const summary = trip ? summarizeTrip(trip, tripTransactions) : null;

  const categoryData = useMemo(() => groupTransactions(summary?.spendingTransactions ?? [], 'category'), [summary?.spendingTransactions]);
  const paymentData = useMemo(() => groupTransactions(summary?.spendingTransactions ?? [], 'payment_method'), [summary?.spendingTransactions]);
  const dailyData = useMemo(() => groupTransactions(summary?.spendingTransactions ?? [], 'occurred_on').sort((a, b) => a.name.localeCompare(b.name)), [summary?.spendingTransactions]);

  if (!loading && !trip) return <Navigate to="/trips" replace />;

  if (loading || !trip || !summary) {
    return (
      <>
        <Skeleton className="h-24" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      </>
    );
  }

  const budgetData = [
    { name: 'Spent', value: summary.spending },
    { name: 'Remaining', value: Math.max(summary.remaining, 0) },
  ];

  return (
    <>
      <Link to="/trips" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"><ArrowLeft size={17} />Back to trips</Link>
      <PageHeader
        title={trip.name}
        description={`${trip.destination} · ${formatTripDates(trip.start_date, trip.end_date)} · ${trip.status}`}
        action={<Link to={`/add-expense?trip=${trip.id}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 sm:w-auto">Add trip expense</Link>}
      />
      {error ? <ErrorMessage message={`We could not load this trip. ${error}`} /> : null}

      <section className="relative mb-5 overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-indigo-100"><MapPin size={16} />{trip.destination}</p>
            <p className="mt-3 text-4xl font-bold">{formatCurrency(summary.spending, trip.home_currency)}</p>
            <p className="mt-2 text-sm text-indigo-100">spent from {formatCurrency(trip.total_budget, trip.home_currency)}</p>
          </div>
          <div className="min-w-48 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.12em] text-indigo-100">Budget used</p>
            <p className="mt-2 text-2xl font-bold">{formatPercent(summary.usedPercent)}</p>
          </div>
        </div>
      </section>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Trip budget" value={formatCurrency(trip.total_budget, trip.home_currency)} /></div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Actual spending" value={formatCurrency(summary.spending, trip.home_currency)} /></div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Remaining" value={formatCurrency(summary.remaining, trip.home_currency)} /></div>
        <div className="w-[72vw] max-w-72 shrink-0 snap-start sm:w-auto sm:max-w-none"><StatCard label="Daily average" value={formatCurrency(summary.dailyAverage, trip.home_currency)} detail={summary.activeDays > 0 ? `${summary.activeDays} active trip day${summary.activeDays === 1 ? '' : 's'}` : 'Trip has not started'} /></div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Budget versus actual" description="How much of the dedicated trip budget remains.">
          <PieChart>
            <Pie data={budgetData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="78%" paddingAngle={3}>
              <Cell fill="#8b5cf6" />
              <Cell fill="#e2e8f0" />
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value), trip.home_currency)} />
            <Legend />
          </PieChart>
        </ChartCard>
        <ChartCard
          title="Spending by category"
          description="Uses your existing SaveLah categories."
          empty={categoryData.length === 0}
          emptyMessage="No category spending yet."
        >
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={3}>
              {categoryData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value), trip.home_currency)} />
            <Legend />
          </PieChart>
        </ChartCard>
        <ChartCard
          title="Spending by day"
          description="Daily home-currency spending across this trip."
          empty={dailyData.length === 0}
          emptyMessage="No daily spending to chart yet."
        >
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), trip.home_currency)} />
            <Line type="monotone" dataKey="value" name="Spending" stroke="#7c3aed" strokeWidth={3} />
          </LineChart>
        </ChartCard>
        <ChartCard
          title="Payment methods"
          description="Which payment methods funded the trip."
          empty={paymentData.length === 0}
          emptyMessage="No payment-method spending yet."
        >
          <BarChart data={paymentData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), trip.home_currency)} />
            <Bar dataKey="value" name="Spending" fill="#6366f1" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <Card className="mt-6">
        <h2 className="font-sora text-lg font-semibold text-ink">Recent trip transactions</h2>
        <p className="mt-1 text-sm text-slate-500">Latest converted expenses for this trip.</p>
        {summary.spendingTransactions.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No trip expenses yet.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {summary.spendingTransactions.slice(0, 8).map((transaction) => (
              <article key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-purple-600 shadow-sm"><ReceiptText size={17} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{transaction.merchant ?? transaction.category}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{transaction.category} · {transaction.occurred_on} · {transaction.payment_method ?? '-'}</p>
                    {transaction.original_amount && transaction.original_currency ? (
                      <p className="mt-1 text-xs text-purple-600">{formatCurrency(transaction.original_amount, transaction.original_currency)} at {Number(transaction.exchange_rate).toFixed(6)}</p>
                    ) : null}
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold text-ink">{formatCurrency(getTransactionHomeAmount(transaction), trip.home_currency)}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ChartCard({
  title,
  description,
  children,
  empty = false,
  emptyMessage = 'No spending data yet.',
}: {
  title: string;
  description: string;
  children: React.ReactElement;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Card>
      <h2 className="font-sora text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {empty ? (
        <div className="mt-4 grid min-h-40 place-items-center rounded-2xl bg-slate-50 px-5 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 h-64 sm:h-72">
          <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function groupTransactions(
  transactions: ReturnType<typeof useTrips>['transactions'],
  field: 'category' | 'payment_method' | 'occurred_on',
) {
  const grouped = new Map<string, number>();
  transactions.forEach((transaction) => {
    const name = transaction[field] || 'Other';
    grouped.set(name, (grouped.get(name) ?? 0) + getTransactionHomeAmount(transaction));
  });
  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function formatTripDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(`${endDate}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}
