import { WalletCards } from 'lucide-react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3 text-lg">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <WalletCards size={22} />
          </span>
          <span className="app-wordmark text-xl">SaveLah</span>
        </div>
        <div className="relative max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100">Helping you become less broke</p>
          <h1 className="mt-6 text-5xl font-bold leading-tight">Small habits. Bigger future.</h1>
          <p className="mt-6 text-lg leading-8 text-indigo-100">
            Authentication and row level security work together so every person sees only their own financial records.
          </p>
        </div>
        <p className="relative text-sm text-indigo-200">Private by design. Built for your next milestone.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
          <div className="mb-7">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                <WalletCards size={20} />
              </span>
              <span className="app-wordmark text-lg">SaveLah</span>
            </div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
