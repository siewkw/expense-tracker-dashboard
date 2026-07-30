import { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, ErrorMessage, PageHeader, Skeleton } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { TripForm, type TripFormValues } from '../components/TripForm';
import { useFinanceData } from '../hooks/useFinanceData';
import { useTrips } from '../hooks/useTrips';
import { formatCurrency, formatPercent } from '../lib/format';
import { summarizeTrip } from '../lib/trips';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import type { Trip, TripStatus } from '../types/database';

const statusOrder: TripStatus[] = ['active', 'upcoming', 'completed'];
const statusLabels: Record<TripStatus, string> = {
  upcoming: 'Upcoming trips',
  active: 'Active trips',
  completed: 'Completed trips',
};

export function Trips() {
  const { user } = useAuth();
  const { profile } = useFinanceData({ includeWealth: false, recentTransactionLimit: 0 });
  const { trips, transactions, loading, error, refresh } = useTrips();
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const tripsByStatus = useMemo(() => {
    const grouped = new Map<TripStatus, Trip[]>(statusOrder.map((status) => [status, []]));
    trips.forEach((trip) => grouped.get(trip.status)?.push(trip));
    return grouped;
  }, [trips]);

  async function saveTrip(values: TripFormValues) {
    if (!user) return;
    setSaving(true);
    setActionError('');
    const result = editingTrip
      ? await supabase.from('trips').update(values).eq('id', editingTrip.id).eq('user_id', user.id)
      : await supabase.from('trips').insert({ ...values, user_id: user.id });
    setSaving(false);

    if (result.error) {
      setActionError(result.error.message);
      return;
    }

    setEditingTrip(null);
    setShowForm(false);
    await refresh();
  }

  async function deleteTrip(trip: Trip) {
    const transactionCount = transactions.filter((transaction) => transaction.trip_id === trip.id).length;
    if (transactionCount > 0) {
      setActionError(`“${trip.name}” contains ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}. Remove or reassign them before deleting this trip.`);
      return;
    }
    if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;

    const { error: deleteError } = await supabase.from('trips').delete().eq('id', trip.id).eq('user_id', user?.id ?? '');
    if (deleteError) {
      setActionError(deleteError.message);
      return;
    }
    await refresh();
  }

  function openCreateForm() {
    setEditingTrip(null);
    setShowForm(true);
    setActionError('');
  }

  function openEditForm(trip: Trip) {
    setEditingTrip(trip);
    setShowForm(true);
    setActionError('');
  }

  return (
    <>
      <PageHeader
        title="Trips"
        description="Plan a travel budget, assign expenses, and keep every journey separate from daily spending."
        action={<Button type="button" className="w-full sm:w-auto" onClick={openCreateForm}><Plus size={17} />New trip</Button>}
      />
      {error ? <ErrorMessage message={`We could not load trips. ${error}`} /> : null}
      {actionError ? <div className="mb-5"><ErrorMessage message={actionError} /></div> : null}
      {showForm ? (
        <TripForm
          trip={editingTrip}
          profile={profile}
          saving={saving}
          onSave={saveTrip}
          onCancel={() => {
            setShowForm(false);
            setEditingTrip(null);
          }}
        />
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-72" />)}
        </div>
      ) : null}

      {!loading && trips.length === 0 ? (
        <Card>
          <EmptyState title="No trips yet" description="Create your first trip to start tracking travel expenses separately." />
          <div className="mt-5 flex justify-center"><Button type="button" onClick={openCreateForm}><Plane size={17} />Create a trip</Button></div>
        </Card>
      ) : null}

      {!loading && trips.length > 0 ? (
        <div className="space-y-8">
          {statusOrder.map((status) => {
            const sectionTrips = tripsByStatus.get(status) ?? [];
            if (sectionTrips.length === 0) return null;
            return (
              <section key={status}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-sora text-lg font-semibold text-ink">{statusLabels[status]}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{sectionTrips.length}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sectionTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      transactions={transactions.filter((transaction) => transaction.trip_id === trip.id)}
                      onEdit={() => openEditForm(trip)}
                      onDelete={() => deleteTrip(trip)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function TripCard({
  trip,
  transactions,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  transactions: ReturnType<typeof useTrips>['transactions'];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const summary = summarizeTrip(trip, transactions);
  const statusStyle = {
    upcoming: 'bg-sky-50 text-sky-700',
    active: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-slate-100 text-slate-600',
  }[trip.status];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}>{trip.status}</span>
        <div className="flex gap-1">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-700" onClick={onEdit} aria-label={`Edit ${trip.name}`}><Pencil size={16} /></button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700" onClick={onDelete} aria-label={`Delete ${trip.name}`}><Trash2 size={16} /></button>
        </div>
      </div>
      <h3 className="mt-4 font-sora text-xl font-semibold text-ink">{trip.name}</h3>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin size={15} />{trip.destination}</p>
      <p className="mt-2 text-sm text-slate-500">{formatTripDates(trip.start_date, trip.end_date)}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-xs text-slate-400">Spent</p>
          <p className="mt-1 font-semibold text-ink">{formatCurrency(summary.spending, trip.home_currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Remaining</p>
          <p className={`mt-1 font-semibold ${summary.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(summary.remaining, trip.home_currency)}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>{formatCurrency(trip.total_budget, trip.home_currency)} budget</span>
          <span>{formatPercent(summary.usedPercent)}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${summary.usedPercent >= 1 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${Math.min(summary.usedPercent * 100, 100)}%` }} />
        </div>
      </div>
      <Link to={`/trips/${trip.id}`} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">
        View trip dashboard <ArrowRight size={16} />
      </Link>
    </Card>
  );
}

function formatTripDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(`${endDate}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}
