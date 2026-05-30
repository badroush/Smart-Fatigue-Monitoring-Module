import { getFirestore } from '../../config/firebase.js';

function dayStringsLast7() {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

/** Parse derniereCommunication / lastUpdate (string locale ou ISO). */
function parseCommDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'object' && raw.toDate) return raw.toDate();
  const s = String(raw);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6])
    );
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function countPacketsWhere(db, field, value) {
  try {
    const snap = await db.collection('packets').where(field, '==', value).count().get();
    return snap.data().count;
  } catch {
    const s = await db.collection('packets').where(field, '==', value).limit(20000).get();
    return s.size;
  }
}

/**
 * Statistiques globales dashboard (équivalent MySQL getGlobalStatistics), données Firestore.
 */
export async function getGlobalStatisticsFs() {
  const db = getFirestore();

  const [vehSnap, alertSnap, modSnap] = await Promise.all([
    db.collection('vehicles').get(),
    db.collection('alerts').where('statut', '==', 'active').get(),
    db.collection('moduleAlerts').where('statut', '==', 'active').get().catch(() => ({ docs: [] })),
  ]);

  let totalPaquets = 0;
  try {
    const cnt = await db.collection('packets').count().get();
    totalPaquets = cnt.data().count;
  } catch {
    const p = await db.collection('packets').limit(20000).get();
    totalPaquets = p.size;
  }

  const vehDocs = vehSnap.docs;
  let totalVehicules = 0;
  let vehiculesActifs = 0;
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;

  for (const d of vehDocs) {
    const v = d.data() || {};
    if (v.isMonitored === false) continue;
    totalVehicules += 1;
    const t = parseCommDate(v.derniereCommunication || v.lastUpdate || v.lastCommunication);
    if (t && now - t.getTime() <= fiveMin) vehiculesActifs += 1;
  }

  const alertesActives = alertSnap.size;
  const alertesModuleActives = modSnap.docs ? modSnap.docs.length : 0;

  const repartitionNiveaux = {
    NORMAL: 0,
    FATIGUE_LEGERE: 0,
    FATIGUE_MODEREE: 0,
    FATIGUE_SEVERE: 0,
    SOMNOLENCE_CRITIQUE: 0,
  };

  for (const k of Object.keys(repartitionNiveaux)) {
    repartitionNiveaux[k] = await countPacketsWhere(db, 'niveauVigilance', k);
  }

  let moyenneScoreGlobal = 0;
  const pktSample = await db
    .collection('packets')
    .orderBy('receivedAt', 'desc')
    .limit(500)
    .get()
    .catch(() => db.collection('packets').limit(500).get());
  if (pktSample && !pktSample.empty) {
    let sum = 0;
    let n = 0;
    for (const doc of pktSample.docs) {
      const sc = doc.data()?.scoreGlobal;
      if (sc != null && !Number.isNaN(Number(sc))) {
        sum += Number(sc);
        n += 1;
      }
    }
    moyenneScoreGlobal = n ? Math.round((sum / n) * 100) / 100 : 0;
  }

  const repartitionVehicules = {};
  const vehAgg = await db
    .collection('packets')
    .limit(5000)
    .get()
    .catch(() => null);
  if (vehAgg) {
    const immatByVid = new Map();
    for (const d of vehDocs) {
      const dd = d.data() || {};
      if (dd.immatriculation) immatByVid.set(d.id, dd.immatriculation);
    }
    for (const doc of vehAgg.docs) {
      const vid = doc.data()?.vehiculeId;
      if (!vid) continue;
      const immat = immatByVid.get(vid) || vid;
      repartitionVehicules[immat] = (repartitionVehicules[immat] || 0) + 1;
    }
  }

  const repartitionConducteurs = {};
  const condAgg = await db
    .collection('packets')
    .limit(5000)
    .get()
    .catch(() => null);
  if (condAgg) {
    for (const doc of condAgg.docs) {
      const idCond = doc.data()?.idConducteur;
      if (!idCond) continue;
      repartitionConducteurs[String(idCond)] =
        (repartitionConducteurs[String(idCond)] || 0) + 1;
    }
  }

  const days = dayStringsLast7();
  const evolutionJournaliere = days.map((date) => ({ date, evenements: 0 }));
  const byDay = {};
  const evSnap = await db
    .collection('packets')
    .where('receivedAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .limit(8000)
    .get()
    .catch(() => null);

  if (evSnap) {
    for (const doc of evSnap.docs) {
      const rs = doc.data()?.receivedAt;
      let dt = null;
      if (rs && rs.toDate) dt = rs.toDate();
      else if (rs instanceof Date) dt = rs;
      if (!dt) continue;
      const key = dt.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + 1;
    }
  }
  for (const e of evolutionJournaliere) {
    if (byDay[e.date] != null) e.evenements = byDay[e.date];
  }

  return {
    totalVehicules: Number(totalVehicules) || 0,
    vehiculesActifs: Number(vehiculesActifs) || 0,
    alertesActives: Number(alertesActives) || 0,
    alertesModuleActives: Number(alertesModuleActives) || 0,
    totalPaquets: Number(totalPaquets) || 0,
    moyenneScoreGlobal,
    repartitionNiveaux,
    repartitionVehicules,
    repartitionConducteurs,
    evolutionJournaliere,
  };
}

function emptyRepartition() {
  return {
    NORMAL: 0,
    FATIGUE_LEGERE: 0,
    FATIGUE_MODEREE: 0,
    FATIGUE_SEVERE: 0,
    SOMNOLENCE_CRITIQUE: 0,
  };
}

/**
 * Stats pour un véhicule (doc id = UUID string).
 */
export async function getVehicleStatisticsSummaryFs(vehicleIdStr) {
  const db = getFirestore();
  const vRef = db.collection('vehicles').doc(String(vehicleIdStr));
  const vDoc = await vRef.get();
  if (!vDoc.exists) {
    const err = new Error('VEHICLE_NOT_FOUND');
    err.code = 'VEHICLE_NOT_FOUND';
    throw err;
  }
  const v = vDoc.data() || {};

  const pktSnap = await db
    .collection('packets')
    .where('vehiculeId', '==', String(vehicleIdStr))
    .orderBy('receivedAt', 'desc')
    .limit(100)
    .get()
    .catch(async () => {
      return await db
        .collection('packets')
        .where('vehiculeId', '==', String(vehicleIdStr))
        .limit(100)
        .get();
    });

  const fmtDc = (raw) => {
    const t = parseCommDate(raw);
    if (!t) return null;
    const p = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
  };

  const docs = pktSnap.docs;
  const totalPaquets = docs.length;
  const stats = {
    totalPaquets,
    derniereCommunication: fmtDc(v.derniereCommunication || v.lastUpdate),
    statut: v.statut ?? 'inconnu',
    isMonitored: v.isMonitored !== false,
  };

  if (totalPaquets === 0) return stats;

  const scores = [];
  const repartitionNiveaux = emptyRepartition();
  for (const doc of docs) {
    const p = doc.data() || {};
    if (p.scoreGlobal != null) scores.push(Number(p.scoreGlobal));
    const n = p.niveauVigilance;
    if (n && repartitionNiveaux[n] !== undefined) repartitionNiveaux[n] += 1;
  }

  if (scores.length) {
    stats.moyenneScore =
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    stats.maxScore = Math.max(...scores);
    stats.minScore = Math.min(...scores);
  }
  stats.repartitionNiveaux = repartitionNiveaux;
  return stats;
}
