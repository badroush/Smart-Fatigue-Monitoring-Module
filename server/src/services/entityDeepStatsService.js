import { getPool } from '../config/database.js';
import { bufferToUuid, uuidToBuffer } from '../utils/uuid.js';
import { readFromFirestore } from '../data/readFallback.js';
import {
  getVehicleDeepStatsFs,
  getDriverDeepStatsFs,
} from '../data/firestore/entityDeepStats.js';

function emptyNiveauRepartition() {
  return {
    NORMAL: 0,
    FATIGUE_LEGERE: 0,
    FATIGUE_MODEREE: 0,
    FATIGUE_SEVERE: 0,
    SOMNOLENCE_CRITIQUE: 0,
  };
}

function lastNDaysLabels(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Agrégations MySQL pour un véhicule (lecture siège).
 */
export async function getVehicleDeepStatsMysql(vehicleIdStr) {
  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  let idBuf;
  try {
    idBuf = uuidToBuffer(String(vehicleIdStr));
  } catch {
    const err = new Error('Identifiant véhicule invalide');
    err.code = 'INVALID_ID';
    throw err;
  }

  const [[vRows]] = await pool.query(`SELECT * FROM vehicule WHERE id = ? LIMIT 1`, [
    idBuf,
  ]);
  if (!vRows.length) {
    const err = new Error('Véhicule introuvable');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const v = vRows[0];
  const vehicleRecord = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === 'sfam_api_key' && val) {
      vehicleRecord[k] = '***' + String(val).slice(-6);
    } else if (Buffer.isBuffer(val)) {
      vehicleRecord[k] = bufferToUuid(val);
    } else if (val instanceof Date) {
      vehicleRecord[k] = val.toISOString();
    } else {
      vehicleRecord[k] = val;
    }
  }

  const [[{ cnt: packetsTotal }]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM paquet_donnees WHERE vehicule_id = ?`,
    [idBuf]
  );

  const [nivRows] = await pool.query(
    `SELECT niveau_vigilance AS n, COUNT(*) AS c FROM paquet_donnees WHERE vehicule_id = ? GROUP BY niveau_vigilance`,
    [idBuf]
  );
  const repartitionNiveaux = emptyNiveauRepartition();
  for (const r of nivRows) {
    if (r.n && repartitionNiveaux[r.n] !== undefined) {
      repartitionNiveaux[r.n] = Number(r.c);
    }
  }

  const [scoreRow] = await pool.query(
    `SELECT MIN(af.score_fatigue) AS mn, MAX(af.score_fatigue) AS mx, AVG(af.score_fatigue) AS av
     FROM paquet_donnees p
     INNER JOIN analyse_fatigue af ON p.analyse_fatigue_id = af.id
     WHERE p.vehicule_id = ?`,
    [idBuf]
  );
  const sc = scoreRow[0] || {};

  const [dayRows] = await pool.query(
    `SELECT DATE(received_at) AS d, COUNT(*) AS c FROM paquet_donnees
     WHERE vehicule_id = ? AND received_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(received_at) ORDER BY d ASC`,
    [idBuf]
  );
  const dayMap = {};
  for (const r of dayRows) {
    const key =
      r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
    dayMap[key] = Number(r.c);
  }
  const packetsPerDay = lastNDaysLabels(14).map((date) => ({
    date,
    count: dayMap[date] || 0,
  }));

  const [alertStatRows] = await pool.query(
    `SELECT statut, COUNT(*) AS c FROM alerte WHERE vehicule_id = ? GROUP BY statut`,
    [idBuf]
  );
  const alertsByStatut = {};
  for (const r of alertStatRows) {
    alertsByStatut[r.statut] = Number(r.c);
  }

  const [alertNivRows] = await pool.query(
    `SELECT niveau, COUNT(*) AS c FROM alerte WHERE vehicule_id = ? GROUP BY niveau`,
    [idBuf]
  );
  const alertsByNiveau = {};
  for (const r of alertNivRows) {
    alertsByNiveau[String(r.niveau)] = Number(r.c);
  }

  const [recentAlerts] = await pool.query(
    `SELECT id, statut, niveau, type, message, horodatage FROM alerte WHERE vehicule_id = ?
     ORDER BY horodatage DESC LIMIT 40`,
    [idBuf]
  );

  let moduleAlerts = { byStatut: {}, items: [] };
  try {
    const [modStat] = await pool.query(
      `SELECT statut, COUNT(*) AS c FROM alerte_module WHERE vehicule_id = ? GROUP BY statut`,
      [idBuf]
    );
    for (const r of modStat) {
      moduleAlerts.byStatut[r.statut] = Number(r.c);
    }
    const [modList] = await pool.query(
      `SELECT id, type, statut, message, horodatage FROM alerte_module WHERE vehicule_id = ?
       ORDER BY horodatage DESC LIMIT 40`,
      [idBuf]
    );
    moduleAlerts.items = modList.map((row) => ({
      ...row,
      horodatage: row.horodatage instanceof Date ? row.horodatage.toISOString() : row.horodatage,
    }));
  } catch {
    /* table absente */
  }

  const [[fleetAvg]] = await pool.query(
    `SELECT AVG(af.score_fatigue) AS m FROM paquet_donnees p
     INNER JOIN analyse_fatigue af ON p.analyse_fatigue_id = af.id`
  );

  return {
    source: 'mysql',
    entity: 'vehicle',
    id: vehicleIdStr,
    vehicleRecord,
    counts: {
      packetsTotalEstimate: Number(packetsTotal),
      alertsTotalEstimate: Object.values(alertsByStatut).reduce((a, b) => a + b, 0),
      moduleAlertsInSample: moduleAlerts.items.length,
    },
    packets: {
      repartitionNiveaux,
      scores: {
        min: sc.mn != null ? Number(sc.mn) : null,
        max: sc.mx != null ? Number(sc.mx) : null,
        avg:
          sc.av != null
            ? Math.round(Number(sc.av) * 100) / 100
            : null,
        median: null,
        sampleSize: Number(packetsTotal),
      },
      packetsPerDay,
    },
    alerts: {
      byStatut: alertsByStatut,
      byNiveau: alertsByNiveau,
      recent: recentAlerts.map((r) => ({
        ...r,
        id: bufferToUuid(r.id),
        horodatage:
          r.horodatage instanceof Date ? r.horodatage.toISOString() : r.horodatage,
      })),
    },
    moduleAlerts,
    comparisons:
      fleetAvg?.m != null && sc.av != null
        ? {
            fleetMoyenneScoreGlobal: Math.round(Number(fleetAvg.m) * 100) / 100,
            ecartScoreVsFlotte:
              Math.round(
                (Number(sc.av) - Number(fleetAvg.m)) * 100
              ) / 100,
          }
        : null,
  };
}

export async function getDriverDeepStatsMysql(driverIdStr) {
  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  let idBuf;
  try {
    idBuf = uuidToBuffer(String(driverIdStr));
  } catch {
    const err = new Error('Identifiant conducteur invalide');
    err.code = 'INVALID_ID';
    throw err;
  }

  const [[dRows]] = await pool.query(`SELECT * FROM conducteur WHERE id = ? LIMIT 1`, [
    idBuf,
  ]);
  if (!dRows.length) {
    const err = new Error('Conducteur introuvable');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const raw = dRows[0];
  const driverRecord = {};
  for (const [k, val] of Object.entries(raw)) {
    if (Buffer.isBuffer(val)) {
      driverRecord[k] = bufferToUuid(val);
    } else if (val instanceof Date) {
      driverRecord[k] = val.toISOString().slice(0, 10);
    } else {
      driverRecord[k] = val;
    }
  }

  const [[{ cnt: packetsTotal }]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM paquet_donnees WHERE conducteur_id = ?`,
    [idBuf]
  );

  const [nivRows] = await pool.query(
    `SELECT niveau_vigilance AS n, COUNT(*) AS c FROM paquet_donnees WHERE conducteur_id = ? GROUP BY niveau_vigilance`,
    [idBuf]
  );
  const repartitionNiveaux = emptyNiveauRepartition();
  for (const r of nivRows) {
    if (r.n && repartitionNiveaux[r.n] !== undefined) {
      repartitionNiveaux[r.n] = Number(r.c);
    }
  }

  const [scoreRow] = await pool.query(
    `SELECT MIN(af.score_fatigue) AS mn, MAX(af.score_fatigue) AS mx, AVG(af.score_fatigue) AS av
     FROM paquet_donnees p
     INNER JOIN analyse_fatigue af ON p.analyse_fatigue_id = af.id
     WHERE p.conducteur_id = ?`,
    [idBuf]
  );
  const sc = scoreRow[0] || {};

  const [dayRows] = await pool.query(
    `SELECT DATE(received_at) AS d, COUNT(*) AS c FROM paquet_donnees
     WHERE conducteur_id = ? AND received_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(received_at) ORDER BY d ASC`,
    [idBuf]
  );
  const dayMap = {};
  for (const r of dayRows) {
    const key =
      r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
    dayMap[key] = Number(r.c);
  }
  const packetsPerDay = lastNDaysLabels(14).map((date) => ({
    date,
    count: dayMap[date] || 0,
  }));

  const [alertStatRows] = await pool.query(
    `SELECT statut, COUNT(*) AS c FROM alerte WHERE conducteur_id = ? GROUP BY statut`,
    [idBuf]
  );
  const alertsByStatut = {};
  for (const r of alertStatRows) {
    alertsByStatut[r.statut] = Number(r.c);
  }

  const [alertNivRows] = await pool.query(
    `SELECT niveau, COUNT(*) AS c FROM alerte WHERE conducteur_id = ? GROUP BY niveau`,
    [idBuf]
  );
  const alertsByNiveau = {};
  for (const r of alertNivRows) {
    alertsByNiveau[String(r.niveau)] = Number(r.c);
  }

  const [recentAlerts] = await pool.query(
    `SELECT id, statut, niveau, type, message, horodatage, vehicule_id FROM alerte WHERE conducteur_id = ?
     ORDER BY horodatage DESC LIMIT 40`,
    [idBuf]
  );

  const [[fleetAvg]] = await pool.query(
    `SELECT AVG(af.score_fatigue) AS m FROM paquet_donnees p
     INNER JOIN analyse_fatigue af ON p.analyse_fatigue_id = af.id`
  );

  return {
    source: 'mysql',
    entity: 'driver',
    id: driverIdStr,
    driverRecord,
    counts: {
      packetsTotalEstimate: Number(packetsTotal),
      alertsTotalEstimate: Object.values(alertsByStatut).reduce((a, b) => a + b, 0),
    },
    packets: {
      repartitionNiveaux,
      scores: {
        min: sc.mn != null ? Number(sc.mn) : null,
        max: sc.mx != null ? Number(sc.mx) : null,
        avg:
          sc.av != null
            ? Math.round(Number(sc.av) * 100) / 100
            : null,
        median: null,
        sampleSize: Number(packetsTotal),
      },
      packetsPerDay,
    },
    alerts: {
      byStatut: alertsByStatut,
      byNiveau: alertsByNiveau,
      recent: recentAlerts.map((r) => ({
        ...r,
        id: bufferToUuid(r.id),
        vehicule_id: r.vehicule_id ? bufferToUuid(r.vehicule_id) : null,
        horodatage:
          r.horodatage instanceof Date ? r.horodatage.toISOString() : r.horodatage,
      })),
    },
    comparisons:
      fleetAvg?.m != null && sc.av != null
        ? {
            fleetMoyenneScoreGlobal: Math.round(Number(fleetAvg.m) * 100) / 100,
            ecartScoreVsFlotte:
              Math.round(
                (Number(sc.av) - Number(fleetAvg.m)) * 100
              ) / 100,
          }
        : null,
  };
}

export async function getVehicleDeepStats(idStr) {
  if (readFromFirestore()) {
    return getVehicleDeepStatsFs(idStr);
  }
  return getVehicleDeepStatsMysql(idStr);
}

export async function getDriverDeepStats(idStr) {
  if (readFromFirestore()) {
    return getDriverDeepStatsFs(idStr);
  }
  return getDriverDeepStatsMysql(idStr);
}
