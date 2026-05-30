import { getPool } from '../config/database.js';
import { bufferToUuid, uuidToBuffer } from '../utils/uuid.js';
import { niveauVigilanceToJson } from '../utils/niveauVigilance.js';
import { isSupervisorAuth } from './statisticsService.js';
import { getDataProvider } from '../data/provider.js';
import {
  listAlertes as listAlertesFs,
  acquitterAlerte as acquitterAlerteFs,
  resoudreAlerte as resoudreAlerteFs,
} from '../data/firestore/alerts.js';
import { dualWrite } from '../data/dualWrite.js';
import { readFromFirestore } from '../data/readFallback.js';

function formatDt(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  return String(v);
}

/**
 * Liste d'alertes (format proche Alerte::toArray() Symfony).
 */
export async function listAlertes(req, idVehiculeParam) {
  if (readFromFirestore()) {
    return listAlertesFs(req, idVehiculeParam, { isSupervisorAuth });
  }
  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  const auth = req.dashboardAuth;
  const idVehicule = idVehiculeParam;

  if (idVehicule === 'global' && !isSupervisorAuth(auth)) {
    const err = new Error('FORBIDDEN_GLOBAL_ALERTS');
    err.code = 'FORBIDDEN_GLOBAL_ALERTS';
    throw err;
  }

  let sql = `
    SELECT a.id, a.id_alerte, a.niveau, a.message, a.type, a.statut, a.horodatage,
           a.acquittee_at, a.resolue_at,
           v.id AS vid, v.immatriculation, v.type AS vtype,
           c.id AS cid, c.nom, c.numero_permis
    FROM alerte a
    INNER JOIN vehicule v ON a.vehicule_id = v.id
    INNER JOIN conducteur c ON a.conducteur_id = c.id
    WHERE a.statut = 'active'
  `;
  const params = [];

  if (!isSupervisorAuth(auth)) {
    if (auth.kind !== 'vehicle') {
      const err = new Error('FORBIDDEN');
      err.code = 'FORBIDDEN';
      throw err;
    }
    const myId = bufferToUuid(auth.vehicleId);
    if (idVehicule !== 'global' && idVehicule !== myId) {
      const err = new Error('FORBIDDEN');
      err.code = 'FORBIDDEN';
      throw err;
    }
    sql += ` AND a.vehicule_id = ?`;
    params.push(auth.vehicleId);
  }

  sql += ` ORDER BY a.horodatage DESC LIMIT 100`;

  const [rows] = await pool.query(sql, params);

  const alertes = rows.map((row) => ({
    id: bufferToUuid(row.id),
    idAlerte: row.id_alerte,
    conducteur: {
      id: bufferToUuid(row.cid),
      nom: row.nom,
      numeroPermis: row.numero_permis,
    },
    vehicule: {
      id: bufferToUuid(row.vid),
      immatriculation: row.immatriculation,
      type: row.vtype,
    },
    niveau: niveauVigilanceToJson(row.niveau),
    message: row.message,
    type: row.type,
    statut: row.statut,
    horodatage: formatDt(row.horodatage),
    acquitteeAt: row.acquittee_at ? formatDt(row.acquittee_at) : undefined,
    resolueAt: row.resolue_at ? formatDt(row.resolue_at) : undefined,
    estCritique: row.niveau === 'SOMNOLENCE_CRITIQUE',
  }));

  return { total: alertes.length, alertes };
}

const ALERTE_SELECT_FULL = `
  SELECT a.id, a.id_alerte, a.niveau, a.message, a.type, a.statut, a.horodatage,
         a.acquittee_at, a.resolue_at, a.acquittee_par, a.resolue_par,
         COALESCE(a.lue, 0) AS lue, COALESCE(a.envoyee, 0) AS envoyee,
         v.id AS vid, v.immatriculation, v.type AS vtype,
         c.id AS cid, c.nom, c.numero_permis
  FROM alerte a
  INNER JOIN vehicule v ON a.vehicule_id = v.id
  INNER JOIN conducteur c ON a.conducteur_id = c.id
`;

function mapAlerteRowFull(row) {
  if (!row) return null;
  return {
    id: bufferToUuid(row.id),
    idAlerte: row.id_alerte,
    conducteur: {
      id: bufferToUuid(row.cid),
      nom: row.nom,
      numeroPermis: row.numero_permis,
    },
    vehicule: {
      id: bufferToUuid(row.vid),
      immatriculation: row.immatriculation,
      type: row.vtype,
    },
    niveau: niveauVigilanceToJson(row.niveau),
    message: row.message,
    type: row.type,
    statut: row.statut,
    horodatage: formatDt(row.horodatage),
    acquitteeAt: row.acquittee_at ? formatDt(row.acquittee_at) : undefined,
    resolueAt: row.resolue_at ? formatDt(row.resolue_at) : undefined,
    acquitteePar: row.acquittee_par ?? undefined,
    resoluePar: row.resolue_par ?? undefined,
    envoyee: Boolean(row.envoyee),
    lue: Boolean(row.lue),
    estCritique: row.niveau === 'SOMNOLENCE_CRITIQUE',
  };
}

