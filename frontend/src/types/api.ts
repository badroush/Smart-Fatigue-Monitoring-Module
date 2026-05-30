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
  acquitteeAt?: string;
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

export interface Conducteur {
  id: string;
  nom: string;
  numeroPermis: string;
  telephone?: string;
  dateNaissance?: string;
  adresse?: string;
  isActive: boolean;
  totalAlertes: number;
  totalEvenementsFatigue: number;
  createdAt?: string;
  lastFatigueEventAt?: string;
  vehiculeAssigneId?: string;
  vehiculeImmatriculation?: string;
  /** UID carte RFID (module camion) — renseigné par l’admin */
  rfidUid?: string;
  nbAlertesReelles?: number;
  nbPaquets?: number;
}

export interface ConducteurStats {
  totalConducteurs: number;
  conducteursActifs: number;
  avecVehiculeAssigne: number;
  totalAlertesLiees: number;
  totalPaquetsLiees: number;
  topParAlertes: Array<{
    id: string;
    nom: string;
    numeroPermis: string;
    nombreAlertes: number;
  }>;
}