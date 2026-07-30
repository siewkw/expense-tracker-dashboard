import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCurrencyConversion,
  getTripActiveDayCount,
  getTripSpending,
  isTripSpendingTransaction,
} from '../src/lib/trips.ts';
import type { Transaction } from '../src/types/database.ts';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'transaction-id',
    user_id: 'user-id',
    occurred_on: '2026-07-10',
    amount: 30,
    type: 'expense',
    category: 'Food',
    category_id: null,
    merchant: null,
    payment_method: 'Credit Card',
    notes: null,
    tags: [],
    recurring_income_id: null,
    recurring_expense_id: null,
    trip_id: 'trip-id',
    original_amount: 1_000,
    original_currency: 'JPY',
    exchange_rate: 0.03,
    home_currency_amount: 30,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...overrides,
  };
}

test('converts destination currency and rounds to home-currency cents', () => {
  assert.deepEqual(calculateCurrencyConversion(1_001, 0.03), {
    originalAmount: 1_001,
    exchangeRate: 0.03,
    homeAmount: 30.03,
    usedActualHomeAmount: false,
  });
});

test('uses an actual bank charge and stores its effective rate', () => {
  assert.deepEqual(calculateCurrencyConversion(100, 0.03, 3.25), {
    originalAmount: 100,
    exchangeRate: 0.0325,
    homeAmount: 3.25,
    usedActualHomeAmount: true,
  });
});

test('trip spending includes expenses and excludes income and card repayments', () => {
  const expense = transaction({});
  const income = transaction({ id: 'income', type: 'income' });
  const repayment = transaction({ id: 'repayment', category: 'Credit Card Repayment' });
  const daily = transaction({ id: 'daily', trip_id: null });

  assert.equal(isTripSpendingTransaction(expense), true);
  assert.equal(isTripSpendingTransaction(income), false);
  assert.equal(isTripSpendingTransaction(repayment), false);
  assert.equal(isTripSpendingTransaction(daily), false);
  assert.equal(getTripSpending([expense, income, repayment, daily]), 30);
});

test('counts elapsed trip days inclusively and returns zero before departure', () => {
  const trip = { start_date: '2026-07-10', end_date: '2026-07-15' };
  assert.equal(getTripActiveDayCount(trip, new Date('2026-07-09T12:00:00')), 0);
  assert.equal(getTripActiveDayCount(trip, new Date('2026-07-12T12:00:00')), 3);
  assert.equal(getTripActiveDayCount(trip, new Date('2026-07-20T12:00:00')), 6);
});
