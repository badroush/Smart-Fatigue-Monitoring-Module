import { getFirestore } from '../../config/firebase.js';
import { getGlobalStatisticsFs } from './statistics.js';

function median(sortedNums) {
  if (!sortedNums.length) return null;
  const s = [...sortedNums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function dayKeyFromFirestoreTs(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function tsToIso(h) {
  if (h == null) return null;
  if (typeof h === 'object' && h.toDate) return h.toDate().toISOString();
  if (h instanceof Date) return h.toISOString();
  if (typeof h === 'string') return h;
  return String(h);
}

function lastNDaysKeys(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function emptyNiveauRepartition() {
  return {
    NORMAL: 0,
    FATIGUE_LEGERE: 0,
    FATIGUE_MODEREE: 0,
    FATIGUE_SEVERE: 0,
    SOMNOLENCE_CRITIQUE: 0,
  };
}

async function safeCount(db, coll, field, value) {
  try {
    const snap = await db.collection(coll).where(field, '==', value).count().get();
    return snap.data().count;
  } catch {
    const s = await db.collection(coll).where(field, '==', value).limit(25000).get();
    return s.size;
  }
}

/**
 * Statistiques exhaustives (Firestore) pour un véhicule.
 */
export async function getVehicleDeepStatsFs(vehicleIdStr) {
  const vid = String(vehicleIdStr);
  const db = getFirestore();

  const vRef = db.collection('vehicles').doc(vid);
  const vDoc = await vRef.get();
  if (!vDoc.exists) {
    const err = new Error('Véhicule introuvable');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const vehicleData = vDoc.data() || {};

  const [
    pktSnap,
    alertSnap,
    modSnap,
    gpsSnap,
    sensSnap,
    afSnap,
    packetsTotal,
    alertsTotal,
    gpsTotal,
    sensTotal,
    afTotal,
    fleet,
  ] = await Promise.all([
    db
      .collection('packets')
      .where('vehiculeId', '==', vid)
      .orderBy('receivedAt', 'desc')
      .limit(3500)
      .get()
      .catch(() =>
        db.collection('packets').where('vehiculeId', '==', vid).limit(3500).get()
      ),
    db.collection('alerts').where('vehiculeId', '==', vid).limit(2000).get(),
    db.collection('moduleAlerts').where('vehiculeId', '==', vid).limit(500).get(),
    db.collection('gps').where('vehiculeId', '==', vid).limit(1500).get(),
    db.collection('sensors').where('vehiculeId', '==', vid).limit(1500).get(),
    db.collection('fatigueAnalyses').where('vehiculeId', '==', vid).limit(1500).get(),
    safeCount(db, 'packets', 'vehiculeId', vid),
    safeCount(db, 'alerts', 'vehiculeId', vid),
    safeCount(db, 'gps', 'vehiculeId', vid),
    safeCount(db, 'sensors', 'vehiculeId', vid),
    safeCount(db, 'fatigueAnalyses', 'vehiculeId', vid),
    getGlobalStatisticsFs().catch(() => null),
  ]);

  const pktDocs = pktSnap.docs;
  const truncatedPackets = pktDocs.length >= 3500;

  const scores = [];
  let alerteGeneree = 0;
  const repartitionNiveaux = emptyNiveauRepartition();
  const packetsPerDayMap = {};
  for (const dk of lastNDaysKeys(14)) packetsPerDayMap[dk] = 0;

  for (const d of pktDocs) {
    const p = d.data() || {};
    if (p.scoreGlobal != null && !Number.isNaN(Number(p.scoreGlobal))) {
      scores.push(Number(p.scoreGlobal));
    }
    if (p.alerteGeneree) alerteGeneree += 1;
    const n = p.niveauVigilance;
    if (n && repartitionNiveaux[n] !== undefined) repartitionNiveaux[n] += 1;
    const dk = dayKeyFromFirestoreTs(p.receivedAt);
    if (dk && packetsPerDayMap[dk] !== undefined) packetsPerDayMap[dk] += 1;
  }

  const packetsPerDay = lastNDaysKeys(14).map((date) => ({
    date,
    count: packetsPerDayMap[date] || 0,
  }));

  const alertsByStatut = {};
  const alertsByNiveau = {};
  const alertsList = [];
  for (const d of alertSnap.docs) {
    const a = d.data() || {};
    const st = a.statut || 'unknown';
    alertsByStatut[st] = (alertsByStatut[st] || 0) + 1;
    const nv = String(a.niveau || '');
    if (nv) alertsByNiveau[nv] = (alertsByNiveau[nv] || 0) + 1;
    alertsList.push({
      id: d.id,
      statut: st,
      niveau: nv,
      type: a.type,
      message: a.message ? String(a.message).slice(0, 120) : '',
      horodatage: tsToIso(a.horodatage),
    });
  }
  alertsList.sort((x, y) => String(y.horodatage || '').localeCompare(String(x.horodatage || '')));

  const modByStatut = {};
  const modList = [];
  for (const d of modSnap.docs) {
    const m = d.data() || {};
    const st = m.statut || 'unknown';
    modByStatut[st] = (modByStatut[st] || 0) + 1;
    modList.push({
      id: d.id,
      type: m.type,
      statut: st,
      message: m.message,
      horodatage: tsToIso(m.horodatage),
    });
  }

  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  const gpsAgg = { sumLat: 0, sumLng: 0, n: 0 };
  for (const d of gpsSnap.docs) {
    const g = d.data() || {};
    const lat = Number(g.latitude);
    const lng = Number(g.longitude);
    if (!Number.isNaN(lat)) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      gpsAgg.sumLat += lat;
      gpsAgg.n += 1;
    }
    if (!Number.isNaN(lng)) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      gpsAgg.sumLng += lng;
    }
  }

  const sensorTemps = [];
  const sensorHum = [];
  const sensorLum = [];
  const sensorBody = [];
  const sensorDuree = [];
  for (const d of sensSnap.docs) {
    const s = d.data() || {};
    if (s.temperatureAmbiante != null) sensorTemps.push(Number(s.temperatureAmbiante));
    if (s.humidite != null) sensorHum.push(Number(s.humidite));
    if (s.luminosite != null) sensorLum.push(Number(s.luminosite));
    if (s.temperatureCorporelle != null)
      sensorBody.push(Number(s.temperatureCorporelle));
    if (s.dureeConduite != null) sensorDuree.push(Number(s.dureeConduite));
  }

  const avg = (arr) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;

  const afScores = [];
  let yeuxFermesN = 0,
    baillementsN = 0,
    inclinaisonN = 0;
  for (const d of afSnap.docs) {
    const f = d.data() || {};
    if (f.scoreFatigue != null) afScores.push(Number(f.scoreFatigue));
    if (f.yeuxFermes) yeuxFermesN += 1;
    if (f.baillements) baillementsN += 1;
    if (f.inclinaisonTete) inclinaisonN += 1;
  }

  const conducteurIds = new Set();
  for (const d of pktDocs) {
    const cid = d.data()?.conducteurId;
    if (cid) conducteurIds.add(String(cid));
  }

  return {
    source: 'firestore',
    entity: 'vehicle',
    id: vid,
    vehicleRecord: {
      ...vehicleData,
      sfamApiKey: vehicleData.sfamApiKey ? '***' + String(vehicleData.sfamApiKey).slice(-6) : undefined,
    },
    counts: {
      packetsInSample: pktDocs.length,
      packetsTotalEstimate: packetsTotal,
      packetsTruncated: truncatedPackets,
      alertsTotalEstimate: alertsTotal,
      alertsInSample: alertSnap.size,
      moduleAlertsInSample: modSnap.size,
      gpsTotalEstimate: gpsTotal,
      gpsInSample: gpsSnap.size,
      sensorsTotalEstimate: sensTotal,
      sensorsInSample: sensSnap.size,
      fatigueAnalysesTotalEstimate: afTotal,
      fatigueAnalysesInSample: afSnap.size,
      distinctConducteursFromPackets: conducteurIds.size,
    },
    packets: {
      repartitionNiveaux,
      scores: {
        min: scores.length ? Math.min(...scores) : null,
        max: scores.length ? Math.max(...scores) : null,
        avg: scores.length
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : null,
        median: median(scores),
        sampleSize: scores.length,
      },
      paquetsAvecAlerteGeneree: alerteGeneree,
      packetsPerDay,
    },
    alerts: {
      byStatut: alertsByStatut,
      byNiveau: alertsByNiveau,
      recent: alertsList.slice(0, 40),
    },
    moduleAlerts: {
      byStatut: modByStatut,
      items: modList.slice(0, 40),
    },
    gps: {
      sampleSize: gpsSnap.size,
      bounds:
        gpsAgg.n > 0
          ? {
              minLat: minLat === Infinity ? null : minLat,
              maxLat: maxLat === -Infinity ? null : maxLat,
              minLng: minLng === Infinity ? null : minLng,
              maxLng: maxLng === -Infinity ? null : maxLng,
              centroidLat: gpsAgg.sumLat / gpsAgg.n,
              centroidLng: gpsAgg.sumLng / gpsAgg.n,
            }
          : null,
    },
    sensors: {
      sampleSize: sensSnap.size,
      temperatureAmbiante: {
        avg: avg(sensorTemps),
        min: sensorTemps.length ? Math.min(...sensorTemps) : null,
        max: sensorTemps.length ? Math.max(...sensorTemps) : null,
      },
      humidite: {
        avg: avg(sensorHum),
        min: sensorHum.length ? Math.min(...sensorHum) : null,
        max: sensorHum.length ? Math.max(...sensorHum) : null,
      },
      luminosite: {
        avg: avg(sensorLum),
        min: sensorLum.length ? Math.min(...sensorLum) : null,
        max: sensorLum.length ? Math.max(...sensorLum) : null,
      },
      temperatureCorporelle: {
        avg: avg(sensorBody),
        min: sensorBody.length ? Math.min(...sensorBody) : null,
        max: sensorBody.length ? Math.max(...sensorBody) : null,
      },
      dureeConduiteMinutes: {
        avg: avg(sensorDuree),
        min: sensorDuree.length ? Math.min(...sensorDuree) : null,
        max: sensorDuree.length ? Math.max(...sensorDuree) : null,
      },
    },
    fatigueAnalyses: {
      sampleSize: afSnap.size,
      scoreFatigue: {
        avg: avg(afScores),
        min: afScores.length ? Math.min(...afScores) : null,
        max: afScores.length ? Math.max(...afScores) : null,
      },
      detectionCounts: {
        yeuxFermes: yeuxFermesN,
        baillements: baillementsN,
        inclinaisonTete: inclinaisonN,
      },
    },
    comparisons: fleet
      ? {
          fleetMoyenneScoreGlobal: fleet.moyenneScoreGlobal ?? null,
          fleetTotalPaquets: fleet.totalPaquets ?? null,
          fleetTotalVehiculesSurveilles: fleet.totalVehicules ?? null,
          ecartScoreVsFlotte:
            scores.length && fleet.moyenneScoreGlobal != null
              ? Math.round(
                  (scores.reduce((a, b) => a + b, 0) / scores.length -
                    Number(fleet.moyenneScoreGlobal)) *
                    100
                ) / 100
              : null,
        }
      : null,
  };
}

/**
 * Statistiques exhaustives (Firestore) pour un conducteur.
 */
export async function getDriverDeepStatsFs(driverIdStr) {
  const did = String(driverIdStr);
  const db = getFirestore();

  const dRef = db.collection('drivers').doc(did);
  const dDoc = await dRef.get();
  if (!dDoc.exists) {
    const err = new Error('Conducteur introuvable');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const driverData = dDoc.data() || {};

  const [
    pktSnap,
    alertSnap,
    packetsTotal,
    alertsTotal,
    fleet,
  ] = await Promise.all([
    db
      .collection('packets')
      .where('conducteurId', '==', did)
      .orderBy('receivedAt', 'desc')
      .limit(3500)
      .get()
      .catch(() =>
        db.collection('packets').where('conducteurId', '==', did).limit(3500).get()
      ),
    db.collection('alerts').where('conducteurId', '==', did).limit(2000).get(),
    safeCount(db, 'packets', 'conducteurId', did),
    safeCount(db, 'alerts', 'conducteurId', did),
    getGlobalStatisticsFs().catch(() => null),
  ]);

  const pktDocs = pktSnap.docs;
  const truncatedPackets = pktDocs.length >= 3500;

  const scores = [];
  const repartitionNiveaux = emptyNiveauRepartition();
  const packetsPerDayMap = {};
  for (const dk of lastNDaysKeys(14)) packetsPerDayMap[dk] = 0;
  const vehiculeIds = new Set();

  for (const d of pktDocs) {
    const p = d.data() || {};
    if (p.scoreGlobal != null && !Number.isNaN(Number(p.scoreGlobal))) {
      scores.push(Number(p.scoreGlobal));
    }
    const n = p.niveauVigilance;
    if (n && repartitionNiveaux[n] !== undefined) repartitionNiveaux[n] += 1;
    const dk = dayKeyFromFirestoreTs(p.receivedAt);
    if (dk && packetsPerDayMap[dk] !== undefined) packetsPerDayMap[dk] += 1;
    const vid = p.vehiculeId;
    if (vid) vehiculeIds.add(String(vid));
  }

  const packetsPerDay = lastNDaysKeys(14).map((date) => ({
    date,
    count: packetsPerDayMap[date] || 0,
  }));

  const alertsByStatut = {};
  const alertsByNiveau = {};
  const alertsList = [];
  for (const d of alertSnap.docs) {
    const a = d.data() || {};
    const st = a.statut || 'unknown';
    alertsByStatut[st] = (alertsByStatut[st] || 0) + 1;
    const nv = String(a.niveau || '');
    if (nv) alertsByNiveau[nv] = (alertsByNiveau[nv] || 0) + 1;
    alertsList.push({
      id: d.id,
      statut: st,
      niveau: nv,
      type: a.type,
      message: a.message ? String(a.message).slice(0, 120) : '',
      horodatage: tsToIso(a.horodatage),
      vehiculeId: a.vehiculeId,
    });
  }
  alertsList.sort((x, y) => String(y.horodatage || '').localeCompare(String(x.horodatage || '')));

  return {
    source: 'firestore',
    entity: 'driver',
    id: did,
    driverRecord: { ...driverData },
    counts: {
      packetsInSample: pktDocs.length,
      packetsTotalEstimate: packetsTotal,
      packetsTruncated: truncatedPackets,
      alertsTotalEstimate: alertsTotal,
      alertsInSample: alertSnap.size,
      vehiculesDistinctsFromPackets: vehiculeIds.size,
      vehiculeIdsSample: [...vehiculeIds].slice(0, 15),
    },
    packets: {
      repartitionNiveaux,
      scores: {
        min: scores.length ? Math.min(...scores) : null,
        max: scores.length ? Math.max(...scores) : null,
        avg: scores.length
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : null,
        median: median(scores),
        sampleSize: scores.length,
      },
      packetsPerDay,
    },
    alerts: {
      byStatut: alertsByStatut,
      byNiveau: alertsByNiveau,
      recent: alertsList.slice(0, 40),
    },
    comparisons: fleet
      ? {
          fleetMoyenneScoreGlobal: fleet.moyenneScoreGlobal ?? null,
          fleetTotalPaquets: fleet.totalPaquets ?? null,
          ecartScoreVsFlotte:
            scores.length && fleet.moyenneScoreGlobal != null
              ? Math.round(
                  (scores.reduce((a, b) => a + b, 0) / scores.length -
                    Number(fleet.moyenneScoreGlobal)) *
                    100
                ) / 100
              : null,
        }
      : null,
  };
}
