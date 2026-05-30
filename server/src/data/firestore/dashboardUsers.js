import { getFirestore } from '../../config/firebase.js';

function normalizeLogin(login) {
  return String(login || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * @returns {Promise<{ id: string, login: string, passwordHash: string, role: 'admin'|'superviseur' } | null>}
 */
export async function findDashboardUserByLogin(login) {
  try {
    const db = getFirestore();
    const id = normalizeLogin(login);
    const doc = await db.collection('dashboard_users').doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data() || {};
    return {
      id: doc.id,
      login: d.login || id,
      passwordHash: d.passwordHash,
      role: d.role === 'superviseur' ? 'superviseur' : 'admin',
    };
  } catch (e) {
    if (e.code === 'FIREBASE_NOT_CONFIGURED') return null;
    throw e;
  }
}

/**
 * @param {string} passwordHash bcrypt hash
 * @param {'admin'|'superviseur'} role
 */
export async function upsertDashboardUser(login, passwordHash, role) {
  const db = getFirestore();
  const id = normalizeLogin(login);
  await db
    .collection('dashboard_users')
    .doc(id)
    .set(
      {
        login: String(login).trim(),
        passwordHash,
        role: role === 'superviseur' ? 'superviseur' : 'admin',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  return id;
}
