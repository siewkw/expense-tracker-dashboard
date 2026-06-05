import { BarChart3, Bot, CircleDollarSign, CreditCard, FileInput, FileText, Gauge, Landmark, LogOut, Menu, PiggyBank, Plus, Settings, TrendingUp, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { clsx } from 'clsx';
import { useState } from 'react';
import { PwaInstallPrompt } from './PwaInstallPrompt';

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
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-white">
            <BarChart3 size={20} />
          </span>
          <div>
            <p className="font-semibold text-ink">SaveLah</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
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
          className="absolute bottom-5 left-4 right-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CircleDollarSign className="text-brand-600" size={22} />
              SaveLah
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {menuOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={() => setMenuOpen(false)}>
            <aside
              className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink">SaveLah</p>
                  <p className="max-w-60 truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
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
                        'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
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
                className="mt-5 flex min-h-12 w-full items-center gap-3 rounded-md border border-line px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut size={19} />
                Logout
              </button>
            </aside>
          </div>
        ) : null}

        <main className="mx-auto max-w-7xl px-4 py-5 pb-32 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>

        {location.pathname !== '/add-expense' ? (
          <NavLink
            to="/add-expense"
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95 lg:hidden"
            aria-label="Quick add expense"
          >
            <Plus size={25} />
          </NavLink>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          {mobileLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
                  isActive ? 'text-brand-700' : 'text-slate-500',
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
