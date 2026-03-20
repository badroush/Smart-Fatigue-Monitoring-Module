export interface NiveauVigilance {
  value: string;
  label: string;
  color: string;
  icon: string;
  critical: boolean;
  threshold: number;
}

export interface Vehicule {
  id: string;
  immatriculation: string;
  type: string;
  statut: string;
  isMonitored: boolean;
  derniereCommunication?: string;
}

export interface Alerte {
  id: string;
  idAlerte: string;
  niveau: NiveauVigilance;
  message: string;
  type: string;
  statut: string;
  horodatage: string;
  vehicule: Vehicule;
  conducteur?: {
    id: string;
    nom: string;
    numeroPermis: string;
  };
}

export interface StatistiquesVehicule {
  totalPaquets: number;
  derniereCommunication: string | null;
  statut: string;
  isMonitored: boolean;
  moyenneScore?: number;
  maxScore?: number;
  minScore?: number;
  repartitionNiveaux?: Record<string, number>;
}