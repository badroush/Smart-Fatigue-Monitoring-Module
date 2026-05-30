import { Navigate } from 'react-router-dom';

/**
 * Réserve la route aux administrateurs (JWT rôle admin ou accès legacy équivalent).
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = localStorage.getItem('sfam_role');
  if (role === 'superviseur') {
    return <Navigate to="/alerts" replace />;
  }
  return <>{children}</>;
}
