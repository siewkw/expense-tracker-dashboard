import { CirclePlus, Sparkles, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CHANGELOG, LATEST_CHANGELOG_ENTRY, type ChangeType } from '../data/changelog';
import { useAuth } from '../providers/AuthProvider';
import { BrandLogo } from './BrandLogo';
import { Button } from './ui';

const STORAGE_KEY_PREFIX = 'savelah-last-seen-update-version';

const typeStyles: Record<ChangeType, { label: string; className: string; icon: typeof CirclePlus }> = {
  new: {
    label: 'New',
    className: 'bg-indigo-50 text-indigo-700',
    icon: CirclePlus,
  },
  improved: {
    label: 'Improved',
    className: 'bg-emerald-50 text-emerald-700',
    icon: Sparkles,
  },
  fixed: {
    label: 'Fixed',
    className: 'bg-amber-50 text-amber-700',
    icon: Wrench,
  },
};

function formatReleaseDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export function WhatsNewModal() {
  const { user } = useAuth();
  const latestUpdate = LATEST_CHANGELOG_ENTRY;
  const [showModal, setShowModal] = useState(false);

  const storageKey = useMemo(() => (user ? getStorageKey(user.id) : null), [user]);

  useEffect(() => {
    if (!storageKey || !latestUpdate || CHANGELOG.length === 0) {
      setShowModal(false);
      return;
    }

    try {
      const lastSeenVersion = localStorage.getItem(storageKey);
      setShowModal(lastSeenVersion !== latestUpdate.version);
    } catch {
      setShowModal(true);
    }
  }, [latestUpdate, storageKey]);

  if (!latestUpdate || !showModal) return null;

  function dismiss() {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, latestUpdate.version);
      } catch {
        // If storage is unavailable, still let the user close the modal for this session.
      }
    }

    setShowModal(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 px-3 pb-3 pt-8 backdrop-blur-sm sm:items-center sm:p-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="w-full max-w-lg overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      >
        <div className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-white/80 hover:text-ink"
            aria-label="Dismiss what's new"
          >
            <X size={18} />
          </button>

          <div className="pr-11">
            <BrandLogo size="sm" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">What's New</p>
            <h2 id="whats-new-title" className="mt-2 font-sora text-2xl font-bold text-ink">
              {latestUpdate.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-indigo-600 px-3 py-1 font-semibold text-white">v{latestUpdate.version}</span>
              <time className="text-slate-500" dateTime={latestUpdate.date}>
                {formatReleaseDate(latestUpdate.date)}
              </time>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{latestUpdate.summary}</p>
          </div>
        </div>

        <div className="max-h-[42vh] space-y-3 overflow-y-auto px-5 py-5 sm:max-h-[46vh] sm:px-6">
          {latestUpdate.changes.length > 0 ? (
            latestUpdate.changes.map((change) => {
              const style = typeStyles[change.type];
              const Icon = style.icon;
              return (
                <div key={change.text} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3.5 py-3">
                  <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
                    <Icon size={13} />
                    {style.label}
                  </span>
                  <p className="min-w-0 pt-0.5 text-sm leading-6 text-slate-700">{change.text}</p>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No update notes are available yet.</p>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <Button type="button" className="w-full" onClick={dismiss}>
            YAY!
          </Button>
        </div>
      </section>
    </div>
  );
}
