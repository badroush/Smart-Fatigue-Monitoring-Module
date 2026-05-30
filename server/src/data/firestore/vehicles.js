import { getFirestore } from '../../config/firebase.js';
import { niveauFromSeverity, severityFromNiveau } from './util.js';

function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/** Format aligné sur frontend `VehicleMap.tsx`. */
function mapVehicleDoc(id, data, extra = {}) {
  const position =
    Array.isArray(data.position) && data.position.length === 2
      ? data.position
      : data.lastPosition && Array.isArray(data.lastPosition)
        ? data.lastPosition
        : [34.0, 9.5];

  const lastUpdate = data.lastUpdate || data.derniereCommunication || nowIso();

  const sev =
    extra.activeAlertSeverity != null
      ? Number(extra.activeAlertSeverity)
      : data.activeAlertSeverity != null
        ? Number(data.activeAlertSeverity)
        : null;

  const niveau =
    sev != null && sev > 0
      ? niveauFromSeverity(sev)
      : String(data.niveauVigilance || data.lastNiveauVigilance || 'NORMAL');

  return {
    id,
    immatriculation: data.immatriculation,
    type: data.type,
    position,
    niveauVigilance: niveau,
    lastUpdate,
    isMonitored: Boolean(data.isMonitored),
    statut: data.statut || 'inconnu',
  };
}

export async function findVehicleAuthByApiKey(apiKey) {
  const db = getFirestore();
  const snap = await db
    .collection('vehicles')
    .where('sfamApiKey', '==', String(apiKey))
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const data = doc.data() || {};
  return {
    kind: 'vehicle',
    vehicleId: doc.id,
    isSuperviseur: Boolean(data.isSuperviseur),
    // Keep a small subset; services can refetch if needed
    immatriculation: data.immatriculation,
  };
}

/**
 * Pour la carte: renvoie tous les véhicules, et calcule (si superviseur)
 * le pire niveau parmi les alertes actives.
 *
 * Note perf: pour des flottes très grandes, on dénormalise `activeAlertSeverity` dans `vehicles/`.
 */
export async function listVehiclesForMap(auth) {
  const db = getFirestore();

  const isSupervisor =
    auth?.kind === 'supervisor_env' ||
    auth?.isSuperviseur ||
    (auth?.kind === 'user' && auth.role === 'admin');

  // 1) véhicules
  let vehiclesSnap;
  if (auth?.kind === 'vehicle' && !auth.isSuperviseur) {
    vehiclesSnap = await db.collection('vehicles').doc(String(auth.vehicleId)).get();
    if (!vehiclesSnap.exists) return [];
    const d = vehiclesSnap.data() || {};
    return [mapVehicleDoc(vehiclesSnap.id, d)];
  }

  const allVehicles = await db
    .collection('vehicles')
    .orderBy('immatriculation', 'asc')
    .get();

  // 2) alertes actives groupées par véhicule (si superviseur)
  const activeByVehicle = new Map();
  if (isSupervisor) {
    // expected: alerts docs contain { statut:'active', vehiculeId, niveau }
    const active = await db
      .collection('alerts')
      .where('statut', '==', 'active')
      .get();
    for (const doc of active.docs) {
      const a = doc.data() || {};
      const vid = a.vehiculeId;
      if (!vid) continue;
      const sev = severityFromNiveau(a.niveau);
      const prev = activeByVehicle.get(vid) ?? 0;
      if (sev > prev) activeByVehicle.set(vid, sev);
    }
  }

  return allVehicles.docs.map((doc) => {
    const data = doc.data() || {};
    const sev = activeByVehicle.get(doc.id);
    return mapVehicleDoc(doc.id, data, {
      activeAlertSeverity: sev,
    });
  });
}

export async function listVehicles() {
  const db = getFirestore();
  const snap = await db.collection('vehicles').orderBy('immatriculation', 'asc').get();
  return snap.docs.map((d) => {
    const v = d.data() || {};
    return {
      id: d.id,
      immatriculation: v.immatriculation,
      type: v.type,
      statut: v.statut,
      isMonitored: Boolean(v.isMonitored),
      isActive: Boolean(v.isActive),
      derniereCommunication: v.derniereCommunication || v.lastUpdate || '',
      sfamApiKey: v.sfamApiKey,
      isSuperviseur: Boolean(v.isSuperviseur),
    };
  });
}

export async function upsertVehicle(vehicle) {
  if (!vehicle?.id) throw new Error('VEHICLE_ID_REQUIRED');
  const db = getFirestore();
  const ref = db.collection('vehicles').doc(String(vehicle.id));
  const data = {
    immatriculation: vehicle.immatriculation,
    type: vehicle.type,
    statut: vehicle.statut,
    isMonitored: vehicle.isMonitored ?? true,
    isActive: vehicle.isActive ?? true,
    sfamApiKey: vehicle.sfamApiKey,
    derniereCommunication: vehicle.derniereCommunication ?? null,
    isSuperviseur: vehicle.isSuperviseur ?? false,
    // keep optional fields if present
    position: vehicle.position,
    lastPosition: vehicle.lastPosition,
    lastUpdate: vehicle.lastUpdate,
  };
  await ref.set(data, { merge: true });
}

export async function deleteVehicle(id) {
  const db = getFirestore();
  await db.collection('vehicles').doc(String(id)).delete();
}

