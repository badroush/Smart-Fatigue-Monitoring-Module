import { getFirestore } from '../../config/firebase.js';

function mapDriverDoc(id, data) {
  const d = data || {};
  return {
    id,
    nom: d.nom,
    numeroPermis: d.numeroPermis,
    telephone: d.telephone ?? undefined,
    dateNaissance: d.dateNaissance ?? undefined,
    adresse: d.adresse ?? undefined,
    isActive: Boolean(d.isActive),
    totalAlertes: Number(d.totalAlertes ?? 0),
    totalEvenementsFatigue: Number(d.totalEvenementsFatigue ?? 0),
    createdAt: d.createdAt ?? undefined,
    lastFatigueEventAt: d.lastFatigueEventAt ?? undefined,
    vehiculeAssigneId: d.vehiculeAssigneId ?? undefined,
    vehiculeImmatriculation: d.vehiculeImmatriculation ?? undefined,
    nbAlertesReelles: d.nbAlertesReelles ?? undefined,
    nbPaquets: d.nbPaquets ?? undefined,
    rfidUid: d.rfidUid ?? undefined,
  };
}

export async function listConducteursFs() {
  const db = getFirestore();
  const snap = await db.collection('drivers').orderBy('nom', 'asc').get();
  return snap.docs.map((doc) => mapDriverDoc(doc.id, doc.data()));
}

/**
 * Stats conducteurs (équivalent getConducteurStatistics MySQL), version Firestore.
 * Limite l'échantillon d'alertes pour le top 5 (évite les scans complets sur très gros volumes).
 */
export async function getConducteurStatisticsFs() {
  const db = getFirestore();

  const drvSnap = await db.collection('drivers').get();
  const drivers = drvSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let totalConducteurs = drivers.length;
  let actifs = 0;
  let avecVehicule = 0;
  for (const dr of drivers) {
    if (dr.isActive !== false) actifs += 1;
    if (dr.vehiculeAssigneId) avecVehicule += 1;
  }

  let totalAlertesLiees = 0;
  try {
    totalAlertesLiees = (await db.collection('alerts').count().get()).data().count;
  } catch {
    const a = await db.collection('alerts').limit(20000).get();
    totalAlertesLiees = a.size;
  }

  let totalPaquetsLiees = 0;
  try {
    const pktSnap = await db.collection('packets').limit(15000).get();
    for (const doc of pktSnap.docs) {
      if (doc.data()?.conducteurId) totalPaquetsLiees += 1;
    }
  } catch {
    totalPaquetsLiees = 0;
  }

  const byConducteur = {};
  const altSample = await db.collection('alerts').limit(5000).get();
  for (const doc of altSample.docs) {
    const cid = doc.data()?.conducteurId;
    if (!cid) continue;
    byConducteur[cid] = (byConducteur[cid] || 0) + 1;
  }

  const top = Object.entries(byConducteur)
    .map(([id, nb]) => {
      const dr = drivers.find((x) => x.id === id);
      return {
        id,
        nom: dr?.nom || '?',
        numeroPermis: dr?.numeroPermis || '?',
        nombreAlertes: nb,
      };
    })
    .sort((a, b) => b.nombreAlertes - a.nombreAlertes)
    .slice(0, 5);

  return {
    totalConducteurs,
    conducteursActifs: actifs,
    avecVehiculeAssigne: avecVehicule,
    totalAlertesLiees,
    totalPaquetsLiees,
    topParAlertes: top,
  };
}
