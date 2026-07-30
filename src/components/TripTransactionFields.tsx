import { Field, Input, Select } from './ui';
import { calculateCurrencyConversion } from '../lib/trips';
import { formatCurrency } from '../lib/format';
import type { Trip } from '../types/database';

export type TripTransactionValue = {
  tripId: string;
  exchangeRate: string;
  actualHomeAmount: string;
};

export function TripTransactionFields({
  trips,
  value,
  originalAmount,
  disabled = false,
  onChange,
}: {
  trips: Trip[];
  value: TripTransactionValue;
  originalAmount: string;
  disabled?: boolean;
  onChange: (value: TripTransactionValue) => void;
}) {
  const selectedTrip = trips.find((trip) => trip.id === value.tripId) ?? null;
  const amount = Number(originalAmount);
  const rate = Number(value.exchangeRate);
  const actualAmount = value.actualHomeAmount ? Number(value.actualHomeAmount) : null;
  const conversion = selectedTrip && amount > 0 && rate > 0
    ? calculateCurrencyConversion(amount, rate, actualAmount)
    : null;

  return (
    <>
      <div className="sm:col-span-2">
        <Field label="Expense type">
          <Select
            value={value.tripId}
            disabled={disabled}
            onChange={(event) => {
              const nextTrip = trips.find((trip) => trip.id === event.target.value);
              onChange({
                tripId: event.target.value,
                exchangeRate: nextTrip ? String(nextTrip.default_exchange_rate) : '',
                actualHomeAmount: '',
              });
            }}
          >
            <option value="">Daily expense</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name} · {trip.destination}</option>)}
          </Select>
        </Field>
        {disabled ? <p className="mt-2 text-xs text-slate-500">Only expense transactions can be assigned to a trip.</p> : null}
      </div>
      {selectedTrip ? (
        <div className="grid gap-4 rounded-[20px] border border-purple-100 bg-purple-50/60 p-4 sm:col-span-2 sm:grid-cols-2">
          <div>
            <Field label={`Exchange rate (1 ${selectedTrip.destination_currency} in ${selectedTrip.home_currency})`}>
              <Input
                type="number"
                min="0.00000001"
                step="0.00000001"
                inputMode="decimal"
                value={value.exchangeRate}
                onChange={(event) => onChange({ ...value, exchangeRate: event.target.value, actualHomeAmount: '' })}
                required
              />
            </Field>
          </div>
          <div>
            <Field label={`Actual bank charge in ${selectedTrip.home_currency} (optional)`}>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={value.actualHomeAmount}
                onChange={(event) => onChange({ ...value, actualHomeAmount: event.target.value })}
                placeholder="Use converted amount"
              />
            </Field>
          </div>
          <p className="text-sm text-purple-800 sm:col-span-2">
            {conversion
              ? `${formatCurrency(conversion.originalAmount, selectedTrip.destination_currency)} → ${formatCurrency(conversion.homeAmount, selectedTrip.home_currency)}${conversion.usedActualHomeAmount ? ' using the actual bank charge' : ''}`
              : `Enter the amount in ${selectedTrip.destination_currency} to see the ${selectedTrip.home_currency} total.`}
          </p>
        </div>
      ) : null}
    </>
  );
}
