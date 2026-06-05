import { Bot, CreditCard, FileInput, FileText, Gauge, Landmark, LogOut, Menu, PiggyBank, Plus, Settings, TrendingUp, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { clsx } from 'clsx';
import { useState } from 'react';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { BrandLogo } from './BrandLogo';

const links = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/add-expense', label: 'Add', icon: Plus },
  { to: '/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/import-export', label: 'Import', icon: FileInput },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/automations', label: 'Automations', icon: Bot },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/net-worth', label: 'Net Worth', icon: Landmark },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const mobileLinks = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/transactions', label: 'Expenses', icon: CreditCard },
  { to: '/budgets', label: 'Budget', icon: PiggyBank },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200/80 bg-slate-50/80 px-4 py-5 backdrop-blur-xl lg:block">
        <div className="mb-9 flex items-center gap-3 px-2">
          <BrandLogo showName={false} />
          <div>
            <p className="app-wordmark text-lg text-ink">SaveLah</p>
            <p className="max-w-40 truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-2 text-sm font-medium transition duration-200',
                  isActive
                    ? 'bg-white text-brand-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                    : 'text-slate-500 hover:bg-white/80 hover:text-ink',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="absolute bottom-5 left-4 right-4 flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-ink"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <BrandLogo size="sm" />
            <button
              onClick={() => setMenuOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {menuOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}>
            <aside
              className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <BrandLogo showName={false} />
                  <div className="min-w-0">
                    <p className="app-wordmark text-lg text-ink">SaveLah</p>
                    <p className="max-w-48 truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-2xl text-slate-500 hover:bg-slate-100"
                  aria-label="Close navigation menu"
                >
                  <X size={22} />
                </button>
              </div>
              <nav className="space-y-1">
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-medium',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                      )
                    }
                  >
                    <Icon size={19} />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <button
                onClick={signOut}
                className="mt-5 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <LogOut size={19} />
                Logout
              </button>
            </aside>
          </div>
        ) : null}

        <main className="page-enter mx-auto max-w-7xl px-4 py-6 pb-32 sm:px-7 sm:py-8 lg:px-10 lg:pb-10">
          <Outlet />
        </main>

        {location.pathname !== '/add-expense' ? (
          <NavLink
            to="/add-expense"
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_16px_35px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5 active:scale-95 lg:hidden"
            aria-label="Quick add expense"
          >
            <Plus size={25} />
          </NavLink>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-100 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.07)] backdrop-blur-xl lg:hidden">
          {mobileLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
                  isActive ? 'text-brand-600' : 'text-slate-400',
                )
              }
            >
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <PwaInstallPrompt />
      </div>
    </div>
  );
}
