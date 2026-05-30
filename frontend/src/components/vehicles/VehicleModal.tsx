import { useState, useEffect } from 'react';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  vehicle?: any; // Pour l'édition
  title: string;
}

export default function VehicleModal({ isOpen, onClose, onSubmit, vehicle, title }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    immatriculation: vehicle?.immatriculation || '',
    type: vehicle?.type || 'camion',
    statut: vehicle?.statut || 'en_service',
    isMonitored: vehicle?.isMonitored ?? true,
    isActive: vehicle?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Dans VehicleModal.tsx
useEffect(() => {
  if (!isOpen) {
    // Réinitialiser le formulaire quand le modal se ferme
    setFormData({
      immatriculation: vehicle?.immatriculation || '',
      type: vehicle?.type || 'camion',
      statut: vehicle?.statut || 'en_service',
      isMonitored: vehicle?.isMonitored ?? true,
      isActive: vehicle?.isActive ?? true,
    });
  }
}, [isOpen, vehicle]);

// Dans VehicleModal.tsx - useEffect pour initialiser les données
useEffect(() => {
  if (isOpen && vehicle) {
    // Mode édition - charger les données du véhicule
    setFormData({
      immatriculation: vehicle.immatriculation || '',
      type: vehicle.type || 'camion',
      statut: vehicle.statut || 'en_service',
      isMonitored: vehicle.isMonitored ?? true,
      isActive: vehicle.isActive ?? true,
    });
  } else if (isOpen) {
    // Mode création - formulaire vide
    setFormData({
      immatriculation: '',
      type: 'camion',
      statut: 'en_service',
      isMonitored: true,
      isActive: true,
    });
  }
}, [isOpen, vehicle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Immatriculation *
              </label>
              <input
                type="text"
                value={formData.immatriculation}
                onChange={(e) => setFormData({...formData, immatriculation: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="camion">Camion</option>
                <option value="bus">Bus</option>
                <option value="fourgon">Fourgon</option>
                <option value="voiture">Voiture</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut *
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="en_service">En service</option>
                <option value="maintenance">Maintenance</option>
                <option value="hors_service">Hors service</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isMonitored}
                  onChange={(e) => setFormData({...formData, isMonitored: e.target.checked})}
                  className="rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <span className="ml-2 text-sm text-gray-700">Surveillé</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <span className="ml-2 text-sm text-gray-700">Actif</span>
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1e3a8a] text-white rounded-md hover:bg-[#1a327a]"
            >
              {vehicle ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}