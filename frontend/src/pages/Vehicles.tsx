import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

interface Vehicule {
  id: string;
  immatriculation: string;
  type: string;
  statut: string;
  isMonitored: boolean;
  derniereCommunication: string;
  conducteur?: string;
}
// Interface pour la réponse API
interface VehiculeResponse {
  id: string;
  immatriculation: string;
  type: string;
  statut: string;
  isMonitored: boolean;
  derniereCommunication: string;
  conducteur?: string;
}

interface VehiculesResponse {
  total: number;
  vehicules: VehiculeResponse[];
}

export default function VehiclesPage() {
  const [filter, setFilter] = useState('tous');
  const [search, setSearch] = useState('');
  const [vehicules, setVehicules] = useState<VehiculeResponse[]>([]);
  const [loading, setLoading] = useState(true);
        
    // Charger les véhicules depuis l'API
  useEffect(() => {
    const fetchVehicules = async () => {
      try {
        setLoading(true);
        const response = await apiGet<VehiculesResponse>('/vehicles');
        
        if (response.success && response.data?.vehicules) {
          setVehicules(response.data.vehicules);
        } else {
          setVehicules([]);
        }
      } catch (err) {
        console.error('Erreur chargement véhicules:', err);
        setVehicules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicules();
    const interval = setInterval(fetchVehicules, 30000); // Rafraîchir toutes les 30s
    return () => clearInterval(interval);
  }, []);
  
  // Remplace le tableau de données simulées par celui de l'API
  const filteredVehicules = vehicules.filter((vehicule) => {
    // Filtre par statut
    if (filter !== 'tous') {
      if (filter === 'actifs' && !vehicule.isMonitored) return false;
      if (filter === 'inactifs' && vehicule.isMonitored) return false;
      if (filter === 'maintenance' && vehicule.statut !== 'maintenance') return false;
    }
    
    // Filtre par recherche
    const searchLower = search.toLowerCase();
    return (
      vehicule.immatriculation.toLowerCase().includes(searchLower) ||
      vehicule.type.toLowerCase().includes(searchLower)
    );
  });

  // Déterminer le statut visuel
  const getStatutBadge = (statut: string, isMonitored: boolean) => {
    if (!isMonitored) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
          Non surveillé
        </span>
      );
    }
    
    switch (statut) {
      case 'en_service':
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            En service
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Maintenance
          </span>
        );
      case 'hors_service':
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            Hors service
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {statut}
          </span>
        );
    }
  };

  // Déterminer si la communication est récente
  const isCommunicationRecente = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 300000; // 5 minutes
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">🚛 Véhicules</h1>
          <p className="text-gray-600">Gestion et surveillance de la flotte</p>
        </div>
        <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1a327a] transition flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ajouter un véhicule
        </button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#1e3a8a]">
          <div className="text-sm text-gray-500 mb-1">Total véhicules</div>
          <div className="text-3xl font-bold text-[#1e3a8a]">{vehicules.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#10b981]">
          <div className="text-sm text-gray-500 mb-1">Surveillés</div>
          <div className="text-3xl font-bold text-[#10b981]">
            {vehicules.filter(v => v.isMonitored).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#f59e0b]">
          <div className="text-sm text-gray-500 mb-1">En service</div>
          <div className="text-3xl font-bold text-[#f59e0b]">
            {vehicules.filter(v => v.statut === 'en_service' && v.isMonitored).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-[#ef4444]">
          <div className="text-sm text-gray-500 mb-1">En maintenance</div>
          <div className="text-3xl font-bold text-[#ef4444]">
            {vehicules.filter(v => v.statut === 'maintenance').length}
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par immatriculation, type ou conducteur..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('tous')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'tous'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({vehicules.length})
            </button>
            <button
              onClick={() => setFilter('actifs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'actifs'
                  ? 'bg-[#10b981] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Actifs ({vehicules.filter(v => v.isMonitored).length})
            </button>
            <button
              onClick={() => setFilter('inactifs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'inactifs'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactifs ({vehicules.filter(v => !v.isMonitored).length})
            </button>
            <button
              onClick={() => setFilter('maintenance')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'maintenance'
                  ? 'bg-[#f59e0b] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Maintenance
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des véhicules */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Immatriculation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conducteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière com.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicules.map((vehicule) => (
                <tr key={vehicule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{vehicule.immatriculation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {vehicule.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicule.conducteur || 'Non assigné'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatutBadge(vehicule.statut, vehicule.isMonitored)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className={`flex items-center ${
                      isCommunicationRecente(vehicule.derniereCommunication) 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        isCommunicationRecente(vehicule.derniereCommunication) 
                          ? 'bg-green-500' 
                          : 'bg-red-500'
                      }`}></span>
                      {new Date(vehicule.derniereCommunication).toLocaleTimeString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-[#1e3a8a] hover:text-[#1a327a] mr-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button className="text-[#1e3a8a] hover:text-[#1a327a] mr-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button className="text-[#1e3a8a] hover:text-[#1a327a]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Affichage de <span className="font-medium">1</span> à <span className="font-medium">{Math.min(10, filteredVehicules.length)}</span> sur <span className="font-medium">{filteredVehicules.length}</span> véhicules
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Précédent
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}