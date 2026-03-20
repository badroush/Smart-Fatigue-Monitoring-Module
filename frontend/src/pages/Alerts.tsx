import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import { Alerte } from '../types/api';

interface AlertesResponse {
  total: number;
  alertes: Alerte[];
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedAlerte, setSelectedAlerte] = useState<Alerte | null>(null);

  // Charger les alertes
 // Charger les alertes
useEffect(() => {
  const fetchAlertes = async () => {
    try {
      setLoading(true);
      // 🔑 Nouvelle route : /alerts (sans ID de véhicule) = TOUTES les alertes
      const response = await apiGet<AlertesResponse>('/alerts');
      
      console.log('🔄 Réponse API complète:', response); // 🔍 Debug
      
      if (response.success && response.data?.alertes) {
        console.log('✅ Alertes chargées:', response.data.alertes.length); // 🔍 Debug
        setAlertes(response.data.alertes);
      } else {
        console.log('❌ Aucune alerte trouvée ou erreur API'); // 🔍 Debug
        setAlertes([]);
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement alertes:', err);
      console.error('Message:', err.response?.data || err.message); // 🔍 Debug détaillé
      setAlertes([]);
    } finally {
      setLoading(false);
    }
  };

  fetchAlertes();
  const interval = setInterval(fetchAlertes, 10000);
  return () => clearInterval(interval);
}, []);

  // Filtrer les alertes
  const filteredAlertes = alertes.filter((alerte) => {
    if (filter === 'all') return true;
    if (filter === 'active') return alerte.statut === 'active';
    if (filter === 'resolved') return alerte.statut !== 'active';
    return alerte.niveau.value === filter;
  });

  // Couleur par niveau
  const getBadgeColor = (niveau: string) => {
    switch (niveau) {
      case 'SOMNOLENCE_CRITIQUE': return 'bg-red-100 text-red-800';
      case 'FATIGUE_SEVERE': return 'bg-orange-100 text-orange-800';
      case 'FATIGUE_MODEREE': return 'bg-yellow-100 text-yellow-800';
      case 'FATIGUE_LEGERE': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (niveau: string) => {
    switch (niveau) {
      case 'SOMNOLENCE_CRITIQUE': return 'text-red-600 font-bold';
      case 'FATIGUE_SEVERE': return 'text-orange-600 font-semibold';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">🚨 Alertes</h1>
          <p className="text-gray-600">Surveillance en temps réel des événements de fatigue</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1a327a] transition"
          >
            ← Retour au tableau de bord
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#ef4444]">
          <div className="text-sm text-gray-500 mb-1">Alertes actives</div>
          <div className="text-3xl font-bold text-[#ef4444]">
            {alertes.filter(a => a.statut === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#dc2626]">
          <div className="text-sm text-gray-500 mb-1">Critiques</div>
          <div className="text-3xl font-bold text-[#dc2626]">
            {alertes.filter(a => a.niveau.value === 'SOMNOLENCE_CRITIQUE').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#f59e0b]">
          <div className="text-sm text-gray-500 mb-1">Sévères</div>
          <div className="text-3xl font-bold text-[#f59e0b]">
            {alertes.filter(a => a.niveau.value === 'FATIGUE_SEVERE').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#10b981]">
          <div className="text-sm text-gray-500 mb-1">Total historique</div>
          <div className="text-3xl font-bold text-[#10b981]">
            {alertes.length}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-[#1e3a8a] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes ({alertes.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'active'
                ? 'bg-[#ef4444] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Actives ({alertes.filter(a => a.statut === 'active').length})
          </button>
          <button
            onClick={() => setFilter('SOMNOLENCE_CRITIQUE')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'SOMNOLENCE_CRITIQUE'
                ? 'bg-[#dc2626] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Critiques
          </button>
          <button
            onClick={() => setFilter('FATIGUE_SEVERE')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'FATIGUE_SEVERE'
                ? 'bg-[#f59e0b] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sévères
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'resolved'
                ? 'bg-[#10b981] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Résolues
          </button>
        </div>
      </div>

      {/* Tableau des alertes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
            Chargement des alertes...
          </div>
        ) : filteredAlertes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            ✅ Aucune alerte correspondant aux filtres
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conducteur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horodatage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlertes.map((alerte) => (
                  <tr
                    key={alerte.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      alerte.statut === 'active' && alerte.niveau.value === 'SOMNOLENCE_CRITIQUE'
                        ? 'bg-red-50/30'
                        : ''
                    }`}
                    onClick={() => setSelectedAlerte(alerte)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeColor(alerte.niveau.value)}`}>
                        {alerte.niveau.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${getPriorityColor(alerte.niveau.value)}`}>
                        {alerte.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{alerte.vehicule.immatriculation}</div>
                      <div className="text-sm text-gray-500">{alerte.vehicule.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {alerte.conducteur?.nom || 'Inconnu'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(alerte.horodatage).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alerte.statut === 'active'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {alerte.statut === 'active' ? '🔴 Active' : '✅ Résolue'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implémenter l'acquittement
                          alert('Fonctionnalité d\'acquittement à implémenter');
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                      >
                        Acquitter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {selectedAlerte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-[#1e3a8a]">Détails de l'alerte</h2>
                <button
                  onClick={() => setSelectedAlerte(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">ID Alerte</label>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {selectedAlerte.idAlerte}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-500">Niveau de vigilance</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${getBadgeColor(selectedAlerte.niveau.value)}`}>
                    <div className="font-bold">{selectedAlerte.niveau.label}</div>
                    <div className="text-xs">{selectedAlerte.niveau.value}</div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-500">Message</label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                    {selectedAlerte.message}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Véhicule</label>
                    <div className="mt-1 font-medium">{selectedAlerte.vehicule.immatriculation}</div>
                    <div className="text-sm text-gray-500">{selectedAlerte.vehicule.type}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Conducteur</label>
                    <div className="mt-1 font-medium">
                      {selectedAlerte.conducteur?.nom || 'Non spécifié'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Horodatage</label>
                    <div className="mt-1 font-medium">
                      {new Date(selectedAlerte.horodatage).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Statut</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedAlerte.statut === 'active'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedAlerte.statut}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-500">Métadonnées</label>
                  <div className="mt-2 text-sm">
                    <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-48">
                      {JSON.stringify(selectedAlerte, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}