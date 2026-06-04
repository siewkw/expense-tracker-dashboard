import { WalletCards } from 'lucide-react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-500">
            <WalletCards size={22} />
          </span>
          Private Finance
        </div>
        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-100">Multi-user by design</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight">Your money data stays in your lane.</h1>
          <p className="mt-5 text-lg text-slate-300">
            Authentication and row level security work together so every person sees only their own financial records.
          </p>
        </div>
        <p className="text-sm text-slate-400">Supabase Auth + RLS + Vercel-ready React dashboard</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
          <div className="mb-7">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-white">
                <WalletCards size={20} />
              </span>
              <span className="font-semibold">Private Finance</span>
            </div>
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
