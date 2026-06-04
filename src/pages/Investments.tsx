import { FormEvent, useState } from 'react';
import { Button, Card, Field, Input, PageHeader, StatCard } from '../components/ui';
import { formatCurrency } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useFinanceData } from '../hooks/useFinanceData';

export function Investments() {
  const { user } = useAuth();
  const { investments, summary, profile, refresh } = useFinanceData();
  const currency = profile?.currency ?? 'MYR';
  const [form, setForm] = useState({ name: '', account: '', quantity: '', cost_basis: '', current_value: '' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('investments').insert({
      user_id: user.id,
      name: form.name,
      account: form.account || null,
      quantity: Number(form.quantity || 0),
      cost_basis: Number(form.cost_basis || 0),
      current_value: Number(form.current_value || 0),
    });
    setForm({ name: '', account: '', quantity: '', cost_basis: '', current_value: '' });
    refresh();
  }

  return (
    <>
      <PageHeader title="Investments" description="Track investment positions and portfolio value." />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Portfolio value" value={formatCurrency(summary.investmentValue, currency)} />
        <StatCard label="Positions" value={String(investments.length)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Account"><Input value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} /></Field>
            <Field label="Quantity"><Input type="number" step="0.000001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
            <Field label="Cost basis"><Input type="number" step="0.01" value={form.cost_basis} onChange={(event) => setForm({ ...form, cost_basis: event.target.value })} /></Field>
            <Field label="Current value"><Input type="number" step="0.01" value={form.current_value} onChange={(event) => setForm({ ...form, current_value: event.target.value })} required /></Field>
            <Button type="submit">Add investment</Button>
          </form>
        </Card>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-line text-slate-500">
                <tr><th className="py-2">Name</th><th>Account</th><th>Quantity</th><th className="text-right">Cost</th><th className="text-right">Value</th></tr>
              </thead>
              <tbody>
                {investments.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{item.name}</td>
                    <td>{item.account ?? '-'}</td>
                    <td>{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.cost_basis, currency)}</td>
                    <td className="text-right font-medium">{formatCurrency(item.current_value, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
