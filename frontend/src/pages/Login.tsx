import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 🔑 Mot de passe superviseur (à sécuriser en production)
    const SUPERVISEUR_PASSWORD = 'sfam2026';

    if (password === SUPERVISEUR_PASSWORD) {
      setLoading(true);
      
      // Simuler une vérification API (optionnel)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stocker l'authentification dans localStorage
      localStorage.setItem('sfam_auth', 'superviseur');
      localStorage.setItem('sfam_auth_time', Date.now().toString());
      
      // Rediriger vers le dashboard
      navigate('/');
    } else {
      setError('Mot de passe incorrect');
      setPassword('');
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
            Connexion Superviseur
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe superviseur
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
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
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connexion en cours...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  🔐 Accès réservé aux superviseurs autorisés
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-blue-100">
            Projet de fin d'études - ISI Medenine
          </p>
          <p className="text-sm text-blue-50">
            Développé par Badr BENAMARA
          </p>
        </div>
      </div>
    </div>
  );
}