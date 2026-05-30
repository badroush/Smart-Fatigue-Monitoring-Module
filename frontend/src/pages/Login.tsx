import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const l = login.trim();
    if (!l || !password) {
      setError('Identifiant et mot de passe requis');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost<{
        token: string;
        role: string;
        login: string;
      }>('/auth/login', { login: l, password });

      if (!res.success || !res.data?.token) {
        setError(res.message || 'Connexion refusée');
        setPassword('');
        return;
      }

      localStorage.setItem('sfam_token', res.data.token);
      localStorage.setItem('sfam_role', res.data.role);
      localStorage.setItem('sfam_login', res.data.login);
      localStorage.setItem('sfam_auth_time', Date.now().toString());
      localStorage.removeItem('sfam_auth');

      if (res.data.role === 'superviseur') {
        navigate('/alerts');
      } else {
        navigate('/');
      }
    } catch {
      setError('Identifiant ou mot de passe incorrect');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#0ea5e9] to-[#1e3a8a] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-white mb-2">🛡️</div>
          <h1 className="text-4xl font-bold text-white mb-2">SFAM</h1>
          <p className="text-xl text-blue-100">
            Système de Surveillance de la Fatigue du Conducteur
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Connexion
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                Identifiant
              </label>
              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm transition"
                placeholder="admin ou superviseur"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#1e3a8a] hover:bg-[#1a327a]'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] transition`}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Connexion…
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-center text-xs text-gray-500 leading-relaxed">
              Comptes <strong>administrateur</strong> et <strong>superviseur</strong> : accès web.
              Les conducteurs s’identifient par <strong>carte RFID</strong> au module du véhicule
              (pas de mot de passe ici).
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-blue-100">
            Projet de fin d&apos;études - ISI Medenine
          </p>
          <p className="text-sm text-blue-50">
            Développé par Badr BENAMARA
          </p>
        </div>
      </div>
    </div>
  );
}
