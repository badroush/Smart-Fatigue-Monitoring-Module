import { useState, useEffect } from 'react';
import { apiGet } from '../services/api';
import { Alerte } from '../types/api';

interface AlertesResponse {
  total: number;
  alertes: Alerte[];
}

export function useAlertes(vehiculeId: string) {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlertes = async () => {
      try {
        setLoading(true);
        const response = await apiGet<AlertesResponse>(`/alerts/${vehiculeId}`);
        
        if (response.success && response.data?.alertes) {
          setAlertes(response.data.alertes);
        } else {
          setAlertes([]);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur lors du chargement des alertes');
        setAlertes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertes();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchAlertes, 10000);
    return () => clearInterval(interval);
  }, [vehiculeId]);

  return { alertes, loading, error };
}