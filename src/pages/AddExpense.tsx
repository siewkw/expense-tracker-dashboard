import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Button, Card, Field, Input, PageHeader, Select, TextArea } from '../components/ui';
import { PAYMENT_METHODS } from '../constants/finance';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useFinanceData } from '../hooks/useFinanceData';

export function AddExpense() {
  const { user } = useAuth();
  const { categories, transactions } = useFinanceData({ includeWealth: false });
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    occurred_on: new Date().toISOString().slice(0, 10),
    amount: '',
    category: '',
    merchant: '',
    payment_method: 'Credit Card',
    notes: '',
    tags: '',
  });
  const activeCategories = categories.filter((category) => !category.is_archived);
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

  useEffect(() => {
    if (!form.category && activeCategories[0]) {
      setForm((current) => ({ ...current, category: activeCategories[0].name }));
    }
  }, [activeCategories, form.category]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      occurred_on: form.occurred_on,
      amount: Number(form.amount),
      type: 'expense',
      category: form.category,
      category_id: activeCategories.find((category) => category.name === form.category)?.id ?? null,
      merchant: form.merchant || null,
      payment_method: form.payment_method,
      notes: form.notes || null,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });

    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    navigate('/transactions');
  }

  return (
    <>
      <PageHeader
        title="Add Expense"
        description="Amount, merchant, category, save."
        action={<Link to="/income" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">Add income instead</Link>}
      />
      <Card className="mx-auto max-w-3xl">
        <form onSubmit={submit} className="grid gap-4 pb-20 sm:grid-cols-2 sm:pb-0">
          <div className="order-1 sm:order-none">
            <Field label="Amount">
              <Input
                className="py-3 text-lg font-semibold"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                enterKeyHint="next"
                autoFocus
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="0.00"
                required
              />
            </Field>
          </div>
          <div className="order-2 sm:order-none">
            <Field label="Merchant">
              <Input
                className="py-3 text-base"
                list="add-expense-recent-merchants"
                enterKeyHint="next"
                autoComplete="organization"
                value={form.merchant}
                onChange={(event) => setForm({ ...form, merchant: event.target.value })}
                placeholder="Where did you spend?"
              />
            </Field>
          </div>
          <div className="order-3 sm:order-none">
            <Field label="Category">
              <Select className="py-3 text-base" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {activeCategories.map((category) => <option key={category.id}>{category.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="order-4 sm:order-none">
            <Field label="Payment method">
              <Select className="py-3 text-base" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
                {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
              </Select>
            </Field>
          </div>
          <div className="order-5 sm:order-none">
            <Field label="Date">
              <Input className="py-3 text-base" type="date" value={form.occurred_on} onChange={(event) => setForm({ ...form, occurred_on: event.target.value })} required />
            </Field>
          </div>
          <div className="order-6 sm:order-none">
            <Field label="Tags">
              <Input className="py-3 text-base" placeholder="comma, separated, tags" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
            </Field>
          </div>
          <div className="order-7 sm:order-none sm:col-span-2">
            <Field label="Notes">
              <TextArea className="text-base" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
          <datalist id="add-expense-recent-merchants">
            {recentMerchants.map((merchant) => <option key={merchant} value={merchant} />)}
          </datalist>
          {recentMerchants.length > 0 ? (
            <div className="order-2 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:order-none sm:col-span-2 sm:flex-wrap sm:overflow-visible">
              {recentMerchants.slice(0, 6).map((merchant) => (
                <button
                  key={merchant}
                  type="button"
                  className="min-h-11 shrink-0 rounded-full border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                  onClick={() => setForm((current) => ({ ...current, merchant }))}
                >
                  {merchant}
                </button>
              ))}
            </div>
          ) : null}
          {message ? <p className="order-8 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:order-none sm:col-span-2">{message}</p> : null}
          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 p-3 backdrop-blur sm:static sm:order-none sm:col-span-2 sm:border-0 sm:bg-transparent sm:p-0">
            <Button className="min-h-12 w-full text-base sm:w-auto" type="submit" disabled={saving || activeCategories.length === 0}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save expense'}
            </Button>
            {activeCategories.length === 0 ? <p className="mt-2 text-sm text-slate-600">Add an active category in Settings before saving expenses.</p> : null}
          </div>
        </form>
      </Card>
    </>
  );
}
