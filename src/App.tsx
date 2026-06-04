import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { AddExpense } from './pages/AddExpense';
import { Automations } from './pages/Automations';
import { Budgets } from './pages/Budgets';
import { Dashboard } from './pages/Dashboard';
import { ForgotPassword } from './pages/ForgotPassword';
import { ImportExport } from './pages/ImportExport';
import { Investments } from './pages/Investments';
import { Login } from './pages/Login';
import { NetWorth } from './pages/NetWorth';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { SignUp } from './pages/SignUp';
import { Transactions } from './pages/Transactions';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/add-expense" element={<AddExpense />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/net-worth" element={<NetWorth />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
