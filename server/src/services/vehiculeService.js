import { randomBytes, randomUUID } from 'crypto';
import { getPool } from '../config/database.js';
import { bufferToUuid, uuidToBuffer } from '../utils/uuid.js';
import { getDataProvider } from '../data/provider.js';
import {
  listVehicles as listVehiclesFs,
  listVehiclesForMap as listVehiclesForMapFs,
  upsertVehicle as upsertVehicleFs,
  deleteVehicle as deleteVehicleFs,
} from '../data/firestore/vehicles.js';
import { dualWrite } from '../data/dualWrite.js';
import { readFromFirestore } from '../data/readFallback.js';

function formatDateTime(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  return String(v);
}

function nowFormatted() {
  return formatDateTime(new Date());
}

/** Pire niveau parmi les alertes `active` (aligné sur `utils/niveauVigilance.js` / enum Symfony). */
const ACTIVE_ALERT_SEVERITY_TO_NIVEAU = {
  4: 'SOMNOLENCE_CRITIQUE',
  3: 'FATIGUE_SEVERE',
  2: 'FATIGUE_MODEREE',
  1: 'FATIGUE_LEGERE',
};

/** Position par défaut (Tunisie) si aucun paquet GPS — décalage stable par véhicule pour éviter le empilement. */
function positionFallbackFromVehicleId(idBuf) {
  const hex = Buffer.isBuffer(idBuf) ? idBuf.toString('hex') : String(idBuf);
  let h = 2166136261;
  for (let i = 0; i < hex.length; i++) {
    h ^= hex.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const dLat = ((u % 1000) / 1000) * 1.2 - 0.6;
  const dLon = (((u >> 10) % 1000) / 1000) * 1.2 - 0.6;
  return [33.8869 + dLat, 10.0984 + dLon];
}

export async function listVehicles() {
  if (readFromFirestore()) {
    return listVehiclesFs();
  }
  const pool = getPool();
  if (!pool) {
    throw new Error('NO_DATABASE');
  }

  const [rows] = await pool.query(`
    SELECT id, immatriculation, type, statut, is_monitored, is_active,
           derniere_communication, sfam_api_key
    FROM vehicule
    ORDER BY immatriculation ASC
  `);

  return rows.map((row) => mapVehicleRow(row));
}

function mapVehicleRow(row) {
  if (!row) return null;
  return {
    id: bufferToUuid(row.id),
    immatriculation: row.immatriculation,
    type: row.type,
    statut: row.statut,
    isMonitored: Boolean(row.is_monitored),
    isActive: Boolean(row.is_active),
    derniereCommunication: formatDateTime(row.derniere_communication) || '',
    sfamApiKey: row.sfam_api_key,
  };
}

const VEHICLE_SELECT =
  'SELECT id, immatriculation, type, statut, is_monitored, is_active, derniere_communication, sfam_api_key FROM vehicule';

/**
 * PUT /vehicles/:id — champs optionnels : immatriculation, type, statut, isMonitored, isActive
 */
export async function updateVehicle(idStr, data) {
  if (getDataProvider() === 'firestore') {
    // Minimal: Firestore-only update (no readback here). Keep MySQL as reference for full parity.
    await upsertVehicleFs({
      id: idStr,
      immatriculation: data.immatriculation,
      type: data.type,
      statut: data.statut,
      isMonitored: data.isMonitored,
      isActive: data.isActive,
    });
    return {
      id: idStr,
      immatriculation: data.immatriculation,
      type: data.type,
      statut: data.statut,
      isMonitored: Boolean(data.isMonitored),
      isActive: Boolean(data.isActive),
    };
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  let idBuf;
  try {
    idBuf = uuidToBuffer(idStr);
  } catch {
    const err = new Error('Identifiant invalide');
    err.code = 'INVALID_ID';
    throw err;
  }

  const [existing] = await pool.query(
    `${VEHICLE_SELECT} WHERE id = ? LIMIT 1`,
    [idBuf]
  );
  if (!existing.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const sets = [];
  const vals = [];
  if (data.immatriculation !== undefined) {
    sets.push('immatriculation = ?');
    vals.push(String(data.immatriculation).trim());
  }
  if (data.type !== undefined) {
    sets.push('type = ?');
    vals.push(String(data.type));
  }
  if (data.statut !== undefined) {
    sets.push('statut = ?');
    vals.push(String(data.statut));
  }
  if (data.isMonitored !== undefined) {
    sets.push('is_monitored = ?');
    vals.push(data.isMonitored ? 1 : 0);
  }
  if (data.isActive !== undefined) {
    sets.push('is_active = ?');
    vals.push(data.isActive ? 1 : 0);
  }

  if (sets.length) {
    vals.push(idBuf);
    try {
      await pool.query(`UPDATE vehicule SET ${sets.join(', ')} WHERE id = ?`, vals);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const e = new Error('Immatriculation ou clé déjà utilisée');
        e.code = 'DUPLICATE';
        throw e;
      }
      throw err;
    }
  }

  const [updated] = await pool.query(`${VEHICLE_SELECT} WHERE id = ? LIMIT 1`, [
    idBuf,
  ]);
  const out = mapVehicleRow(updated[0]);
  return dualWrite(
    async () => out,
    async (v) => {
      await upsertVehicleFs({
        id: v.id,
        immatriculation: v.immatriculation,
        type: v.type,
        statut: v.statut,
        isMonitored: v.isMonitored,
        isActive: v.isActive,
        derniereCommunication: v.derniereCommunication,
        sfamApiKey: v.sfamApiKey,
      });
    },
    'dualWrite.vehicle.update',
    {
      enqueuePayload: (v) => ({
        vehicle: {
          id: v.id,
          immatriculation: v.immatriculation,
          type: v.type,
          statut: v.statut,
          isMonitored: v.isMonitored,
          isActive: v.isActive,
          derniereCommunication: v.derniereCommunication,
          sfamApiKey: v.sfamApiKey,
        },
      }),
    }
  );
}

/**
 * POST /vehicles — création (Symfony : superviseur + clé API générée).
 */
export async function createVehicle(data) {
  if (getDataProvider() === 'firestore') {
    const idStr = randomUUID();
    const apiKey = `sfam_${randomBytes(8).toString('hex')}`;
    const isMonitored =
      data.isMonitored !== undefined ? Boolean(data.isMonitored) : true;
    const v = {
      id: idStr,
      immatriculation: String(data.immatriculation).trim(),
      type: String(data.type),
      statut: String(data.statut),
      isMonitored,
      isActive: true,
      sfamApiKey: apiKey,
    };
    await upsertVehicleFs(v);
    return {
      id: idStr,
      immatriculation: v.immatriculation,
      type: v.type,
      statut: v.statut,
      isMonitored: v.isMonitored,
      sfamApiKey: v.sfamApiKey,
    };
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  for (const f of ['immatriculation', 'type', 'statut']) {
    if (data[f] == null || String(data[f]).trim() === '') {
      const err = new Error(`Champ requis: ${f}`);
      err.code = 'VALIDATION';
      throw err;
    }
  }

  const idStr = randomUUID();
  const idBuf = uuidToBuffer(idStr);
  const apiKey = `sfam_${randomBytes(8).toString('hex')}`;
  const isMonitored = data.isMonitored !== undefined ? Boolean(data.isMonitored) : true;

  try {
    await pool.query(
      `INSERT INTO vehicule (id, immatriculation, type, statut, is_monitored, is_active, sfam_api_key, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, NOW())`,
      [
        idBuf,
        String(data.immatriculation).trim(),
        String(data.type),
        String(data.statut),
        isMonitored ? 1 : 0,
        apiKey,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const e = new Error('Immatriculation ou clé déjà utilisée');
      e.code = 'DUPLICATE';
      throw e;
    }
    throw err;
  }

  const out = {
    id: idStr,
    immatriculation: String(data.immatriculation).trim(),
    type: String(data.type),
    statut: String(data.statut),
    isMonitored,
    sfamApiKey: apiKey,
  };
  return dualWrite(
    async () => out,
    async (v) => {
      await upsertVehicleFs({
        id: v.id,
        immatriculation: v.immatriculation,
        type: v.type,
        statut: v.statut,
        isMonitored: v.isMonitored,
        isActive: true,
        sfamApiKey: v.sfamApiKey,
      });
    },
    'dualWrite.vehicle.create',
    {
      enqueuePayload: (v) => ({
        vehicle: {
          id: v.id,
          immatriculation: v.immatriculation,
          type: v.type,
          statut: v.statut,
          isMonitored: v.isMonitored,
          isActive: true,
          sfamApiKey: v.sfamApiKey,
        },
      }),
    }
  );
}

/**
 * DELETE /vehicles/:id — interdit si compte superviseur.
 */
export async function deleteVehicle(idStr) {
  if (getDataProvider() === 'firestore') {
    await deleteVehicleFs(idStr);
    return;
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  let idBuf;
  try {
    idBuf = uuidToBuffer(idStr);
  } catch {
    const err = new Error('Identifiant invalide');
    err.code = 'INVALID_ID';
    throw err;
  }

  let rows;
  try {
    const [r] = await pool.query(
      `SELECT id, COALESCE(is_superviseur, 0) AS is_sup FROM vehicule WHERE id = ? LIMIT 1`,
      [idBuf]
    );
    rows = r;
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054) {
      const [r] = await pool.query(
        `SELECT id, 0 AS is_sup FROM vehicule WHERE id = ? LIMIT 1`,
        [idBuf]
      );
      rows = r;
    } else {
      throw e;
    }
  }
  if (!rows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (rows[0].is_sup) {
    const err = new Error('Impossible de supprimer le superviseur');
    err.code = 'FORBIDDEN_DELETE_SUPERVISOR';
    throw err;
  }

  return dualWrite(
    async () => {
      await pool.query(`DELETE FROM vehicule WHERE id = ?`, [idBuf]);
      return { id: idStr };
    },
    async (ctx) => deleteVehicleFs(ctx.id),
    'dualWrite.vehicle.delete',
    { enqueuePayload: (ctx) => ({ id: ctx.id }) }
  );
}

export async function listVehiclesForMap(auth) {
  if (readFromFirestore()) {
    return listVehiclesForMapFs(auth);
  }
  const pool = getPool();
  if (!pool) {
    throw new Error('NO_DATABASE');
  }

  const [rows] = await pool.query(`
    SELECT v.id, v.immatriculation, v.type, v.statut, v.is_monitored, v.derniere_communication,
           lg.latitude, lg.longitude,
           p.niveau_vigilance,
           p.received_at, p.horodatage AS paquet_horodatage,
           aa.active_alert_severity
    FROM vehicule v
    LEFT JOIN paquet_donnees p ON p.id = (
      SELECT p2.id
      FROM paquet_donnees p2
      WHERE p2.vehicule_id = v.id
      ORDER BY COALESCE(p2.received_at, p2.horodatage) DESC
      LIMIT 1
    )
    LEFT JOIN localisation_gps lg ON lg.id = p.localisation_gps_id
    LEFT JOIN (
      SELECT vehicule_id,
        MAX(
          CASE niveau
            WHEN 'SOMNOLENCE_CRITIQUE' THEN 4
            WHEN 'FATIGUE_SEVERE' THEN 3
            WHEN 'FATIGUE_MODEREE' THEN 2
            WHEN 'FATIGUE_LEGERE' THEN 1
            ELSE 0
          END
        ) AS active_alert_severity
      FROM alerte
      WHERE statut = 'active'
      GROUP BY vehicule_id
    ) aa ON aa.vehicule_id = v.id
    ORDER BY v.immatriculation ASC
  `);

  let filtered = rows;
  if (auth.kind === 'vehicle' && !auth.isSuperviseur) {
    const vid = bufferToUuid(auth.vehicleId);
    filtered = rows.filter((r) => bufferToUuid(r.id) === vid);
  }

  return filtered.map((v) => {
    const lat =
      v.latitude != null && v.latitude !== ''
        ? Number(v.latitude)
        : null;
    const lng =
      v.longitude != null && v.longitude !== ''
        ? Number(v.longitude)
        : null;
    const hasGps =
      lat != null &&
      lng != null &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng);

    const position = hasGps
      ? [lat, lng]
      : positionFallbackFromVehicleId(v.id);

    const lastRaw =
      v.received_at ?? v.paquet_horodatage ?? v.derniere_communication;
    const lastUpdate = lastRaw ? formatDateTime(lastRaw) : nowFormatted();

    const sev =
      v.active_alert_severity != null
        ? Number(v.active_alert_severity)
        : null;
    const niveau =
      sev != null &&
      sev > 0 &&
      ACTIVE_ALERT_SEVERITY_TO_NIVEAU[sev]
        ? ACTIVE_ALERT_SEVERITY_TO_NIVEAU[sev]
        : 'NORMAL';

    return {
      id: bufferToUuid(v.id),
      immatriculation: v.immatriculation,
      type: v.type,
      position,
      niveauVigilance: niveau,
      lastUpdate,
      isMonitored: Boolean(v.is_monitored),
      statut: v.statut,
    };
  });
}
