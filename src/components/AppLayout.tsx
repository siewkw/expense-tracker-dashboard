import { BarChart3, Bot, CircleDollarSign, CreditCard, FileInput, FileText, Gauge, Landmark, LogOut, PiggyBank, Plus, Settings, TrendingUp } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { clsx } from 'clsx';

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

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-white">
            <BarChart3 size={20} />
          </span>
          <div>
            <p className="font-semibold text-ink">Finance OS</p>
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
        <header className="sticky top-0 z-10 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CircleDollarSign className="text-brand-600" size={22} />
              Finance OS
            </div>
            <button onClick={signOut} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Logout">
              <LogOut size={20} />
            </button>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
