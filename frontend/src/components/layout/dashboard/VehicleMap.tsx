import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { useState, useEffect } from 'react';
import { apiGet } from '../../../services/api';
import { subscribeSupervisorAlertsStream } from '../../../services/alertsStream';

interface Vehicle {
  id: string;
  immatriculation: string;
  type: string;
  position: [number, number];
  niveauVigilance: string;
  lastUpdate: string | null;
  isMonitored: boolean;
  statut: string;
}

// 🔑 FIX : Utiliser des URLs fiables pour les icônes
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface VehiclesMapResponse {
  total?: number;
  vehicles: Vehicle[];
}
interface VehicleMapProps {
  onVehiclesCountChange?: (count: number) => void;
}

export default function VehicleMap({ onVehiclesCountChange }: VehicleMapProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les véhicules depuis l'API
    useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const response = await apiGet<VehiclesMapResponse>('/vehicles/map');
        
        if (response.success && response.data?.vehicles) {
          const list = response.data.vehicles;
          setVehicles(list);
          const n = response.data.total ?? list.length;
          onVehiclesCountChange?.(n);
          setError(null);
        } else {
          setVehicles([]);
          onVehiclesCountChange?.(0);
          setError('Aucun véhicule trouvé');
        }
      } catch (err: any) {
        console.error('Erreur chargement véhicules:', err);
        setError(err.response?.data?.message || 'Erreur lors du chargement des véhicules');
        setVehicles([]);
        onVehiclesCountChange?.(0);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
    const interval = setInterval(fetchVehicles, 15000);
    const unsubAlerts = subscribeSupervisorAlertsStream(fetchVehicles);
    return () => {
      clearInterval(interval);
      unsubAlerts();
    };
  }, [onVehiclesCountChange]);

  // Couleurs par niveau de vigilance
  const getMarkerColor = (niveau: string) => {
    switch (niveau) {
      case 'SOMNOLENCE_CRITIQUE': return '#dc2626'; // Rouge critique
      case 'FATIGUE_SEVERE': return '#ef4444';      // Rouge alerte
      case 'FATIGUE_MODEREE': return '#f59e0b';      // Orange
      case 'FATIGUE_LEGERE': return '#fbbf24';       // Jaune
      default: return '#10b981';                     // Vert normal
    }
  };

  // Déterminer le label du niveau
  const getNiveauLabel = (niveau: string) => {
    switch (niveau) {
      case 'SOMNOLENCE_CRITIQUE': return 'Somnolence critique';
      case 'FATIGUE_SEVERE': return 'Fatigue sévère';
      case 'FATIGUE_MODEREE': return 'Fatigue modérée';
      case 'FATIGUE_LEGERE': return 'Fatigue légère';
      default: return 'Normal';
    }
  };

  return (
    <div className="overflow-hidden h-full min-h-[320px] relative bg-slate-900">
      {loading && (
        <div className="absolute inset-0 bg-slate-900/85 flex items-center justify-center z-10">
          <div className="text-center border border-slate-600 bg-slate-800 px-6 py-4 shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-500 border-t-amber-400 mx-auto mb-3"></div>
            <div className="text-slate-300 text-xs uppercase tracking-wider">Chargement des véhicules</div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-slate-900/85 flex items-center justify-center z-10">
          <div className="text-center p-6 border border-red-900/60 bg-slate-900 max-w-sm">
            <div className="text-red-400 font-medium mb-2 text-sm uppercase tracking-wide">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-slate-700 text-slate-100 text-xs font-semibold uppercase tracking-wider border border-slate-500 hover:bg-slate-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <MapContainer 
        center={[34.0, 9.5]} 
        zoom={7} 
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {vehicles.map((vehicle) => {
          // Utiliser CircleMarker au lieu de Marker pour éviter les problèmes d'icônes
          return (
            <CircleMarker
              key={`${vehicle.id}-${vehicle.lastUpdate ?? ""}`}
              center={vehicle.position}
              radius={10}
              fillColor={getMarkerColor(vehicle.niveauVigilance)}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="font-bold text-lg">{vehicle.immatriculation}</div>
                <div className="mt-1 text-sm text-gray-600">{vehicle.type}</div>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    vehicle.niveauVigilance === 'SOMNOLENCE_CRITIQUE' 
                      ? 'bg-red-100 text-red-800' 
                      : vehicle.niveauVigilance.startsWith('FATIGUE') 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {getNiveauLabel(vehicle.niveauVigilance)}
                  </span>
                </div>
                {vehicle.lastUpdate && (
                  <div className="text-xs text-gray-500 mt-1">
                    Mise à jour : {new Date(vehicle.lastUpdate).toLocaleTimeString('fr-FR')}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Statut : {vehicle.statut === 'en_service' ? '🟢 En service' : '🟡 ' + vehicle.statut}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Légende — style IHM */}
      <div className="absolute bottom-3 right-3 border border-slate-600 bg-slate-900/92 backdrop-blur-sm p-2.5 z-[1000] text-slate-200 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 border-b border-slate-600 pb-1.5 mb-2">
          Légende vigilance
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#dc2626] border border-slate-500 shrink-0"></div>
          <span className="text-[11px] leading-tight">Somnolence critique</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#ef4444] border border-slate-500 shrink-0"></div>
          <span className="text-[11px] leading-tight">Fatigue sévère</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b] border border-slate-500 shrink-0"></div>
          <span className="text-[11px] leading-tight">Fatigue modérée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10b981] border border-slate-500 shrink-0"></div>
          <span className="text-[11px] leading-tight">Normal</span>
        </div>
      </div>

      {/* Compteur de véhicules */}
      <div className="absolute top-3 left-3 border border-slate-600 bg-slate-900/92 backdrop-blur-sm px-3 py-2 z-[1000] shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Flotte</div>
        <div className="text-slate-100 font-mono text-lg font-bold tabular-nums">
          {vehicles.length} <span className="text-slate-500 text-xs font-sans font-normal">unités</span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">MAJ ~15 s</span>
      </div>
    </div>
  );
}