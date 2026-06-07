import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Button, Card, ErrorMessage, Field, Input, PageHeader, Select, Skeleton, TextArea } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { PAYMENT_METHODS } from '../constants/finance';
import { formatCurrency } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../providers/AuthProvider';
import type { Transaction, TransactionType } from '../types/database';

type ExpenseForm = {
  occurred_on: string;
  amount: string;
  type: TransactionType;
  category: string;
  merchant: string;
  payment_method: string;
  notes: string;
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
});

export function Transactions() {
  const { user } = useAuth();
  const { categories, merchantRules, profile, refresh } = useFinanceData({ recentTransactionLimit: 0, includeWealth: false });
  const currency = profile?.currency ?? 'MYR';
  const activeCategories = categories.filter((category) => !category.is_archived);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [form, setForm] = useState<ExpenseForm>(emptyExpenseForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ExpenseForm>(emptyExpenseForm());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const pageSize = 50;

  useEffect(() => {
    if (!form.category && activeCategories[0]) {
      setForm((current) => ({ ...current, category: activeCategories[0].name }));
    }
  }, [activeCategories, form.category]);

  const recentMerchants = useMemo(() => {
    const counts = transactions.reduce<Record<string, number>>((acc, transaction) => {
      const merchant = transaction.merchant?.trim();
      if (!merchant) return acc;
      acc[merchant] = (acc[merchant] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([merchant]) => merchant);
  }, [transactions]);

  const filteredTransactions = transactions;

  const loadTransactions = useCallback(async (offset = 0) => {
    if (!user) return;
    setListLoading(true);
    setListError('');
    const from = offset;
    const to = from + pageSize - 1;
    let query = supabase
      .from('transactions')
      .select('id,user_id,occurred_on,amount,type,category,category_id,merchant,payment_method,notes,tags,recurring_income_id,recurring_expense_id,created_at,updated_at')
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

  async function addExpense(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('transactions').insert({
      user_id: user.id,
      occurred_on: form.occurred_on,
      amount: Number(form.amount),
      type: 'expense',
      category: form.category,
      category_id: activeCategories.find((category) => category.name === form.category)?.id ?? null,
      merchant: form.merchant || null,
      payment_method: form.payment_method,
      notes: form.notes || null,
      tags: [],
    });
    setForm(emptyExpenseForm(form.category));
    loadTransactions(0);
    refresh();
  }

  function startEditing(transaction: Transaction) {
    setEditingId(transaction.id);
    setEditingForm({
      occurred_on: transaction.occurred_on,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      merchant: transaction.merchant ?? '',
      payment_method: transaction.payment_method ?? 'Credit Card',
      notes: transaction.notes ?? '',
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const original = transactions.find((transaction) => transaction.id === editingId);
    await supabase
      .from('transactions')
      .update({
        occurred_on: editingForm.occurred_on,
        amount: Number(editingForm.amount),
        type: editingForm.type,
        category: editingForm.category,
        category_id: activeCategories.find((category) => category.name === editingForm.category)?.id ?? null,
        merchant: editingForm.merchant || null,
        payment_method: editingForm.payment_method,
        notes: editingForm.notes || null,
      })
      .eq('id', editingId);

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
      <PageHeader title="Transactions" description="Quickly add, search, filter, edit, and delete expenses." />

      <Card className="mb-4 overflow-hidden border-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Fast entry</p>
            <h2 className="font-sora text-xl font-semibold text-ink">Quick Add Expense</h2>
            <p className="mt-1 text-sm text-slate-600">Amount, merchant, category, save. Built for fast mobile entry.</p>
          </div>
        </div>
        <form onSubmit={addExpense} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[130px_130px_1fr_180px_170px_auto]">
          <Field label="Date">
            <Input className="py-3 text-base" type="date" value={form.occurred_on} onChange={(event) => setForm({ ...form, occurred_on: event.target.value })} required />
          </Field>
          <Field label="Amount">
            <Input className="py-3 text-base" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
          </Field>
          <Field label="Merchant">
            <Input className="py-3 text-base" list="recent-merchants" value={form.merchant} onChange={(event) => setForm({ ...form, merchant: event.target.value })} placeholder="Merchant" />
          </Field>
          <Field label="Category">
            <Select className="py-3 text-base" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {activeCategories.map((category) => <option key={category.id}>{category.name}</option>)}
            </Select>
          </Field>
          <Field label="Payment">
            <Select className="py-3 text-base" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
              {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="min-h-12 w-full px-5 text-base" disabled={activeCategories.length === 0}>
              <Plus size={18} />
              Add
            </Button>
          </div>
          <div className="sm:col-span-2 xl:col-span-6">
            <Field label="Notes">
              <TextArea className="text-base" rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
        </form>
        <datalist id="recent-merchants">
          {recentMerchants.map((merchant) => <option key={merchant} value={merchant} />)}
        </datalist>
        {recentMerchants.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {recentMerchants.slice(0, 6).map((merchant) => (
              <button
                key={merchant}
                type="button"
                className="rounded-full border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700"
                onClick={() => setForm((current) => ({ ...current, merchant }))}
              >
                {merchant}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

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
  setForm,
  onCancel,
  onSave,
}: {
  form: ExpenseForm;
  activeCategories: Array<{ id: string; name: string }>;
  setForm: (form: ExpenseForm) => void;
  onCancel: () => void;
  onSave: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSave} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[130px_130px_130px_1fr_170px_170px_auto]">
      <Input type="date" value={form.occurred_on} onChange={(event) => setForm({ ...form, occurred_on: event.target.value })} required />
      <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
      <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType })}>
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
    </form>
  );
}

function MobileTransactionCard({
  transaction,
  currency,
  isEditing,
  editingForm,
  activeCategories,
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
  setEditingForm: (form: ExpenseForm) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: (event: FormEvent) => void;
}) {
  if (isEditing) {
    return (
      <div className="rounded-[20px] border border-indigo-100 bg-indigo-50/60 p-4">
        <EditExpenseForm form={editingForm} activeCategories={activeCategories} setForm={setEditingForm} onCancel={onCancel} onSave={onSave} />
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
