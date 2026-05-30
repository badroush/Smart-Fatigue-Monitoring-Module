import { randomUUID } from 'crypto';
import { getPool } from '../config/database.js';
import { bufferToUuid, uuidToBuffer } from '../utils/uuid.js';
import { getDataProvider } from '../data/provider.js';
import { dualWrite } from '../data/dualWrite.js';
import { upsertDriver, deleteDriver } from '../data/firestore/drivers.js';
import {
  listConducteursFs,
  getConducteurStatisticsFs,
} from '../data/firestore/conducteurs.js';
import { readFromFirestore } from '../data/readFallback.js';

function fmtDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10);
  }
  return null;
}

function fmtDt(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  return String(v);
}

function mapConducteurRow(row, extra = {}) {
  if (!row) return null;
  return {
    id: bufferToUuid(row.id),
    nom: row.nom,
    numeroPermis: row.numero_permis,
    telephone: row.telephone ?? undefined,
    dateNaissance: row.date_naissance ? fmtDate(row.date_naissance) : undefined,
    adresse: row.adresse ?? undefined,
    isActive: Boolean(row.is_active),
    totalAlertes: Number(row.total_alertes ?? 0),
    totalEvenementsFatigue: Number(row.total_evenements_fatigue ?? 0),
    createdAt: fmtDt(row.created_at),
    lastFatigueEventAt: row.last_fatigue_event_at
      ? fmtDt(row.last_fatigue_event_at)
      : undefined,
    vehiculeAssigneId: row.vehicule_assigne_id
      ? bufferToUuid(row.vehicule_assigne_id)
      : undefined,
    vehiculeImmatriculation: row.vehicule_immatriculation ?? undefined,
    nbAlertesReelles: extra.nbAlertesReelles,
    nbPaquets: extra.nbPaquets,
  };
}

const SELECT_BASE = `
  SELECT c.id, c.nom, c.numero_permis, c.telephone, c.date_naissance, c.adresse, c.is_active,
         c.total_alertes, c.total_evenements_fatigue, c.created_at, c.last_fatigue_event_at,
         c.vehicule_assigne_id,
         v.immatriculation AS vehicule_immatriculation,
         (SELECT COUNT(*) FROM alerte a WHERE a.conducteur_id = c.id) AS nb_alertes_reelles,
         (SELECT COUNT(*) FROM paquet_donnees p WHERE p.conducteur_id = c.id) AS nb_paquets
  FROM conducteur c
  LEFT JOIN vehicule v ON c.vehicule_assigne_id = v.id
`;

export async function listConducteurs() {
  if (readFromFirestore()) {
    return listConducteursFs();
  }
  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  const [rows] = await pool.query(
    `${SELECT_BASE} ORDER BY c.nom ASC`
  );

  return rows.map((row) =>
    mapConducteurRow(row, {
      nbAlertesReelles: Number(row.nb_alertes_reelles ?? 0),
      nbPaquets: Number(row.nb_paquets ?? 0),
    })
  );
}

/**
 * Statistiques agrégées pour le tableau de bord conducteurs.
 */
export async function getConducteurStatistics() {
  if (readFromFirestore()) {
    return getConducteurStatisticsFs();
  }
  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  const [[totals]] = await pool.query(`
    SELECT
      COUNT(*) AS total_conducteurs,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS actifs,
      SUM(CASE WHEN vehicule_assigne_id IS NOT NULL THEN 1 ELSE 0 END) AS avec_vehicule
    FROM conducteur
  `);

  const [[alertes]] = await pool.query(`
    SELECT COUNT(*) AS n FROM alerte a
    INNER JOIN conducteur c ON a.conducteur_id = c.id
  `);

  const [[paquets]] = await pool.query(`
    SELECT COUNT(*) AS n FROM paquet_donnees WHERE conducteur_id IS NOT NULL
  `);

  const [topAlertes] = await pool.query(`
    SELECT c.id, c.nom, c.numero_permis, COUNT(a.id) AS nb
    FROM conducteur c
    INNER JOIN alerte a ON a.conducteur_id = c.id
    GROUP BY c.id, c.nom, c.numero_permis
    ORDER BY nb DESC
    LIMIT 5
  `);

  return {
    totalConducteurs: Number(totals.total_conducteurs ?? 0),
    conducteursActifs: Number(totals.actifs ?? 0),
    avecVehiculeAssigne: Number(totals.avec_vehicule ?? 0),
    totalAlertesLiees: Number(alertes.n ?? 0),
    totalPaquetsLiees: Number(paquets.n ?? 0),
    topParAlertes: topAlertes.map((r) => ({
      id: bufferToUuid(r.id),
      nom: r.nom,
      numeroPermis: r.numero_permis,
      nombreAlertes: Number(r.nb),
    })),
  };
}

