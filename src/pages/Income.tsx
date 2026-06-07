import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Banknote, CalendarDays, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { Button, Card, ErrorMessage, Field, Input, PageHeader, Select, Skeleton, TextArea } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { PAYMENT_METHODS } from '../constants/finance';
import { formatCurrency } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useFinanceData } from '../hooks/useFinanceData';
import type { RecurringIncome } from '../types/database';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);

export function Income() {
  const { user } = useAuth();
  const { profile, refresh } = useFinanceData({ recentTransactionLimit: 0, includeWealth: false });
  const currency = profile?.currency ?? 'MYR';
  const [mode, setMode] = useState<'one-time' | 'recurring'>('one-time');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [schedules, setSchedules] = useState<RecurringIncome[]>([]);
  const [form, setForm] = useState({
    amount: '',
    name: '',
    occurred_on: today(),
    day_of_month: String(new Date().getDate()),
    start_month: currentMonth(),
    payment_method: 'Bank Transfer/QR',
    notes: '',
  });

  const loadSchedules = useCallback(async () => {
    if (!user) return;
    setLoadingSchedules(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('recurring_incomes')
      .select('id,user_id,name,amount,day_of_month,start_month,payment_method,notes,is_active,last_generated_month,created_at,updated_at')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('day_of_month', { ascending: true });

    setLoadingSchedules(false);
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setSchedules((data ?? []).map((item) => ({ ...item, amount: Number(item.amount), day_of_month: Number(item.day_of_month) })) as RecurringIncome[]);
  }, [user]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    setError('');

    if (mode === 'one-time') {
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        occurred_on: form.occurred_on,
        amount: Number(form.amount),
        type: 'income',
        category: 'Income',
        category_id: null,
        merchant: form.name.trim() || 'Income',
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
        tags: ['income'],
        recurring_income_id: null,
      });

      setSaving(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setMessage('Income added successfully.');
      setForm((current) => ({ ...current, amount: '', name: '', notes: '' }));
      refresh();
      return;
    }

    const { error: scheduleError } = await supabase.from('recurring_incomes').insert({
      user_id: user.id,
      name: form.name.trim() || 'Monthly income',
      amount: Number(form.amount),
      day_of_month: Number(form.day_of_month),
      start_month: `${form.start_month}-01`,
      payment_method: form.payment_method,
      notes: form.notes.trim() || null,
      is_active: true,
    });

    if (!scheduleError) {
      await supabase.rpc('process_recurring_incomes', { p_as_of: today() });
    }

    setSaving(false);
    if (scheduleError) {
      setError(scheduleError.message);
      return;
    }
    setMessage('Monthly recurring income created.');
    setForm((current) => ({ ...current, amount: '', name: '', notes: '' }));
    await loadSchedules();
    refresh();
  }

  async function toggleSchedule(schedule: RecurringIncome) {
    const willResume = !schedule.is_active;
    const { error: updateError } = await supabase
      .from('recurring_incomes')
      .update({ is_active: willResume })
      .eq('id', schedule.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (willResume) {
      await supabase.rpc('process_recurring_incomes', { p_as_of: today() });
      refresh();
    }
    await loadSchedules();
  }

  async function deleteSchedule(schedule: RecurringIncome) {
    if (!window.confirm(`Delete the recurring income "${schedule.name}"? Existing income transactions will remain.`)) return;
    const { error: deleteError } = await supabase.from('recurring_incomes').delete().eq('id', schedule.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadSchedules();
  }

  return (
    <>
      <PageHeader
        title="Income"
        description="Add money you receive once, or schedule it automatically for the same date every month."
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-fit">
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${mode === 'one-time' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setMode('one-time')}
            >
              One-time
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${mode === 'recurring' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setMode('recurring')}
            >
              Monthly recurring
            </button>
          </div>

          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              {mode === 'one-time' ? <Banknote size={21} /> : <CalendarDays size={21} />}
            </span>
            <div>
              <h2 className="font-sora text-lg font-semibold text-ink">{mode === 'one-time' ? 'Add income' : 'Schedule monthly income'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === 'one-time' ? 'Record salary, freelance work, refunds, or other money received.' : 'SaveLah will add it when you open the app on or after the selected day.'}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Amount">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="0.00"
                autoFocus
                required
              />
            </Field>
            <Field label="Income source">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Salary, freelance, allowance..."
                required={mode === 'recurring'}
              />
            </Field>

            {mode === 'one-time' ? (
              <Field label="Date received">
                <Input type="date" value={form.occurred_on} onChange={(event) => setForm({ ...form, occurred_on: event.target.value })} required />
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Day each month">
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={form.day_of_month}
                    onChange={(event) => setForm({ ...form, day_of_month: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Starting month">
                  <Input type="month" value={form.start_month} onChange={(event) => setForm({ ...form, start_month: event.target.value })} required />
                </Field>
              </div>
            )}

            <Field label="Payment method">
              <Select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
                {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
              </Select>
            </Field>
            <Field label="Notes">
              <TextArea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>

            {error ? <ErrorMessage message={error} /> : null}
            {message ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}

            <Button className="w-full" type="submit" disabled={saving}>
              <Plus size={18} />
              {saving ? 'Saving...' : mode === 'one-time' ? 'Add income' : 'Create monthly income'}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-5">
            <h2 className="font-sora text-lg font-semibold text-ink">Monthly income schedules</h2>
            <p className="mt-1 text-sm text-slate-500">Pause or remove future income without changing transactions already recorded.</p>
          </div>

          {loadingSchedules ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
            </div>
          ) : null}

          {!loadingSchedules && schedules.length === 0 ? (
            <EmptyState title="No recurring income yet" description="Choose Monthly recurring to automate salary or other predictable income." />
          ) : null}

          {!loadingSchedules && schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <article key={schedule.id} className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-sora font-semibold text-ink">{schedule.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${schedule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Day {schedule.day_of_month} each month · {schedule.payment_method}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Starts {schedule.start_month.slice(0, 7)}
                        {schedule.last_generated_month ? ` · Last added ${schedule.last_generated_month.slice(0, 7)}` : ''}
                      </p>
                    </div>
                    <p className="shrink-0 font-sora text-lg font-semibold text-emerald-600">{formatCurrency(schedule.amount, currency)}</p>
                  </div>
                  {schedule.notes ? <p className="mt-3 text-sm text-slate-600">{schedule.notes}</p> : null}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className="min-h-11 bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                      onClick={() => toggleSchedule(schedule)}
                    >
                      {schedule.is_active ? <Pause size={16} /> : <Play size={16} />}
                      {schedule.is_active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11 bg-red-600 shadow-sm hover:bg-red-700"
                      onClick={() => deleteSchedule(schedule)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
