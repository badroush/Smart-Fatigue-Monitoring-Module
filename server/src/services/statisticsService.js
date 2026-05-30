import { getPool } from '../config/database.js';
import {
  getGlobalStatisticsFs,
  getVehicleStatisticsSummaryFs,
} from '../data/firestore/statistics.js';
import { bufferToUuid } from '../utils/uuid.js';
import { readFromFirestore } from '../data/readFallback.js';

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

/**
 * Statistiques globales (équivalent SfamDataController::getGlobalStatistics).
 */
export async function getGlobalStatistics() {
  if (readFromFirestore()) {
    return getGlobalStatisticsFs();
  }
  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  const [rVeh] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM vehicule WHERE is_monitored = 1`
  );
  const totalVehicules = Number(rVeh[0]?.cnt ?? 0);

  const [rAct] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM vehicule
     WHERE is_monitored = 1 AND derniere_communication >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
  );
  const vehiculesActifs = Number(rAct[0]?.cnt ?? 0);

  const [rAlt] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM alerte WHERE statut = 'active'`
  );
  const alertesActives = Number(rAlt[0]?.cnt ?? 0);

  let alertesModuleActives = 0;
  try {
    const [[r]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM alerte_module WHERE statut = 'active'`
    );
    alertesModuleActives = r?.cnt ?? 0;
  } catch {
    /* table absente */
  }

  const [rPk] = await pool.query(
    `SELECT COUNT(*) AS totalPaquets FROM paquet_donnees`
  );
  const totalPaquets = Number(rPk[0]?.totalPaquets ?? 0);

  const [avgRows] = await pool.query(
    `SELECT AVG(af.score_fatigue) AS m FROM paquet_donnees p
     INNER JOIN analyse_fatigue af ON p.analyse_fatigue_id = af.id`
  );
  const avgRow = avgRows[0];
  const moyenneScoreGlobal =
    avgRow?.m != null ? Math.round(Number(avgRow.m) * 100) / 100 : 0;

  const repartitionNiveaux = {
    NORMAL: 0,
    FATIGUE_LEGERE: 0,
    FATIGUE_MODEREE: 0,
    FATIGUE_SEVERE: 0,
    SOMNOLENCE_CRITIQUE: 0,
  };
  const [niveauRows] = await pool.query(
    `SELECT niveau_vigilance AS n, COUNT(*) AS c FROM paquet_donnees GROUP BY niveau_vigilance`
  );
  for (const row of niveauRows) {
    if (repartitionNiveaux[row.n] !== undefined) {
      repartitionNiveaux[row.n] = Number(row.c);
    }
  }

  const repartitionVehicules = {};
  const [vehRows] = await pool.query(
    `SELECT v.immatriculation AS immat, COUNT(p.id) AS c
     FROM paquet_donnees p
     INNER JOIN vehicule v ON p.vehicule_id = v.id
     GROUP BY v.id, v.immatriculation`
  );
  for (const row of vehRows) {
    repartitionVehicules[row.immat] = Number(row.c);
  }

  const repartitionConducteurs = {};
  const [condRows] = await pool.query(
    `SELECT id_conducteur AS permis, COUNT(*) AS c FROM paquet_donnees GROUP BY id_conducteur`
  );
  for (const row of condRows) {
    repartitionConducteurs[row.permis] = Number(row.c);
  }

  const days = dayStringsLast7();
  const evolutionJournaliere = days.map((date) => ({ date, evenements: 0 }));
  const [evRows] = await pool.query(
    `SELECT DATE(received_at) AS d, COUNT(*) AS c FROM paquet_donnees
     WHERE received_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(received_at)`
  );
  const byDay = {};
  for (const row of evRows) {
    const key =
      row.d instanceof Date
        ? row.d.toISOString().slice(0, 10)
        : String(row.d).slice(0, 10);
    byDay[key] = Number(row.c);
  }
  for (const e of evolutionJournaliere) {
    if (byDay[e.date] != null) e.evenements = byDay[e.date];
  }

  return {
    totalVehicules: Number(totalVehicules) || 0,
    vehiculesActifs: Number(vehiculesActifs) || 0,
    alertesActives: Number(alertesActives) || 0,
    alertesModuleActives,
    totalPaquets: Number(totalPaquets) || 0,
    moyenneScoreGlobal,
    repartitionNiveaux,
    repartitionVehicules,
    repartitionConducteurs,
    evolutionJournaliere,
  };
}

/**
 * Résumé pour GET /statistics (cartes du dashboard App.tsx).
 */
export async function getStatisticsSummary() {
  const g = await getGlobalStatistics();
  return {
    totalPaquets: g.totalPaquets,
    moyenneScore: g.moyenneScoreGlobal,
    repartitionNiveaux: g.repartitionNiveaux,
    derniereCommunication: null,
    statut: 'ok',
    isMonitored: true,
    maxScore: undefined,
    minScore: undefined,
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
 * Statistiques pour un seul véhicule (équivalent getStatistics Symfony).
 */
export async function getVehicleStatisticsSummary(vehicleIdBuf) {
  if (readFromFirestore()) {
    const idStr = Buffer.isBuffer(vehicleIdBuf)
      ? bufferToUuid(vehicleIdBuf)
      : String(vehicleIdBuf);
    return getVehicleStatisticsSummaryFs(idStr);
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  const [vRows] = await pool.query(
    `SELECT derniere_communication, statut, COALESCE(is_monitored, 1) AS is_monitored
     FROM vehicule WHERE id = ? LIMIT 1`,
    [vehicleIdBuf]
  );
  const v = vRows[0];
  if (!v) {
    const err = new Error('VEHICLE_NOT_FOUND');
    err.code = 'VEHICLE_NOT_FOUND';
    throw err;
  }

  const fmtDc = (d) => {
    if (d == null) return null;
    if (d instanceof Date) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
    return String(d);
  };

  const [rows] = await pool.query(
    `SELECT af.score_fatigue AS s, p.niveau_vigilance AS n
     FROM paquet_donnees p
     INNER JOIN analyse_fatigue af ON p.analyse_fatigue_id = af.id
     WHERE p.vehicule_id = ?
     ORDER BY p.received_at DESC
     LIMIT 100`,
    [vehicleIdBuf]
  );

  const totalPaquets = rows.length;
  const stats = {
    totalPaquets,
    derniereCommunication: fmtDc(v.derniere_communication),
    statut: v.statut ?? 'inconnu',
    isMonitored: Boolean(v.is_monitored),
  };

  if (totalPaquets === 0) {
    return stats;
  }

  const scores = rows.map((r) => Number(r.s));
  const repartitionNiveaux = emptyRepartition();
  for (const r of rows) {
    if (repartitionNiveaux[r.n] !== undefined) {
      repartitionNiveaux[r.n] += 1;
    }
  }

  stats.moyenneScore =
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
    100;
  stats.maxScore = Math.max(...scores);
  stats.minScore = Math.min(...scores);
  stats.repartitionNiveaux = repartitionNiveaux;
  return stats;
}

/** Accès messagerie alertes globales : admin JWT, superviseur JWT, clé siège, compte véhicule superviseur. */
export function isSupervisorAuth(auth) {
  if (!auth) return false;
  if (auth.kind === 'user' && (auth.role === 'admin' || auth.role === 'superviseur')) {
    return true;
  }
  if (auth.kind === 'supervisor_env') return true;
  if (auth.kind === 'vehicle' && auth.isSuperviseur) return true;
  return false;
}

/** Rôle siège uniquement : tout sauf la gestion alertes pour le compte « superviseur » JWT. */
export function isSuperviseurDashboardOnly(auth) {
  return Boolean(auth?.kind === 'user' && auth.role === 'superviseur');
}

/** Administration : clé API siège env ou utilisateur JWT admin (pas le compte superviseur opérateur). */
export function isAdminAuth(auth) {
  if (!auth) return false;
  if (auth.kind === 'supervisor_env') return true;
  if (auth.kind === 'user' && auth.role === 'admin') return true;
  return false;
}

/**
 * GET /statistics : agrégat global (admin / clé siège / véhicule superviseur) ou véhicule standard.
 */
export async function getStatisticsSummaryForAuth(auth) {
  if (isSuperviseurDashboardOnly(auth)) {
    const err = new Error('Statistiques réservées à l’administrateur');
    err.code = 'FORBIDDEN';
    throw err;
  }
  if (
    isAdminAuth(auth) ||
    (auth.kind === 'vehicle' && auth.isSuperviseur)
  ) {
    return getStatisticsSummary();
  }
  if (auth.kind === 'vehicle') {
    return getVehicleStatisticsSummary(auth.vehicleId);
  }
  const err = new Error('FORBIDDEN');
  err.code = 'FORBIDDEN';
  throw err;
}
