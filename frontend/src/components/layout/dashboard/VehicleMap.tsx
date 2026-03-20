import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';

// 🔑 Fix pour l'icône Leaflet (problème courant sur React)
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Données simulées (à remplacer par l'API plus tard)
const vehicles = [
  { 
    id: '1', 
    immatriculation: 'TN-TEST-001', 
    position: [36.8065, 10.1815], // Tunis
    niveauVigilance: 'NORMAL',
    lastUpdate: new Date()
  },
  { 
    id: '2', 
    immatriculation: 'TN-TEST-002', 
    position: [34.7406, 10.7603], // Sfax
    niveauVigilance: 'FATIGUE_MODEREE',
    lastUpdate: new Date(Date.now() - 300000)
  },
  { 
    id: '3', 
    immatriculation: 'TN-TEST-003', 
    position: [33.3564, 10.5000], // Médenine
    niveauVigilance: 'SOMNOLENCE_CRITIQUE',
    lastUpdate: new Date(Date.now() - 600000)
  },
];

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

export default function VehicleMap() {
  return (
    <div className="rounded-xl shadow-md overflow-hidden h-[500px]">
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
        
        {vehicles.map((vehicle) => (
          <Marker 
            key={vehicle.id} 
            position={vehicle.position as [number, number]}
            icon={new Icon({
              iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${getMarkerColor(vehicle.niveauVigilance).substring(1)}.png`,
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
            })}
          >
            <Popup>
              <div className="font-bold">{vehicle.immatriculation}</div>
              <div className="mt-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  vehicle.niveauVigilance === 'SOMNOLENCE_CRITIQUE' 
                    ? 'bg-red-100 text-red-800' 
                    : vehicle.niveauVigilance.startsWith('FATIGUE') 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                }`}>
                  {vehicle.niveauVigilance.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Mise à jour : {vehicle.lastUpdate.toLocaleTimeString('fr-FR')}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Légende */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-md z-[1000]">
        <div className="font-medium mb-2">Légende</div>
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-4 h-4 rounded-full bg-[#dc2626]"></div>
          <span className="text-xs">Somnolence critique</span>
        </div>
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-4 h-4 rounded-full bg-[#ef4444]"></div>
          <span className="text-xs">Fatigue sévère</span>
        </div>
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-4 h-4 rounded-full bg-[#f59e0b]"></div>
          <span className="text-xs">Fatigue modérée</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#10b981]"></div>
          <span className="text-xs">Normal</span>
        </div>
      </div>
    </div>
  );
}