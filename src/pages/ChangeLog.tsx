import { CheckCircle2, CirclePlus, Sparkles, Wrench } from 'lucide-react';
import { Card, PageHeader } from '../components/ui';
import { CHANGELOG, type ChangeType } from '../data/changelog';

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

export function ChangeLog() {
  return (
    <>
      <PageHeader
        title="What’s New"
        description="A simple record of the features, improvements, and fixes added to SaveLah."
      />

      <div className="mx-auto max-w-3xl space-y-5">
        {CHANGELOG.map((release, releaseIndex) => (
          <Card key={release.version} className={releaseIndex === 0 ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60' : undefined}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-sora text-xl font-semibold text-ink">{release.title}</h2>
                  {releaseIndex === 0 ? (
                    <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">Latest</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{release.summary}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-sora text-sm font-semibold text-indigo-700">v{release.version}</p>
                <time className="mt-1 block text-xs text-slate-400" dateTime={release.date}>
                  {new Date(`${release.date}T00:00:00`).toLocaleDateString('en-MY', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {release.changes.map((change) => {
                const style = typeStyles[change.type];
                const Icon = style.icon;
                return (
                  <div key={change.text} className="flex items-start gap-3 rounded-2xl bg-white/80 px-3.5 py-3">
                    <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
                      <Icon size={13} />
                      {style.label}
                    </span>
                    <p className="min-w-0 pt-0.5 text-sm leading-6 text-slate-700">{change.text}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
          <CheckCircle2 size={16} />
          You’re all caught up.
        </div>
      </div>
    </>
  );
}