export async function createConducteur(data) {
  if (getDataProvider() === 'firestore') {
    const idStr = randomUUID();
    const driver = {
      id: idStr,
      nom: String(data.nom).trim(),
      numeroPermis: String(data.numeroPermis).trim(),
      telephone: data.telephone != null ? String(data.telephone).trim() : undefined,
      adresse: data.adresse != null ? String(data.adresse).trim() : undefined,
      dateNaissance: data.dateNaissance ? fmtDate(data.dateNaissance) : undefined,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      totalAlertes: 0,
      totalEvenementsFatigue: 0,
      createdAt: fmtDt(new Date()),
      lastFatigueEventAt: undefined,
      vehiculeAssigneId: data.vehiculeAssigneId ? String(data.vehiculeAssigneId) : undefined,
      rfidUid:
        data.rfidUid != null && String(data.rfidUid).trim()
          ? String(data.rfidUid).trim().toUpperCase()
          : undefined,
    };
    await upsertDriver(driver);
    return driver;
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  const nom = data.nom != null ? String(data.nom).trim() : '';
  const numeroPermis =
    data.numeroPermis != null ? String(data.numeroPermis).trim() : '';
  if (!nom || nom.length < 2) {
    const e = new Error('Le nom est obligatoire (2 caractères min.)');
    e.code = 'VALIDATION';
    throw e;
  }
  if (!numeroPermis || numeroPermis.length < 5) {
    const e = new Error('Le numéro de permis est obligatoire');
    e.code = 'VALIDATION';
    throw e;
  }

  const idStr = randomUUID();
  const idBuf = uuidToBuffer(idStr);
  const telephone = data.telephone != null ? String(data.telephone).trim() : null;
  const adresse = data.adresse != null ? String(data.adresse).trim() : null;
  const dateNaissance = data.dateNaissance
    ? fmtDate(data.dateNaissance)
    : null;
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

  let vehiculeBuf = null;
  if (data.vehiculeAssigneId) {
    try {
      vehiculeBuf = uuidToBuffer(String(data.vehiculeAssigneId));
    } catch {
      const e = new Error('Identifiant véhicule invalide');
      e.code = 'VALIDATION';
      throw e;
    }
  }

  try {
    await pool.query(
      `INSERT INTO conducteur (id, nom, numero_permis, telephone, date_naissance, adresse, is_active,
        total_alertes, total_evenements_fatigue, created_at, last_fatigue_event_at, vehicule_assigne_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NULL, ?)`,
      [
        idBuf,
        nom,
        numeroPermis,
        telephone,
        dateNaissance,
        adresse,
        isActive ? 1 : 0,
        vehiculeBuf,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const e = new Error('Ce numéro de permis existe déjà');
      e.code = 'DUPLICATE';
      throw e;
    }
    throw err;
  }

  const [rows] = await pool.query(`${SELECT_BASE} WHERE c.id = ?`, [idBuf]);
  const out = mapConducteurRow(rows[0], {
    nbAlertesReelles: Number(rows[0]?.nb_alertes_reelles ?? 0),
    nbPaquets: Number(rows[0]?.nb_paquets ?? 0),
  });
  return dualWrite(
    async () => out,
    async (d) => upsertDriver(d),
    'dualWrite.driver.create',
    { enqueuePayload: (d) => ({ driver: d }) }
  );
}

export async function updateConducteur(idStr, data) {
  if (getDataProvider() === 'firestore') {
    await upsertDriver({
      id: idStr,
      nom: data.nom !== undefined ? String(data.nom).trim() : undefined,
      numeroPermis:
        data.numeroPermis !== undefined ? String(data.numeroPermis).trim() : undefined,
      telephone:
        data.telephone !== undefined
          ? data.telephone
            ? String(data.telephone).trim()
            : null
          : undefined,
      dateNaissance:
        data.dateNaissance !== undefined ? (data.dateNaissance ? fmtDate(data.dateNaissance) : null) : undefined,
      adresse:
        data.adresse !== undefined ? (data.adresse ? String(data.adresse).trim() : null) : undefined,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      vehiculeAssigneId:
        data.vehiculeAssigneId !== undefined
          ? data.vehiculeAssigneId === null || data.vehiculeAssigneId === ''
            ? null
            : String(data.vehiculeAssigneId)
          : undefined,
      rfidUid:
        data.rfidUid !== undefined
          ? data.rfidUid === null || data.rfidUid === ''
            ? null
            : String(data.rfidUid).trim().toUpperCase()
          : undefined,
    });
    return { id: idStr, ...data };
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  let idBuf;
  try {
    idBuf = uuidToBuffer(idStr);
  } catch {
    const e = new Error('Identifiant invalide');
    e.code = 'INVALID_ID';
    throw e;
  }

  const [existing] = await pool.query(`${SELECT_BASE} WHERE c.id = ?`, [idBuf]);
  if (!existing.length) {
    const e = new Error('NOT_FOUND');
    e.code = 'NOT_FOUND';
    throw e;
  }

  const sets = [];
  const vals = [];

  if (data.nom !== undefined) {
    sets.push('nom = ?');
    vals.push(String(data.nom).trim());
  }
  if (data.numeroPermis !== undefined) {
    sets.push('numero_permis = ?');
    vals.push(String(data.numeroPermis).trim());
  }
  if (data.telephone !== undefined) {
    sets.push('telephone = ?');
    vals.push(data.telephone ? String(data.telephone).trim() : null);
  }
  if (data.dateNaissance !== undefined) {
    sets.push('date_naissance = ?');
    vals.push(data.dateNaissance ? fmtDate(data.dateNaissance) : null);
  }
  if (data.adresse !== undefined) {
    sets.push('adresse = ?');
    vals.push(data.adresse ? String(data.adresse).trim() : null);
  }
  if (data.isActive !== undefined) {
    sets.push('is_active = ?');
    vals.push(data.isActive ? 1 : 0);
  }
  if (data.vehiculeAssigneId !== undefined) {
    sets.push('vehicule_assigne_id = ?');
    if (data.vehiculeAssigneId === null || data.vehiculeAssigneId === '') {
      vals.push(null);
    } else {
      try {
        vals.push(uuidToBuffer(String(data.vehiculeAssigneId)));
      } catch {
        const e = new Error('Identifiant véhicule invalide');
        e.code = 'VALIDATION';
        throw e;
      }
    }
  }

  if (sets.length) {
    vals.push(idBuf);
    try {
      await pool.query(`UPDATE conducteur SET ${sets.join(', ')} WHERE id = ?`, vals);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const e = new Error('Ce numéro de permis existe déjà');
        e.code = 'DUPLICATE';
        throw e;
      }
      throw err;
    }
  }

  const [rows] = await pool.query(`${SELECT_BASE} WHERE c.id = ?`, [idBuf]);
  const out = mapConducteurRow(rows[0], {
    nbAlertesReelles: Number(rows[0]?.nb_alertes_reelles ?? 0),
    nbPaquets: Number(rows[0]?.nb_paquets ?? 0),
  });
  return dualWrite(
    async () => out,
    async (d) => upsertDriver(d),
    'dualWrite.driver.update',
    { enqueuePayload: (d) => ({ driver: d }) }
  );
}

export async function deleteConducteur(idStr) {
  if (getDataProvider() === 'firestore') {
    await deleteDriver(idStr);
    return;
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  let idBuf;
  try {
    idBuf = uuidToBuffer(idStr);
  } catch {
    const e = new Error('Identifiant invalide');
    e.code = 'INVALID_ID';
    throw e;
  }

  const [r] = await pool.query(`SELECT id FROM conducteur WHERE id = ?`, [idBuf]);
  if (!r.length) {
    const e = new Error('NOT_FOUND');
    e.code = 'NOT_FOUND';
    throw e;
  }

  return dualWrite(
    async () => {
      await pool.query(`DELETE FROM conducteur WHERE id = ?`, [idBuf]);
      return { id: idStr };
    },
    async (ctx) => deleteDriver(ctx.id),
    'dualWrite.driver.delete',
    { enqueuePayload: (ctx) => ({ id: ctx.id }) }
  );
}
