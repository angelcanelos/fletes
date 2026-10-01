import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';

export default function RequireAuth() {
  const { autenticado, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-ink-400" strokeWidth={2.25} />
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
