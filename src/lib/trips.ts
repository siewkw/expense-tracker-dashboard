import type { Transaction, Trip } from '../types/database';

export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
export const TRIP_SPENDING_EXCLUDED_CATEGORIES = new Set(['credit card repayment', 'income']);

export type CurrencyConversion = {
  originalAmount: number;
  exchangeRate: number;
  homeAmount: number;
  usedActualHomeAmount: boolean;
};

export function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidCurrencyCode(value: string) {
  return CURRENCY_CODE_PATTERN.test(normalizeCurrencyCode(value));
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCurrencyConversion(
  originalAmount: number,
  exchangeRate: number,
  actualHomeAmount?: number | null,
): CurrencyConversion {
  const useActual = actualHomeAmount != null && Number.isFinite(actualHomeAmount) && actualHomeAmount > 0;
  const homeAmount = roundCurrency(useActual ? actualHomeAmount : originalAmount * exchangeRate);
  const effectiveRate = useActual && originalAmount > 0
    ? homeAmount / originalAmount
    : exchangeRate;

  return {
    originalAmount,
    exchangeRate: Number(effectiveRate.toFixed(8)),
    homeAmount,
    usedActualHomeAmount: useActual,
  };
}

export function getTransactionHomeAmount(transaction: Pick<Transaction, 'amount' | 'home_currency_amount'>) {
  return Number(transaction.home_currency_amount ?? transaction.amount);
}

export function isTripSpendingTransaction(
  transaction: Pick<Transaction, 'trip_id' | 'type' | 'category'>,
) {
  return Boolean(
    transaction.trip_id
    && transaction.type === 'expense'
    && !TRIP_SPENDING_EXCLUDED_CATEGORIES.has(transaction.category.trim().toLowerCase()),
  );
}

export function getTripSpending(transactions: Transaction[]) {
  return roundCurrency(transactions.reduce(
    (total, transaction) => total + (isTripSpendingTransaction(transaction) ? getTransactionHomeAmount(transaction) : 0),
    0,
  ));
}

export function getTripActiveDayCount(trip: Pick<Trip, 'start_date' | 'end_date'>, today = new Date()) {
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (current < start) return 0;
  const effectiveEnd = current < end ? current : end;
  return Math.max(Math.floor((effectiveEnd.getTime() - start.getTime()) / 86_400_000) + 1, 1);
}

export function summarizeTrip(trip: Trip, transactions: Transaction[]) {
  const spendingTransactions = transactions.filter(isTripSpendingTransaction);
  const spending = getTripSpending(spendingTransactions);
  const remaining = roundCurrency(Number(trip.total_budget) - spending);
  const activeDays = getTripActiveDayCount(trip);

  return {
    spendingTransactions,
    spending,
    remaining,
    usedPercent: Number(trip.total_budget) > 0 ? spending / Number(trip.total_budget) : 0,
    dailyAverage: activeDays > 0 ? roundCurrency(spending / activeDays) : 0,
    activeDays,
  };
}
