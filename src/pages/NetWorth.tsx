import { FormEvent, useState } from 'react';
import { Card, Field, Input, PageHeader, Select, StatCard, Button } from '../components/ui';
import { formatCurrency } from '../lib/format';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import type { Asset, Liability } from '../types/database';

export function NetWorth() {
  const { user } = useAuth();
  const { assets, liabilities, properties, summary, profile, refresh } = useFinanceData();
  const currency = profile?.currency ?? 'MYR';
  const propertyEquity = properties.reduce((sum, property) => sum + property.market_value - property.mortgage_balance, 0);
  const assetValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const debt = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const [asset, setAsset] = useState<{ name: string; asset_type: Asset['asset_type']; value: string }>({ name: '', asset_type: 'bank', value: '' });
  const [liability, setLiability] = useState<{ name: string; liability_type: Liability['liability_type']; balance: string }>({ name: '', liability_type: 'credit_card', balance: '' });
  const [property, setProperty] = useState({ name: '', address: '', market_value: '', mortgage_balance: '' });

  async function addAsset(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('assets').insert({ user_id: user.id, name: asset.name, asset_type: asset.asset_type, value: Number(asset.value) });
    setAsset({ name: '', asset_type: 'bank', value: '' });
    refresh();
  }

  async function addLiability(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('liabilities').insert({ user_id: user.id, name: liability.name, liability_type: liability.liability_type, balance: Number(liability.balance) });
    setLiability({ name: '', liability_type: 'credit_card', balance: '' });
    refresh();
  }

  async function addProperty(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await supabase.from('properties').insert({
      user_id: user.id,
      name: property.name,
      address: property.address || null,
      market_value: Number(property.market_value),
      mortgage_balance: Number(property.mortgage_balance || 0),
    });
    setProperty({ name: '', address: '', market_value: '', mortgage_balance: '' });
    refresh();
  }

  return (
    <>
      <PageHeader title="Net Worth" description="Assets, property equity, investments, and liabilities." />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Net worth" value={formatCurrency(summary.netWorth, currency)} />
        <StatCard label="Assets" value={formatCurrency(assetValue, currency)} />
        <StatCard label="Property equity" value={formatCurrency(propertyEquity, currency)} />
        <StatCard label="Liabilities" value={formatCurrency(debt, currency)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <List title="Assets" rows={assets.map((asset) => [asset.name, formatCurrency(asset.value, currency)])} />
        <List title="Properties" rows={properties.map((property) => [property.name, formatCurrency(property.market_value - property.mortgage_balance, currency)])} />
        <List title="Liabilities" rows={liabilities.map((liability) => [liability.name, formatCurrency(liability.balance, currency)])} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Add asset</h2>
          <form onSubmit={addAsset} className="space-y-4">
            <Field label="Name"><Input value={asset.name} onChange={(event) => setAsset({ ...asset, name: event.target.value })} required /></Field>
            <Field label="Type">
              <Select value={asset.asset_type} onChange={(event) => setAsset({ ...asset, asset_type: event.target.value as Asset['asset_type'] })}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="investment">Investment</option>
                <option value="property">Property</option>
                <option value="vehicle">Vehicle</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Value"><Input type="number" min="0" step="0.01" value={asset.value} onChange={(event) => setAsset({ ...asset, value: event.target.value })} required /></Field>
            <Button type="submit">Add asset</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Add property</h2>
          <form onSubmit={addProperty} className="space-y-4">
            <Field label="Name"><Input value={property.name} onChange={(event) => setProperty({ ...property, name: event.target.value })} required /></Field>
            <Field label="Address"><Input value={property.address} onChange={(event) => setProperty({ ...property, address: event.target.value })} /></Field>
            <Field label="Market value"><Input type="number" min="0" step="0.01" value={property.market_value} onChange={(event) => setProperty({ ...property, market_value: event.target.value })} required /></Field>
            <Field label="Mortgage balance"><Input type="number" min="0" step="0.01" value={property.mortgage_balance} onChange={(event) => setProperty({ ...property, mortgage_balance: event.target.value })} /></Field>
            <Button type="submit">Add property</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Add liability</h2>
          <form onSubmit={addLiability} className="space-y-4">
            <Field label="Name"><Input value={liability.name} onChange={(event) => setLiability({ ...liability, name: event.target.value })} required /></Field>
            <Field label="Type">
              <Select value={liability.liability_type} onChange={(event) => setLiability({ ...liability, liability_type: event.target.value as Liability['liability_type'] })}>
                <option value="mortgage">Mortgage</option>
                <option value="car_loan">Car loan</option>
                <option value="credit_card">Credit card</option>
                <option value="personal_loan">Personal loan</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Balance"><Input type="number" min="0" step="0.01" value={liability.balance} onChange={(event) => setLiability({ ...liability, balance: event.target.value })} required /></Field>
            <Button type="submit">Add liability</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <Card>
      <h2 className="mb-4 font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm">
        {rows.length === 0 ? <p className="text-slate-500">No records yet.</p> : null}
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-slate-600">{label}</span>
            <span className="font-medium text-ink">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
