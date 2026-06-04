import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading secure workspace...
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
