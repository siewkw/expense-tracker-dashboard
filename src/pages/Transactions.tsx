import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Pencil, Save, Search, Trash2, X } from 'lucide-react';
import { Button, Card, ErrorMessage, Field, Input, PageHeader, Select, Skeleton, TextArea } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { PAYMENT_METHODS } from '../constants/finance';
import { formatCurrency } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../providers/AuthProvider';
import type { Transaction, TransactionType } from '../types/database';
import type { TripTransactionValue } from '../components/TripTransactionFields';
import { TripTransactionFields } from '../components/TripTransactionFields';
import { useTrips } from '../hooks/useTrips';
import { calculateCurrencyConversion } from '../lib/trips';

type ExpenseForm = {
  occurred_on: string;
  amount: string;
  type: TransactionType;
  category: string;
  merchant: string;
  payment_method: string;
  notes: string;
  trip: TripTransactionValue;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyExpenseForm = (category = ''): ExpenseForm => ({
  occurred_on: today(),
  amount: '',
  type: 'expense',
  category,
  merchant: '',
  payment_method: 'Credit Card',
  notes: '',
  trip: { tripId: '', exchangeRate: '', actualHomeAmount: '' },
});

export function Transactions() {
  const { user } = useAuth();
  const { categories, merchantRules, profile, refresh } = useFinanceData({ recentTransactionLimit: 0, includeWealth: false });
  const { trips } = useTrips({ includeTransactions: false });
  const currency = profile?.currency ?? 'MYR';
  const activeCategories = categories.filter((category) => !category.is_archived);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ExpenseForm>(emptyExpenseForm());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const pageSize = 50;

  const filteredTransactions = transactions;

  const loadTransactions = useCallback(async (offset = 0) => {
    if (!user) return;
    setListLoading(true);
    setListError('');
    const from = offset;
    const to = from + pageSize - 1;
    let query = supabase
      .from('transactions')
      .select('id,user_id,occurred_on,amount,type,category,category_id,merchant,payment_method,notes,tags,recurring_income_id,recurring_expense_id,trip_id,original_amount,original_currency,exchange_rate,home_currency_amount,created_at,updated_at')
      .eq('user_id', user.id);

    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    if (paymentFilter !== 'all') query = query.eq('payment_method', paymentFilter);
    if (typeFilter !== 'all') query = query.eq('type', typeFilter);
    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`merchant.ilike.${term},category.ilike.${term},payment_method.ilike.${term},notes.ilike.${term}`);
    }

    if (sortBy === 'date_asc') query = query.order('occurred_on', { ascending: true });
    else if (sortBy === 'amount_desc') query = query.order('amount', { ascending: false });
    else if (sortBy === 'amount_asc') query = query.order('amount', { ascending: true });
    else if (sortBy === 'merchant_asc') query = query.order('merchant', { ascending: true });
    else query = query.order('occurred_on', { ascending: false });

    const { data, error } = await query.range(from, to);
    setListLoading(false);
    if (error) {
      setListError(error.message);
      return;
    }
    const nextRows = (data ?? []) as Transaction[];
    setTransactions((current) => (offset > 0 ? [...current, ...nextRows] : nextRows));
    setHasMore(nextRows.length === pageSize);
  }, [categoryFilter, paymentFilter, search, sortBy, typeFilter, user]);

  useEffect(() => {
    loadTransactions(0);
  }, [categoryFilter, loadTransactions, paymentFilter, search, sortBy, typeFilter]);

  function startEditing(transaction: Transaction) {
    setEditingId(transaction.id);
    setEditingForm({
      occurred_on: transaction.occurred_on,
      amount: String(transaction.original_amount ?? transaction.amount),
      type: transaction.type,
      category: transaction.category,
      merchant: transaction.merchant ?? '',
      payment_method: transaction.payment_method ?? 'Credit Card',
      notes: transaction.notes ?? '',
      trip: {
        tripId: transaction.trip_id ?? '',
        exchangeRate: transaction.exchange_rate ? String(transaction.exchange_rate) : '',
        actualHomeAmount: transaction.home_currency_amount ? String(transaction.home_currency_amount) : '',
      },
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const original = transactions.find((transaction) => transaction.id === editingId);
    const selectedTrip = trips.find((trip) => trip.id === editingForm.trip.tripId) ?? null;
    const originalAmount = Number(editingForm.amount);
    const rate = Number(editingForm.trip.exchangeRate);
    if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
      setListError('Amount must be greater than zero.');
      return;
    }
    if (selectedTrip && (!Number.isFinite(rate) || rate <= 0)) {
      setListError('Exchange rate must be greater than zero.');
      return;
    }
    const actualHomeAmount = editingForm.trip.actualHomeAmount ? Number(editingForm.trip.actualHomeAmount) : null;
    const conversion = selectedTrip ? calculateCurrencyConversion(originalAmount, rate, actualHomeAmount) : null;
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        occurred_on: editingForm.occurred_on,
        amount: conversion?.homeAmount ?? originalAmount,
        type: editingForm.type,
        category: editingForm.category,
        category_id: activeCategories.find((category) => category.name === editingForm.category)?.id ?? null,
        merchant: editingForm.merchant || null,
        payment_method: editingForm.payment_method,
        notes: editingForm.notes || null,
        trip_id: selectedTrip?.id ?? null,
        original_amount: selectedTrip ? originalAmount : null,
        original_currency: selectedTrip?.destination_currency ?? null,
        exchange_rate: conversion?.exchangeRate ?? null,
        home_currency_amount: conversion?.homeAmount ?? null,
      })
      .eq('id', editingId)
      .eq('user_id', user?.id ?? '');

    if (updateError) {
      setListError(updateError.message);
      return;
    }

    const learnedMerchant = editingForm.merchant || original?.merchant || '';
    if (user && learnedMerchant && original?.category !== editingForm.category) {
      await saveLearnedMerchantRule(user.id, learnedMerchant, editingForm.category);
    }

    setEditingId(null);
    loadTransactions(0);
    refresh();
  }

  async function saveLearnedMerchantRule(userId: string, merchant: string, category: string) {
    const existing = merchantRules.find(
      (rule) => rule.user_id === userId && rule.merchant_pattern.trim().toLowerCase() === merchant.trim().toLowerCase(),
    );

    if (existing) {
      await supabase.from('merchant_rules').update({ category, source: 'user', confidence: 1, is_active: true }).eq('id', existing.id);
      return;
    }

    await supabase.from('merchant_rules').insert({
      user_id: userId,
      merchant_pattern: merchant.trim(),
      category,
      source: 'user',
      confidence: 1,
      is_active: true,
    });
  }

  async function remove(id: string) {
    const confirmed = window.confirm('Delete this transaction?');
    if (!confirmed) return;
    await supabase.from('transactions').delete().eq('id', id);
    loadTransactions(0);
    refresh();
  }

  return (
    <>
      <PageHeader title="Transactions" description="Search, filter, edit, and delete expenses." />

      <Card className="mb-4 bg-slate-50/70">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_150px_180px]">
          <Field label="Search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input className="py-3 pl-10 text-base" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Merchant, category, notes" />
            </div>
          </Field>
          <Field label="Category">
            <Select className="py-3 text-base" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category.id}>{category.name}</option>)}
            </Select>
          </Field>
          <Field label="Payment">
            <Select className="py-3 text-base" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="all">All payments</option>
              {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
            </Select>
          </Field>
          <Field label="Type">
            <Select className="py-3 text-base" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | TransactionType)}>
              <option value="all">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </Field>
          <Field label="Sort">
            <Select className="py-3 text-base" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Highest amount</option>
              <option value="amount_asc">Lowest amount</option>
              <option value="merchant_asc">Merchant A-Z</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        {listError ? <ErrorMessage message={`We could not load transactions. ${listError}`} /> : null}
        {listLoading && transactions.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16" />)}
          </div>
        ) : null}
        {transactions.length === 0 ? <EmptyState title="No transactions yet" description="Add expenses to populate your dashboard." /> : null}
        {transactions.length > 0 && filteredTransactions.length === 0 ? <EmptyState title="No matching transactions" description="Try a different search, filter, or sort option." /> : null}
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredTransactions.map((transaction) => (
            <MobileTransactionCard
              key={transaction.id}
              transaction={transaction}
              currency={currency}
              isEditing={editingId === transaction.id}
              editingForm={editingForm}
              activeCategories={activeCategories}
              trips={trips}
              setEditingForm={setEditingForm}
              onEdit={() => startEditing(transaction)}
              onDelete={() => remove(transaction.id)}
              onCancel={() => setEditingId(null)}
              onSave={saveEdit}
            />
          ))}
        </div>
        {hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button type="button" className="min-h-11" onClick={() => loadTransactions(transactions.length)} disabled={listLoading}>
              {listLoading ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function EditExpenseForm({
  form,
  activeCategories,
  trips,
  setForm,
  onCancel,
  onSave,
}: {
  form: ExpenseForm;
  activeCategories: Array<{ id: string; name: string }>;
  trips: ReturnType<typeof useTrips>['trips'];
  setForm: (form: ExpenseForm) => void;
  onCancel: () => void;
  onSave: (event: FormEvent) => void;
}) {
  function updateTrip(trip: TripTransactionValue) {
    let amount = form.amount;
    if (form.trip.tripId && !trip.tripId) {
      const originalAmount = Number(form.amount);
      const rate = Number(form.trip.exchangeRate);
      const actualHomeAmount = form.trip.actualHomeAmount ? Number(form.trip.actualHomeAmount) : null;
      if (originalAmount > 0 && rate > 0) {
        amount = String(calculateCurrencyConversion(originalAmount, rate, actualHomeAmount).homeAmount);
      }
    }
    setForm({ ...form, amount, trip });
  }

  return (
    <form onSubmit={onSave} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[130px_130px_130px_1fr_170px_170px_auto]">
      <Input type="date" value={form.occurred_on} onChange={(event) => setForm({ ...form, occurred_on: event.target.value })} required />
      <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
      <Select value={form.type} onChange={(event) => {
        const type = event.target.value as TransactionType;
        setForm({ ...form, type, trip: type === 'expense' ? form.trip : { tripId: '', exchangeRate: '', actualHomeAmount: '' } });
      }}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </Select>
      <Input value={form.merchant} onChange={(event) => setForm({ ...form, merchant: event.target.value })} placeholder="Merchant" />
      <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
        {activeCategories.map((category) => <option key={category.id}>{category.name}</option>)}
      </Select>
      <Select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
        {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
      </Select>
      <div className="flex gap-2">
        <Button type="submit" className="px-3" aria-label="Save transaction"><Save size={15} /></Button>
        <Button type="button" className="bg-slate-500 px-3 hover:bg-slate-600" onClick={onCancel} aria-label="Cancel edit"><X size={15} /></Button>
      </div>
      <div className="md:col-span-2 xl:col-span-7">
        <TextArea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" />
      </div>
      <div className="contents xl:[&>*]:col-span-7">
        <TripTransactionFields
          trips={trips}
          value={form.trip}
          originalAmount={form.amount}
          disabled={form.type !== 'expense'}
          onChange={updateTrip}
        />
      </div>
    </form>
  );
}

function MobileTransactionCard({
  transaction,
  currency,
  isEditing,
  editingForm,
  activeCategories,
  trips,
  setEditingForm,
  onEdit,
  onDelete,
  onCancel,
  onSave,
}: {
  transaction: Transaction;
  currency: string;
  isEditing: boolean;
  editingForm: ExpenseForm;
  activeCategories: Array<{ id: string; name: string }>;
  trips: ReturnType<typeof useTrips>['trips'];
  setEditingForm: (form: ExpenseForm) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: (event: FormEvent) => void;
}) {
  if (isEditing) {
    return (
      <div className="rounded-[20px] border border-indigo-100 bg-indigo-50/60 p-4">
        <EditExpenseForm form={editingForm} activeCategories={activeCategories} trips={trips} setForm={setEditingForm} onCancel={onCancel} onSave={onSave} />
      </div>
    );
  }

  return (
    <article className="group rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_32px_rgba(79,70,229,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-sora font-semibold text-ink">{transaction.merchant ?? transaction.category}</p>
          <p className="mt-1 text-sm text-slate-500">{transaction.occurred_on} · <span className="font-medium text-indigo-600">{transaction.category}</span></p>
          <p className="mt-1 text-sm text-slate-500">{transaction.payment_method ?? '-'} · <span className="capitalize">{transaction.type}</span></p>
          {transaction.trip_id ? <p className="mt-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">Travel expense</p> : null}
        </div>
        <p className={`shrink-0 font-sora font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-ink'}`}>{formatCurrency(transaction.amount, currency)}</p>
      </div>
      {transaction.notes ? <p className="mt-3 text-sm text-slate-600">{transaction.notes}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" className="min-h-11 bg-slate-700 hover:bg-slate-800" onClick={onEdit}>
          <Pencil size={16} />
          Edit
        </Button>
        <Button type="button" className="min-h-11 bg-red-600 hover:bg-red-700" onClick={onDelete}>
          <Trash2 size={16} />
          Delete
        </Button>
      </div>
    </article>
  );
}
