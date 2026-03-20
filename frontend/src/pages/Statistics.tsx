import { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { apiGet } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface StatistiquesData {
  totalPaquets: number;
  moyenneScore: number;
  maxScore: number;
  minScore: number;
  repartitionNiveaux: Record<string, number>;
  historique: Array<{
    date: string;
    score: number;
    niveau: string;
  }>;
}

// Ajoute ce type après les autres interfaces
interface StatistiquesResponse {
  totalPaquets: number;
  derniereCommunication: string | null;
  statut: string;
  isMonitored: boolean;
  moyenneScore?: number;
  maxScore?: number;
  minScore?: number;
  repartitionNiveaux?: Record<string, number>;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatistiquesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('7j');

  // Simuler les données (à remplacer par l'API plus tard)
 // Remplace le useEffect existant par celui-ci
useEffect(() => {
  const fetchStats = async () => {
    try {
      setLoading(true);
      // 🔑 ID du véhicule (remplace par ton ID réel)
      const VEHICULE_ID = 'd92dbc25-238f-11';
      const response = await apiGet<StatistiquesResponse>(`/statistics/${VEHICULE_ID}`);
      
      if (response.success && response.data) {
        // Convertir la réponse API en format attendu
        const statsData: StatistiquesData = {
          totalPaquets: response.data.totalPaquets,
          moyenneScore: response.data.moyenneScore || 0,
          maxScore: response.data.maxScore || 0,
          minScore: response.data.minScore || 0,
          repartitionNiveaux: response.data.repartitionNiveaux || {},
          historique: [], // À implémenter plus tard
        };
        setStats(statsData);
      }
    } catch (err) {
      console.error('Erreur chargement statistiques:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
  const interval = setInterval(fetchStats, 60000); // Rafraîchir toutes les 60s
  return () => clearInterval(interval);
}, [periode]);

  // Données pour le graphique linéaire
  const lineData = {
    labels: stats?.historique.slice(-14).map(h => h.date) || [],
    datasets: [
      {
        label: 'Score de vigilance',
        data: stats?.historique.slice(-14).map(h => h.score) || [],
        borderColor: '#1e3a8a',
        backgroundColor: 'rgba(30, 58, 138, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Données pour le graphique en barres
  const barData = {
    labels: ['Normal', 'Légère', 'Modérée', 'Sévère', 'Critique'],
    datasets: [
      {
        label: 'Nombre d\'événements',
        data: [
          stats?.repartitionNiveaux['NORMAL'] || 0,
          stats?.repartitionNiveaux['FATIGUE_LEGERE'] || 0,
          stats?.repartitionNiveaux['FATIGUE_MODEREE'] || 0,
          stats?.repartitionNiveaux['FATIGUE_SEVERE'] || 0,
          stats?.repartitionNiveaux['SOMNOLENCE_CRITIQUE'] || 0,
        ],
        backgroundColor: [
          '#10b981', // Vert
          '#fbbf24', // Jaune
          '#f59e0b', // Orange
          '#ef4444', // Rouge
          '#dc2626', // Rouge foncé
        ],
      },
    ],
  };

  // Données pour le graphique circulaire
  const pieData = {
    labels: ['Normal', 'Fatigue légère', 'Fatigue modérée', 'Fatigue sévère', 'Somnolence critique'],
    datasets: [
      {
        data: [
          stats?.repartitionNiveaux['NORMAL'] || 0,
          stats?.repartitionNiveaux['FATIGUE_LEGERE'] || 0,
          stats?.repartitionNiveaux['FATIGUE_MODEREE'] || 0,
          stats?.repartitionNiveaux['FATIGUE_SEVERE'] || 0,
          stats?.repartitionNiveaux['SOMNOLENCE_CRITIQUE'] || 0,
        ],
        backgroundColor: [
          '#10b981',
          '#fbbf24',
          '#f59e0b',
          '#ef4444',
          '#dc2626',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution de la vigilance (14 derniers jours)',
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Répartition des niveaux de vigilance',
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Répartition globale',
      },
    },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">📈 Statistiques</h1>
          <p className="text-gray-600">Analyse détaillée des événements de fatigue</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="24h">24 heures</option>
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#1e3a8a]">
          <div className="text-sm text-gray-500 mb-1">Total événements</div>
          <div className="text-4xl font-bold text-[#1e3a8a]">
            {loading ? '...' : stats?.totalPaquets}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#10b981]">
          <div className="text-sm text-gray-500 mb-1">Score moyen</div>
          <div className="text-4xl font-bold text-[#10b981]">
            {loading ? '...' : stats?.moyenneScore?.toFixed(1)}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#f59e0b]">
          <div className="text-sm text-gray-500 mb-1">Score maximum</div>
          <div className="text-4xl font-bold text-[#f59e0b]">
            {loading ? '...' : stats?.maxScore}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#dc2626]">
          <div className="text-sm text-gray-500 mb-1">Événements critiques</div>
          <div className="text-4xl font-bold text-[#dc2626]">
            {loading ? '...' : stats?.repartitionNiveaux['SOMNOLENCE_CRITIQUE'] || 0}
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Évolution temporelle</h2>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Chargement des données...
            </div>
          ) : (
            <div className="h-80">
              <Line data={lineData} options={options} />
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Répartition des niveaux</h2>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Chargement des données...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64">
                <Bar data={barData} options={barOptions} />
              </div>
              <div className="h-64">
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau historique */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Historique détaillé</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
            Chargement de l'historique...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(stats?.historique || []).slice(-20).reverse().map((event, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        event.niveau === 'SOMNOLENCE_CRITIQUE' ? 'bg-red-100 text-red-800' :
                        event.niveau === 'FATIGUE_SEVERE' ? 'bg-orange-100 text-orange-800' :
                        event.niveau === 'FATIGUE_MODEREE' ? 'bg-yellow-100 text-yellow-800' :
                        event.niveau === 'FATIGUE_LEGERE' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {event.niveau.replace('FATIGUE_', '').replace('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      TN-TEST-001
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1a327a] transition flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter CSV
          </button>
        </div>
      </div>
    </div>
  );
}