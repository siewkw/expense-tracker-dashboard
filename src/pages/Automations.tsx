import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, HeartPulse, PiggyBank, ReceiptText, Repeat, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorMessage, PageHeader, Skeleton, StatCard } from '../components/ui';
import { CHART_COLORS } from '../constants/finance';
import { useFinanceData } from '../hooks/useFinanceData';
import { supabase } from '../lib/supabase';
import {
  addDays,
  buildSavingsRecommendations,
  calculateHealthScore,
  largestTransactionLabel,
  predictBudgetRisk,
  startOfWeek,
  topCategories,
} from '../lib/automations';
import { currentMonthDate, formatCurrency, formatPercent } from '../lib/format';
import type { BiggestTransaction, RecurringSubscription, SpendingAnomaly } from '../types/database';

const today = () => new Date().toISOString().slice(0, 10);

export function Automations() {
  const monthStart = currentMonthDate();
  const todayDate = today();
  const weekStart = startOfWeek();
  const weekEnd = addDays(weekStart, 6) > todayDate ? todayDate : addDays(weekStart, 6);
  const month = useFinanceData({ startDate: monthStart, endDate: todayDate, recentTransactionLimit: 0 });
  const week = useFinanceData({ startDate: weekStart, endDate: weekEnd, recentTransactionLimit: 0, includeWealth: false });
  const [subscriptions, setSubscriptions] = useState<RecurringSubscription[]>([]);
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([]);
  const [biggestWeekTransactions, setBiggestWeekTransactions] = useState<BiggestTransaction[]>([]);
  const [automationLoading, setAutomationLoading] = useState(true);
  const [automationError, setAutomationError] = useState('');
  const currency = month.profile?.currency ?? 'MYR';
  const loading = month.loading || week.loading || automationLoading;
  const error = month.error || week.error || automationError;

  useEffect(() => {
    let active = true;

    async function loadAutomations() {
      setAutomationLoading(true);
      setAutomationError('');
      const [subscriptionResult, anomalyResult, biggestResult] = await Promise.all([
        supabase.rpc('get_recurring_subscriptions', { p_months: 6 }),
        supabase.rpc('get_spending_anomalies', { p_start_date: monthStart, p_end_date: todayDate, p_baseline_months: 3 }),
        supabase.rpc('get_biggest_transactions', { p_start_date: weekStart, p_end_date: weekEnd, p_limit: 5 }),
      ]);

      if (!active) return;
      const failure = [subscriptionResult, anomalyResult, biggestResult].find((result) => result.error);
      if (failure?.error) {
        setAutomationError(failure.error.message);
        setAutomationLoading(false);
        return;
      }

      setSubscriptions((subscriptionResult.data ?? []).map((item) => ({ ...item, average_amount: Number(item.average_amount), confidence: Number(item.confidence), cadence_days: item.cadence_days === null ? null : Number(item.cadence_days), occurrences: Number(item.occurrences) })));
      setAnomalies((anomalyResult.data ?? []).map((item) => ({ ...item, current_spending: Number(item.current_spending), baseline_monthly_average: Number(item.baseline_monthly_average), difference: Number(item.difference), variance_percent: Number(item.variance_percent) })));
      setBiggestWeekTransactions((biggestResult.data ?? []).map((item) => ({ ...item, amount: Number(item.amount) })));
      setAutomationLoading(false);
    }

    loadAutomations();
    return () => {
      active = false;
    };
  }, [monthStart, todayDate, weekEnd, weekStart]);

  const monthlyTopCategories = useMemo(() => topCategories(month.categorySummary, 6), [month.categorySummary]);
  const weeklyTopCategories = useMemo(() => topCategories(week.categorySummary, 4), [week.categorySummary]);
  const liabilities = month.liabilities.reduce((sum, item) => sum + item.balance, 0) + month.properties.reduce((sum, item) => sum + item.mortgage_balance, 0);
  const assets = month.assets.reduce((sum, item) => sum + item.value, 0);
  const investments = month.investments.reduce((sum, item) => sum + item.current_value, 0);
  const propertyEquity = month.properties.reduce((sum, item) => sum + item.market_value - item.mortgage_balance, 0);
  const health = calculateHealthScore({
    savingsRate: month.summary.savingsRate,
    budgetUsedPercent: month.summary.budgetUsedPercent,
    liabilities,
    assets,
    investments,
    propertyEquity,
    anomalyCount: anomalies.filter((item) => item.severity !== 'normal').length,
  });
  const recommendations = buildSavingsRecommendations({
    categorySummary: month.categorySummary,
    anomalies,
    budgets: month.summary.categoryBudgets,
  });
  const budgetRisk = predictBudgetRisk({
    spending: month.summary.spending,
    budget: month.summary.budget,
    periodStart: monthStart,
    periodEnd: todayDate,
    today: todayDate,
  });
  const subscriptionTotal = subscriptions.reduce((sum, item) => sum + item.average_amount, 0);

  return (
    <>
      <PageHeader
        title="Smart Automations"
        description="Private rule-based insights for subscriptions, anomalies, summaries, financial health, savings, and budget risk."
      />
      {error ? <ErrorMessage message={`We could not load smart automations. ${error}`} /> : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : null}

      <div className={loading ? 'hidden' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
        <StatCard label="Detected subscriptions" value={String(subscriptions.length)} detail={formatCurrency(subscriptionTotal, currency)} />
        <StatCard label="Anomaly alerts" value={String(anomalies.length)} detail={anomalies.length > 0 ? 'Review spending spikes' : 'No spikes found'} />
        <StatCard label="Financial health" value={`${health.score}/100`} detail={health.status} />
        <StatCard label="Budget risk" value={budgetRisk.risk === 'none' ? 'Setup needed' : budgetRisk.risk} detail={budgetRisk.detail} />
      </div>

      <div className={loading ? 'hidden' : 'mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]'}>
        <Card>
          <SectionTitle icon={Repeat} title="Subscriptions Dashboard" />
          {subscriptions.length === 0 ? (
            <p className="text-sm text-slate-600">No monthly recurring charges detected yet. Three similar monthly charges are needed before a subscription appears here.</p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((subscription) => (
                <div key={`${subscription.merchant}-${subscription.category}`} className="rounded-md border border-line p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{subscription.merchant}</p>
                      <p className="mt-1 text-sm text-slate-500">{subscription.category} - every {subscription.cadence_days ?? 30} days</p>
                    </div>
                    <p className="shrink-0 font-semibold text-ink">{formatCurrency(subscription.average_amount, currency)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <span>{subscription.occurrences} charges</span>
                    <span>{formatPercent(subscription.confidence)} confidence</span>
                    <span>Last {subscription.last_charge}</span>
                    <span>{subscription.payment_method ?? 'No payment method'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={AlertTriangle} title="Spending Anomaly Detection" />
          {anomalies.length === 0 ? (
            <p className="text-sm text-slate-600">No unusually high category spending detected for this month.</p>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly) => (
                <div key={anomaly.category} className="rounded-md border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{anomaly.category}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Usually {formatCurrency(anomaly.baseline_monthly_average, currency)} - now {formatCurrency(anomaly.current_spending, currency)}
                      </p>
                    </div>
                    <span className={anomaly.severity === 'critical' ? 'rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700' : 'rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Difference: {formatCurrency(anomaly.difference, currency)} ({formatPercent(anomaly.variance_percent)})
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className={loading ? 'hidden' : 'mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]'}>
        <Card>
          <SectionTitle icon={CalendarDays} title="Weekly Summary" />
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Spending" value={formatCurrency(week.summary.spending, currency)} />
            <MiniMetric label="Income" value={formatCurrency(week.summary.income, currency)} />
            <MiniMetric label="Biggest" value={largestTransactionLabel(biggestWeekTransactions[0])} />
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-ink">Top categories</h3>
            <div className="mt-3 space-y-3">
              {weeklyTopCategories.map((item) => (
                <ProgressRow key={item.category} label={item.category} amount={item.spending} max={weeklyTopCategories[0]?.spending ?? 1} currency={currency} />
              ))}
              {weeklyTopCategories.length === 0 ? <p className="text-sm text-slate-600">No weekly expenses yet.</p> : null}
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-ink">Biggest transactions</h3>
            <div className="mt-3 space-y-2">
              {biggestWeekTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{transaction.merchant ?? transaction.category}</span>
                  <span className="shrink-0 font-medium">{formatCurrency(transaction.amount, currency)}</span>
                </div>
              ))}
              {biggestWeekTransactions.length === 0 ? <p className="text-sm text-slate-600">No weekly expenses yet.</p> : null}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle icon={ReceiptText} title="Monthly Financial Report" />
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniMetric label="Spending" value={formatCurrency(month.summary.spending, currency)} />
            <MiniMetric label="Income" value={formatCurrency(month.summary.income, currency)} />
            <MiniMetric label="Savings" value={formatPercent(month.summary.savingsRate)} />
            <MiniMetric label="Budget" value={formatPercent(month.summary.budgetUsedPercent)} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={monthlyTopCategories} dataKey="spending" nameKey="category" innerRadius={48} outerRadius={86} paddingAngle={2}>
                    {monthlyTopCategories.map((item, index) => <Cell key={item.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={monthlyTopCategories}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  <Bar dataKey="spending" fill="#18a46f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      <div className={loading ? 'hidden' : 'mt-6 grid gap-4 xl:grid-cols-3'}>
        <Card>
          <SectionTitle icon={HeartPulse} title="Financial Health Score" />
          <div className="flex items-end gap-3">
            <p className="text-5xl font-semibold text-ink">{health.score}</p>
            <p className="pb-2 text-sm font-medium text-slate-600">{health.status}</p>
          </div>
          <div className="mt-5 space-y-4">
            {health.factors.map((factor) => (
              <div key={factor.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{factor.label}</span>
                  <span className="text-slate-600">{factor.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${factor.score}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{factor.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={PiggyBank} title="Savings Recommendations" />
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-md border border-line p-4">
                <p className="font-semibold text-ink">{recommendation.title}</p>
                <p className="mt-1 text-sm text-slate-600">{recommendation.detail}</p>
              </div>
            ))}
            {recommendations.length === 0 ? (
              <div className="rounded-md bg-brand-50 p-4 text-sm text-brand-800">
                <CheckCircle2 className="mb-2" size={18} />
                No obvious savings cuts found this month.
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={TrendingUp} title="Budget Risk Prediction" />
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Projected monthly spending</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatCurrency(budgetRisk.projectedSpending, currency)}</p>
            <p className="mt-2 text-sm text-slate-600">{budgetRisk.detail}</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Monthly budget</span>
              <span className="font-medium text-ink">{formatCurrency(month.summary.budget, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Projected overage</span>
              <span className={budgetRisk.projectedOverage > 0 ? 'font-medium text-red-700' : 'font-medium text-brand-700'}>{formatCurrency(budgetRisk.projectedOverage, currency)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={budgetRisk.risk === 'high' ? 'h-2 rounded-full bg-red-600' : budgetRisk.risk === 'medium' ? 'h-2 rounded-full bg-amber-500' : 'h-2 rounded-full bg-brand-500'}
                style={{ width: `${Math.min(month.summary.budget > 0 ? (budgetRisk.projectedSpending / month.summary.budget) * 100 : 0, 100)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="text-brand-600" size={18} />
      <h2 className="font-semibold text-ink">{title}</h2>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ProgressRow({ label, amount, max, currency }: { label: string; amount: number; max: number; currency: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-slate-600">{formatCurrency(amount, currency)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min((amount / Math.max(max, 1)) * 100, 100)}%` }} />
      </div>
    </div>
  );
}
