import { Navigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = () => {
    const auth = localStorage.getItem('sfam_auth');
    const authTime = localStorage.getItem('sfam_auth_time');
    
    // Vérifier si l'authentification existe
    if (!auth) return false;
    
    // Vérifier si la session n'a pas expiré (24h)
    if (authTime) {
      const now = Date.now();
      const expiryTime = parseInt(authTime) + 24 * 60 * 60 * 1000; // 24h en ms
      
      if (now > expiryTime) {
        localStorage.removeItem('sfam_auth');
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