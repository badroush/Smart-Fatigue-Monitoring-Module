/**
 * Migration MySQL (sfam_db) -> Firestore (Firebase).
 *
 * Cible: rendre le dashboard fonctionnel sur Firestore:
 * - vehicles (vehicule)
 * - conducteurs (conducteur)
 * - alerts (alerte)
 * - module alerts (alerte_module)
 *
 * Prérequis (env):
 * - DATABASE_URL=mysql://...
 * - FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 * - FIREBASE_PROJECT_ID (optionnel si dans le JSON)
 *
 * Usage:
 *   node scripts/migrate-mysql-to-firestore.js
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import admin from 'firebase-admin';
import { bufferToUuid } from '../src/utils/uuid.js';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
  }
  return JSON.parse(raw);
}

function initFirestore() {
  if (admin.apps.length) return admin.firestore();
  const sa = parseServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || sa.project_id;
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId,
  });
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

function normalizeMysqlUrl(raw) {
  if (!raw?.trim()) return '';
  try {
    const u = new URL(raw);
    u.searchParams.delete('serverVersion');
    u.searchParams.delete('charset');
    const out = u.toString();
    return out.endsWith('?') ? out.slice(0, -1) : out;
  } catch {
    return raw.split('?')[0];
  }
}

async function getMysqlPool() {
  const url = normalizeMysqlUrl(process.env.DATABASE_URL);
  if (!url) throw new Error('DATABASE_URL is required');
  return mysql.createPool({ uri: url });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertMany(db, collection, docs) {
  // 500 ops max / batch
  for (const part of chunk(docs, 450)) {
    const batch = db.batch();
    for (const d of part) {
      batch.set(db.collection(collection).doc(d.id), d.data, { merge: true });
    }
    await batch.commit();
  }
}

async function migrateVehicles(pool, db) {
  const [rows] = await pool.query(`
    SELECT id, immatriculation, type, statut, is_monitored, is_active, sfam_api_key,
           derniere_communication, created_at, COALESCE(is_superviseur, 0) AS is_superviseur
    FROM vehicule
  `);

  const docs = rows.map((r) => {
    const id = bufferToUuid(r.id);
    return {
      id,
      data: {
        immatriculation: r.immatriculation,
        type: r.type,
        statut: r.statut,
        isMonitored: Boolean(r.is_monitored),
        isActive: Boolean(r.is_active),
        sfamApiKey: r.sfam_api_key,
        isSuperviseur: Boolean(r.is_superviseur),
        derniereCommunication: r.derniere_communication
          ? r.derniere_communication.toISOString()
          : null,
        createdAt: r.created_at ? r.created_at.toISOString() : null,
      },
    };
  });

  await upsertMany(db, 'vehicles', docs);
  return docs.length;
}

async function migrateConducteurs(pool, db) {
  const [rows] = await pool.query(`
    SELECT id, nom, numero_permis, telephone, date_naissance, adresse, is_active,
           total_alertes, total_evenements_fatigue, created_at, last_fatigue_event_at,
           vehicule_assigne_id
    FROM conducteur
  `);

  const docs = rows.map((r) => {
    const id = bufferToUuid(r.id);
    return {
      id,
      data: {
        nom: r.nom,
        numeroPermis: r.numero_permis,
        telephone: r.telephone ?? null,
        dateNaissance: r.date_naissance ? r.date_naissance.toISOString().slice(0, 10) : null,
        adresse: r.adresse ?? null,
        isActive: Boolean(r.is_active),
        totalAlertes: Number(r.total_alertes ?? 0),
        totalEvenementsFatigue: Number(r.total_evenements_fatigue ?? 0),
        createdAt: r.created_at ? r.created_at.toISOString() : null,
        lastFatigueEventAt: r.last_fatigue_event_at ? r.last_fatigue_event_at.toISOString() : null,
        vehiculeAssigneId: r.vehicule_assigne_id ? bufferToUuid(r.vehicule_assigne_id) : null,
      },
    };
  });

  await upsertMany(db, 'drivers', docs);
  return docs.length;
}

async function migrateAlerts(pool, db) {
  const [rows] = await pool.query(`
    SELECT id, id_alerte, niveau, message, type, statut, horodatage,
           acquittee_at, resolue_at, metadata, envoyee, lue,
           conducteur_id, vehicule_id, fatigue_event_id,
           acquittee_par, resolue_par
    FROM alerte
  `);

  const docs = rows.map((r) => {
    const id = bufferToUuid(r.id);
    const vehiculeId = bufferToUuid(r.vehicule_id);
    const conducteurId = bufferToUuid(r.conducteur_id);
    return {
      id,
      data: {
        idAlerte: r.id_alerte,
        niveau: r.niveau,
        message: r.message,
        type: r.type,
        statut: r.statut,
        horodatage: r.horodatage ? r.horodatage.toISOString() : null,
        acquitteeAt: r.acquittee_at ? r.acquittee_at.toISOString() : null,
        resolueAt: r.resolue_at ? r.resolue_at.toISOString() : null,
        metadata: r.metadata ? safeJsonParse(r.metadata) : null,
        envoyee: Boolean(r.envoyee),
        lue: Boolean(r.lue),
        vehiculeId,
        conducteurId,
        fatigueEventId: r.fatigue_event_id ? bufferToUuid(r.fatigue_event_id) : null,
        acquitteePar: r.acquittee_par ?? null,
        resoluePar: r.resolue_par ?? null,
        // embedded snapshots for UI compatibility (optional)
        vehicule: { id: vehiculeId },
        conducteur: { id: conducteurId },
      },
    };
  });

  await upsertMany(db, 'alerts', docs);
  return docs.length;
}

async function migrateModuleAlerts(pool, db) {
  let rows;
  try {
    const [r] = await pool.query(`
      SELECT id, type, message, statut, horodatage, resolue_at, metadata, vehicule_id
      FROM alerte_module
    `);
    rows = r;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) {
      return 0;
    }
    throw e;
  }

  const docs = rows.map((r) => {
    const id = bufferToUuid(r.id);
    const vehiculeId = bufferToUuid(r.vehicule_id);
    return {
      id,
      data: {
        type: r.type,
        message: r.message,
        statut: r.statut,
        horodatage: r.horodatage ? r.horodatage.toISOString() : null,
        resolueAt: r.resolue_at ? r.resolue_at.toISOString() : null,
        metadata: r.metadata ? safeJsonParse(r.metadata) : null,
        vehiculeId,
        vehicule: { id: vehiculeId },
      },
    };
  });

  await upsertMany(db, 'moduleAlerts', docs);
  return docs.length;
}

function safeJsonParse(v) {
  try {
    if (typeof v === 'string') return JSON.parse(v);
    return v;
  } catch {
    return null;
  }
}

async function main() {
  const db = initFirestore();
  const pool = await getMysqlPool();

  console.log('[migrate] starting...');

  const nVeh = await migrateVehicles(pool, db);
  console.log(`[migrate] vehicles: ${nVeh}`);

  const nDrv = await migrateConducteurs(pool, db);
  console.log(`[migrate] drivers: ${nDrv}`);

  const nAlt = await migrateAlerts(pool, db);
  console.log(`[migrate] alerts: ${nAlt}`);

  const nMod = await migrateModuleAlerts(pool, db);
  console.log(`[migrate] moduleAlerts: ${nMod}`);

  await pool.end();
  console.log('[migrate] done.');
}

main().catch((e) => {
  console.error('[migrate] failed:', e);
  process.exitCode = 1;
});

