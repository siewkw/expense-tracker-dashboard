import { FormEvent, useEffect, useState } from 'react';
import { Button, Card, Field, Input, Select } from './ui';
import { isValidCurrencyCode, normalizeCurrencyCode } from '../lib/trips';
import type { Profile, Trip, TripStatus } from '../types/database';

export type TripFormValues = {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  home_currency: string;
  destination_currency: string;
  default_exchange_rate: number;
  status: TripStatus;
};

const today = () => new Date().toISOString().slice(0, 10);

function initialValues(trip: Trip | null, profile: Profile | null) {
  return {
    name: trip?.name ?? '',
    destination: trip?.destination ?? '',
    start_date: trip?.start_date ?? today(),
    end_date: trip?.end_date ?? today(),
    total_budget: trip ? String(trip.total_budget) : '',
    home_currency: trip?.home_currency ?? profile?.currency ?? 'MYR',
    destination_currency: trip?.destination_currency ?? '',
    default_exchange_rate: trip ? String(trip.default_exchange_rate) : '',
    status: trip?.status ?? 'upcoming' as TripStatus,
  };
}

export function TripForm({
  trip,
  profile,
  saving,
  onSave,
  onCancel,
}: {
  trip: Trip | null;
  profile: Profile | null;
  saving: boolean;
  onSave: (values: TripFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => initialValues(trip, profile));
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setForm(initialValues(trip, profile));
    setValidationError('');
  }, [profile, trip]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const budget = Number(form.total_budget);
    const rate = Number(form.default_exchange_rate);
    const homeCurrency = normalizeCurrencyCode(form.home_currency);
    const destinationCurrency = normalizeCurrencyCode(form.destination_currency);

    if (!form.name.trim() || !form.destination.trim()) {
      setValidationError('Trip name and destination are required.');
      return;
    }
    if (form.end_date < form.start_date) {
      setValidationError('End date cannot be earlier than start date.');
      return;
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      setValidationError('Trip budget must be greater than zero.');
      return;
    }
    if (!isValidCurrencyCode(homeCurrency) || !isValidCurrencyCode(destinationCurrency)) {
      setValidationError('Use valid three-letter currency codes, such as MYR, JPY, or EUR.');
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      setValidationError('Default exchange rate must be greater than zero.');
      return;
    }

    setValidationError('');
    await onSave({
      name: form.name.trim(),
      destination: form.destination.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      total_budget: budget,
      home_currency: homeCurrency,
      destination_currency: destinationCurrency,
      default_exchange_rate: rate,
      status: form.status,
    });
  }

  return (
    <Card className="mb-6 border-indigo-100 bg-indigo-50/40">
      <div className="mb-5">
        <h2 className="font-sora text-lg font-semibold text-ink">{trip ? 'Edit trip' : 'Create a trip'}</h2>
        <p className="mt-1 text-sm text-slate-500">Set the trip budget and a default manual exchange rate.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Trip name">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} placeholder="Japan getaway" required />
        </Field>
        <Field label="Destination">
          <Input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} maxLength={160} placeholder="Tokyo, Japan" required />
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required />
        </Field>
        <Field label="End date">
          <Input type="date" min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required />
        </Field>
        <Field label="Total budget">
          <Input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.total_budget} onChange={(event) => setForm({ ...form, total_budget: event.target.value })} required />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TripStatus })}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Home currency">
          <Input value={form.home_currency} onChange={(event) => setForm({ ...form, home_currency: event.target.value.toUpperCase() })} maxLength={3} placeholder="MYR" required />
        </Field>
        <Field label="Destination currency">
          <Input value={form.destination_currency} onChange={(event) => setForm({ ...form, destination_currency: event.target.value.toUpperCase() })} maxLength={3} placeholder="JPY" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label={`Default exchange rate (1 ${normalizeCurrencyCode(form.destination_currency) || 'destination unit'} in ${normalizeCurrencyCode(form.home_currency) || 'home currency'})`}>
            <Input type="number" min="0.00000001" step="0.00000001" inputMode="decimal" value={form.default_exchange_rate} onChange={(event) => setForm({ ...form, default_exchange_rate: event.target.value })} placeholder="0.03000000" required />
          </Field>
        </div>
        {validationError ? <p className="sm:col-span-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{validationError}</p> : null}
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : trip ? 'Save changes' : 'Create trip'}</Button>
          <Button type="button" className="bg-slate-600 hover:bg-slate-700" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
