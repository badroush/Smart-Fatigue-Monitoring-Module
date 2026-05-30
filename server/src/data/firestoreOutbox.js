import { getPool } from '../config/database.js';
import { getDataProvider } from './provider.js';
import { upsertVehicle as upsertVehicleFs, deleteVehicle as deleteVehicleFs } from './firestore/vehicles.js';
import { upsertDriver, deleteDriver } from './firestore/drivers.js';
import {
  acquitterAlerte as acquitterAlerteFs,
  resoudreAlerte as resoudreAlerteFs,
} from './firestore/alerts.js';
import { replicateIngestToFirestore } from './firestore/ingest.js';

let tableEnsured = false;

async function ensureTable(pool) {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS firestore_sync_queue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(128) NOT NULL,
      payload JSON NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      last_error TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_status_created (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableEnsured = true;
}

function isMysqlPlusFirestoreSync() {
  const p = getDataProvider();
  return p === 'dual' || p === 'firestore';
}

/**
 * Met en file d'attente une opération Firestore à rejouer (MySQL = file locale).
 * Utilisé quand DATA_PROVIDER=dual ou firestore et que l'écriture secondaire échoue.
 */
export async function enqueueFirestoreSync(kind, payload) {
  if (!isMysqlPlusFirestoreSync()) return;
  const pool = getPool();
  if (!pool) return;

  let json;
  try {
    json = JSON.stringify(payload);
  } catch (e) {
    console.warn('[firestoreOutbox] payload not serializable:', e?.message || e);
    return;
  }

  await ensureTable(pool);
  await pool.query(
    `INSERT INTO firestore_sync_queue (kind, payload, status) VALUES (?, ?, 'pending')`,
    [kind, json]
  );
}

async function replayOne(kind, payload) {
  switch (kind) {
    case 'dualWrite.vehicle.update':
    case 'dualWrite.vehicle.create':
      await upsertVehicleFs(payload.vehicle);
      break;
    case 'dualWrite.vehicle.delete':
      await deleteVehicleFs(payload.id);
      break;
    case 'dualWrite.driver.create':
    case 'dualWrite.driver.update':
      await upsertDriver(payload.driver);
      break;
    case 'dualWrite.driver.delete':
      await deleteDriver(payload.id);
      break;
    case 'dualWrite.alert.acquit':
      await acquitterAlerteFs(payload.alertId, {
        acquitteeAt: payload.acquitteeAt ? new Date(payload.acquitteeAt) : new Date(),
        acquitteePar: payload.acquitteePar,
      });
      break;
    case 'dualWrite.alert.resolve':
      await resoudreAlerteFs(payload.alertId, {
        resolueAt: payload.resolueAt ? new Date(payload.resolueAt) : new Date(),
        resoluePar: payload.resoluePar,
      });
      break;
    case 'ingest':
      await replicateIngestToFirestore(payload);
      break;
    default:
      throw new Error(`Unknown outbox kind: ${kind}`);
  }
}

const MAX_ATTEMPTS = 100;

export async function processFirestoreOutboxBatch() {
  if (!isMysqlPlusFirestoreSync()) return { processed: 0 };

  const pool = getPool();
  if (!pool) return { processed: 0 };

  await ensureTable(pool);

  const [rows] = await pool.query(
    `SELECT id, kind, payload, attempts FROM firestore_sync_queue
     WHERE status = 'pending' AND attempts < ?
     ORDER BY id ASC
     LIMIT 30`,
    [MAX_ATTEMPTS]
  );

  let processed = 0;
  for (const row of rows) {
    const kind = row.kind;
    let payload =
      typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

    try {
      await replayOne(kind, payload);
      await pool.query(`DELETE FROM firestore_sync_queue WHERE id = ?`, [row.id]);
      processed += 1;
    } catch (e) {
      const msg = e?.message || String(e);
      await pool.query(
        `UPDATE firestore_sync_queue
         SET attempts = attempts + 1, last_error = ?, status = IF(attempts + 1 >= ?, 'dead', 'pending')
         WHERE id = ?`,
        [msg.slice(0, 2000), MAX_ATTEMPTS, row.id]
      );
    }
  }

  return { processed };
}

let started = false;

/**
 * Boucle de synchronisation automatique quand Firebase revient.
 */
export function startFirestoreOutboxProcessor() {
  if (started) return;
  started = true;

  const intervalMs = Number(process.env.FIRESTORE_OUTBOX_INTERVAL_MS) || 30000;

  const tick = () => {
    processFirestoreOutboxBatch().catch((e) => {
      console.warn('[firestoreOutbox] batch error:', e?.message || e);
    });
  };

  setTimeout(tick, 5000);
  setInterval(tick, intervalMs);
}
