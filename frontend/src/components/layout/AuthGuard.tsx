import { Navigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = () => {
    const token = localStorage.getItem('sfam_token');
    const authTime = localStorage.getItem('sfam_auth_time');

    if (!token) return false;

    if (authTime) {
      const now = Date.now();
      const expiryTime = parseInt(authTime, 10) + 24 * 60 * 60 * 1000;
      if (now > expiryTime) {
        localStorage.removeItem('sfam_token');
        localStorage.removeItem('sfam_role');
        localStorage.removeItem('sfam_login');
        localStorage.removeItem('sfam_auth_time');
        return false;
      }
    }

    return true;
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
