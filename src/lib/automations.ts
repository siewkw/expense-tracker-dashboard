import type { BiggestTransaction, Budget, Category, SpendingAnomaly } from '../types/database';

export type CategorySpend = {
  category: string;
  spending: number;
};

export type HealthScore = {
  score: number;
  status: 'Strong' | 'Stable' | 'Needs attention' | 'At risk';
  factors: Array<{ label: string; score: number; detail: string }>;
};

export type BudgetRisk = {
  risk: 'low' | 'medium' | 'high' | 'none';
  projectedSpending: number;
  projectedOverage: number;
  detail: string;
};

export type SavingsRecommendation = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  category: string;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

export function startOfWeek(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  return next.toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysInMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(dateString: string) {
  return new Date(`${dateString}T00:00:00`).getDate();
}

export function calculateHealthScore({
  savingsRate,
  budgetUsedPercent,
  liabilities,
  assets,
  investments,
  propertyEquity,
  anomalyCount,
}: {
  savingsRate: number;
  budgetUsedPercent: number;
  liabilities: number;
  assets: number;
  investments: number;
  propertyEquity: number;
  anomalyCount: number;
}): HealthScore {
  const savingsScore = clamp((savingsRate / 0.25) * 100);
  const budgetScore = clamp(100 - Math.max(budgetUsedPercent - 0.75, 0) * 220);
  const wealthBase = assets + investments + Math.max(propertyEquity, 0);
  const debtRatio = wealthBase > 0 ? liabilities / wealthBase : liabilities > 0 ? 1 : 0;
  const debtScore = clamp(100 - debtRatio * 120);
  const consistencyScore = clamp(100 - anomalyCount * 18);
  const score = Math.round(savingsScore * 0.35 + budgetScore * 0.3 + debtScore * 0.2 + consistencyScore * 0.15);

  return {
    score,
    status: score >= 80 ? 'Strong' : score >= 65 ? 'Stable' : score >= 45 ? 'Needs attention' : 'At risk',
    factors: [
      { label: 'Savings rate', score: Math.round(savingsScore), detail: savingsRate >= 0.2 ? 'Healthy monthly saving pace.' : 'Savings could use more room.' },
      { label: 'Budget adherence', score: Math.round(budgetScore), detail: budgetUsedPercent <= 0.8 ? 'Spending is inside the planned range.' : 'Budget usage is running hot.' },
      { label: 'Debt ratio', score: Math.round(debtScore), detail: debtRatio <= 0.35 ? 'Debt load is manageable.' : 'Debt is taking a larger share of net assets.' },
      { label: 'Spending consistency', score: Math.round(consistencyScore), detail: anomalyCount === 0 ? 'No major category spikes detected.' : `${anomalyCount} unusual category spike${anomalyCount > 1 ? 's' : ''} found.` },
    ],
  };
}

export function predictBudgetRisk({
  spending,
  budget,
  periodStart,
  periodEnd,
  today,
}: {
  spending: number;
  budget: number;
  periodStart: string;
  periodEnd: string;
  today: string;
}): BudgetRisk {
  if (budget <= 0) {
    return { risk: 'none', projectedSpending: spending, projectedOverage: 0, detail: 'Set a monthly budget to enable risk prediction.' };
  }

  const currentDay = Math.max(dayOfMonth(today), 1);
  const totalDays = daysInMonth(periodStart);
  const projectedSpending = periodEnd.slice(0, 7) === today.slice(0, 7) ? (spending / currentDay) * totalDays : spending;
  const projectedOverage = Math.max(projectedSpending - budget, 0);
  const projectedUsage = projectedSpending / budget;
  const risk = projectedUsage >= 1.05 ? 'high' : projectedUsage >= 0.9 ? 'medium' : 'low';

  return {
    risk,
    projectedSpending,
    projectedOverage,
    detail:
      risk === 'high'
        ? 'Current pace is likely to exceed the monthly budget.'
        : risk === 'medium'
          ? 'Current pace is close to the monthly budget.'
          : 'Current pace is within budget.',
  };
}

export function buildSavingsRecommendations({
  categorySummary,
  anomalies,
  budgets,
}: {
  categorySummary: CategorySpend[];
  anomalies: SpendingAnomaly[];
  budgets: Array<Budget & { spent?: number; amount: number }>;
}): SavingsRecommendation[] {
  const recommendations: SavingsRecommendation[] = [];
  const anomalyByCategory = new Map(anomalies.map((item) => [item.category, item]));

  for (const item of categorySummary.slice(0, 8)) {
    const anomaly = anomalyByCategory.get(item.category);
    const budget = budgets.find((budgetItem) => budgetItem.category === item.category);
    const overBudget = budget ? Math.max((budget.spent ?? item.spending) - budget.amount, 0) : 0;
    const opportunity = Math.max(overBudget, anomaly ? anomaly.difference * 0.35 : item.spending * 0.08);

    if (opportunity >= 30) {
      const rounded = Math.round(opportunity / 10) * 10;
      recommendations.push({
        id: `${item.category}-${rounded}`,
        title: `Reduce ${item.category} by RM${rounded}/month`,
        detail: overBudget > 0 ? 'This category is above its monthly budget.' : 'This category is higher than recent behavior.',
        amount: rounded,
        category: item.category,
      });
    }
  }

  return recommendations.slice(0, 5);
}

export function topCategories(categorySummary: CategorySpend[], limit = 5) {
  return [...categorySummary].sort((a, b) => b.spending - a.spending).slice(0, limit);
}

export function largestTransactionLabel(transaction: BiggestTransaction | undefined) {
  if (!transaction) return 'No expenses';
  return transaction.merchant || transaction.category;
}

export function activeCategoryNames(categories: Category[]) {
  return categories.filter((category) => !category.is_archived).map((category) => category.name);
}