async function findAlerteFull(pool, idParam) {
  let idBuf = null;
  try {
    idBuf = uuidToBuffer(idParam);
  } catch {
    /* id_alerte ou autre */
  }
  if (idBuf) {
    const [rows] = await pool.query(`${ALERTE_SELECT_FULL} WHERE a.id = ?`, [
      idBuf,
    ]);
    if (rows[0]) return rows[0];
  }
  const [rows2] = await pool.query(
    `${ALERTE_SELECT_FULL} WHERE a.id_alerte = ?`,
    [idParam]
  );
  return rows2[0] || null;
}

/** Suffixe après le préfixe `superviseur-` (aligné sur Symfony : immatriculation du compte superviseur). */
async function getSupervisorSuffix(req) {
  const auth = req.dashboardAuth;
  if (auth.kind === 'supervisor_env') {
    return process.env.SUPERVISOR_LABEL || 'api';
  }
  if (auth.kind === 'vehicle' && auth.isSuperviseur) {
    const pool = getPool();
    if (!pool) throw new Error('NO_DATABASE');
    const [r] = await pool.query(
      `SELECT immatriculation FROM vehicule WHERE id = ? LIMIT 1`,
      [auth.vehicleId]
    );
    return r[0]?.immatriculation || 'api';
  }
  return null;
}

/**
 * POST /alerts/:id/acquitter — réservé au superviseur (Symfony).
 */
export async function acquitterAlerte(req, idParam) {
  if (getDataProvider() === 'firestore') {
    if (!isSupervisorAuth(req.dashboardAuth)) {
      const err = new Error('SUPERVISOR_ONLY');
      err.code = 'SUPERVISOR_ONLY';
      throw err;
    }
    await acquitterAlerteFs(idParam, {
      acquitteeAt: new Date(),
      acquitteePar: `superviseur-${(process.env.SUPERVISOR_LABEL || 'api')}`,
    });
    return { data: null, message: 'Alerte acquittée (Firestore)' };
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  if (!isSupervisorAuth(req.dashboardAuth)) {
    const err = new Error('SUPERVISOR_ONLY');
    err.code = 'SUPERVISOR_ONLY';
    throw err;
  }

  const row = await findAlerteFull(pool, idParam);
  if (!row) {
    const err = new Error('ALERTE_NOT_FOUND');
    err.code = 'ALERTE_NOT_FOUND';
    throw err;
  }

  const suffix = await getSupervisorSuffix(req);
  await pool.query(
    `UPDATE alerte SET acquittee_at = NOW(), acquittee_par = ?, lue = 1 WHERE id = ?`,
    [`superviseur-${suffix}`, row.id]
  );

  const updated = await findAlerteFull(pool, bufferToUuid(row.id));
  const out = {
    data: mapAlerteRowFull(updated),
    message: `Alerte acquittée avec succès par ${suffix}`,
  };
  return dualWrite(
    async () => out,
    async () =>
      acquitterAlerteFs(bufferToUuid(row.id), {
        acquitteeAt: new Date(),
        acquitteePar: `superviseur-${suffix}`,
      }),
    'dualWrite.alert.acquit',
    {
      enqueuePayload: () => ({
        alertId: bufferToUuid(row.id),
        acquitteeAt: new Date().toISOString(),
        acquitteePar: `superviseur-${suffix}`,
      }),
    }
  );
}

/**
 * POST /alerts/:id/resoudre — réservé au superviseur (Symfony).
 */
export async function resoudreAlerte(req, idParam) {
  if (getDataProvider() === 'firestore') {
    if (!isSupervisorAuth(req.dashboardAuth)) {
      const err = new Error('SUPERVISOR_ONLY');
      err.code = 'SUPERVISOR_ONLY';
      throw err;
    }
    await resoudreAlerteFs(idParam, {
      resolueAt: new Date(),
      resoluePar: `superviseur-${(process.env.SUPERVISOR_LABEL || 'api')}`,
    });
    return { data: null, message: 'Alerte résolue (Firestore)' };
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  if (!isSupervisorAuth(req.dashboardAuth)) {
    const err = new Error('SUPERVISOR_ONLY');
    err.code = 'SUPERVISOR_ONLY';
    throw err;
  }

  const row = await findAlerteFull(pool, idParam);
  if (!row) {
    const err = new Error('ALERTE_NOT_FOUND');
    err.code = 'ALERTE_NOT_FOUND';
    throw err;
  }

  const suffix = await getSupervisorSuffix(req);
  await pool.query(
    `UPDATE alerte SET statut = 'resolue', resolue_at = NOW(), resolue_par = ? WHERE id = ?`,
    [`superviseur-${suffix}`, row.id]
  );

  const updated = await findAlerteFull(pool, bufferToUuid(row.id));
  const out = {
    data: mapAlerteRowFull(updated),
    message: 'Alerte marquée comme résolue',
  };
  return dualWrite(
    async () => out,
    async () =>
      resoudreAlerteFs(bufferToUuid(row.id), {
        resolueAt: new Date(),
        resoluePar: `superviseur-${suffix}`,
      }),
    'dualWrite.alert.resolve',
    {
      enqueuePayload: () => ({
        alertId: bufferToUuid(row.id),
        resolueAt: new Date().toISOString(),
        resoluePar: `superviseur-${suffix}`,
      }),
    }
  );
}
