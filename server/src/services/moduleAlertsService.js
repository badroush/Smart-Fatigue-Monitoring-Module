import { getPool } from '../config/database.js';
import { bufferToUuid } from '../utils/uuid.js';
import { listModuleAlertsFs } from '../data/firestore/moduleAlerts.js';
import { readFromFirestore } from '../data/readFallback.js';

function formatDt(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  return String(v);
}

/**
 * GET /module-alerts — alertes matériel (batterie, surchauffe, etc.), comme SfamDataController::getModuleAlerts.
 */
export async function listModuleAlerts() {
  if (readFromFirestore()) {
    return listModuleAlertsFs();
  }

  const pool = getPool();
  if (!pool) throw new Error('NO_DATABASE');

  try {
    const [rows] = await pool.query(
      `SELECT am.id, am.type, am.message, am.statut, am.horodatage,
              v.id AS vid, v.immatriculation
       FROM alerte_module am
       INNER JOIN vehicule v ON am.vehicule_id = v.id
       WHERE am.statut = 'active'
       ORDER BY am.horodatage DESC
       LIMIT 50`
    );

    const alertes = rows.map((row) => ({
      id: bufferToUuid(row.id),
      vehicule: {
        id: bufferToUuid(row.vid),
        immatriculation: row.immatriculation,
      },
      type: row.type,
      message: row.message,
      statut: row.statut,
      horodatage: formatDt(row.horodatage),
    }));

    return { total: alertes.length, alertes };
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) {
      return { total: 0, alertes: [] };
    }
    throw e;
  }
}
