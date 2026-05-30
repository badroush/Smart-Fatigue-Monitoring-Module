import { getFirestore } from '../../config/firebase.js';

function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export async function upsertDriver(driver) {
  if (!driver?.id) throw new Error('DRIVER_ID_REQUIRED');
  const db = getFirestore();
  const ref = db.collection('drivers').doc(String(driver.id));
  const data = {
    nom: driver.nom,
    numeroPermis: driver.numeroPermis,
    telephone: driver.telephone ?? null,
    dateNaissance: driver.dateNaissance ?? null,
    adresse: driver.adresse ?? null,
    isActive: driver.isActive ?? true,
    totalAlertes: driver.totalAlertes ?? 0,
    totalEvenementsFatigue: driver.totalEvenementsFatigue ?? 0,
    createdAt: driver.createdAt ?? nowIso(),
    lastFatigueEventAt: driver.lastFatigueEventAt ?? null,
    vehiculeAssigneId: driver.vehiculeAssigneId ?? null,
    vehiculeImmatriculation: driver.vehiculeImmatriculation ?? null,
    rfidUid:
      driver.rfidUid !== undefined
        ? driver.rfidUid
          ? String(driver.rfidUid).trim().toUpperCase()
          : null
        : undefined,
    nbAlertesReelles: driver.nbAlertesReelles ?? null,
    nbPaquets: driver.nbPaquets ?? null,
  };
  await ref.set(data, { merge: true });
}

export async function deleteDriver(id) {
  const db = getFirestore();
  await db.collection('drivers').doc(String(id)).delete();
}

